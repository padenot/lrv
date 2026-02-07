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
use tokio::sync::{mpsc, Mutex, Notify};
use lrv::netutil;
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

// Parse a whitespace-separated list of IPs and return Tailscale IPv4s (100.64.0.0/10)
fn get_tailscale_ipv4s() -> Vec<String> {
    // Prefer `tailscale ip -4` if available
    if let Ok(output) = Command::new("tailscale").args(["ip", "-4"]).output() {
        if output.status.success() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                let ips: Vec<String> = text
                    .lines()
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect();
                if !ips.is_empty() {
                    return ips;
                }
            }
        }
    }

    // Fallback: parse hostname -I and filter 100.64/10
    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("hostname").args(["-I"]).output() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                let ips = netutil::filter_tailscale_ipv4s(&text);
                if !ips.is_empty() {
                    return ips;
                }
            }
        }
    }
    Vec::new()
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

    /// Bind address(es). Can be passed multiple times. Default: 127.0.0.1
    #[arg(long)]
    bind: Vec<String>,

    /// Shorthand to bind on all interfaces (equivalent to --bind 0.0.0.0)
    #[arg(long)]
    public: bool,

    /// Also bind to the local Tailscale IPv4 address, if detected
    #[arg(long)]
    tailscale: bool,

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

    // Create router (we'll clone per listener)
    let _app_for_clone = create_router(state.clone());

    // Determine bind addresses
    let mut bind_addrs: Vec<String> = Vec::new();
    if args.public {
        bind_addrs.push("0.0.0.0".to_string());
    } else if !args.bind.is_empty() {
        bind_addrs.extend(args.bind.clone());
    } else {
        bind_addrs.push("127.0.0.1".to_string());
    }

    if args.tailscale {
        let ts = get_tailscale_ipv4s();
        if ts.is_empty() {
            eprintln!("Note: Tailscale IP not detected; is tailscale running?");
        }
        for ip in ts {
            if !bind_addrs.contains(&ip) {
                bind_addrs.push(ip);
            }
        }
    }

    if bind_addrs.iter().any(|a| a == "0.0.0.0") {
        eprintln!("Warning: running in public mode on 0.0.0.0 (no auth)");
    }

    // Bind listeners
    let requested_port = args.port.unwrap_or(0);
    let mut listeners: Vec<(String, tokio::net::TcpListener)> = Vec::new();
    let actual_port: u16;
    if requested_port == 0 {
        // Bind the first address to an ephemeral port to pick a port
        let first = &bind_addrs[0];
        let first_listener = tokio::net::TcpListener::bind(format!("{}:{}", first, 0))
            .await
            .context("Failed to bind to ephemeral port")?;
        let addr = first_listener.local_addr()?;
        actual_port = addr.port();
        listeners.push((first.clone(), first_listener));
        for addr in bind_addrs.iter().skip(1) {
            match tokio::net::TcpListener::bind(format!("{}:{}", addr, actual_port)).await {
                Ok(l) => listeners.push((addr.clone(), l)),
                Err(e) => eprintln!("Warning: failed to bind {}:{}: {}", addr, actual_port, e),
            }
        }
    } else {
        actual_port = requested_port;
        for addr in &bind_addrs {
            match tokio::net::TcpListener::bind(format!("{}:{}", addr, actual_port)).await {
                Ok(l) => listeners.push((addr.clone(), l)),
                Err(e) => eprintln!("Warning: failed to bind {}:{}: {}", addr, actual_port, e),
            }
        }
        if listeners.is_empty() {
            anyhow::bail!("Failed to bind to any provided addresses");
        }
    }

    eprintln!("Server running on port {}", actual_port);
    eprintln!("Available at:");
    for (addr, _) in &listeners {
        if addr == "0.0.0.0" {
            for iface in get_network_interfaces() {
                eprintln!("  http://{}:{}", iface, actual_port);
            }
        } else {
            eprintln!("  http://{}:{}", addr, actual_port);
        }
    }

    // Prefer loopback when opening browser
    let url = format!("http://127.0.0.1:{}", actual_port);

    // Open browser
    if !args.no_open {
        if let Err(e) = open::that(&url) {
            eprintln!("Failed to open browser: {}", e);
        }
    }

    // Run servers with graceful shutdown
    let shutdown_notify = Arc::new(Notify::new());
    let mut handles = Vec::new();
    for (_, listener) in listeners.into_iter() {
        let app_clone = create_router(state.clone());
        let notify = shutdown_notify.clone();
        let handle = tokio::spawn(async move {
            axum::serve(listener, app_clone)
                .with_graceful_shutdown(async move { notify.notified().await })
                .await
        });
        handles.push(handle);
    }

    // Wait for either shutdown signal or server error
    tokio::select! {
        _ = shutdown_rx.recv() => {
            eprintln!("Received shutdown signal");
            shutdown_notify.notify_waiters();
        }
        result = async {
            for h in handles {
                if let Err(e) = h.await { return Err(anyhow::anyhow!("Server task join error: {}", e)); }
            }
            Ok(())
        } => {
            result.context("Server error")?;
        }
    }

    // Output comments
    let comments = state.comments.lock().await;
    let output = output::format_output(comments.clone(), &output_format);
    println!("{}", output);

    Ok(())
}
