use crate::types::*;
use anyhow::Result;

pub fn parse_diff(diff_text: &str) -> Result<DiffResponse> {
    let mut files = Vec::new();
    let mut total_additions = 0;
    let mut total_deletions = 0;

    let mut commit_hash: Option<String> = None;
    let mut commit_author: Option<String> = None;
    let mut commit_date: Option<String> = None;
    let mut commit_message: Option<String> = None;

    // Parse commit metadata if present (from git show / jj show / jj diff output)
    let diff_start_idx = if let Some(first_line) = diff_text.lines().next() {
        let extracted_hash = first_line
            .strip_prefix("commit ")
            .or_else(|| first_line.strip_prefix("Commit ID: "));

        if let Some(hash) = extracted_hash {
            commit_hash = Some(hash.split_whitespace().next().unwrap_or(hash).to_string());

            let mut message_lines = Vec::new();
            let mut in_message = false;
            let mut diff_line_idx = 0;

            for (idx, line) in diff_text.lines().enumerate() {
                if line.starts_with("diff --git") {
                    diff_line_idx = idx;
                    break;
                }

                // git: "Author: name", jj: "Author   : name (date)"
                let is_author = line.starts_with("Author:") || line.starts_with("author ");
                let is_author_jj = !is_author
                    && line.starts_with("Author")
                    && line.contains(':')
                    && !line.starts_with("AuthorDate:");
                if is_author {
                    let author = line
                        .strip_prefix("Author:")
                        .or_else(|| line.strip_prefix("author "))
                        .unwrap_or("");
                    commit_author = Some(author.trim().to_string());
                } else if is_author_jj {
                    if let Some((_, val)) = line.split_once(':') {
                        commit_author = Some(val.trim().to_string());
                    }
                } else if let Some(date) = line
                    .strip_prefix("Date:")
                    .or_else(|| line.strip_prefix("AuthorDate:"))
                {
                    commit_date = Some(date.trim().to_string());
                } else if line.is_empty() {
                    if in_message {
                        message_lines.push("");
                    } else {
                        in_message = true;
                    }
                } else if in_message && line.starts_with("    ") {
                    message_lines.push(line.strip_prefix("    ").unwrap_or(line));
                }
            }

            // Strip trailing blank lines only
            while message_lines.last() == Some(&"") {
                message_lines.pop();
            }
            if !message_lines.is_empty() {
                commit_message = Some(message_lines.join("\n"));
            }

            diff_line_idx
        } else {
            0
        }
    } else {
        0
    };

    let mut current_file: Option<(String, Option<String>, FileStatus)> = None;
    let mut current_hunks: Vec<Hunk> = Vec::new();
    let mut current_lines: Vec<DiffLine> = Vec::new();
    let mut old_line = 0;
    let mut new_line = 0;
    let mut hunk_header = String::new();
    let mut hunk_old_start = 0;
    let mut hunk_new_start = 0;
    let mut old_path_temp: Option<String> = None;
    let mut is_rename = false;
    let mut rename_from: Option<String> = None;
    let mut current_old_blob: Option<String> = None;
    let mut current_new_blob: Option<String> = None;

    for line in diff_text.lines().skip(diff_start_idx) {
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
                // Include renames even without hunks (100% similarity)
                if !current_hunks.is_empty() || status == FileStatus::Renamed {
                    files.push(FileDiff {
                        path,
                        old_path,
                        status,
                        hunks: current_hunks,
                        old_blob: current_old_blob.take(),
                        new_blob: current_new_blob.take(),
                    });
                }
                current_hunks = Vec::new();
            }
            // Reset state for new file
            old_path_temp = None;
            is_rename = false;
            rename_from = None;
            current_old_blob = None;
            current_new_blob = None;
        } else if let Some(rest) = line.strip_prefix("index ") {
            // Example: index 2d81a82fc6..0dca82f7e2 100644
            let mut parts = rest.split_whitespace();
            if let Some(range) = parts.next() {
                if let Some((a, b)) = range.split_once("..") {
                    if !a.is_empty() {
                        current_old_blob = Some(a.to_string());
                    }
                    if !b.is_empty() {
                        current_new_blob = Some(b.to_string());
                    }
                }
            }
        } else if let Some(stripped) = line.strip_prefix("rename from ") {
            is_rename = true;
            rename_from = Some(stripped.to_string());
        } else if let Some(stripped) = line.strip_prefix("rename to ") {
            // For pure renames (100% similarity), there's no +++ line
            // So we need to create the file entry here
            let new_path = stripped.to_string();
            current_file = Some((new_path, rename_from.clone(), FileStatus::Renamed));
        } else if line.starts_with("new file mode") {
            // Mark as new file
            old_path_temp = Some("/dev/null".to_string());
        } else if line.starts_with("deleted file mode") {
            // Mark as deleted file
        } else if let Some(stripped) = line.strip_prefix("--- ") {
            // Old file path
            let old_path = stripped.trim_start_matches("a/").to_string();
            old_path_temp = Some(old_path);
        } else if let Some(stripped) = line.strip_prefix("+++ ") {
            // New file path
            let new_path = stripped.trim_start_matches("b/").to_string();

            // Determine status based on collected information
            let (final_path, final_old_path, status) = if is_rename {
                // Renamed file
                (new_path.clone(), rename_from.clone(), FileStatus::Renamed)
            } else if new_path == "/dev/null" {
                // Deleted file
                (
                    old_path_temp
                        .clone()
                        .unwrap_or_else(|| "unknown".to_string()),
                    None,
                    FileStatus::Deleted,
                )
            } else if old_path_temp.as_deref() == Some("/dev/null") {
                // New file
                (new_path.clone(), None, FileStatus::Added)
            } else {
                // Modified file
                (new_path.clone(), None, FileStatus::Modified)
            };

            current_file = Some((final_path, final_old_path, status));
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
        } else if line.starts_with('+') && !line.starts_with("+++ ") {
            total_additions += 1;
            current_lines.push(DiffLine {
                line_type: LineType::Add,
                content: line.strip_prefix('+').unwrap_or("").to_string(),
                old_line: None,
                new_line: Some(new_line),
            });
            new_line += 1;
        } else if line.starts_with('-') && !line.starts_with("--- ") {
            total_deletions += 1;
            current_lines.push(DiffLine {
                line_type: LineType::Delete,
                content: line.strip_prefix('-').unwrap_or("").to_string(),
                old_line: Some(old_line),
                new_line: None,
            });
            old_line += 1;
        } else if let Some(stripped) = line.strip_prefix(' ') {
            current_lines.push(DiffLine {
                line_type: LineType::Context,
                content: stripped.to_string(),
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
        // Include renames even without hunks (100% similarity)
        if !current_hunks.is_empty() || status == FileStatus::Renamed {
            files.push(FileDiff {
                path,
                old_path,
                status,
                hunks: current_hunks,
                old_blob: current_old_blob,
                new_blob: current_new_blob,
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
        commit_hash,
        commit_author,
        commit_date,
        commit_message,
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
