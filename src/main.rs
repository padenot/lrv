mod config;
mod diff;
mod github;
mod output;
mod phab_mcp;
mod phabricator;
mod server;
mod skill;
mod store;
mod themes;
mod types;

use anyhow::{Context, Result};
use clap::{ArgAction, Parser};
use lrv::netutil;
use moz_cli_version_check::VersionChecker;
use std::env;
use std::io::{Read, Write};
use std::process::Command;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, Notify};

use crate::output::OutputFormat;
use crate::phabricator::PhabricatorClient;
use crate::server::{create_router, AppState};
use crate::types::{CommentLine, DiffResponse, LineType, ProjectContext, ReviewNote, Side};
use lrv::repository;

fn get_project_context() -> ProjectContext {
    let current_directory = std::env::current_dir().ok();
    let working_directory = current_directory
        .as_deref()
        .and_then(repository::root)
        .or(current_directory)
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_else(|| String::from("unknown"));

    // A jj-only repository has no Git branch to report, and probing Git here
    // only produces an avoidable failed command.
    let git_branch = if repository::is_jj_repo(&working_directory) {
        None
    } else {
        Command::new("git")
            .args(["rev-parse", "--abbrev-ref", "HEAD"])
            .current_dir(&working_directory)
            .output()
            .ok()
            .and_then(|output| {
                if output.status.success() {
                    String::from_utf8(output.stdout)
                        .ok()
                        .map(|s| s.trim().to_string())
                } else {
                    None
                }
            })
    };

    ProjectContext {
        working_directory,
        git_branch,
        title: None,
        is_public: false,
        claude_skill_installed: skill::all_skills_installed(),
        comment_store_error: None,
    }
}

fn get_network_interfaces() -> Vec<String> {
    let mut interfaces = Vec::new();

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("ifconfig").output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                let mut current_ip = None;
                for line in text.lines() {
                    if (line.starts_with('\t') || line.starts_with(' '))
                        && line.contains("inet ")
                        && !line.contains("inet6")
                    {
                        if let Some(ip) = line.split_whitespace().nth(1) {
                            if ip != "127.0.0.1" {
                                current_ip = Some(ip.to_string());
                            }
                        }
                    }
                    if let Some(ip) = current_ip.take() {
                        interfaces.push(ip);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("hostname").args(["-I"]).output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for ip in text.split_whitespace() {
                    if ip != "127.0.0.1" {
                        interfaces.push(ip.to_string());
                    }
                }
            }
        }
    }

    if interfaces.is_empty() {
        interfaces.push("127.0.0.1".to_string());
    }

    interfaces
}

fn push_unique_ip(list: &mut Vec<String>, ip: String) {
    if !list.iter().any(|x| x == &ip) {
        list.push(ip);
    }
}

fn parse_ips_from_env_value(value: &str) -> Vec<String> {
    let normalized = value.replace(',', " ");
    netutil::filter_tailscale_ipv4s(&normalized)
}

// Environment-only detection for Tailscale addresses.
fn get_tailscale_ipv4s_from_env() -> Vec<String> {
    let mut out = Vec::new();

    for key in [
        "LRV_TAILSCALE_IPS",
        "TAILSCALE_IPS",
        "LRV_TAILSCALE_IP",
        "TAILSCALE_IP",
    ] {
        if let Ok(v) = env::var(key) {
            for ip in parse_ips_from_env_value(&v) {
                push_unique_ip(&mut out, ip);
            }
        }
    }

    if let Ok(ssh_conn) = env::var("SSH_CONNECTION") {
        if let Some(ip) = netutil::tailscale_server_ip_from_ssh_connection(&ssh_conn) {
            push_unique_ip(&mut out, ip);
        }
    }

    out
}

fn is_ssh_session() -> bool {
    // Detect common SSH environment variables
    env::var_os("SSH_CONNECTION").is_some()
        || env::var_os("SSH_TTY").is_some()
        || env::var_os("SSH_CLIENT").is_some()
}

#[derive(Parser, Debug)]
#[command(name = "lrv")]
#[command(about = "Local code review tool for LLM agents", long_about = None)]
#[command(disable_version_flag = true)]
struct Args {
    /// Print version information
    #[arg(long = "version", short = 'V', action = ArgAction::SetTrue)]
    version: bool,

    /// Command to run to get diff (e.g., "git diff", "jj diff")
    #[arg(long)]
    cmd: Option<String>,

    /// Read diff from file instead of stdin
    #[arg(long)]
    file: Option<String>,

    /// Port to bind server to (default: random available port)
    #[arg(long)]
    port: Option<u16>,

