use anyhow::{Context, Result};
use clap::Parser;
use serde_json::json;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::process::Command;

#[derive(Parser, Debug)]
struct Args {
    /// Optionally override cwd used for git context
    #[arg(long)]
    cwd: Option<PathBuf>,

    /// Additionally simulate /api/file for this path (relative to repo root)
    #[arg(long)]
    file: Option<String>,
}

fn get_project_context(cwd: Option<&PathBuf>) -> lrv::types::ProjectContext {
    let mut cmd = Command::new("git");
    if let Some(d) = cwd {
        cmd.current_dir(d);
    }
    let working_directory = cmd
        .args(["rev-parse", "--show-toplevel"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout).ok()
            } else {
                None
            }
        })
        .map(|s| s.trim().to_string())
        .or_else(|| {
            if let Some(d) = cwd {
                d.to_str().map(|s| s.to_string())
            } else {
                std::env::current_dir()
                    .ok()
                    .and_then(|p| p.to_str().map(String::from))
            }
        })
        .unwrap_or_else(|| "unknown".to_string());

    let mut cmd = Command::new("git");
    if let Some(d) = cwd {
        cmd.current_dir(d);
    }
    let git_branch = cmd
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout).ok()
            } else {
                None
            }
        })
        .map(|s| s.trim().to_string());

    lrv::types::ProjectContext {
        working_directory,
        git_branch,
        title: None,
        is_public: false,
    }
}

fn read_stdin() -> Result<String> {
    let mut buf = String::new();
    std::io::stdin().read_to_string(&mut buf)?;
    Ok(buf)
}

fn get_file_new(cwd: Option<&PathBuf>, rel: &str) -> Result<String> {
    let root = if let Some(d) = cwd {
        d.clone()
    } else {
        std::env::current_dir()?
    };
    let path = root.join(rel);
    Ok(fs::read_to_string(path).with_context(|| format!("read new file {}", rel))?)
}

fn get_file_old(cwd: Option<&PathBuf>, rel: &str) -> Result<String> {
    let mut cmd = Command::new("git");
    if let Some(d) = cwd {
        cmd.current_dir(d);
    }
    let out = cmd.args(["show", &format!("HEAD:{}", rel)]).output()?;
    if out.status.success() {
        Ok(String::from_utf8(out.stdout).unwrap_or_default())
    } else {
        Ok(String::new())
    }
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Parse diff (simulate GET /api/diff)
    let diff_text = read_stdin()?;
    let diff = lrv::diff::parse_diff(&diff_text)?;

    // Build project context (simulate GET /api/context)
    let ctx = get_project_context(args.cwd.as_ref());

    println!("--- GET /api/context");
    println!("{}", serde_json::to_string_pretty(&ctx)?);

    println!("--- GET /api/diff");
    println!("{}", serde_json::to_string_pretty(&diff)?);

    if let Some(path) = args.file.as_ref() {
        let new_content = get_file_new(args.cwd.as_ref(), path).unwrap_or_default();
        let old_content = get_file_old(args.cwd.as_ref(), path).unwrap_or_default();
        println!("--- GET /api/file?path={}&side=new", path);
        println!("{}", json!({"content": new_content}));
        println!("--- GET /api/file?path={}&side=old", path);
        println!("{}", json!({"content": old_content}));
    }

    Ok(())
}
