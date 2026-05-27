use crate::types::{CommentLine, ReviewNote, Side};
use anyhow::Result;

/// Parse the markdown output of `mcp__moz__get_phabricator_revision` into
/// lrv review notes. Only inline comments with a file+line are included;
/// general comments become file="(commit)" notes.
pub fn parse_phab_mcp_output(text: &str) -> Result<Vec<ReviewNote>> {
    // Each comment block starts with a bold timestamp header.
    // Split on lines that begin with "**20" (year prefix is reliable enough).
    let mut notes = Vec::new();

    // Collect all lines; find header lines and slice blocks between them.
    let lines: Vec<&str> = text.lines().collect();
    let header_indices: Vec<usize> = lines
        .iter()
        .enumerate()
        .filter(|(_, l)| l.starts_with("**20") && l.contains(" - **"))
        .map(|(i, _)| i)
        .collect();

    for (n, &start) in header_indices.iter().enumerate() {
        let end = header_indices.get(n + 1).copied().unwrap_or(lines.len());

        let header = lines[start];
        let body_lines = lines[start + 1..end].iter().copied().collect::<Vec<_>>();
        let body = body_lines.join("\n").trim().to_string();

        if body.is_empty() {
            continue;
        }

        if let Some(note) = parse_header(header, body) {
            notes.push(note);
        }
    }

    Ok(notes)
}

/// Parse a single comment header line into a ReviewNote.
///
/// Formats:
///   **DATE** - **Inline Comment** by NAME (login) on `FILE` at Line N [RESOLVED]
///   **DATE** - **Inline Comment** by NAME (login) on `FILE` at Lines N-M [RESOLVED]
///   **DATE** - **General Comment** by NAME (login)
fn parse_header(header: &str, body: String) -> Option<ReviewNote> {
    // Extract date (between first pair of **)
    let date = header
        .strip_prefix("**")?
        .split("**")
        .next()
        .map(|s| s.to_string());

    // Extract author: "by NAME (login)" — take the login
    let author = if let Some(by_pos) = header.find(" by ") {
        let after_by = &header[by_pos + 4..];
        // login is in parentheses: "Name (login)"
        if let (Some(open), Some(close)) = (after_by.find('('), after_by.find(')')) {
            Some(after_by[open + 1..close].to_string())
        } else {
            // No parens — use the name up to the next keyword
            let name = after_by
                .split(" on `")
                .next()
                .unwrap_or(after_by)
                .trim()
                .to_string();
            Some(name)
        }
    } else {
        None
    };

    // Determine if inline or general
    let is_inline = header.contains("**Inline Comment**");
    let is_general = header.contains("**General Comment**");

    if is_inline {
        // Extract file: backtick-quoted after " on `"
        let file = header.split(" on `").nth(1)?.split('`').next()?.to_string();

        // Extract line(s): "at Line N" or "at Lines N-M"
        let line = if let Some(at_pos) = header.find(" at Line") {
            let after = header[at_pos..]
                .trim_start_matches(" at Lines")
                .trim_start_matches(" at Line")
                .trim();
            // Strip trailing " [RESOLVED]" or end
            let num_str = after
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_matches(|c: char| !c.is_ascii_digit() && c != '-');
            parse_line_spec(num_str)?
        } else {
            return None;
        };

        Some(ReviewNote {
            id: None,
            file,
            line,
            side: Side::New,
            body,
            author,
            date,
            source_url: None,
            commit_idx: None,
        })
    } else if is_general {
        Some(ReviewNote {
            id: None,
            file: "(commit)".to_string(),
            line: CommentLine::Single(1),
            side: Side::New,
            body,
            author,
            date,
            source_url: None,
            commit_idx: None,
        })
    } else {
        None
    }
}

fn parse_line_spec(s: &str) -> Option<CommentLine> {
    // Strip trailing non-digit chars (e.g. " [RESOLVED]" remnants)
    let s = s.trim();
    if let Some((a, b)) = s.split_once('-') {
        let start: usize = a.trim().parse().ok()?;
        let end: usize = b.trim().split_whitespace().next()?.parse().ok()?;
        if start > 0 && end >= start {
            return Some(CommentLine::Range((start, end)));
        }
    }
    let n: usize = s.split_whitespace().next()?.parse().ok()?;
    if n > 0 {
        Some(CommentLine::Single(n))
    } else {
        None
    }
}