    /// Bind address(es). Can be passed multiple times. Default: 127.0.0.1
    #[arg(long)]
    bind: Vec<String>,

    /// Shorthand to bind on all interfaces (equivalent to --bind 0.0.0.0)
    #[arg(long)]
    public: bool,

    /// Also bind to the local Tailscale IPv4 address, if detected
    #[arg(long)]
    tailscale: bool,

    /// Don't auto-open browser
    #[arg(long)]
    no_open: bool,

    /// Output format: json or text
    #[arg(long, default_value = "json")]
    format: String,

    /// Optional title to display in the UI header (e.g., PR summary)
    #[arg(long)]
    title: Option<String>,

    /// Load review notes from a JSON file and render them inline with the diff. Can be repeated.
    #[arg(long)]
    review_notes_file: Vec<String>,

    /// Load Phabricator comments from the markdown output of mcp__moz__get_phabricator_revision
    #[arg(long = "phab-mcp-comments")]
    phab_mcp_comments: Option<String>,

    /// Load GitHub PR review comments from a JSON file (output of `gh api repos/OWNER/REPO/pulls/N/comments`)
    #[arg(long = "github-pr-comments")]
    github_pr_comments: Option<String>,

    /// Load a GitHub PR's review comments as inline review notes, fetched with `gh`. Takes a PR
    /// number, OWNER/REPO#N or a PR URL. Without a value, find the open PR containing the top
    /// commit.
    #[arg(
        long = "github-pr",
        num_args = 0..=1,
        default_missing_value = "",
        value_name = "PR"
    )]
    github_pr: Option<String>,

    /// Load Phabricator review comments as inline review notes. Can be repeated for series mode.
    /// Without a value, find the revision from the commits' `Differential Revision:` trailer.
    #[arg(
        long = "phab-revision",
        num_args = 0..=1,
        default_missing_value = "",
        value_name = "REVISION"
    )]
    phab_revisions: Vec<String>,

    /// Base Phabricator URL
    #[arg(long)]
    phab_base_url: Option<String>,

    /// Include Phabricator inline comments marked done
    #[arg(long)]
    phab_include_done: bool,

    /// Enable development HTTP tracing (tower_http::trace). Disabled by default.
    #[arg(long)]
    dev_log: bool,

    /// Review a commit series (jj revset or git range, e.g. "trunk()..@" or "HEAD~5..HEAD")
    #[arg(long)]
    series: Option<String>,

    /// Print the config directory path and exit
    #[arg(long)]
    config_dir: bool,

    /// Validate a review notes JSON file and exit (exit 0 on success, 1 on error)
    #[arg(long)]
    validate_review_notes: Option<String>,

    /// List review sessions stored in the local comment database and exit
    #[arg(long)]
    list_reviews: bool,

    /// Print the comments of a stored review session and exit (session id, or
    /// nothing/"latest" for the most recent one with comments)
    #[arg(long, num_args = 0..=1, default_missing_value = "latest")]
    recover: Option<String>,
}

