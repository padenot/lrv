use crate::diff::{attribute_line, diff_shows_line};
use crate::types::{CommentLine, DiffResponse, ReviewNote, Side};
use anyhow::{bail, Context, Result};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::time::Duration;
use tokio::process::Command;

#[derive(Debug, Deserialize)]
struct GhComment {
    id: u64,
    body: String,
    path: Option<String>,
    /// Line number in the new file (null when comment is outdated after a push)
    line: Option<usize>,
    original_line: Option<usize>,
    /// For multi-line comments: the start line
    start_line: Option<usize>,
    original_start_line: Option<usize>,
    /// "LEFT" (old) or "RIGHT" (new)
    side: Option<String>,
    /// If set, this is a reply to another comment
    in_reply_to_id: Option<u64>,
    commit_id: Option<String>,
    html_url: Option<String>,
    created_at: Option<String>,
    user: Option<GhUser>,
}

#[derive(Debug, Deserialize)]
struct GhUser {
    login: String,
}

/// Parse the JSON output of `gh api repos/OWNER/REPO/pulls/N/comments`
/// into lrv review notes.
pub fn load_github_notes(path: &str, diffs: &[DiffResponse]) -> Result<Vec<ReviewNote>> {
    let raw = std::fs::read(path)
        .with_context(|| format!("Failed to read GitHub comments file: {}", path))?;
    let comments: Vec<GhComment> =
        serde_json::from_slice(&raw).context("Failed to parse GitHub PR comments JSON")?;
    Ok(notes_from_comments(comments, diffs))
}

fn notes_from_comments(comments: Vec<GhComment>, diffs: &[DiffResponse]) -> Vec<ReviewNote> {
    // Group replies by their root comment id
    let mut replies: HashMap<u64, Vec<&GhComment>> = HashMap::new();
    for c in &comments {
        if let Some(parent_id) = c.in_reply_to_id {
            replies.entry(parent_id).or_default().push(c);
        }
    }

    // Build series commit-hash → index map
    let commit_hash_to_idx: HashMap<String, usize> = diffs
        .iter()
        .enumerate()
        .filter_map(|(i, d)| d.commit_hash.as_ref().map(|h| (h.clone(), i)))
        .collect();

    let mut notes = Vec::new();

    for comment in &comments {
        // Skip replies — they'll be appended to the root comment body
        if comment.in_reply_to_id.is_some() {
            continue;
        }

        let Some(path) = &comment.path else { continue };

        // Use current line position; fall back to original if comment became outdated
        let end_line = comment.line.or(comment.original_line);
        let start_line = comment.start_line.or(comment.original_start_line);

        let Some(end_line) = end_line else { continue };
        if end_line == 0 {
            continue;
        }

        let line = match start_line {
            Some(s) if s > 0 && s < end_line => CommentLine::Range((s, end_line)),
            _ => CommentLine::Single(end_line),
        };

        let side = match comment.side.as_deref() {
            Some("LEFT") => Side::Old,
            _ => Side::New,
        };

        // Append any replies to the body
        let mut body = comment.body.clone();
        if let Some(thread) = replies.get(&comment.id) {
            for reply in thread {
                let author = reply.user.as_ref().map(|u| u.login.as_str()).unwrap_or("?");
                body.push_str(&format!("\n\n**{}:** {}", author, reply.body));
            }
        }

        let mut line = line;
        let mut commit_idx = comment
            .commit_id
            .as_ref()
            .and_then(|h| commit_hash_to_idx.get(h).copied());

        // "Files changed" comments are stamped with the PR head and use
        // combined-diff line numbers; trace them back to the owning commit.
        if diffs.len() > 1 && is_head(comment.commit_id.as_deref(), diffs) {
            let head = diffs.len() - 1;
            if !diff_shows_line(&diffs[head], path, end_line, side) {
                if let Some((idx, mapped_end)) = attribute_line(diffs, path, end_line, side) {
                    commit_idx = Some(idx);
                    line = match line {
                        CommentLine::Range((s, _)) => match attribute_line(diffs, path, s, side) {
                            Some((i, mapped_start)) if i == idx && mapped_start < mapped_end => {
                                CommentLine::Range((mapped_start, mapped_end))
                            }
                            _ => CommentLine::Single(mapped_end),
                        },
                        CommentLine::Single(_) => CommentLine::Single(mapped_end),
                    };
                }
            }
        }

        notes.push(ReviewNote {
            id: Some(comment.id.to_string()),
            file: path.clone(),
            line,
            side,
            body,
            author: comment.user.as_ref().map(|u| u.login.clone()),
            date: comment.created_at.clone(),
            source_url: comment.html_url.clone(),
            commit_idx,
        });
    }

    eprintln!(
        "Loaded {} review note{} from GitHub PR",
        notes.len(),
        if notes.len() == 1 { "" } else { "s" }
    );
    notes
}

