mod config;
mod diff;
mod output;
mod server;
mod themes;
mod types;

use anyhow::{Context, Result};
use clap::{ArgAction, Parser};
use lrv::netutil;
use moz_cli_version_check::VersionChecker;
use std::env;
use std::io::{Read, Write};
use std::process::Command;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, Notify};

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

    let claude_skill_installed = dirs::home_dir()
        .map(|h| h.join(".claude").join("skills").join("lrv").join("SKILL.md"))
        .map(|p| p.exists())
        .unwrap_or(false);

    ProjectContext {
        working_directory,
        git_branch,
        title: None,
        is_public: false,
        claude_skill_installed,
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

fn push_unique_ip(list: &mut Vec<String>, ip: String) {
    if !list.iter().any(|x| x == &ip) {
        list.push(ip);
    }
}

fn parse_ips_from_env_value(value: &str) -> Vec<String> {
    let normalized = value.replace(',', " ");
    netutil::filter_tailscale_ipv4s(&normalized)
}

// Environment-only detection for Tailscale addresses.
fn get_tailscale_ipv4s_from_env() -> Vec<String> {
    let mut out = Vec::new();

    for key in [
        "LRV_TAILSCALE_IPS",
        "TAILSCALE_IPS",
        "LRV_TAILSCALE_IP",
        "TAILSCALE_IP",
    ] {
        if let Ok(v) = env::var(key) {
            for ip in parse_ips_from_env_value(&v) {
                push_unique_ip(&mut out, ip);
            }
        }
    }

    if let Ok(ssh_conn) = env::var("SSH_CONNECTION") {
        if let Some(ip) = netutil::tailscale_server_ip_from_ssh_connection(&ssh_conn) {
            push_unique_ip(&mut out, ip);
        }
    }

    out
}

fn is_ssh_session() -> bool {
    // Detect common SSH environment variables
    env::var_os("SSH_CONNECTION").is_some()
        || env::var_os("SSH_TTY").is_some()
        || env::var_os("SSH_CLIENT").is_some()
}

#[derive(Parser, Debug)]
#[command(name = "lrv")]
#[command(about = "Local code review tool for LLM agents", long_about = None)]
#[command(disable_version_flag = true)]
struct Args {
    /// Print version information
    #[arg(long = "version", short = 'V', action = ArgAction::SetTrue)]
    version: bool,

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

    /// Optional title to display in the UI header (e.g., PR summary)
    #[arg(long)]
    title: Option<String>,

    /// Enable development HTTP tracing (tower_http::trace). Disabled by default.
    #[arg(long)]
    dev_log: bool,

    /// Review a commit series (jj revset or git range, e.g. "trunk()..@" or "HEAD~5..HEAD")
    #[arg(long)]
    series: Option<String>,

    /// Print the config directory path and exit
    #[arg(long)]
    config_dir: bool,
}

fn is_jj_repo(root: &str) -> bool {
    std::path::Path::new(root).join(".jj").exists()
}

fn enumerate_series_commits(revset: &str, working_dir: &str) -> Result<Vec<String>> {
    if is_jj_repo(working_dir) {
        let output = Command::new("jj")
            .args(["log", "--no-graph", "--reversed", "-r", revset, "-T", "commit_id ++ \"\\n\""])
            .current_dir(working_dir)
            .output()
            .context("Failed to run jj log")?;
        if !output.status.success() {
            anyhow::bail!("jj log failed: {}", String::from_utf8_lossy(&output.stderr));
        }
        let ids: Vec<String> = String::from_utf8(output.stdout)
            .context("jj log output is not valid UTF-8")?
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        Ok(ids)
    } else {
        let output = Command::new("git")
            .args(["log", "--format=%H", "--reverse", revset])
            .current_dir(working_dir)
            .output()
            .context("Failed to run git log")?;
        if !output.status.success() {
            anyhow::bail!("git log failed: {}", String::from_utf8_lossy(&output.stderr));
        }
        let hashes: Vec<String> = String::from_utf8(output.stdout)
            .context("git log output is not valid UTF-8")?
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        Ok(hashes)
    }
}

struct Spinner {
    stop: Arc<std::sync::atomic::AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl Spinner {
    fn start(label: &str) -> Self {
        let stop = Arc::new(std::sync::atomic::AtomicBool::new(false));
        let stop_clone = stop.clone();
        let label = label.to_string();
        let thread = std::thread::spawn(move || {
            let frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let mut i = 0usize;
            let mut stderr = std::io::stderr();
            while !stop_clone.load(std::sync::atomic::Ordering::Relaxed) {
                let _ = write!(stderr, "\r{} {}  ", frames[i % frames.len()], label);
                let _ = stderr.flush();
                std::thread::sleep(std::time::Duration::from_millis(80));
                i += 1;
            }
        });
        Self { stop, thread: Some(thread) }
    }

    fn finish(mut self, message: &str) {
        self.stop.store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
        eprintln!("\r✓ {}  ", message);
    }
}

impl Drop for Spinner {
    fn drop(&mut self) {
        self.stop.store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
        // clear the spinner line
        let _ = write!(std::io::stderr(), "\r");
    }
}

// Fetch all diffs for a jj series in one subprocess call and parse them.
// Returns diffs in revset order (oldest first, matching --reversed).
fn get_series_diffs_jj(revset: &str, working_dir: &str) -> Result<Vec<crate::types::DiffResponse>> {
    let template = concat!(
        r#"concat("Commit ID: ", commit_id, "\nAuthor: ", author.name(), "#,
        r#"" <", author.email(), "> (", author.timestamp().format("%Y-%m-%d %H:%M:%S"), ")\n\n    ", description, "\n\n")"#
    );
    let output = Command::new("jj")
        .args(["log", "--no-graph", "--reversed", "-r", revset, "-T", template, "-p", "--git"])
        .current_dir(working_dir)
        .output()
        .context("Failed to run jj log")?;
    if !output.status.success() {
        anyhow::bail!("jj log failed: {}", String::from_utf8_lossy(&output.stderr));
    }
    let text = String::from_utf8(output.stdout).context("jj log output is not valid UTF-8")?;

    // Split on commit boundaries: each commit starts with "Commit ID: "
    let parts: Vec<&str> = text.split("\nCommit ID: ").collect();
    parts
        .iter()
        .enumerate()
        .map(|(i, part)| {
            let chunk = if i == 0 {
                part.to_string()
            } else {
                format!("Commit ID: {}", part)
            };
            diff::parse_diff(&chunk).context("Failed to parse commit diff")
        })
        .collect()
}

fn get_commit_diff_text(commit_id: &str, working_dir: &str) -> Result<String> {
    if is_jj_repo(working_dir) {
        let output = Command::new("jj")
            .args(["show", "--git", "-r", commit_id])
            .current_dir(working_dir)
            .output()
            .context("Failed to run jj show")?;
        if !output.status.success() {
            anyhow::bail!("jj show failed: {}", String::from_utf8_lossy(&output.stderr));
        }
        String::from_utf8(output.stdout).context("jj show output is not valid UTF-8")
    } else {
        let output = Command::new("git")
            .args(["show", commit_id])
            .current_dir(working_dir)
            .output()
            .context("Failed to run git show")?;
        if !output.status.success() {
            anyhow::bail!("git show failed: {}", String::from_utf8_lossy(&output.stderr));
        }
        String::from_utf8(output.stdout).context("git show output is not valid UTF-8")
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let version_checker = VersionChecker::new("lrv", env!("CARGO_PKG_VERSION"));
    version_checker.check_async();

    let args = Args::parse();
    if args.version {
        println!("lrv {}", env!("CARGO_PKG_VERSION"));
        version_checker.print_warning_sync();
        return Ok(());
    }
    if args.config_dir {
        let dir = dirs::config_dir()
            .context("Could not determine config directory")?
            .join("lrv");
        println!("{}", dir.display());
        return Ok(());
    }

    // Derive dynamic behavior based on environment.
    // If we're over SSH and a Tailscale IP is present in env, auto-enable tailscale
    // bindings and avoid opening a local browser on this host.
    let mut enable_tailscale = args.tailscale;
    let mut disable_open = args.no_open;
    let mut detected_ts_ips: Option<Vec<String>> = None;
    if (!enable_tailscale || !disable_open) && is_ssh_session() {
        let ts = get_tailscale_ipv4s_from_env();
        if !ts.is_empty() {
            if !enable_tailscale {
                enable_tailscale = true;
            }
            if !disable_open {
                disable_open = true;
            }
            detected_ts_ips = Some(ts);
        }
    }

    // Parse output format
    let output_format: OutputFormat = args.format.parse().context("Invalid output format")?;

    // Load user config
    let user_config = config::load_config().unwrap_or_else(|e| {
        tracing::warn!("Failed to load config, using defaults: {}", e);
        config::UserConfig::default()
    });

    // Get project context and attach optional title
    let mut project_context = get_project_context();
    project_context.title = args.title.clone();
    // Precompute public flag from args
    let is_public_flag = args.public || args.bind.iter().any(|a| a == "0.0.0.0");
    project_context.is_public = is_public_flag;

    let working_dir = project_context.working_directory.clone();

    // Parse diffs: series mode or single commit
    let (diffs, pre_old, pre_new, is_series) = if let Some(ref revset) = args.series {
        if args.cmd.is_some() || args.file.is_some() {
            anyhow::bail!("--series cannot be combined with --cmd or --file");
        }
        let parsed = if is_jj_repo(&working_dir) {
            let revset = revset.clone();
            let wd = working_dir.clone();
            let spinner = Spinner::start("Loading commits");
            let diffs = tokio::task::spawn_blocking(move || get_series_diffs_jj(&revset, &wd))
                .await
                .context("task join")??;
            spinner.finish(&format!("Loaded {} commits", diffs.len()));
            diffs
        } else {
            let commits = enumerate_series_commits(revset, &working_dir)?;
            if commits.is_empty() {
                anyhow::bail!("No commits found for series: {}", revset);
            }
            eprintln!("Loading {} commits...", commits.len());
            let mut handles = Vec::with_capacity(commits.len());
            for (i, id) in commits.iter().enumerate() {
                let id = id.clone();
                let wd = working_dir.clone();
                handles.push(tokio::task::spawn_blocking(move || -> anyhow::Result<_> {
                    let text = get_commit_diff_text(&id, &wd)?;
                    let d = diff::parse_diff(&text)?;
                    Ok((i, d))
                }));
            }
            let mut parsed_indexed = Vec::with_capacity(commits.len());
            for h in handles {
                parsed_indexed.push(h.await.context("task join")??);
            }
            parsed_indexed.sort_by_key(|(i, _)| *i);
            parsed_indexed.into_iter().map(|(_, d)| d).collect()
        };
        let spinner = Spinner::start("Precomputing file content");
        let (pre_old, pre_new) = server::precompute_series_content(&parsed, &working_dir).await;
        spinner.finish("Ready");
        (parsed, pre_old, pre_new, true)
    } else {
        // Get diff text from stdin, file, or command
        let diff_text = if let Some(file_path) = args.file {
            std::fs::read_to_string(&file_path)
                .context(format!("Failed to read file: {}", file_path))?
        } else if let Some(cmd) = args.cmd {
            let output = if cfg!(target_os = "windows") {
                Command::new("cmd").args(["/C", &cmd]).output()
            } else {
                Command::new("sh").args(["-c", &cmd]).output()
            }
            .context("Failed to execute command")?;

            if !output.status.success() {
                anyhow::bail!(
                    "Command failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }

            String::from_utf8(output.stdout).context("Command output is not valid UTF-8")?
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

        let diff = diff::parse_diff(&diff_text)?;

        if diff.files.is_empty() {
            eprintln!("No changes found in diff");
            return Ok(());
        }

        (vec![diff], vec![], vec![], false)
    };

    // Setup shutdown channel
    let (shutdown_tx, mut shutdown_rx) = mpsc::channel::<()>(1);

    // Build per-commit old and new caches (pre-populated for series, empty for single diff)
    let n = diffs.len();
    let old_caches: Vec<tokio::sync::Mutex<std::collections::HashMap<String, String>>> = {
        let mut maps: Vec<_> = pre_old.into_iter().map(tokio::sync::Mutex::new).collect();
        maps.resize_with(n, || tokio::sync::Mutex::new(std::collections::HashMap::new()));
        maps
    };
    let new_caches: Vec<tokio::sync::Mutex<std::collections::HashMap<String, String>>> = {
        let mut maps: Vec<_> = pre_new.into_iter().map(tokio::sync::Mutex::new).collect();
        maps.resize_with(n, || tokio::sync::Mutex::new(std::collections::HashMap::new()));
        maps
    };

    // Create app state
    let state = AppState {
        diffs: Arc::new(diffs),
        comments: Arc::new(Mutex::new(Vec::new())),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(user_config)),
        context: Arc::new(project_context),
        old_caches: Arc::new(old_caches),
        new_caches: Arc::new(new_caches),
        is_series,
    };

    // Create router (we'll clone per listener)
    let _app_for_clone = create_router(state.clone(), args.dev_log);

    // Eagerly prefetch old-side contents for all commits in background
    for i in 0..state.diffs.len() {
        tokio::spawn(crate::server::prefetch_old_files(state.clone(), i));
    }

    // Determine bind addresses
    let mut bind_addrs: Vec<String> = Vec::new();
    if args.public {
        bind_addrs.push("0.0.0.0".to_string());
    } else if !args.bind.is_empty() {
        bind_addrs.extend(args.bind.clone());
    } else {
        bind_addrs.push("127.0.0.1".to_string());
    }

    if enable_tailscale {
        let ts = match detected_ts_ips {
            Some(v) => v,
            None => get_tailscale_ipv4s_from_env(),
        };
        if ts.is_empty() {
            eprintln!("warning: no Tailscale IP found in environment");
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
                Err(e) => tracing::warn!("failed to bind {}:{}: {}", addr, actual_port, e),
            }
        }
    } else {
        actual_port = requested_port;
        for addr in &bind_addrs {
            match tokio::net::TcpListener::bind(format!("{}:{}", addr, actual_port)).await {
                Ok(l) => listeners.push((addr.clone(), l)),
                Err(e) => tracing::warn!("failed to bind {}:{}: {}", addr, actual_port, e),
            }
        }
        if listeners.is_empty() {
            anyhow::bail!("Failed to bind to any provided addresses");
        }
    }

    for (addr, _) in &listeners {
        if addr == "0.0.0.0" {
            for iface in get_network_interfaces() {
                eprintln!("http://{}:{}", iface, actual_port);
            }
        } else {
            eprintln!("http://{}:{}", addr, actual_port);
        }
    }

    // Prefer loopback when opening browser
    let url = format!("http://127.0.0.1:{}", actual_port);

    // Run servers with graceful shutdown
    let shutdown_notify = Arc::new(Notify::new());
    let mut handles = Vec::new();
    for (_, listener) in listeners.into_iter() {
        let app_clone = create_router(state.clone(), args.dev_log);
        let notify = shutdown_notify.clone();
        let handle = tokio::spawn(async move {
            axum::serve(listener, app_clone)
                .with_graceful_shutdown(async move { notify.notified().await })
                .await
        });
        handles.push(handle);
    }

    // Yield so server tasks begin accepting before browser opens
    tokio::task::yield_now().await;

    // Open browser after server is ready
    if !disable_open {
        let url_for_open = url.clone();
        tokio::spawn(async move {
            if let Err(e) = open::that(&url_for_open) {
                eprintln!("Failed to open browser: {}", e);
            }
        });
    }

    // Wait for either shutdown signal or server error
    tokio::select! {
        _ = shutdown_rx.recv() => {
            tracing::info!("Received shutdown signal");
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
    let output = output::format_output(comments.clone(), &output_format, &state.diffs, is_series);
    println!("{}", output);

    Ok(())
}
