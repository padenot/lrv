use crate::types::{Comment, CommitReview, DiffResponse, ReviewOutput, SeriesReviewOutput};
use anyhow::Result;
use std::fmt;

pub fn format_output(
    comments: Vec<Comment>,
    format: &OutputFormat,
    diffs: &[DiffResponse],
    is_series: bool,
) -> String {
    match format {
        OutputFormat::Json => format_json(&comments, diffs, is_series),
        OutputFormat::Text => format_text(&comments, diffs, is_series),
    }
}

fn format_json(comments: &[Comment], diffs: &[DiffResponse], is_series: bool) -> String {
    if is_series {
        format_json_series(comments, diffs)
    } else {
        format_json_single(comments)
    }
}

fn format_json_single(comments: &[Comment]) -> String {
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
        status: "completed".to_string(),
        comments: comments.to_vec(),
        summary,
    };
    serde_json::to_string_pretty(&output).unwrap_or_else(|_| "{}".to_string())
}

fn format_json_series(comments: &[Comment], diffs: &[DiffResponse]) -> String {
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
        status: "completed".to_string(),
        summary,
        commits,
    };
    serde_json::to_string_pretty(&output).unwrap_or_else(|_| "{}".to_string())
}

fn format_text(comments: &[Comment], diffs: &[DiffResponse], is_series: bool) -> String {
    let mut output = String::new();
    output.push_str(&format!(
        "Review completed with {} comments:\n\n",
        comments.len()
    ));

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
    let line_display = match &comment.line {
        crate::types::CommentLine::Single(line) => line.to_string(),
        crate::types::CommentLine::Range((start, end)) => format!("{}-{}", start, end),
    };
    output.push_str(&format!(
        "{}:{} [{}]\n",
        comment.file, line_display, comment.side
    ));
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