fn enumerate_series_commits(revset: &str, working_dir: &str) -> Result<Vec<String>> {
    if repository::is_jj_repo(working_dir) {
        let output = Command::new("jj")
            .args([
                "log",
                "--no-graph",
                "--reversed",
                "-r",
                revset,
                "-T",
                "commit_id ++ \"\\n\"",
            ])
            .current_dir(working_dir)
            .output()
            .context("Failed to run jj log")?;
        if !output.status.success() {
            anyhow::bail!("jj log failed: {}", String::from_utf8_lossy(&output.stderr));
        }
        let ids: Vec<String> = String::from_utf8(output.stdout)
            .context("jj log output is not valid UTF-8")?
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        Ok(ids)
    } else {
        let output = Command::new("git")
            .args(["log", "--format=%H", "--reverse", revset])
            .current_dir(working_dir)
            .output()
            .context("Failed to run git log")?;
        if !output.status.success() {
            anyhow::bail!(
                "git log failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
        let hashes: Vec<String> = String::from_utf8(output.stdout)
            .context("git log output is not valid UTF-8")?
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        Ok(hashes)
    }
}

struct Spinner {
    stop: Arc<std::sync::atomic::AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl Spinner {
    fn start(label: &str) -> Self {
        let stop = Arc::new(std::sync::atomic::AtomicBool::new(false));
        let stop_clone = stop.clone();
        let label = label.to_string();
        let thread = std::thread::spawn(move || {
            let frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let mut i = 0usize;
            let mut stderr = std::io::stderr();
            while !stop_clone.load(std::sync::atomic::Ordering::Relaxed) {
                let _ = write!(stderr, "\r{} {}  ", frames[i % frames.len()], label);
                let _ = stderr.flush();
                std::thread::sleep(std::time::Duration::from_millis(80));
                i += 1;
            }
        });
        Self {
            stop,
            thread: Some(thread),
        }
    }

    fn finish(mut self, message: &str) {
        self.stop.store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
        eprintln!("\r✓ {}  ", message);
    }
}

impl Drop for Spinner {
    fn drop(&mut self) {
        self.stop.store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
        // clear the spinner line
        let _ = write!(std::io::stderr(), "\r");
    }
}

// Fetch all diffs for a jj series in one subprocess call and parse them.
// Returns diffs in revset order (oldest first, matching --reversed).
fn get_series_diffs_jj(revset: &str, working_dir: &str) -> Result<Vec<crate::types::DiffResponse>> {
    let template = concat!(
        r#"concat("Commit ID: ", commit_id, "\nAuthor: ", author.name(), "#,
        r#"" <", author.email(), "> (", author.timestamp().format("%Y-%m-%d %H:%M:%S"), ")\n\n", indent("    ", description), "\n\n")"#
    );
    let output = Command::new("jj")
        .args([
            "log",
            "--no-graph",
            "--reversed",
            "-r",
            revset,
            "-T",
            template,
            "-p",
            "--git",
        ])
        .current_dir(working_dir)
        .output()
        .context("Failed to run jj log")?;
    if !output.status.success() {
        anyhow::bail!("jj log failed: {}", String::from_utf8_lossy(&output.stderr));
    }
    let text = String::from_utf8(output.stdout).context("jj log output is not valid UTF-8")?;

    // Split on commit boundaries: each commit starts with "Commit ID: "
    let parts: Vec<&str> = text.split("\nCommit ID: ").collect();
    parts
        .iter()
        .enumerate()
        .map(|(i, part)| {
            let chunk = if i == 0 {
                part.to_string()
            } else {
                format!("Commit ID: {}", part)
            };
            diff::parse_diff(&chunk).context("Failed to parse commit diff")
        })
        .collect()
}

fn get_commit_diff_text(commit_id: &str, working_dir: &str) -> Result<String> {
    if repository::is_jj_repo(working_dir) {
        let output = Command::new("jj")
            .args(["show", "--git", "-r", commit_id])
            .current_dir(working_dir)
            .output()
            .context("Failed to run jj show")?;
        if !output.status.success() {
            anyhow::bail!(
                "jj show failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
        String::from_utf8(output.stdout).context("jj show output is not valid UTF-8")
    } else {
        let output = Command::new("git")
            .args(["show", commit_id])
            .current_dir(working_dir)
            .output()
            .context("Failed to run git show")?;
        if !output.status.success() {
            anyhow::bail!(
                "git show failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
        String::from_utf8(output.stdout).context("git show output is not valid UTF-8")
    }
}

fn load_review_notes_file(path: &str) -> Result<Vec<ReviewNote>> {
    let text = std::fs::read_to_string(path)
        .context(format!("Failed to read review notes file: {}", path))?;
    let notes: Vec<ReviewNote> =
        serde_json::from_str(&text).context("Failed to parse review notes JSON")?;
    validate_review_notes(&notes)?;
    Ok(notes)
}

fn validate_review_notes(notes: &[ReviewNote]) -> Result<()> {
    if let Some(note) = notes.iter().find(|note| !note.is_valid()) {
        anyhow::bail!(
            "Invalid review note for {}:{}",
            note.file,
            match &note.line {
                CommentLine::Single(line) => line.to_string(),
                CommentLine::Range((start, end)) => format!("{}-{}", start, end),
            }
        );
    }
    Ok(())
}

/// The Phabricator API token: from the environment, else from `~/.arcrc` (shared with moz-phab
/// and arc), where it is stored per host.
fn phabricator_token(base_url: &str) -> Result<String> {
    if let Ok(token) =
        std::env::var("PHABRICATOR_API_KEY").or_else(|_| std::env::var("PHABRICATOR_TOKEN"))
    {
        return Ok(token);
    }
    if let Some(token) =
        dirs::home_dir().and_then(|home| arcrc_token(&home.join(".arcrc"), base_url))
    {
        return Ok(token);
    }
    anyhow::bail!(
        "Set PHABRICATOR_API_KEY or PHABRICATOR_TOKEN (or log in with moz-phab) to load Phabricator comments"
    )
}

fn arcrc_token(path: &std::path::Path, base_url: &str) -> Option<String> {
    let value: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()?;
    let normalize = |url: &str| {
        url.trim_end_matches('/')
            .trim_end_matches("/api")
            .to_string()
    };
    let wanted = normalize(base_url);
    value
        .get("hosts")?
        .as_object()?
        .iter()
        .find(|(host, _)| normalize(host) == wanted)
        .and_then(|(_, entry)| entry.get("token")?.as_str())
        .map(str::to_string)
}

async fn load_phabricator_notes(
    revisions: &[String],
    base_url: &str,
    include_done: bool,
    diffs: &[DiffResponse],
) -> Result<Vec<ReviewNote>> {
    if revisions.is_empty() {
        return Ok(Vec::new());
    }

    let token = phabricator_token(base_url)?;
    let client = PhabricatorClient::new(base_url.to_string(), token)?;
    let mut notes = Vec::new();

    for (idx, revision) in revisions.iter().enumerate() {
        eprintln!("Loading review comments from Phabricator {}...", revision);
        let mut revision_notes = client.fetch_review_notes(revision, include_done).await?;
        let commit_idx = Some(idx);
        for note in &mut revision_notes {
            if note.file != "(commit)" {
                note.side = infer_review_note_side(note, diffs, commit_idx);
            }
            note.commit_idx = commit_idx;
        }
        eprintln!(
            "Loaded {} active review note{} from {}",
            revision_notes.len(),
            if revision_notes.len() == 1 { "" } else { "s" },
            revision
        );
        notes.extend(revision_notes);
    }

    validate_review_notes(&notes)?;
    Ok(notes)
}

/// Load the comments of the Phabricator revision(s) named by the commits' `Differential Revision:`
/// trailers. `None` when no commit has one. Failures are warnings: the review must open regardless.
async fn auto_fetch_phab(diffs: &[DiffResponse], include_done: bool) -> Option<Vec<ReviewNote>> {
    let revisions: Vec<(usize, String, u32)> = diffs
        .iter()
        .enumerate()
        .filter_map(|(i, diff)| {
            let (base, id) = phabricator::detect_revision(diff.commit_message.as_deref()?)?;
            Some((i, base, id))
        })
        .collect();
    if revisions.is_empty() {
        return None;
    }

    let token = match phabricator_token(&revisions[0].1) {
        Ok(token) => token,
        Err(e) => {
            eprintln!("warning: not loading Phabricator comments: {e:#}");
            return Some(Vec::new());
        }
    };
    let mut notes = Vec::new();
    for (i, base, id) in revisions {
        eprintln!("Loading review comments from Phabricator D{id}...");
        let fetched = async {
            let client = PhabricatorClient::new(base, token.clone())?;
            tokio::time::timeout(
                std::time::Duration::from_secs(30),
                client.fetch_review_notes(&format!("D{id}"), include_done),
            )
            .await
            .context("timed out")?
        }
        .await;
        match fetched {
            Ok(mut revision_notes) => {
                let commit_idx = Some(i);
                for note in &mut revision_notes {
                    if note.file != "(commit)" {
                        note.side = infer_review_note_side(note, diffs, commit_idx);
                    }
                    note.commit_idx = commit_idx;
                }
                eprintln!(
                    "Loaded {} active review note{} from D{id}",
                    revision_notes.len(),
                    if revision_notes.len() == 1 { "" } else { "s" },
                );
                notes.extend(revision_notes);
            }
            Err(e) => eprintln!("warning: failed to load comments from D{id}: {e:#}"),
        }
    }
    Some(notes)
}

/// Load the comments of the open GitHub PR containing the top commit. `None` when there isn't
/// exactly one.
async fn auto_fetch_github(diffs: &[DiffResponse]) -> Option<Vec<ReviewNote>> {
    let pr = github::detect_pr(diffs).await?;
    eprintln!(
        "Loading review comments from GitHub {}/{}#{}...",
        pr.owner, pr.repo, pr.number
    );
    Some(match github::fetch_pr_notes(&pr, diffs).await {
        Ok(notes) => notes,
        Err(e) => {
            eprintln!("warning: failed to load comments from GitHub PR: {e:#}");
            Vec::new()
        }
    })
}

fn infer_review_note_side(
    note: &ReviewNote,
    diffs: &[DiffResponse],
    commit_idx: Option<usize>,
) -> Side {
    let Some(diff) = diffs.get(commit_idx.unwrap_or(0)) else {
        return note.side;
    };
    let Some(file) = diff.files.iter().find(|file| {
        file.path == note.file || file.old_path.as_deref() == Some(note.file.as_str())
    }) else {
        return note.side;
    };

    if line_exists_in_file(file, &note.line, Side::New) {
        return Side::New;
    }
    if line_exists_in_file(file, &note.line, Side::Old) {
        return Side::Old;
    }
    note.side
}

fn line_exists_in_file(file: &crate::types::FileDiff, line: &CommentLine, side: Side) -> bool {
    let (start, end) = match line {
        CommentLine::Single(line) => (*line, *line),
        CommentLine::Range((start, end)) => (*start, *end),
    };
    (start..=end).all(|target| {
        file.hunks.iter().any(|hunk| {
            hunk.lines.iter().any(|line| match side {
                Side::New => {
                    !matches!(line.line_type, LineType::Delete) && line.new_line == Some(target)
                }
                Side::Old => {
                    !matches!(line.line_type, LineType::Add) && line.old_line == Some(target)
                }
            })
        })
    })
}

fn failure_lines(failures: &[store::OpenFailure]) -> Vec<String> {
    failures
        .iter()
        .map(|(path, e)| format!("Cannot use {}: {e:#}", path.display()))
        .collect()
}

/// Resolves the database to read stored reviews from, warning about any
/// location that could not be read.
fn readable_db_path() -> std::path::PathBuf {
    let (path, failures) = store::readable_db_path();
    if !failures.is_empty() {
        let mut lines = failure_lines(&failures);
        lines.push(format!("Reading {} instead.", path.display()));
        store::print_critical_warning("Comment database unreadable", &lines);
    }
    path
}

fn list_stored_reviews() -> Result<()> {
    let path = readable_db_path();
    let sessions = store::CommentStore::list_sessions(&path, 50)?;
    if sessions.is_empty() {
        eprintln!("No stored review sessions in {}", path.display());
        return Ok(());
    }
    for session in sessions {
        let label = session
            .title
            .as_deref()
            .or(session.commit_hash.as_deref())
            .or(session.git_branch.as_deref())
            .unwrap_or("(no title)");
        println!(
            "{:>5}  {}  {:>3} comment{}  {:<11}  {:<6}  {}  {}",
            session.id,
            session.updated_at,
            session.comment_count,
            if session.comment_count == 1 { " " } else { "s" },
            if session.submitted_at.is_some() {
                "submitted"
            } else {
                "unsubmitted"
            },
            if session.is_series {
                "series"
            } else {
                "single"
            },
            session.working_directory,
            label,
        );
    }
    Ok(())
}

fn recover_stored_review(selector: &str, format: &OutputFormat) -> Result<()> {
    let id = if selector == "latest" {
        None
    } else {
        Some(
            selector
                .parse::<i64>()
                .with_context(|| format!("Invalid session id: {selector}"))?,
        )
    };
    let path = readable_db_path();
    let Some((session, comments)) = store::CommentStore::load_session(&path, id)? else {
        eprintln!("No stored review comments found in {}", path.display());
        std::process::exit(1);
    };
    eprintln!(
        "Recovered session {} ({}, {})",
        session.id, session.updated_at, session.working_directory
    );
    // Printed in single-diff shape: commit_idx is preserved on each comment,
    // and the original diffs are no longer available to group by commit.
    println!(
        "{}",
        output::format_output(comments, format, &[], false, session.overall_comment)
    );
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let version_checker = VersionChecker::new("lrv", env!("CARGO_PKG_VERSION"));
    version_checker.check_async();

    let args = Args::parse();
    if args.version {
        println!("lrv {}", env!("CARGO_PKG_VERSION"));
        version_checker.print_warning_sync();
        return Ok(());
    }
    if args.config_dir {
        let dir = dirs::config_dir()
            .context("Could not determine config directory")?
            .join("lrv");
        println!("{}", dir.display());
        return Ok(());
    }
    if args.list_reviews {
        list_stored_reviews()?;
        return Ok(());
    }
    if let Some(selector) = &args.recover {
        recover_stored_review(selector, &args.format.parse()?)?;
        return Ok(());
    }
    if let Some(path) = args.validate_review_notes {
        match load_review_notes_file(&path) {
            Ok(notes) => {
                eprintln!(
                    "OK: {} note{}",
                    notes.len(),
                    if notes.len() == 1 { "" } else { "s" }
                );
                return Ok(());
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        }
    }

    // Derive dynamic behavior based on environment.
    // If we're over SSH and a Tailscale IP is present in env, auto-enable tailscale
    // bindings and avoid opening a local browser on this host.
    let mut enable_tailscale = args.tailscale;
    let mut disable_open = args.no_open;
    let mut detected_ts_ips: Option<Vec<String>> = None;
    if (!enable_tailscale || !disable_open) && is_ssh_session() {
        let ts = get_tailscale_ipv4s_from_env();
        if !ts.is_empty() {
            if !enable_tailscale {
                enable_tailscale = true;
            }
            if !disable_open {
                disable_open = true;
            }
            detected_ts_ips = Some(ts);
        }
    }

    // Parse output format
    let output_format: OutputFormat = args.format.parse().context("Invalid output format")?;

    // Load user config
    let user_config = config::load_config().unwrap_or_else(|e| {
        tracing::warn!("Failed to load config, using defaults: {}", e);
        config::UserConfig::default()
    });

    // Get project context and attach optional title
    let mut project_context = get_project_context();
    project_context.title = args.title.clone();
    // Precompute public flag from args
    let is_public_flag = args.public || args.bind.iter().any(|a| a == "0.0.0.0");
    project_context.is_public = is_public_flag;

    let working_dir = project_context.working_directory.clone();

    // Parse diffs: series mode or single commit
    let (diffs, pre_old, pre_new, is_series) = if let Some(ref revset) = args.series {
        if args.cmd.is_some() || args.file.is_some() {
            anyhow::bail!("--series cannot be combined with --cmd or --file");
        }
        let parsed = if repository::is_jj_repo(&working_dir) {
            let revset = revset.clone();
            let wd = working_dir.clone();
            let spinner = Spinner::start("Loading commits");
            let diffs = tokio::task::spawn_blocking(move || get_series_diffs_jj(&revset, &wd))
                .await
                .context("task join")??;
            spinner.finish(&format!("Loaded {} commits", diffs.len()));
            diffs
        } else {
            let commits = enumerate_series_commits(revset, &working_dir)?;
            if commits.is_empty() {
                anyhow::bail!("No commits found for series: {}", revset);
            }
            eprintln!("Loading {} commits...", commits.len());
            let mut handles = Vec::with_capacity(commits.len());
            for (i, id) in commits.iter().enumerate() {
                let id = id.clone();
                let wd = working_dir.clone();
                handles.push(tokio::task::spawn_blocking(move || -> anyhow::Result<_> {
                    let text = get_commit_diff_text(&id, &wd)?;
                    let d = diff::parse_diff(&text)?;
                    Ok((i, d))
                }));
            }
            let mut parsed_indexed = Vec::with_capacity(commits.len());
            for h in handles {
                parsed_indexed.push(h.await.context("task join")??);
            }
            parsed_indexed.sort_by_key(|(i, _)| *i);
            parsed_indexed.into_iter().map(|(_, d)| d).collect()
        };
        let spinner = Spinner::start("Precomputing file content");
        let (pre_old, pre_new) = server::precompute_series_content(&parsed, &working_dir).await;
        spinner.finish("Ready");
        (parsed, pre_old, pre_new, true)
    } else {
        // Get diff text from stdin, file, or command
        let diff_text = if let Some(file_path) = args.file {
            std::fs::read_to_string(&file_path)
                .context(format!("Failed to read file: {}", file_path))?
        } else if let Some(cmd) = args.cmd {
            let spinner = Spinner::start("Running command");
            let output = if cfg!(target_os = "windows") {
                Command::new("cmd").args(["/C", &cmd]).output()
            } else {
                Command::new("sh").args(["-c", &cmd]).output()
            }
            .context("Failed to execute command")?;
            spinner.finish("Done");

            if !output.status.success() {
                anyhow::bail!(
                    "Command failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }

            String::from_utf8(output.stdout).context("Command output is not valid UTF-8")?
        } else {
            let mut buffer = String::new();
            std::io::stdin()
                .read_to_string(&mut buffer)
                .context("Failed to read from stdin")?;
            buffer
        };

        if diff_text.trim().is_empty() {
            anyhow::bail!("No diff provided. Pipe diff to stdin, use --file, or --cmd");
        }

        let diff = diff::parse_diff(&diff_text)?;

        if diff.files.is_empty() {
            eprintln!("No changes found in diff");
            return Ok(());
        }

        (vec![diff], vec![], vec![], false)
    };

    let mut review_notes = Vec::new();
    for path in &args.review_notes_file {
        review_notes.extend(load_review_notes_file(path)?);
    }

    let phab_base_url = args
        .phab_base_url
        .clone()
        .or_else(|| std::env::var("PHABRICATOR_BASE_URL").ok())
        .unwrap_or_else(|| "https://phabricator.services.mozilla.com".to_string());
    // A bare `--phab-revision` is an empty string: detect the revision from the commits instead.
    let named_revisions: Vec<String> = args
        .phab_revisions
        .iter()
        .filter(|r| !r.is_empty())
        .cloned()
        .collect();
    review_notes.extend(
        load_phabricator_notes(
            &named_revisions,
            &phab_base_url,
            args.phab_include_done,
            &diffs,
        )
        .await?,
    );
    if named_revisions.len() < args.phab_revisions.len() {
        match auto_fetch_phab(&diffs, args.phab_include_done).await {
            Some(notes) => review_notes.extend(notes),
            None => eprintln!("warning: no commit has a Differential Revision trailer"),
        }
    }
    if let Some(path) = &args.phab_mcp_comments {
        let text = std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read Phabricator MCP comments file: {}", path))?;
        review_notes.extend(phab_mcp::parse_phab_mcp_output(&text)?);
    }
    if let Some(path) = &args.github_pr_comments {
        review_notes.extend(github::load_github_notes(path, &diffs)?);
    }
    // A bare `--github-pr` is an empty string: detect the PR from the commits instead.
    match args.github_pr.as_deref() {
        Some("") => match auto_fetch_github(&diffs).await {
            Some(notes) => review_notes.extend(notes),
            None => eprintln!("warning: no open GitHub PR found for the reviewed commit"),
        },
        Some(pr) => {
            let pr = github::parse_pr_ref(pr, &github::github_remotes())?;
            eprintln!(
                "Loading review comments from GitHub {}/{}#{}...",
                pr.owner, pr.repo, pr.number
            );
            review_notes.extend(github::fetch_pr_notes(&pr, &diffs).await?);
        }
        None => {}
    }
    // Explicitly requested comments win; fetching on top of them would duplicate notes.
    let explicit_comments = !args.phab_revisions.is_empty()
        || args.phab_mcp_comments.is_some()
        || args.github_pr_comments.is_some()
        || args.github_pr.is_some();
    if user_config.auto_fetch_comments && !explicit_comments {
        let notes = match auto_fetch_phab(&diffs, args.phab_include_done).await {
            Some(notes) => Some(notes),
            None => auto_fetch_github(&diffs).await,
        };
        review_notes.extend(notes.unwrap_or_default());
    }

    // Setup shutdown channel
    let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

    // Build per-commit old and new caches (pre-populated for series, empty for single diff)
    let n = diffs.len();
    let old_caches: Vec<tokio::sync::Mutex<std::collections::HashMap<String, String>>> = {
        let mut maps: Vec<_> = pre_old.into_iter().map(tokio::sync::Mutex::new).collect();
        maps.resize_with(n, || {
            tokio::sync::Mutex::new(std::collections::HashMap::new())
        });
        maps
    };
    let new_caches: Vec<tokio::sync::Mutex<std::collections::HashMap<String, String>>> = {
        let mut maps: Vec<_> = pre_new.into_iter().map(tokio::sync::Mutex::new).collect();
        maps.resize_with(n, || {
            tokio::sync::Mutex::new(std::collections::HashMap::new())
        });
        maps
    };

    let store_meta = store::SessionMeta {
        working_directory: project_context.working_directory.clone(),
        git_branch: project_context.git_branch.clone(),
        title: project_context.title.clone(),
        commit_hash: diffs.first().and_then(|d| d.commit_hash.clone()),
        jj_change_id: diffs.first().and_then(|d| d.jj_change_id.clone()),
        is_series,
    };
    let (opened, failures) = store::CommentStore::open_default(store_meta);
    let store = match opened {
        Some((store, path)) => {
            if !failures.is_empty() {
                let mut lines = failure_lines(&failures);
                lines.push(format!("Comments are saved to {} instead.", path.display()));
                lines.push(format!(
                    "Use LRV_COMMENT_DB={} to read them from elsewhere.",
                    path.display()
                ));
                store::print_critical_warning("Comment database fallback", &lines);
            }
            Some(Arc::new(store))
        }
        None => {
            let mut lines = failure_lines(&failures);
            lines.push("Comments will NOT be saved for recovery.".to_string());
            lines.push("If this process or its output is lost, the review is lost.".to_string());
            store::print_critical_warning("Comment database unavailable", &lines);
            project_context.comment_store_error = Some(lines.join("\n"));
            None
        }
    };

    // Create app state
    let state = AppState {
        diffs: Arc::new(diffs),
        comments: Arc::new(Mutex::new(Vec::new())),
        overall_comment: Arc::new(Mutex::new(None)),
        review_notes: Arc::new(Mutex::new(review_notes)),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(user_config)),
        context: Arc::new(project_context),
        old_caches: Arc::new(old_caches),
        new_caches: Arc::new(new_caches),
        is_series,
        store,
    };

    // Create router (we'll clone per listener)
    let _app_for_clone = create_router(state.clone(), args.dev_log);

    // Eagerly prefetch old-side contents for all commits in background
    for i in 0..state.diffs.len() {
        tokio::spawn(crate::server::prefetch_old_files(state.clone(), i));
    }

    // Determine bind addresses
    let mut bind_addrs: Vec<String> = Vec::new();
    if args.public {
        bind_addrs.push("0.0.0.0".to_string());
    } else if !args.bind.is_empty() {
        bind_addrs.extend(args.bind.clone());
    } else {
        bind_addrs.push("127.0.0.1".to_string());
    }

    if enable_tailscale {
        let ts = match detected_ts_ips {
            Some(v) => v,
            None => get_tailscale_ipv4s_from_env(),
        };
        if ts.is_empty() {
            eprintln!("warning: no Tailscale IP found in environment");
        }
        for ip in ts {
            if !bind_addrs.contains(&ip) {
                bind_addrs.push(ip);
            }
        }
    }

    if bind_addrs.iter().any(|a| a == "0.0.0.0") {
        eprintln!("Warning: running in public mode on 0.0.0.0 (no auth)");
    }

    // Bind listeners
    let requested_port = args.port.unwrap_or(0);
    let mut listeners: Vec<(String, tokio::net::TcpListener)> = Vec::new();
    let actual_port: u16;
    if requested_port == 0 {
        // Derive a stable port from the CWD so the same directory always gets
        // the same port. Fall back to an ephemeral port if the stable one is taken.
        let stable_port = {
            let cwd = env::current_dir().unwrap_or_default();
            let bytes = cwd.to_string_lossy();
            let mut h: u32 = 0x811c9dc5;
            for b in bytes.bytes() {
                h ^= b as u32;
                h = h.wrapping_mul(0x01000193);
            }
            32768u16 + (h % 8192) as u16
        };
        let first = &bind_addrs[0];
        let first_listener =
            match tokio::net::TcpListener::bind(format!("{}:{}", first, stable_port)).await {
                Ok(l) => l,
                Err(_) => tokio::net::TcpListener::bind(format!("{}:0", first))
                    .await
                    .context("Failed to bind to ephemeral port")?,
            };
        let addr = first_listener.local_addr()?;
        actual_port = addr.port();
        listeners.push((first.clone(), first_listener));
        for addr in bind_addrs.iter().skip(1) {
            match tokio::net::TcpListener::bind(format!("{}:{}", addr, actual_port)).await {
                Ok(l) => listeners.push((addr.clone(), l)),
                Err(e) => tracing::warn!("failed to bind {}:{}: {}", addr, actual_port, e),
            }
        }
    } else {
        actual_port = requested_port;
        for addr in &bind_addrs {
            match tokio::net::TcpListener::bind(format!("{}:{}", addr, actual_port)).await {
                Ok(l) => listeners.push((addr.clone(), l)),
                Err(e) => tracing::warn!("failed to bind {}:{}: {}", addr, actual_port, e),
            }
        }
        if listeners.is_empty() {
            anyhow::bail!("Failed to bind to any provided addresses");
        }
    }

    for (addr, _) in &listeners {
        if addr == "0.0.0.0" {
            for iface in get_network_interfaces() {
                eprintln!("http://{}:{}", iface, actual_port);
            }
        } else {
            eprintln!("http://{}:{}", addr, actual_port);
        }
    }

    // Prefer loopback when opening browser
    let url = format!("http://127.0.0.1:{}", actual_port);

    // Run servers with graceful shutdown
    let shutdown_notify = Arc::new(Notify::new());
    let mut handles = Vec::new();
    for (_, listener) in listeners.into_iter() {
        let app_clone = create_router(state.clone(), args.dev_log);
        let notify = shutdown_notify.clone();
        let handle = tokio::spawn(async move {
            axum::serve(listener, app_clone)
                .with_graceful_shutdown(async move { notify.notified().await })
                .await
        });
        handles.push(handle);
    }

    // Yield so server tasks begin accepting before browser opens
    tokio::task::yield_now().await;

    // Open browser after server is ready
    if !disable_open {
        let url_for_open = url.clone();
        tokio::spawn(async move {
            if let Err(e) = open::that(&url_for_open) {
                eprintln!("Failed to open browser: {}", e);
            }
        });
    }

    // Wait for either shutdown signal or server error
    tokio::select! {
        _ = shutdown_rx.recv() => {
            tracing::info!("Received shutdown signal");
            shutdown_notify.notify_waiters();
        }
        result = async {
            for h in handles {
                if let Err(e) = h.await { return Err(anyhow::anyhow!("Server task join error: {}", e)); }
            }
            Ok(())
        } => {
            result.context("Server error")?;
        }
    }

    // Output comments
    let comments = state.comments.lock().await;
    let overall_comment = state.overall_comment.lock().await.clone();
    let output = output::format_output(
        comments.clone(),
        &output_format,
        &state.diffs,
        is_series,
        overall_comment,
    );
    println!("{}", output);

    Ok(())
}
