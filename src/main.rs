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
#[command(name = "localreview")]
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

    // Setup shutdown channel
    let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

    // Create app state
    let state = AppState {
        diff: Arc::new(diff),
        comments: Arc::new(Mutex::new(Vec::new())),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
    };

    // Create router
    let app = create_router(state.clone());

    // Bind to port
    let port = args.port.unwrap_or(0);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .context("Failed to bind to port")?;

    let addr = listener.local_addr()?;
    let port = addr.port();

    eprintln!("Server running on port {}", port);
    eprintln!("Available at:");

    // Display all network interfaces
    for iface in get_network_interfaces() {
        eprintln!("  http://{}:{}", iface, port);
    }

    let url = format!("http://127.0.0.1:{}", port);

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
// Test comment
