use crate::types::{CommentLine, DiffResponse, ReviewNote, Side};
use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::HashMap;

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

        let commit_idx = comment
            .commit_id
            .as_ref()
            .and_then(|h| commit_hash_to_idx.get(h).copied());

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
    Ok(notes)
}