/// Whether `commit_id` is the head (last) commit of the series.
fn is_head(commit_id: Option<&str>, diffs: &[DiffResponse]) -> bool {
    let (Some(id), Some(head)) = (
        commit_id,
        diffs.last().and_then(|d| d.commit_hash.as_deref()),
    ) else {
        return false;
    };
    !id.is_empty() && !head.is_empty() && (id.starts_with(head) || head.starts_with(id))
}

/// A pull request: `owner/repo#number`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PrRef {
    pub owner: String,
    pub repo: String,
    pub number: u64,
}

/// `(owner, repo)` of a GitHub remote URL (`https://github.com/O/R(.git)`,
/// `git@github.com:O/R.git`, `ssh://git@github.com/O/R`).
pub fn parse_github_remote(url: &str) -> Option<(String, String)> {
    let url = url.trim();
    let rest = match url.strip_prefix("git@github.com:") {
        Some(rest) => rest,
        None => {
            let (_, rest) = url.split_once("://")?;
            let rest = rest.rsplit_once('@').map_or(rest, |(_, host)| host);
            rest.strip_prefix("github.com")?.strip_prefix(['/', ':'])?
        }
    };
    let rest = rest.trim_end_matches('/');
    let rest = rest.strip_suffix(".git").unwrap_or(rest);
    let (owner, repo) = rest.split_once('/')?;
    if owner.is_empty() || repo.is_empty() || repo.contains('/') {
        return None;
    }
    Some((owner.to_string(), repo.to_string()))
}

