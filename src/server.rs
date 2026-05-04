use crate::config::UserConfig;
use crate::themes::{load_user_themes, UserTheme};
use crate::types::*;
use axum::{
    extract::{Path as AxumPath, Query, State},
    http::{header, HeaderValue, StatusCode},
    middleware,
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use rust_embed::RustEmbed;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Component, Path};
use std::process::{ExitStatus, Output};
use std::sync::atomic::AtomicBool;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tokio::sync::{mpsc, Mutex, Semaphore};
use tokio::task::JoinSet;
use tower_http::trace::TraceLayer;

#[cfg(unix)]
use std::os::unix::process::ExitStatusExt;
#[cfg(windows)]
use std::os::windows::process::ExitStatusExt;

#[derive(Deserialize)]
struct FileQuery {
    path: String,
    side: String, // "old" or "new"
    commit: Option<usize>,
}

#[derive(Deserialize)]
struct CommitQuery {
    commit: Option<usize>,
}

#[derive(Clone)]
pub struct AppState {
    pub diffs: Arc<Vec<DiffResponse>>,
    pub comments: Arc<Mutex<Vec<Comment>>>,
    pub shutdown_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
    pub config: Arc<Mutex<UserConfig>>,
    pub context: Arc<ProjectContext>,
    // Per-commit caches for old-side and new-side content, keyed by file path
    pub old_caches: Arc<Vec<Mutex<HashMap<String, String>>>>,
    pub new_caches: Arc<Vec<Mutex<HashMap<String, String>>>>,
    pub is_series: bool,
}

impl AppState {
    fn clamp_commit(&self, idx: usize) -> usize {
        idx.min(self.diffs.len().saturating_sub(1))
    }
}

fn failed_output() -> Output {
    Output {
        status: failed_status(),
        stdout: Vec::new(),
        stderr: Vec::new(),
    }
}

#[cfg(unix)]
fn failed_status() -> ExitStatus {
    ExitStatus::from_raw(1)
}

#[cfg(windows)]
fn failed_status() -> ExitStatus {
    ExitStatus::from_raw(1)
}

fn is_jj_repo(root: &str) -> bool {
    Path::new(root).join(".jj").exists()
}

