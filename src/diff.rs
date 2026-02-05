use anyhow::Result;
use crate::types::*;

pub fn parse_diff(diff_text: &str) -> Result<DiffResponse> {
    let mut files = Vec::new();
    let mut total_additions = 0;
    let mut total_deletions = 0;

    let mut current_file: Option<(String, Option<String>, FileStatus)> = None;
    let mut current_hunks: Vec<Hunk> = Vec::new();
    let mut current_lines: Vec<DiffLine> = Vec::new();
    let mut old_line = 0;
    let mut new_line = 0;
    let mut hunk_header = String::new();
    let mut hunk_old_start = 0;
    let mut hunk_new_start = 0;

    for line in diff_text.lines() {
        if line.starts_with("diff --git") {
            // Save previous file
            if let Some((path, old_path, status)) = current_file.take() {
                if !current_lines.is_empty() {
                    current_hunks.push(Hunk {
                        header: hunk_header.clone(),
                        old_start: hunk_old_start,
                        new_start: hunk_new_start,
                        lines: current_lines,
                    });
                    current_lines = Vec::new();
                }
                files.push(FileDiff {
                    path,
                    old_path,
                    status,
                    hunks: current_hunks,
                });
                current_hunks = Vec::new();
            }
        } else if line.starts_with("--- ") {
            // Old file path
        } else if line.starts_with("+++ ") {
            // New file path
            let new_path = line[4..].trim_start_matches("b/").to_string();

            // Try to determine status based on context
            let status = if new_path == "/dev/null" {
                FileStatus::Deleted
            } else {
                FileStatus::Modified  // Default to modified
            };

            current_file = Some((new_path, None, status));
        } else if line.starts_with("@@") {
            // Save previous hunk
            if !current_lines.is_empty() {
                current_hunks.push(Hunk {
                    header: hunk_header,
                    old_start: hunk_old_start,
                    new_start: hunk_new_start,
                    lines: current_lines,
                });
                current_lines = Vec::new();
            }

            // Parse hunk header: @@ -old_start,old_count +new_start,new_count @@
            hunk_header = line.to_string();
            if let Some(captures) = parse_hunk_header(line) {
                old_line = captures.0;
                new_line = captures.1;
                hunk_old_start = captures.0;
                hunk_new_start = captures.1;
            }
        } else if line.starts_with("+") && !line.starts_with("+++") {
            total_additions += 1;
            current_lines.push(DiffLine {
                line_type: LineType::Add,
                content: line[1..].to_string(),
                old_line: None,
                new_line: Some(new_line),
            });
            new_line += 1;
        } else if line.starts_with("-") && !line.starts_with("---") {
            total_deletions += 1;
            current_lines.push(DiffLine {
                line_type: LineType::Delete,
                content: line[1..].to_string(),
                old_line: Some(old_line),
                new_line: None,
            });
            old_line += 1;
        } else if line.starts_with(" ") {
            current_lines.push(DiffLine {
                line_type: LineType::Context,
                content: line[1..].to_string(),
                old_line: Some(old_line),
                new_line: Some(new_line),
            });
            old_line += 1;
            new_line += 1;
        }
    }

    // Save last file
    if let Some((path, old_path, status)) = current_file {
        if !current_lines.is_empty() {
            current_hunks.push(Hunk {
                header: hunk_header,
                old_start: hunk_old_start,
                new_start: hunk_new_start,
                lines: current_lines,
            });
        }
        if !current_hunks.is_empty() {
            files.push(FileDiff {
                path,
                old_path,
                status,
                hunks: current_hunks,
            });
        }
    }

    let file_count = files.len();
    Ok(DiffResponse {
        files,
        stats: DiffStats {
            additions: total_additions,
            deletions: total_deletions,
            files_changed: file_count,
        },
    })
}

fn parse_hunk_header(line: &str) -> Option<(usize, usize)> {
    // Parse: @@ -old_start,old_count +new_start,new_count @@
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 3 {
        return None;
    }

    let old_part = parts[1].trim_start_matches('-');
    let new_part = parts[2].trim_start_matches('+');

    let old_start = old_part.split(',').next()?.parse().ok()?;
    let new_start = new_part.split(',').next()?.parse().ok()?;

    Some((old_start, new_start))
}
