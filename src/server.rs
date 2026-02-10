use crate::config::UserConfig;
use crate::types::*;
use std::fs;
use std::collections::{HashMap, HashSet};
use axum::{
    extract::{Path as AxumPath, Query, State},
    http::{header, HeaderValue, StatusCode},
    middleware,
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use mime_guess;
use rust_embed::RustEmbed;
use serde::Deserialize;
use std::path::{Component, Path};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, Semaphore};
use tokio::task::JoinSet;
use tower_http::trace::TraceLayer;
use std::thread;
use std::os::unix::process::ExitStatusExt;
use std::sync::atomic::AtomicBool;
use std::time::{Duration, Instant};

#[derive(Deserialize)]
struct FileQuery {
    path: String,
    side: String, // "old" or "new"
}

#[derive(Clone)]
pub struct AppState {
    pub diff: Arc<DiffResponse>,
    pub comments: Arc<Mutex<Vec<Comment>>>,
    pub shutdown_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
    pub config: Arc<Mutex<UserConfig>>,
    pub context: Arc<ProjectContext>,
    // Cache for expensive old-side content fetches, keyed by new-path used by the UI
    pub old_cache: Arc<Mutex<HashMap<String, String>>>,
}

fn is_jj_repo(root: &str) -> bool {
    Path::new(root).join(".jj").exists()
}

fn run_with_delayed_notice<T, F: FnOnce() -> T>(message: String, delay_ms: u64, op: F) -> T {
    let shown = Arc::new(AtomicBool::new(false));
    let done = Arc::new(AtomicBool::new(false));
    let shown_clone = shown.clone();
    let done_clone = done.clone();
    let msg_clone = message.clone();
    let handle = thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(delay_ms));
        if !done_clone.load(Ordering::Relaxed) {
            shown_clone.store(true, Ordering::Relaxed);
            eprintln!("{}", msg_clone);
        }
    });
    let start = Instant::now();
    let result = op();
    done.store(true, Ordering::Relaxed);
    let _ = handle.join();
    if shown.load(Ordering::Relaxed) {
        let ms = start.elapsed().as_millis();
        eprintln!("{} (done in {}ms)", message, ms);
    }
    result
}