fn is_null_oid(oid: &str) -> bool {
    oid.chars().all(|c| c == '0')
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
fn resolve_old_content(diff: &DiffResponse, working_dir: &str, req_path: &str) -> String {
    let base_path = Path::new(working_dir);

    let rel_path = Path::new(req_path);
    if rel_path.is_absolute()
        || rel_path
            .components()
            .any(|c| matches!(c, Component::ParentDir))
    {
        return String::new();
    }

    // 1) Try reconstructing old content from diff hunks + new content
    let file_entry = diff
        .files
        .iter()
        .find(|f| f.path == req_path || f.old_path.as_deref() == Some(req_path));

    if let Some(fe) = file_entry {
        // Added: no old content
        if fe.status == FileStatus::Added {
            return String::new();
        }
        // Skip disk reconstruction when a blob OID is available: the OID gives
        // exact content at the reviewed commit, whereas the working-tree file may
        // be ahead of it and produce a bogus diff.
        if fe.old_blob.is_none() {
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
                let op = || {
                    let mut lines: Vec<String> = if new_text.is_empty() {
                        Vec::new()
                    } else {
                        new_text
                            .split_inclusive('\n')
                            .map(|s| s.to_string())
                            .collect()
                    };
                    let mut hunks = fe.hunks.clone();
                    hunks.sort_by_key(|h| std::cmp::Reverse(h.new_start));
                    for h in hunks {
                        let mut pos = if h.new_start == 0 {
                            0
                        } else {
                            h.new_start.saturating_sub(1)
                        };
                        for dl in &h.lines {
                            match dl.line_type {
                                LineType::Context => {
                                    pos = pos.saturating_add(1);
                                }
                                LineType::Add => {
                                    if pos < lines.len() {
                                        lines.remove(pos);
                                    }
                                }
                                LineType::Delete => {
                                    lines.insert(pos, dl.content.clone() + "\n");
                                    pos = pos.saturating_add(1);
                                }
                            }
                        }
                    }
                    lines.into_iter().collect::<String>()
                };
                new_text = run_with_delayed_notice(msg, 400, op);
                return new_text;
            }
        }
    }

    // 2) Git blob OID (fast), then jj file show as fallback
    if let Some(fe) = diff
        .files
        .iter()
        .find(|f| f.path == req_path || f.old_path.as_deref() == Some(req_path))
    {
        let repo = working_dir;
        let old_key = fe.old_path.clone().unwrap_or_else(|| fe.path.clone());

        if let Some(oid) = &fe.old_blob {
            if !is_null_oid(oid) {
                let output = std::process::Command::new("git")
                    .current_dir(repo)
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
        }

        if is_jj_repo(repo) {
            let cmd_old = |rev: &str| -> std::process::Output {
                std::process::Command::new("jj")
                    .current_dir(repo)
                    .args(["file", "show", "-r", &format!("parents({})", rev), "--", &old_key])
                    .output()
                    .unwrap_or_else(|_| failed_output())
            };
            let revs: Vec<String> = if let Some(hash) = &diff.commit_hash {
                vec![hash.clone(), "@-".to_string(), "@".to_string()]
            } else {
                vec!["@-".to_string(), "@".to_string()]
            };
            let out = run_with_delayed_notice(
                format!("Fetching old content from jj for {}...", old_key),
                400,
                || {
                    for rev in &revs {
                        let o = cmd_old(rev);
                        if o.status.success() {
                            return o;
                        }
                    }
                    failed_output()
                },
            );
            if out.status.success() {
                if let Ok(s) = String::from_utf8(out.stdout) {
                    return s;
                }
            }
        }
    }

    // 3) jj fallback for files not in current diff (e.g. race condition with commit switch)
    if is_jj_repo(working_dir) {
        if let Some(hash) = &diff.commit_hash {
            let repo = working_dir;
            let rev = hash.clone();
            let path_str = req_path.to_string();
            let out = std::process::Command::new("jj")
                .current_dir(repo)
                .args(["file", "show", "-r", &format!("parents({})", rev), "--", &path_str])
                .output()
                .unwrap_or_else(|_| failed_output());
            if out.status.success() {
                if let Ok(s) = String::from_utf8(out.stdout) {
                    if !s.is_empty() {
                        return s;
                    }
                }
            }
        }
    }

    // 4) Fallback to VCS: git show HEAD:path
    let rel_for_vcs = rel_path
        .to_str()
        .map(|s| s.replace(std::path::MAIN_SEPARATOR, "/"))
        .unwrap_or_else(|| req_path.to_string());
    let output = run_with_delayed_notice(
        format!(
            "Falling back to git show HEAD:{} (may be slow)...",
            rel_for_vcs
        ),
        400,
        || {
            std::process::Command::new("git")
                .args(["show", &format!("HEAD:{}", rel_for_vcs)])
                .output()
                .unwrap_or_else(|_| failed_output())
        },
    );
    if output.status.success() {
        String::from_utf8(output.stdout).unwrap_or_default()
    } else {
        String::new()
    }
}

// Spawn a background task that eagerly precomputes and caches old-side contents for one commit.
pub async fn prefetch_old_files(state: AppState, commit_idx: usize) {
    let commit_idx = state.clamp_commit(commit_idx);
    let diff = &state.diffs[commit_idx];

    // Build the worklist from diff entries; key by the path used by the UI
    let items: Vec<(String, Option<String>, Option<String>)> = diff
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
        if let Some(blob_map) = batch_cat_file_blobs(
            &state.context.working_directory,
            &blob_items.iter().map(|t| t.2.clone()).collect::<Vec<_>>(),
        ) {
            let mut cache = state.old_caches[commit_idx].lock().await;
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

    let sem = Arc::new(Semaphore::new(64)); // bound concurrency
    let mut set: JoinSet<()> = JoinSet::new();

    for (path, old_path_opt, _old_blob) in items {
        let state_cloned = state.clone();
        let sem = sem.clone();
        let prefilled_set = prefilled.clone();
        set.spawn(async move {
            let _permit = sem.acquire_owned().await.ok();
            // Skip if already cached (e.g., raced with first request)
            if prefilled_set.contains(&path) || {
                let cache = state_cloned.old_caches[commit_idx].lock().await;
                cache.contains_key(&path)
            } {
                return;
            }
            let content = resolve_old_content(
                &state_cloned.diffs[commit_idx],
                &state_cloned.context.working_directory,
                &path,
            );
            let mut cache = state_cloned.old_caches[commit_idx].lock().await;
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
    // Process responses in the same order as inputs so we can key by abbreviated input OID.
    let mut input_iter = oids.iter();

    loop {
        let mut header = String::new();
        match reader.read_line(&mut header) {
            Ok(0) => break, // EOF
            Ok(_) => {}
            Err(_) => return None,
        }
        let header = header.trim_end();
        if header.is_empty() {
            continue;
        }
        let input_oid = match input_iter.next() {
            Some(s) => s,
            None => break,
        };
        let mut it = header.split_whitespace();
        let _output_oid = it.next(); // full OID from git; may differ from abbreviated input
        let second = it.next();
        match second {
            Some("missing") => {
                // no content for this OID
                continue;
            }
            Some(_typ) => {
                let size_str = it.next().unwrap_or("0");
                let size: usize = size_str.parse().unwrap_or(0);
                let mut buf = vec![0u8; size];
                if reader.read_exact(&mut buf).is_err() {
                    return None;
                }
                // Consume the trailing newline after the object content
                let mut nl = [0u8; 1];
                let _ = reader.read_exact(&mut nl);
                let content = String::from_utf8(buf).unwrap_or_default();
                result.insert(input_oid.clone(), content);
            }
            None => break,
        }
    }
    let _ = child.wait();
    Some(result)
}

// Apply diff hunks in reverse: convert new file content back to old.
fn apply_diff_reverse(new_content: &str, hunks: &[Hunk]) -> String {
    if hunks.is_empty() {
        return new_content.to_string();
    }
    let mut lines: Vec<String> = if new_content.is_empty() {
        Vec::new()
    } else {
        new_content
            .split_inclusive('\n')
            .map(|s| s.to_string())
            .collect()
    };
    let mut sorted_hunks = hunks.to_vec();
    sorted_hunks.sort_by_key(|h| std::cmp::Reverse(h.new_start));
    for h in &sorted_hunks {
        let mut pos = if h.new_start == 0 {
            0
        } else {
            h.new_start.saturating_sub(1)
        };
        for dl in &h.lines {
            match dl.line_type {
                LineType::Context => {
                    pos += 1;
                }
                LineType::Add => {
                    if pos < lines.len() {
                        lines.remove(pos);
                    }
                }
                LineType::Delete => {
                    lines.insert(pos, dl.content.clone() + "\n");
                    pos += 1;
                }
            }
        }
    }
    lines.into_iter().collect()
}

// For git repos: batch-fetch all old+new blob OIDs in one git process.
fn precompute_via_blobs(
    diffs: &[DiffResponse],
    working_dir: &str,
) -> (Vec<HashMap<String, String>>, Vec<HashMap<String, String>>) {
    let n = diffs.len();
    let mut all_oids: Vec<String> = Vec::new();
    let mut oid_seen: HashSet<String> = HashSet::new();
    for diff in diffs {
        for file in &diff.files {
            for oid_opt in [&file.old_blob, &file.new_blob] {
                if let Some(oid) = oid_opt {
                    if !is_null_oid(oid) && oid_seen.insert(oid.clone()) {
                        all_oids.push(oid.clone());
                    }
                }
            }
        }
    }
    let blob_map = if !all_oids.is_empty() {
        batch_cat_file_blobs(working_dir, &all_oids).unwrap_or_default()
    } else {
        HashMap::new()
    };
    let mut old_maps: Vec<HashMap<String, String>> = (0..n).map(|_| HashMap::new()).collect();
    let mut new_maps: Vec<HashMap<String, String>> = (0..n).map(|_| HashMap::new()).collect();
    for (i, diff) in diffs.iter().enumerate() {
        for file in &diff.files {
            let old_content = if file.status == FileStatus::Added {
                Some(String::new())
            } else if let Some(oid) = &file.old_blob {
                if is_null_oid(oid) { Some(String::new()) } else { blob_map.get(oid).cloned() }
            } else {
                None
            };
            if let Some(content) = old_content {
                old_maps[i].insert(file.path.clone(), content.clone());
                if let Some(ref op) = file.old_path {
                    old_maps[i].insert(op.clone(), content);
                }
            }
            let new_content = if file.status == FileStatus::Deleted {
                Some(String::new())
            } else if let Some(oid) = &file.new_blob {
                if is_null_oid(oid) { Some(String::new()) } else { blob_map.get(oid).cloned() }
            } else {
                None
            };
            if let Some(content) = new_content {
                new_maps[i].insert(file.path.clone(), content);
            }
        }
    }
    (old_maps, new_maps)
}

// Pre-populate per-commit old and new content maps for all files in the series.
// For git repos: batch-fetches all blob OIDs in one git process.
// For jj repos: fetches base file content in parallel via `jj file show`,
// then applies diff hunks forward through the commit chain.
pub async fn precompute_series_content(
    diffs: &[DiffResponse],
    working_dir: &str,
) -> (Vec<HashMap<String, String>>, Vec<HashMap<String, String>>) {
    if !is_jj_repo(working_dir) {
        return precompute_via_blobs(diffs, working_dir);
    }

    let n = diffs.len();

    // In jj, @ is always the working copy: disk files == new[last_commit].
    // Read all touched files from disk, then walk commits backwards applying
    // reverse diffs — no subprocess calls needed.
    let mut all_paths: HashSet<String> = HashSet::new();
    for diff in diffs {
        for file in &diff.files {
            all_paths.insert(file.path.clone());
        }
    }

    let mut current_state: HashMap<String, String> = HashMap::new();
    for path in &all_paths {
        if let Ok(content) = fs::read_to_string(Path::new(working_dir).join(path)) {
            current_state.insert(path.clone(), content);
        }
    }

    let mut old_maps: Vec<HashMap<String, String>> = (0..n).map(|_| HashMap::new()).collect();
    let mut new_maps: Vec<HashMap<String, String>> = (0..n).map(|_| HashMap::new()).collect();

    for i in (0..n).rev() {
        let diff = &diffs[i];
        for file in &diff.files {
            let new_content = if file.status == FileStatus::Deleted {
                String::new()
            } else {
                current_state.get(&file.path).cloned().unwrap_or_default()
            };

            let old_content = if file.status == FileStatus::Added {
                String::new()
            } else {
                apply_diff_reverse(&new_content, &file.hunks)
            };

            new_maps[i].insert(file.path.clone(), new_content);
            old_maps[i].insert(file.path.clone(), old_content.clone());
            if let Some(ref op) = file.old_path {
                old_maps[i].insert(op.clone(), old_content.clone());
            }

            if file.status == FileStatus::Added {
                current_state.remove(&file.path);
            } else {
                current_state.insert(file.path.clone(), old_content);
            }
        }
    }

    (old_maps, new_maps)
}

pub fn create_router(state: AppState, enable_trace: bool) -> Router {
    let router = Router::new()
        .route("/", get(serve_index))
        .route("/assets/{*path}", get(serve_asset))
        .route("/api/diff", get(get_diff))
        .route("/api/series", get(get_series))
        .route("/api/context", get(get_context))
        .route("/api/config", get(get_config).put(update_config))
        .route("/api/themes", get(get_user_themes))
        .route("/api/install-skill", post(install_skill))
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

async fn get_diff(
    State(state): State<AppState>,
    Query(query): Query<CommitQuery>,
) -> Json<DiffResponse> {
    let idx = state.clamp_commit(query.commit.unwrap_or(0));
    Json(state.diffs[idx].clone())
}

async fn get_series(State(state): State<AppState>) -> Json<SeriesInfo> {
    let commits = state
        .diffs
        .iter()
        .enumerate()
        .map(|(i, d)| CommitSummary {
            idx: i,
            commit_hash: d.commit_hash.clone(),
            commit_author: d.commit_author.clone(),
            commit_date: d.commit_date.clone(),
            commit_message: d.commit_message.clone(),
            stats: d.stats.clone(),
        })
        .collect();
    Json(SeriesInfo {
        is_series: state.is_series,
        commits,
    })
}

async fn get_context(State(state): State<AppState>) -> Json<ProjectContext> {
    Json((*state.context).clone())
}

async fn get_user_themes() -> Json<Vec<UserTheme>> {
    Json(load_user_themes())
}

async fn install_skill() -> Result<Json<serde_json::Value>, StatusCode> {
    const SKILL_CONTENT: &str = include_str!("skill.md");
    let skill_path = dirs::home_dir()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?
        .join(".claude")
        .join("skills")
        .join("lrv");
    fs::create_dir_all(&skill_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    fs::write(skill_path.join("SKILL.md"), SKILL_CONTENT)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn get_file_content(
    State(state): State<AppState>,
    Query(query): Query<FileQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let commit_idx = state.clamp_commit(query.commit.unwrap_or(0));
    let diff = &state.diffs[commit_idx];

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
    let content =
        match query.side.as_str() {
            "new" => {
                // Check precomputed new_caches first (populated synchronously at startup)
                if let Some(cached) = {
                    let cache = state.new_caches[commit_idx].lock().await;
                    cache.get(&query.path).cloned()
                } {
                    return Ok(Json(serde_json::json!({ "content": cached })));
                }

                let repo = &state.context.working_directory;
                let path = &query.path;
                let mut content_new = String::new();

                // For jj repos with a known commit hash, fetch directly from jj.
                if is_jj_repo(repo) {
                    if let Some(hash) = &diff.commit_hash {
                        let out = std::process::Command::new("jj")
                            .current_dir(repo)
                            .args(["file", "show", "-r", hash, "--", path.as_str()])
                            .output()
                            .unwrap_or_else(|_| failed_output());
                        if out.status.success() {
                            content_new = String::from_utf8(out.stdout).unwrap_or_default();
                        }
                    }
                }

                if content_new.is_empty() {
                    // Try Git blob OID from diff if present, fallback to filesystem.
                    content_new = if let Some(fe) =
                        diff.files.iter().find(|f| {
                            f.path == query.path || f.old_path.as_deref() == Some(&query.path)
                        }) {
                        let mut content = String::new();

                        if let Some(oid) = &fe.new_blob {
                            let output = std::process::Command::new("git")
                                .current_dir(repo)
                                .args(["cat-file", "-p", oid])
                                .output()
                                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                            if output.status.success() {
                                if let Ok(s) = String::from_utf8(output.stdout) {
                                    content = s;
                                }
                            }
                        }

                        if content.is_empty() {
                            let joined = base_path.join(rel_path);
                            let file_path = std::fs::canonicalize(&joined)
                                .map_err(|_| StatusCode::NOT_FOUND)?;
                            if !file_path.starts_with(&base_canon) {
                                return Err(StatusCode::FORBIDDEN);
                            }
                            content = std::fs::read_to_string(&file_path)
                                .map_err(|_| StatusCode::NOT_FOUND)?;
                        }

                        content
                    } else {
                        let joined = base_path.join(rel_path);
                        let file_path = std::fs::canonicalize(&joined)
                            .map_err(|_| StatusCode::NOT_FOUND)?;
                        if !file_path.starts_with(&base_canon) {
                            return Err(StatusCode::FORBIDDEN);
                        }
                        std::fs::read_to_string(&file_path).map_err(|_| StatusCode::NOT_FOUND)?
                    };
                }

                content_new
            }
            "old" => {
                // Cache check first
                if let Some(cached) = {
                    let cache = state.old_caches[commit_idx].lock().await;
                    cache.get(&query.path).cloned()
                } {
                    cached
                } else {
                    let content = resolve_old_content(
                        diff,
                        &state.context.working_directory,
                        &query.path,
                    );
                    let mut cache = state.old_caches[commit_idx].lock().await;
                    cache.insert(query.path.clone(), content.clone());
                    content
                }
            }
            _ => return Err(StatusCode::BAD_REQUEST),
        };

    Ok(Json(serde_json::json!({ "content": content })))
}

async fn add_comment(State(state): State<AppState>, Json(comment): Json<Comment>) -> StatusCode {
    if !comment.is_valid() {
        return StatusCode::BAD_REQUEST;
    }
    let mut comments = state.comments.lock().await;
    comments.push(comment);
    StatusCode::OK
}

async fn complete_review(
    State(state): State<AppState>,
    Json(payload): Json<ReviewComplete>,
) -> StatusCode {
    if payload.comments.iter().any(|c| !c.is_valid()) {
        return StatusCode::BAD_REQUEST;
    }
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
