use crate::agent::{AgentEvent, Poll};
use crate::types::{Comment, CommitReview, DiffResponse, ReviewOutput, SeriesReviewOutput};
use anyhow::Result;
use std::fmt;

pub fn format_output(
    comments: Vec<Comment>,
    format: &OutputFormat,
    diffs: &[DiffResponse],
    is_series: bool,
    overall_comment: Option<String>,
) -> String {
    match format {
        OutputFormat::Json => format_json(&comments, diffs, is_series, overall_comment),
        OutputFormat::Text => format_text(&comments, diffs, is_series, overall_comment.as_deref()),
    }
}

fn format_json(
    comments: &[Comment],
    diffs: &[DiffResponse],
    is_series: bool,
    overall_comment: Option<String>,
) -> String {
    if is_series {
        format_json_series(comments, diffs, overall_comment)
    } else {
        format_json_single(comments, overall_comment)
    }
}

fn format_json_single(comments: &[Comment], overall_comment: Option<String>) -> String {
    let n = comments.len();
    let f = count_unique_files(comments);
    let summary = format!(
        "{} comment{} on {} file{}",
        n,
        if n == 1 { "" } else { "s" },
        f,
        if f == 1 { "" } else { "s" },
    );
    let output = ReviewOutput {
        published: None,
        status: "completed".to_string(),
        comments: comments.to_vec(),
        summary,
        overall_comment,
    };
    serde_json::to_string_pretty(&output).unwrap_or_else(|_| "{}".to_string())
}

fn format_json_series(
    comments: &[Comment],
    diffs: &[DiffResponse],
    overall_comment: Option<String>,
) -> String {
    let mut by_commit: std::collections::BTreeMap<usize, Vec<Comment>> =
        std::collections::BTreeMap::new();
    for comment in comments {
        let mut c = comment.clone();
        c.commit_idx = None; // redundant in nested form
        by_commit
            .entry(comment.commit_idx.unwrap_or(0))
            .or_default()
            .push(c);
    }

    let commits: Vec<CommitReview> = diffs
        .iter()
        .enumerate()
        .map(|(idx, diff)| CommitReview {
            idx,
            commit_hash: diff.commit_hash.clone(),
            commit_message: diff.commit_message.clone(),
            comments: by_commit.remove(&idx).unwrap_or_default(),
        })
        .collect();

    let total = comments.len();
    let with_comments = commits.iter().filter(|c| !c.comments.is_empty()).count();
    let summary = format!(
        "{} comment{} across {} commit{}",
        total,
        if total == 1 { "" } else { "s" },
        with_comments,
        if with_comments == 1 { "" } else { "s" },
    );

    let output = SeriesReviewOutput {
        published: None,
        status: "completed".to_string(),
        summary,
        commits,
        overall_comment,
    };
    serde_json::to_string_pretty(&output).unwrap_or_else(|_| "{}".to_string())
}

fn format_text(
    comments: &[Comment],
    diffs: &[DiffResponse],
    is_series: bool,
    overall_comment: Option<&str>,
) -> String {
    let mut output = String::new();
    output.push_str(&format!(
        "Review completed with {} comments:\n\n",
        comments.len()
    ));

    if let Some(overall) = overall_comment.filter(|s| !s.trim().is_empty()) {
        output.push_str(&format!("=== Overall Feedback ===\n\n{}\n\n", overall));
    }

    if is_series && !diffs.is_empty() {
        let mut by_commit: std::collections::BTreeMap<usize, Vec<&Comment>> =
            std::collections::BTreeMap::new();
        for comment in comments {
            by_commit
                .entry(comment.commit_idx.unwrap_or(0))
                .or_default()
                .push(comment);
        }
        for (idx, diff) in diffs.iter().enumerate() {
            let group = by_commit.get(&idx);
            if group.map(|g| g.is_empty()).unwrap_or(true) {
                continue;
            }
            let msg = diff
                .commit_message
                .as_deref()
                .and_then(|m| m.lines().next())
                .unwrap_or("(no message)");
            output.push_str(&format!("=== Commit {} — {} ===\n\n", idx + 1, msg));
            for comment in group.unwrap() {
                format_text_comment(&mut output, comment);
            }
        }
    } else {
        for comment in comments {
            format_text_comment(&mut output, comment);
        }
    }

    output
}