// Compute the "old" side content for a given request path.
// Mirrors the logic in get_file_content's old-branch, but returns a String for reuse
// in both handler and eager prefetch.
fn resolve_old_content(state: &AppState, req_path: &str) -> String {
    let base_path = Path::new(&state.context.working_directory);

    let rel_path = Path::new(req_path);
    if rel_path.is_absolute()
        || rel_path
            .components()
            .any(|c| matches!(c, Component::ParentDir))
    {
        return String::new();
    }

    // 1) Try reconstructing old content from diff hunks + new content
    let file_entry = state
        .diff
        .files
        .iter()
        .find(|f| f.path == req_path || f.old_path.as_deref() == Some(req_path));

    if let Some(fe) = file_entry {
        // Added: no old content
        if fe.status == FileStatus::Added {
            return String::new();
        }
        // Read new content when available
        let new_text = match fe.status {
            FileStatus::Deleted => None,
            _ => {
                let joined = base_path.join(req_path);
                fs::read_to_string(&joined).ok()
            }
        };

        if let Some(mut new_text) = new_text {
            let msg = format!(
                "Reconstructing old content for {} from diff ({} hunks)...",
                req_path,
                fe.hunks.len()
            );
            // Normalize to lines preserving newlines
            let op = || {
                let mut lines: Vec<String> = if new_text.is_empty() {
                    Vec::new()
                } else {
                    new_text
                        .split_inclusive('\n')
                        .map(|s| s.to_string())
                        .collect()
                };
                // Apply hunks in reverse by new_start to reconstruct old
                let mut hunks = fe.hunks.clone();
                hunks.sort_by_key(|h| std::cmp::Reverse(h.new_start));
                for h in hunks {
                    let mut pos = if h.new_start == 0 { 0 } else { h.new_start.saturating_sub(1) };
                    for dl in &h.lines {
                        match dl.line_type {
                            LineType::Context => { pos = pos.saturating_add(1); }
                            LineType::Add => { if pos < lines.len() { lines.remove(pos); } }
                            LineType::Delete => { lines.insert(pos, dl.content.clone() + "\n"); pos = pos.saturating_add(1); }
                        }
                    }
                }
                lines.into_iter().collect::<String>()
            };
            new_text = run_with_delayed_notice(msg, 400, op);
            return new_text;
        }
    }

    // 2) Prefer blob OID or JJ fallback when available
    if let Some(fe) = state
        .diff
        .files
        .iter()
        .find(|f| f.path == req_path || f.old_path.as_deref() == Some(req_path))
    {
        if let Some(oid) = &fe.old_blob {
            let output = std::process::Command::new("git")
                .current_dir(&state.context.working_directory)
                .args(["cat-file", "-p", oid])
                .output();
            if let Ok(output) = output {
                if output.status.success() {
                    if let Ok(s) = String::from_utf8(output.stdout) {
                        return s;
                    }
                }
            }
        }
        if is_jj_repo(&state.context.working_directory) {
            let repo = &state.context.working_directory;
            let old_key = fe.old_path.clone().unwrap_or_else(|| fe.path.clone());
            let cmd_old = |rev: &str| -> std::process::Output {
                std::process::Command::new("jj")
                    .current_dir(repo)
                    .args(["file", "show", "-r", &format!("parents({})", rev), "--", &old_key])
                    .output()
                    .unwrap_or_else(|_| std::process::Output { status: std::process::ExitStatus::from_raw(1), stdout: Vec::new(), stderr: Vec::new() })
            };
            let out = run_with_delayed_notice(
                format!(
                    "Fetching old content from jj (parents(@-), then parents(@)) for {}...",
                    old_key
                ),
                400,
                || {
                    let o1 = cmd_old("@-");
                    if o1.status.success() { return o1; }
                    cmd_old("@")
                },
            );
            if out.status.success() {
                if let Ok(s) = String::from_utf8(out.stdout) {
                    return s;
                }
            }
        }
    }

    // 3) Fallback to VCS: git show HEAD:path
    let rel_for_vcs = rel_path
        .to_str()
        .map(|s| s.replace(std::path::MAIN_SEPARATOR, "/"))
        .unwrap_or_else(|| req_path.to_string());
    let output = run_with_delayed_notice(
        format!("Falling back to git show HEAD:{} (may be slow)...", rel_for_vcs),
        400,
        || {
            std::process::Command::new("git")
                .args(["show", &format!("HEAD:{}", rel_for_vcs)])
                .output()
                .unwrap_or_else(|_| std::process::Output { status: std::process::ExitStatus::from_raw(1), stdout: Vec::new(), stderr: Vec::new() })
        },
    );
    if output.status.success() {
        String::from_utf8(output.stdout).unwrap_or_default()
    } else {
        String::new()
    }
}

