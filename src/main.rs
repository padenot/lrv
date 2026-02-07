mod config;
mod diff;
mod output;
mod server;
mod types;

use anyhow::{Context, Result};
use clap::Parser;
use std::io::Read;
use std::process::Command;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tracing_subscriber;

use crate::output::OutputFormat;
use crate::server::{create_router, AppState};
use crate::types::ProjectContext;

fn get_project_context() -> ProjectContext {
    // Get git repository root as working directory
    let working_directory = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
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
        .or_else(|| {
            // Fallback to current directory if not in a git repo
            std::env::current_dir()
                .ok()
                .and_then(|p| p.to_str().map(String::from))
        })
        .unwrap_or_else(|| String::from("unknown"));

    // Try to get git branch
    let git_branch = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
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
        });

    ProjectContext {
        working_directory,
        git_branch,
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
                    if line.starts_with('\t') || line.starts_with(' ') {
                        if line.contains("inet ") && !line.contains("inet6") {
                            if let Some(ip) = line.split_whitespace().nth(1) {
                                if ip != "127.0.0.1" {
                                    current_ip = Some(ip.to_string());
                                }
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

#[derive(Parser, Debug)]
#[command(name = "lrv")]
#[command(about = "Local code review tool for LLM agents", long_about = None)]
struct Args {
    /// Command to run to get diff (e.g., "git diff", "jj diff")
    #[arg(long)]
    cmd: Option<String>,

    /// Read diff from file instead of stdin
    #[arg(long)]
    file: Option<String>,

    /// Port to bind server to (default: random available port)
    #[arg(long)]
    port: Option<u16>,

    /// Bind address (default: 127.0.0.1; use --public for 0.0.0.0)
    #[arg(long)]
    bind: Option<String>,

    /// Shorthand to bind on all interfaces (equivalent to --bind 0.0.0.0)
    #[arg(long)]
    public: bool,

    /// Don't auto-open browser
    #[arg(long)]
    no_open: bool,

    /// Output format: json or text
    #[arg(long, default_value = "json")]
    format: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    // Get diff text from stdin, file, or command
    let diff_text = if let Some(file_path) = args.file {
        std::fs::read_to_string(&file_path)
            .context(format!("Failed to read file: {}", file_path))?
    } else if let Some(cmd) = args.cmd {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", &cmd])
                .output()
        } else {
            Command::new("sh")
                .args(["-c", &cmd])
                .output()
        }
        .context("Failed to execute command")?;

        if !output.status.success() {
            anyhow::bail!("Command failed: {}", String::from_utf8_lossy(&output.stderr));
        }

        String::from_utf8(output.stdout)
            .context("Command output is not valid UTF-8")?
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

    // Parse diff
    let diff = diff::parse_diff(&diff_text)?;

    if diff.files.is_empty() {
        eprintln!("No changes found in diff");
        return Ok(());
    }

    // Parse output format
    let output_format: OutputFormat = args.format.parse()
        .context("Invalid output format")?;

    // Load user config
    let user_config = config::load_config()
        .unwrap_or_else(|e| {
            eprintln!("Warning: Failed to load config, using defaults: {}", e);
            config::UserConfig::default()
        });

    // Get project context
    let project_context = get_project_context();

    // Setup shutdown channel
    let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

    // Create app state
    let state = AppState {
        diff: Arc::new(diff),
        comments: Arc::new(Mutex::new(Vec::new())),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(user_config)),
        context: Arc::new(project_context),
    };

    // Create router
    let app = create_router(state.clone());

    // Determine bind address and port
    let port = args.port.unwrap_or(0);
    let bind_addr = if args.public {
        "0.0.0.0".to_string()
    } else {
        args.bind.unwrap_or_else(|| "127.0.0.1".to_string())
    };

    // Bind to address
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", bind_addr, port))
        .await
        .context("Failed to bind to port")?;

    let addr = listener.local_addr()?;
    let port = addr.port();

    if bind_addr == "0.0.0.0" {
        eprintln!("Warning: running in public mode on 0.0.0.0 (no auth)");
    }
    eprintln!("Server running on {}:{}", bind_addr, port);
    eprintln!("Available at:");

    // Show URLs depending on bind mode
    if bind_addr == "0.0.0.0" {
        for iface in get_network_interfaces() {
            eprintln!("  http://{}:{}", iface, port);
        }
    } else {
        eprintln!("  http://{}:{}", bind_addr, port);
    }

    // Determine URL to open in browser
    let url = if bind_addr == "0.0.0.0" {
        // Prefer loopback when publicly bound
        format!("http://127.0.0.1:{}", port)
    } else {
        format!("http://{}:{}", bind_addr, port)
    };

    // Open browser
    if !args.no_open {
        if let Err(e) = open::that(&url) {
            eprintln!("Failed to open browser: {}", e);
        }
    }

    // Run server with shutdown signal
    let server = axum::serve(listener, app);

    tokio::select! {
        result = server => {
            result.context("Server error")?;
        }
        _ = shutdown_rx.recv() => {
            eprintln!("Received shutdown signal");
        }
    }

    // Output comments
    let comments = state.comments.lock().await;
    let output = output::format_output(comments.clone(), &output_format);
    println!("{}", output);

    Ok(())
}
