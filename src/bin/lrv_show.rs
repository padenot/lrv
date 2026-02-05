use anyhow::Result;
use lrv::types::{FileStatus, LineType};
use std::io::Read;

fn main() -> Result<()> {
    let mut buf = String::new();
    std::io::stdin().read_to_string(&mut buf)?;

    let diff = lrv::diff::parse_diff(&buf)?;

    if let Some(hash) = &diff.commit_hash {
        println!("commit {}", hash);
    }
    if let Some(author) = &diff.commit_author {
        println!("Author: {}", author);
    }
    if let Some(date) = &diff.commit_date {
        println!("Date:   {}", date);
    }
    if let Some(msg) = &diff.commit_message {
        println!();
        for line in msg.lines() {
            println!("    {}", line);
        }
    }
    if diff.commit_hash.is_some() {
        println!();
    }

    println!(
        "{} file(s) changed, +{} -{}",
        diff.stats.files_changed, diff.stats.additions, diff.stats.deletions
    );
    println!();

    for file in &diff.files {
        let status = match file.status {
            FileStatus::Added => "added",
            FileStatus::Deleted => "deleted",
            FileStatus::Modified => "modified",
            FileStatus::Renamed => "renamed",
        };
        let label = match &file.old_path {
            Some(old) => format!("{} -> {} [{}]", old, file.path, status),
            None => format!("{} [{}]", file.path, status),
        };
        let bar = "─".repeat(label.len().min(70));
        println!("┌─{}─┐", bar);
        println!("│ {} │", label);
        println!("└─{}─┘", bar);

        for hunk in &file.hunks {
            println!("  {}", hunk.header);
            for line in &hunk.lines {
                let (prefix, old_num, new_num) = match line.line_type {
                    LineType::Add => (
                        "+",
                        "     ".to_string(),
                        format!("{:4} ", line.new_line.unwrap_or(0)),
                    ),
                    LineType::Delete => (
                        "-",
                        format!("{:4} ", line.old_line.unwrap_or(0)),
                        "     ".to_string(),
                    ),
                    LineType::Context => (
                        " ",
                        format!("{:4} ", line.old_line.unwrap_or(0)),
                        format!("{:4} ", line.new_line.unwrap_or(0)),
                    ),
                };
                println!("  {} {}│{}│ {}", prefix, old_num, new_num, line.content);
            }
        }
        println!();
    }

    Ok(())
}