// Spawn a background task that eagerly precomputes and caches old-side contents
pub async fn prefetch_old_files(state: AppState) {
    // Build the worklist from diff entries; key by the path used by the UI
    let items: Vec<(String, Option<String>, Option<String>)> = state
        .diff
        .files
        .iter()
        .map(|f| (f.path.clone(), f.old_path.clone(), f.old_blob.clone()))
        .collect();

    // 0) Fast path: batch-fetch any available old blobs in one git process
    let mut prefilled: HashSet<String> = HashSet::new();
    let blob_items: Vec<(String, Option<String>, String)> = items
        .iter()
        .filter_map(|(p, op, ob)| ob.as_ref().map(|b| (p.clone(), op.clone(), b.clone())))
        .collect();
    if !blob_items.is_empty() {
        if let Some(blob_map) = batch_cat_file_blobs(&state.context.working_directory, &blob_items.iter().map(|t| t.2.clone()).collect::<Vec<_>>()) {
            let mut cache = state.old_cache.lock().await;
            for (path, old_path_opt, oid) in blob_items {
                if let Some(content) = blob_map.get(&oid) {
                    cache.insert(path.clone(), content.clone());
                    prefilled.insert(path.clone());
                    if let Some(op) = old_path_opt {
                        cache.insert(op.clone(), content.clone());
                        prefilled.insert(op);
                    }
                }
            }
        }
    }

    let sem = Arc::new(Semaphore::new(8)); // bound concurrency
    let mut set: JoinSet<()> = JoinSet::new();

    for (path, old_path_opt, _old_blob) in items {
        let state_cloned = state.clone();
        let sem = sem.clone();
        let prefilled_set = prefilled.clone();
        set.spawn(async move {
            let _permit = sem.acquire_owned().await.ok();
            // Skip if already cached (e.g., raced with first request)
            if prefilled_set.contains(&path) || {
                let cache = state_cloned.old_cache.lock().await;
                cache.contains_key(&path)
            } {
                return;
            }
            let content = resolve_old_content(&state_cloned, &path);
            let mut cache = state_cloned.old_cache.lock().await;
            cache.insert(path.clone(), content.clone());
            if let Some(op) = old_path_opt {
                // Also cache under old_path for fast lookups in rename scenarios
                cache.insert(op, content);
            }
        });
    }

    while set.join_next().await.is_some() {}
}

