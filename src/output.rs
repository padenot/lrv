use crate::types::{Comment, ReviewOutput};
use anyhow::Result;
use std::fmt;

pub fn format_output(comments: Vec<Comment>, format: &OutputFormat) -> String {
    match format {
        OutputFormat::Json => format_json(&comments),
        OutputFormat::Text => format_text(&comments),
    }
}

fn format_json(comments: &[Comment]) -> String {
    let summary = format!(
        "{} comment{} on {} file{}",
        comments.len(),
        if comments.len() == 1 { "" } else { "s" },
        count_unique_files(comments),
        if count_unique_files(comments) == 1 {
            ""
        } else {
            "s"
        }
    );

    let output = ReviewOutput {
        status: "completed".to_string(),
        comments: comments.to_vec(),
        summary,
    };

    serde_json::to_string_pretty(&output).unwrap_or_else(|_| "{}".to_string())
}

fn format_text(comments: &[Comment]) -> String {
    let mut output = String::new();
    output.push_str(&format!(
        "Review completed with {} comments:\n\n",
        comments.len()
    ));

    // Group by commit_idx if present
    let has_commits = comments.iter().any(|c| c.commit_idx.is_some());
    if has_commits {
        let mut by_commit: std::collections::BTreeMap<usize, Vec<&Comment>> =
            std::collections::BTreeMap::new();
        for comment in comments {
            by_commit
                .entry(comment.commit_idx.unwrap_or(0))
                .or_default()
                .push(comment);
        }
        for (idx, group) in &by_commit {
            output.push_str(&format!("=== Commit {} ===\n\n", idx + 1));
            for comment in group {
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