/// GitHub repos the working directory pushes to or fetches from, `upstream` and
/// `origin` first (a fork's PR lives in the upstream repo).
pub fn github_remotes() -> Vec<(String, String)> {
    let run = |cmd: &str, args: &[&str]| {
        std::process::Command::new(cmd)
            .args(args)
            .stdin(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .output()
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
    };
    // `jj git remote list` and `git remote -v` both print `<name> <url>...` per line.
    let out = run("jj", &["git", "remote", "list"])
        .filter(|o| !o.trim().is_empty())
        .or_else(|| run("git", &["remote", "-v"]))
        .unwrap_or_default();
    let mut remotes: Vec<(String, String, String)> = Vec::new();
    for line in out.lines() {
        let mut words = line.split_whitespace();
        if let (Some(name), Some(url)) = (words.next(), words.next()) {
            if let Some((owner, repo)) = parse_github_remote(url) {
                remotes.push((name.to_string(), owner, repo));
            }
        }
    }
    let rank = |name: &str| match name {
        "upstream" => 0,
        "origin" => 1,
        _ => 2,
    };
    remotes.sort_by_key(|(name, _, _)| rank(name));
    let mut seen = HashSet::new();
    remotes
        .into_iter()
        .map(|(_, owner, repo)| (owner, repo))
        .filter(|slug| seen.insert(slug.clone()))
        .collect()
}

fn gh_bin() -> String {
    std::env::var("LRV_GH_BIN").unwrap_or_else(|_| "gh".to_string())
}

/// Run `gh <args>` and return its stdout, or `None` if it is missing, fails or exceeds `timeout`.
async fn run_gh(args: &[&str], timeout: Duration) -> Option<Vec<u8>> {
    let mut cmd = Command::new(gh_bin());
    cmd.args(args)
        .stdin(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .kill_on_drop(true);
    let out = tokio::time::timeout(timeout, cmd.output())
        .await
        .ok()?
        .ok()?;
    out.status.success().then_some(out.stdout)
}

/// Find the open GitHub PR the reviewed commits belong to: ask GitHub which PRs contain the top
/// commit, in each GitHub remote of the working directory. Only an unambiguous answer counts.
/// Silent when `gh` is missing, unauthenticated or slow, since most reviews aren't of a PR and
/// must not be held up.
pub async fn detect_pr(diffs: &[DiffResponse]) -> Option<PrRef> {
    detect_pr_in(&github_remotes(), diffs).await
}

/// `detect_pr` against an explicit list of `(owner, repo)` candidates.
pub async fn detect_pr_in(remotes: &[(String, String)], diffs: &[DiffResponse]) -> Option<PrRef> {
    let sha = diffs.last()?.commit_hash.as_deref()?;
    for (owner, repo) in remotes {
        let path = format!("repos/{owner}/{repo}/commits/{sha}/pulls");
        let args = [
            "api",
            path.as_str(),
            "--jq",
            r#"[.[] | select(.state == "open") | [.base.repo.full_name, .number]] | @json"#,
        ];
        let Some(out) = run_gh(&args, Duration::from_secs(5)).await else {
            continue;
        };
        let Ok(numbers) = serde_json::from_slice::<Vec<(String, u64)>>(&out) else {
            continue;
        };
        // The PR may live in another repo than the remote asked (a fork's commit also lists the
        // upstream's PRs), so use the PR's base repo.
        if let [(full_name, number)] = &numbers[..] {
            if let Some((owner, repo)) = full_name.split_once('/') {
                return Some(PrRef {
                    owner: owner.to_string(),
                    repo: repo.to_string(),
                    number: *number,
                });
            }
        }
    }
    None
}

/// Parse `123`, `#123`, `OWNER/REPO#123` or a `github.com/OWNER/REPO/pull/123` URL. A bare number
/// refers to the first of `remotes`.
pub fn parse_pr_ref(input: &str, remotes: &[(String, String)]) -> Result<PrRef> {
    let input = input.trim();
    let invalid =
        || anyhow::anyhow!("Invalid GitHub PR {input:?}: use a number, OWNER/REPO#N or a PR URL");
    let (slug, number) = if let Some((_, tail)) = input.split_once("github.com/") {
        let parts: Vec<&str> = tail.split('/').collect();
        match parts[..] {
            [owner, repo, "pull", number, ..] => (Some((owner, repo)), number),
            _ => return Err(invalid()),
        }
    } else if let Some((slug, number)) = input.rsplit_once('#') {
        let slug = match slug {
            "" => None,
            slug => Some(slug.split_once('/').ok_or_else(invalid)?),
        };
        (slug, number)
    } else {
        (None, input)
    };
    let number: u64 = number.parse().map_err(|_| invalid())?;
    let (owner, repo) = match slug {
        Some((owner, repo)) => (owner.to_string(), repo.to_string()),
        None => remotes
            .first()
            .cloned()
            .context("No GitHub remote found to resolve the PR number; use OWNER/REPO#N")?,
    };
    Ok(PrRef {
        owner,
        repo,
        number,
    })
}

/// Fetch a PR's inline review comments through the `gh` CLI, so lrv never handles a GitHub token.
pub async fn fetch_pr_notes(pr: &PrRef, diffs: &[DiffResponse]) -> Result<Vec<ReviewNote>> {
    let path = format!(
        "repos/{}/{}/pulls/{}/comments",
        pr.owner, pr.repo, pr.number
    );
    // `--jq '.[]'` makes paginated output one object per page entry instead of several arrays.
    let args = ["api", "--paginate", path.as_str(), "--jq", ".[]"];
    let Some(out) = run_gh(&args, Duration::from_secs(30)).await else {
        bail!("`gh api {path}` failed (is the GitHub CLI installed and authenticated?)");
    };
    let comments = serde_json::Deserializer::from_slice(&out)
        .into_iter::<GhComment>()
        .collect::<Result<Vec<_>, _>>()
        .context("Failed to parse GitHub PR comments")?;
    Ok(notes_from_comments(comments, diffs))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_pr_references() {
        let remotes = [("o".to_string(), "r".to_string())];
        let want = |owner: &str, repo: &str, number| PrRef {
            owner: owner.into(),
            repo: repo.into(),
            number,
        };
        for (input, expected) in [
            ("7", want("o", "r", 7)),
            ("#7", want("o", "r", 7)),
            ("a/b#7", want("a", "b", 7)),
            ("https://github.com/a/b/pull/7/files", want("a", "b", 7)),
        ] {
            assert_eq!(parse_pr_ref(input, &remotes).unwrap(), expected, "{input}");
        }
        assert!(parse_pr_ref("nope", &remotes).is_err());
        assert!(parse_pr_ref("7", &[]).is_err());
    }

    #[test]
    fn github_remote_urls_parse() {
        let want = Some(("o".to_string(), "r".to_string()));
        for url in [
            "https://github.com/o/r.git",
            "https://github.com/o/r",
            "https://user@github.com/o/r/",
            "git@github.com:o/r.git",
            "ssh://git@github.com/o/r.git",
            "ssh://git@github.com:o/r",
        ] {
            assert_eq!(parse_github_remote(url), want, "{url}");
        }
        for url in [
            "https://gitlab.com/o/r.git",
            "https://github.com/o",
            "https://github.com/o/r/extra",
            "/home/me/r",
        ] {
            assert_eq!(parse_github_remote(url), None, "{url}");
        }
    }
}