// Batch-fetch blobs via a single `git cat-file --batch` invocation.
// Returns a map from OID -> content for successfully fetched blobs.
fn batch_cat_file_blobs(working_dir: &str, oids: &[String]) -> Option<HashMap<String, String>> {
    use std::io::{BufRead, BufReader, Read, Write};
    use std::process::{Command, Stdio};

    let mut child = Command::new("git")
        .current_dir(working_dir)
        .args(["cat-file", "--batch"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .ok()?;

    {
        let mut stdin = child.stdin.take()?;
        for oid in oids {
            let _ = writeln!(stdin, "{}", oid);
        }
        // close stdin
    }

    let stdout = child.stdout.take()?;
    let mut reader = BufReader::new(stdout);
    let mut result: HashMap<String, String> = HashMap::new();

    loop {
        let mut header = String::new();
        match reader.read_line(&mut header) {
            Ok(0) => break, // EOF
            Ok(_) => {}
            Err(_) => return None,
        }
        let header = header.trim_end();
        if header.is_empty() { continue; }
        let mut it = header.split_whitespace();
        let oid = match it.next() { Some(s) => s.to_string(), None => break };
        let second = it.next();
        match second {
            Some("missing") => {
                // skip this oid
                continue;
            }
            Some(_typ) => {
                let size_str = it.next().unwrap_or("0");
                let size: usize = size_str.parse().unwrap_or(0);
                let mut buf = vec![0u8; size];
                if let Err(_) = reader.read_exact(&mut buf) { return None; }
                // Consume the trailing newline after the object content
                let mut nl = [0u8; 1];
                let _ = reader.read_exact(&mut nl);
                let content = String::from_utf8(buf).unwrap_or_default();
                result.insert(oid, content);
            }
            None => break,
        }
    }
    let _ = child.wait();
    Some(result)
}

pub fn create_router(state: AppState, enable_trace: bool) -> Router {
    let router = Router::new()
        .route("/", get(serve_index))
        .route("/assets/*path", get(serve_asset))
        .route("/api/diff", get(get_diff))
        .route("/api/context", get(get_context))
        .route("/api/config", get(get_config).put(update_config))
        .route("/api/file", get(get_file_content))
        .route("/api/comment", post(add_comment))
        .route("/api/complete", post(complete_review))
        .layer(middleware::from_fn(security_headers))
        .with_state(state);

    if enable_trace {
        router.layer(TraceLayer::new_for_http())
    } else {
        router
    }
}

async fn serve_index() -> impl IntoResponse {
    match WebAssets::get("dist/index.html") {
        Some(content) => {
            // Generate a best-effort nonce (time + counter + pid, hex)
            static NONCE_CTR: AtomicU64 = AtomicU64::new(1);
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos() as u64;
            let ctr = NONCE_CTR.fetch_add(1, Ordering::Relaxed);
            let pid = std::process::id() as u64;
            let mix = now ^ (ctr.wrapping_mul(0x9E37_79B9_7F4A_7C15)) ^ pid;
            let nonce = format!("{:016x}{:016x}", now, mix);

            // Inject nonce into HTML
            let mut html = String::from_utf8_lossy(&content.data).to_string();
            html = html.replace("__CSP_NONCE__", &nonce);

            // AMD Monaco: allow eval + blob workers; allow nonce for the inline preloader
            let csp = format!(
                "default-src 'self'; script-src 'self' 'unsafe-eval' blob: 'nonce-{}'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
                nonce
            );

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .header(header::CONTENT_SECURITY_POLICY, csp)
                .body(axum::body::Body::from(html))
                .unwrap()
        }
        None => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "index.html not found in embedded assets",
        )
            .into_response(),
    }
}

#[derive(RustEmbed)]
#[folder = "web/"]
struct WebAssets;

async fn serve_asset(AxumPath(path): AxumPath<String>) -> Response {
    let asset_path = format!("assets/{}", path);
    // Guard debugging-only assets from being served unless explicitly enabled
    // Set LRV_DEBUG_ASSETS=1 to allow accessing preloader demo files.
    if (path.starts_with("preloader"))
        && std::env::var("LRV_DEBUG_ASSETS").unwrap_or_default() != "1"
    {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(axum::body::Body::from("Asset not found"))
            .unwrap();
    }
    if let Some(content) = WebAssets::get(&asset_path) {
        let mime = mime_guess::from_path(&asset_path).first_or_octet_stream();
        Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .body(axum::body::Body::from(content.data))
            .unwrap()
    } else {
        Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(axum::body::Body::from("Asset not found"))
            .unwrap()
    }
}

// Middleware: add strict security headers (CSP, frame-ancestors, etc.)
async fn security_headers(
    req: axum::http::Request<axum::body::Body>,
    next: middleware::Next,
) -> Response {
    // Default CSP for non-HTML routes (match index CSP)
    const DEFAULT_CSP: &str = "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

    let mut res = next.run(req).await;
    {
        let headers = res.headers_mut();
        if !headers.contains_key(header::CONTENT_SECURITY_POLICY) {
            let _ = headers.insert(
                header::CONTENT_SECURITY_POLICY,
                HeaderValue::from_static(DEFAULT_CSP),
            );
        }
        let _ = headers.insert(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        );
        let _ = headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
        let _ = headers.insert(
            header::REFERRER_POLICY,
            HeaderValue::from_static("no-referrer"),
        );
        let _ = headers.insert(
            header::HeaderName::from_static("cross-origin-resource-policy"),
            HeaderValue::from_static("same-origin"),
        );
        let _ = headers.insert(header::HeaderName::from_static("permissions-policy"), HeaderValue::from_static("camera=() , microphone=() , geolocation=() , payment=() , usb=() , xr-spatial-tracking=()"));
        // HSTS is omitted since we bind http locally; can be enabled behind TLS/terminator
    }
    res
}

async fn get_diff(State(state): State<AppState>) -> Json<DiffResponse> {
    Json((*state.diff).clone())
}

async fn get_context(State(state): State<AppState>) -> Json<ProjectContext> {
    Json((*state.context).clone())
}

async fn get_file_content(
    State(state): State<AppState>,
    Query(query): Query<FileQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Base path is the working directory; we resolve old/new lazily from VCS or diff
    let base_path = Path::new(&state.context.working_directory);

    let base_canon =
        std::fs::canonicalize(base_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Basic path validation on input path
    let rel_path = Path::new(&query.path);
    if rel_path.is_absolute()
        || rel_path
            .components()
            .any(|c| matches!(c, Component::ParentDir))
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    // For the "new" side we require the file to exist on disk and stay under root.
    // For the "old" side we first try to reconstruct from the parsed diff hunks
    // (works for jj or any stdin-provided diff), and only then fall back to VCS.
    let content = match query.side.as_str() {
        "new" => {
            // Prefer Git blob OID from diff if present
            let mut content_new = if let Some(fe) = state
                .diff
                .files
                .iter()
                .find(|f| f.path == query.path || f.old_path.as_deref() == Some(&query.path))
            {
                if let Some(oid) = &fe.new_blob {
                    let output = std::process::Command::new("git")
                        .current_dir(&state.context.working_directory)
                        .args(["cat-file", "-p", oid])
                        .output()
                        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                    if output.status.success() {
                        if let Ok(s) = String::from_utf8(output.stdout) {
                            s
                        } else {
                            String::new()
                        }
                    } else {
                        String::new()
                    }
                } else {
                    // Fallback to filesystem
                    let joined = base_path.join(rel_path);
                    let file_path = std::fs::canonicalize(&joined)
                        .map_err(|_| StatusCode::NOT_FOUND)?;
                    if !file_path.starts_with(&base_canon) {
                        return Err(StatusCode::FORBIDDEN);
                    }
                    std::fs::read_to_string(&file_path).map_err(|_| StatusCode::NOT_FOUND)?
                }
            } else {
                // Not part of diff: fallback to filesystem
                let joined = base_path.join(rel_path);
                let file_path = std::fs::canonicalize(&joined).map_err(|_| StatusCode::NOT_FOUND)?;
                if !file_path.starts_with(&base_canon) {
                    return Err(StatusCode::FORBIDDEN);
                }
                std::fs::read_to_string(&file_path).map_err(|_| StatusCode::NOT_FOUND)?
            };

            // As a last resort on JJ repos, fetch from jj new revs if we still have no content
            if content_new.is_empty() && is_jj_repo(&state.context.working_directory) {
                let repo = &state.context.working_directory;
                let path = query.path.clone();
                let cmd_new = |rev: &str| -> std::process::Output {
                    std::process::Command::new("jj")
                        .current_dir(repo)
                        .args(["file", "show", "-r", rev, "--", &path])
                        .output()
                        .unwrap_or_else(|_| std::process::Output { status: std::process::ExitStatus::from_raw(1), stdout: Vec::new(), stderr: Vec::new() })
                };
                let out = run_with_delayed_notice(
                    format!("Fetching new content from jj (@-, then @) for {}...", path),
                    400,
                    || {
                        let o1 = cmd_new("@-");
                        if o1.status.success() { return o1; }
                        cmd_new("@")
                    },
                );
                if out.status.success() {
                    if let Ok(s) = String::from_utf8(out.stdout) { content_new = s; }
                }
            }
            content_new
        }
        "old" => {
            // Cache check first
            if let Some(cached) = {
                let cache = state.old_cache.lock().await;
                cache.get(&query.path).cloned()
            } {
                cached
            } else {
                let content = resolve_old_content(&state, &query.path);
                let mut cache = state.old_cache.lock().await;
                cache.insert(query.path.clone(), content.clone());
                content
            }
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    Ok(Json(serde_json::json!({ "content": content })))
}

async fn add_comment(State(state): State<AppState>, Json(comment): Json<Comment>) -> StatusCode {
    let mut comments = state.comments.lock().await;
    comments.push(comment);
    StatusCode::OK
}

async fn complete_review(
    State(state): State<AppState>,
    Json(payload): Json<ReviewComplete>,
) -> StatusCode {
    let mut comments = state.comments.lock().await;
    *comments = payload.comments;

    // Trigger shutdown
    if let Some(tx) = state.shutdown_tx.lock().await.take() {
        let _ = tx.send(()).await;
    }

    StatusCode::OK
}

async fn get_config(State(state): State<AppState>) -> Json<UserConfig> {
    let config = state.config.lock().await;
    Json(config.clone())
}

async fn update_config(
    State(state): State<AppState>,
    Json(new_config): Json<UserConfig>,
) -> Result<StatusCode, StatusCode> {
    let mut config = state.config.lock().await;
    *config = new_config.clone();

    // Persist to disk
    crate::config::save_config(&new_config).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