fn format_text_comment(output: &mut String, comment: &Comment) {
    let line_display = comment.line.to_string();
    output.push_str(&format!(
        "{}:{} [{}]\n",
        comment.file, line_display, comment.side
    ));
    if let Some(note) = &comment.in_reply_to {
        let author = note
            .author
            .as_deref()
            .map(|a| format!(" from {a}"))
            .unwrap_or_default();
        if comment.body.trim().is_empty() {
            output.push_str(&format!("  Address this review comment{author}:\n"));
        } else {
            output.push_str(&format!("  {}\n", comment.body));
            output.push_str(&format!("  In reply to review comment{author}:\n"));
        }
        for line in note.body.lines() {
            output.push_str(&format!("  > {line}\n"));
        }
        if let Some(url) = &note.source_url {
            output.push_str(&format!("  Source: {url}\n"));
        }
        output.push('\n');
        return;
    }
    output.push_str(&format!("  {}\n\n", comment.body));
}

fn count_unique_files(comments: &[Comment]) -> usize {
    let mut files = std::collections::HashSet::new();
    for comment in comments {
        files.insert(&comment.file);
    }
    files.len()
}

impl fmt::Display for crate::types::Side {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            crate::types::Side::New => write!(f, "new"),
            crate::types::Side::Old => write!(f, "old"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum OutputFormat {
    Json,
    Text,
}

impl std::str::FromStr for OutputFormat {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "json" => Ok(OutputFormat::Json),
            "text" => Ok(OutputFormat::Text),
            _ => anyhow::bail!("Invalid output format: {}", s),
        }
    }
}

/// Tell the agent which revisions the review was already published to.
pub fn with_published(output: String, format: &OutputFormat, urls: Vec<String>) -> String {
    if urls.is_empty() {
        return output;
    }
    match format {
        OutputFormat::Json => {
            let mut value: serde_json::Value = serde_json::from_str(&output).expect("review JSON");
            value["published"] = serde_json::json!(urls);
            serde_json::to_string_pretty(&value).expect("review JSON")
        }
        OutputFormat::Text => format!(
            "{output}\nReview published to Phabricator:\n  {}",
            urls.join("\n  ")
        ),
    }
}

impl fmt::Display for crate::types::CommentLine {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Single(line) => write!(f, "{line}"),
            Self::Range((start, end)) => write!(f, "{start}-{end}"),
        }
    }
}

pub fn format_listen(poll: &Poll, format: &OutputFormat) -> String {
    let status = if !poll.events.is_empty() {
        "events"
    } else if poll.ended {
        "ended"
    } else {
        "timeout"
    };
    match format {
        OutputFormat::Json => {
            let value = if status == "events" {
                serde_json::json!({ "status": status, "events": poll.events })
            } else {
                serde_json::json!({ "status": status })
            };
            value.to_string()
        }
        OutputFormat::Text => match status {
            "ended" => "The review has ended.".to_string(),
            "timeout" => "No discussion yet; run lrv --listen again.".to_string(),
            _ => {
                let mut output = String::new();
                for event in &poll.events {
                    let AgentEvent::Discussion { discussion } = &event.event;
                    let commit = discussion
                        .commit_idx
                        .map(|idx| format!(" [commit {idx}]"))
                        .unwrap_or_default();
                    let heading = match &discussion.thread_id {
                        Some(thread) => format!("Follow-up {} in thread {thread}", discussion.id),
                        None => format!("Discussion {}", discussion.id),
                    };
                    output.push_str(&format!(
                        "{heading} on {}:{} ({}){commit}\n",
                        discussion.file, discussion.line, discussion.side
                    ));
                    for line in discussion.body.lines() {
                        output.push_str(&format!("    {line}\n"));
                    }
                    output.push('\n');
                }
                output.trim_end().to_string()
            }
        },
    }
}
