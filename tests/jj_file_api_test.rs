/// Tests for jj-repo file content loading via `jj file show -r <commit>`.
///
/// These tests create a fake `jj` binary that echoes predetermined content,
/// then verify the server uses the commit hash (not @) for both sides.
use axum::{body::Body, http::Request};
use std::sync::Arc;
use std::{fs, path::PathBuf};
use tokio::sync::{mpsc, Mutex};
use tower::util::ServiceExt;

// Serialize PATH-mutating tests so they don't interfere with each other.
// tokio::sync::Mutex is safe to hold across .await points.
static PATH_LOCK: Mutex<()> = Mutex::const_new(());

fn unique_dir(tag: &str) -> PathBuf {
    let mut dir = std::env::temp_dir();
    dir.push(format!("lrv-jj-test-{}-{}", std::process::id(), tag));
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Write a shell script that acts as a fake `jj`.
/// For `jj file show -r parents(...)`, prints OLD_CONTENT.
/// For `jj file show -r <anything else>`, prints NEW_CONTENT.
fn write_fake_jj(dir: &std::path::Path, old_content: &str, new_content: &str) {
    let script = format!(
        "#!/bin/sh\nREV=\"$4\"\ncase \"$REV\" in\n  parents*|@-) printf '%s' '{}' ;;\n  *)             printf '%s' '{}' ;;\nesac\n",
        old_content.replace('\'', "'\\''"),
        new_content.replace('\'', "'\\''"),
    );
    let path = dir.join("jj");
    fs::write(&path, script).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut p = fs::metadata(&path).unwrap().permissions();
        p.set_mode(0o755);
        fs::set_permissions(&path, p).unwrap();
    }
}

fn make_jj_state(
    working_dir: &std::path::Path,
    commit_hash: Option<&str>,
    file_path: &str,
) -> lrv::server::AppState {
    let diff_data = lrv::types::DiffResponse {
        files: vec![lrv::types::FileDiff {
            path: file_path.to_string(),
            old_path: None,
            status: lrv::types::FileStatus::Modified,
            hunks: vec![],
            old_blob: Some("aabbccdd".to_string()),
            new_blob: Some("eeff1122".to_string()),
            is_binary: false,
        }],
        stats: lrv::types::DiffStats {
            files_changed: 1,
            additions: 1,
            deletions: 1,
        },
        commit_hash: commit_hash.map(str::to_string),
        commit_author: None,
        commit_date: None,
        commit_message: None,
        jj_change_id: None,
    };
    let (shutdown_tx, _rx) = mpsc::channel::<()>(1);
    lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(tokio::sync::Mutex::new(vec![])),
        overall_comment: Arc::new(tokio::sync::Mutex::new(None)),
        notes_version: std::sync::Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
        launcher: lrv::launch::AgentLauncher::new(),
        raw_diffs: std::sync::Arc::new(Vec::new()),
        review_notes: Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: Arc::new(tokio::sync::Mutex::new(lrv::config::UserConfig::default())),
        context: Arc::new(lrv::types::ProjectContext {
            working_directory: working_dir.to_str().unwrap().to_string(),
            git_branch: None,
            title: None,
            is_public: false,
            launch_available: true,
            claude_skill_installed: false,
            comment_store_error: None,
            phabricator_available: false,
        }),
        old_caches: Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        new_caches: Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        is_series: false,
        pull_requests: Default::default(),
        store: None,
        publish: None,
    }
}

async fn get_content(app: axum::Router, path: &str, side: &str) -> String {
    let uri = format!("/api/file?path={}&side={}", path, side);
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let bytes = axum::body::to_bytes(res.into_body(), 1_000_000)
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    v["content"].as_str().unwrap_or("").to_string()
}

async fn get_raw_content(
    app: axum::Router,
    path: &str,
    side: &str,
) -> (axum::http::StatusCode, String) {
    let uri = format!("/api/file/raw?path={}&side={}", path, side);
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = res.status();
    let bytes = axum::body::to_bytes(res.into_body(), 1_000_000)
        .await
        .unwrap();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

#[tokio::test]
async fn test_jj_new_side_uses_commit_hash() {
    let _guard = PATH_LOCK.lock().await;
    let bin_dir = unique_dir("bin-new");
    let repo_dir = unique_dir("repo-new");
    fs::create_dir_all(repo_dir.join(".jj")).unwrap();
    // File on disk (should NOT be served; jj should be used instead)
    fs::write(repo_dir.join("file.c"), "disk content").unwrap();
    write_fake_jj(&bin_dir, "old content\n", "new content\n");

    let orig_path = std::env::var("PATH").unwrap_or_default();
    std::env::set_var(
        "PATH",
        format!("{}:{}", bin_dir.to_str().unwrap(), orig_path),
    );

    let state = make_jj_state(&repo_dir, Some("deadbeef"), "file.c");
    let app = lrv::server::create_router(state, false);
    let content = get_content(app, "file.c", "new").await;

    std::env::set_var("PATH", &orig_path);
    let _ = fs::remove_dir_all(&bin_dir);
    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(content, "new content\n");
}

#[tokio::test]
async fn test_jj_old_side_uses_parents_of_commit_hash() {
    let _guard = PATH_LOCK.lock().await;
    let bin_dir = unique_dir("bin-old");
    let repo_dir = unique_dir("repo-old");
    fs::create_dir_all(repo_dir.join(".jj")).unwrap();
    fs::write(repo_dir.join("file.c"), "disk content").unwrap();
    write_fake_jj(&bin_dir, "old content\n", "new content\n");

    let orig_path = std::env::var("PATH").unwrap_or_default();
    std::env::set_var(
        "PATH",
        format!("{}:{}", bin_dir.to_str().unwrap(), orig_path),
    );

    let state = make_jj_state(&repo_dir, Some("deadbeef"), "file.c");
    let app = lrv::server::create_router(state, false);
    let content = get_content(app, "file.c", "old").await;

    std::env::set_var("PATH", &orig_path);
    let _ = fs::remove_dir_all(&bin_dir);
    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(content, "old content\n");
}

#[tokio::test]
async fn test_jj_old_and_new_differ() {
    let _guard = PATH_LOCK.lock().await;
    let bin_dir = unique_dir("bin-diff");
    let repo_dir = unique_dir("repo-diff");
    fs::create_dir_all(repo_dir.join(".jj")).unwrap();
    fs::write(repo_dir.join("file.c"), "disk content").unwrap();
    write_fake_jj(&bin_dir, "before the change\n", "after the change\n");

    let orig_path = std::env::var("PATH").unwrap_or_default();
    std::env::set_var(
        "PATH",
        format!("{}:{}", bin_dir.to_str().unwrap(), orig_path),
    );

    let state = make_jj_state(&repo_dir, Some("cafebabe"), "file.c");
    let app = lrv::server::create_router(state.clone(), false);
    let new_content = get_content(app, "file.c", "new").await;

    let app2 = lrv::server::create_router(state, false);
    let old_content = get_content(app2, "file.c", "old").await;

    std::env::set_var("PATH", &orig_path);
    let _ = fs::remove_dir_all(&bin_dir);
    let _ = fs::remove_dir_all(&repo_dir);

    assert_ne!(old_content, new_content, "old and new content must differ");
    assert_eq!(old_content, "before the change\n");
    assert_eq!(new_content, "after the change\n");
}

#[tokio::test]
async fn test_jj_raw_old_side_ignores_git_blob_ids() {
    let _guard = PATH_LOCK.lock().await;
    let bin_dir = unique_dir("bin-raw-old");
    let repo_dir = unique_dir("repo-raw-old");
    fs::create_dir_all(repo_dir.join(".jj")).unwrap();
    write_fake_jj(&bin_dir, "old raw content\n", "new raw content\n");

    let orig_path = std::env::var("PATH").unwrap_or_default();
    std::env::set_var(
        "PATH",
        format!("{}:{}", bin_dir.to_str().unwrap(), orig_path),
    );

    let state = make_jj_state(&repo_dir, Some("cafebabe"), "file.c");
    let app = lrv::server::create_router(state, false);
    let (status, content) = get_raw_content(app, "file.c", "old").await;

    std::env::set_var("PATH", &orig_path);
    let _ = fs::remove_dir_all(&bin_dir);
    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(status, axum::http::StatusCode::OK);
    assert_eq!(content, "old raw content\n");
}

#[tokio::test]
async fn test_jj_working_copy_old_side_uses_parent_revision() {
    let _guard = PATH_LOCK.lock().await;
    let bin_dir = unique_dir("bin-working-copy-old");
    let repo_dir = unique_dir("repo-working-copy-old");
    fs::create_dir_all(repo_dir.join(".jj")).unwrap();
    write_fake_jj(&bin_dir, "parent content\n", "working copy content\n");

    let orig_path = std::env::var("PATH").unwrap_or_default();
    std::env::set_var(
        "PATH",
        format!("{}:{}", bin_dir.to_str().unwrap(), orig_path),
    );

    let state = make_jj_state(&repo_dir, None, "file.c");
    let app = lrv::server::create_router(state, false);
    let content = get_content(app, "file.c", "old").await;

    std::env::set_var("PATH", &orig_path);
    let _ = fs::remove_dir_all(&bin_dir);
    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(content, "parent content\n");
}

// --- Issue #6: reviewing a commit that is not the working copy ---------------
//
// `jj diff -r <rev> --git` produces a bare patch with no revision identity, so
// lrv used to fall back to reading `@`/`@-` from the working copy and displayed
// an unrelated revision's contents. These tests build a real jj repository and
// check that the `index` blob OIDs in the patch are used to load the exact
// reviewed content.

/// Run `jj` with the repo's isolated config, returning stdout on success.
fn jj_in(dir: &std::path::Path, args: &[&str]) -> String {
    let out = std::process::Command::new("jj")
        .current_dir(dir)
        .env("JJ_CONFIG", dir.join("jj-config.toml"))
        .env("HOME", dir)
        .env("JJ_USER", "Test User")
        .env("JJ_EMAIL", "test@example.com")
        .args(args)
        .output()
        .expect("failed to run jj");
    assert!(
        out.status.success(),
        "jj {args:?} failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8(out.stdout).unwrap()
}

fn jj_available() -> bool {
    std::process::Command::new("jj")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Build the tree from the issue: `Infrastructure` -> `disliked attempt`, an
/// empty `@` on top, and a working copy that differs from the reviewed commit.
/// Returns (repo_dir, patch_for_the_middle_commit, change_id).
fn build_issue_tree(tag: &str) -> (PathBuf, String, String) {
    let repo_dir = unique_dir(tag);
    let _ = fs::remove_dir_all(&repo_dir);
    fs::create_dir_all(&repo_dir).unwrap();
    fs::write(repo_dir.join("jj-config.toml"), "").unwrap();

    jj_in(&repo_dir, &["git", "init"]);
    fs::write(repo_dir.join("base.txt"), "infra one\ninfra two\n").unwrap();
    jj_in(&repo_dir, &["describe", "-m", "Infrastructure"]);

    jj_in(&repo_dir, &["new", "-m", "disliked attempt"]);
    fs::write(repo_dir.join("base.txt"), "infra one\nDISLIKED two\n").unwrap();
    fs::write(repo_dir.join("newfile.txt"), "DISLIKED new file\n").unwrap();
    jj_in(&repo_dir, &["describe", "-m", "disliked attempt"]);

    // `@` becomes an unrelated, empty commit whose working copy content differs
    // from the commit under review.
    jj_in(&repo_dir, &["new", "-m", "working copy"]);
    fs::write(repo_dir.join("base.txt"), "WORKING copy content\n").unwrap();
    let _ = fs::remove_file(repo_dir.join("newfile.txt"));

    let patch = jj_in(&repo_dir, &["diff", "-r", "@-", "--git"]);
    let change_id = jj_in(
        &repo_dir,
        &["log", "--no-graph", "-r", "@-", "-T", "change_id.short()"],
    )
    .trim()
    .to_string();

    (repo_dir, patch, change_id)
}

/// The diff must carry blob OIDs, otherwise this regression cannot be caught.
fn make_state_from_patch(repo_dir: &std::path::Path, patch: &str) -> lrv::server::AppState {
    let parsed = lrv::diff::parse_diff(patch).expect("patch should parse");
    assert!(
        parsed.files.iter().any(|f| f.old_blob.is_some()),
        "patch should contain index OIDs: {patch}"
    );
    let (shutdown_tx, _rx) = mpsc::channel::<()>(1);
    lrv::server::AppState {
        notes_version: Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
        launcher: lrv::launch::AgentLauncher::new(),
        raw_diffs: Arc::new(Vec::new()),
        diffs: Arc::new(vec![parsed]),
        comments: Arc::new(tokio::sync::Mutex::new(vec![])),
        overall_comment: Arc::new(tokio::sync::Mutex::new(None)),
        review_notes: Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: Arc::new(tokio::sync::Mutex::new(lrv::config::UserConfig::default())),
        context: Arc::new(lrv::types::ProjectContext {
            working_directory: repo_dir.to_str().unwrap().to_string(),
            git_branch: None,
            title: None,
            is_public: false,
            launch_available: true,
            claude_skill_installed: false,
            comment_store_error: None,
            phabricator_available: false,
        }),
        old_caches: Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        new_caches: Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        is_series: false,
        pull_requests: Default::default(),
        store: None,
        publish: None,
    }
}

#[tokio::test]
async fn test_reviewing_non_working_copy_commit_uses_patch_blobs() {
    // Hold the lock first: the fake-jj tests put a stub `jj` on PATH, which
    // would make jj_available() succeed without a real jj installed.
    let _guard = PATH_LOCK.lock().await;
    if !jj_available() {
        eprintln!("skipping: jj not installed");
        return;
    }
    let (repo_dir, patch, _rev) = build_issue_tree("issue6-blobs");

    let state = make_state_from_patch(&repo_dir, &patch);
    let app = lrv::server::create_router(state, false);

    // The reviewed commit changed `base.txt`; the working copy says otherwise.
    let old = get_content(app.clone(), "base.txt", "old").await;
    let new = get_content(app.clone(), "base.txt", "new").await;
    // A file added by the reviewed commit no longer exists in the working copy.
    let added = get_content(app, "newfile.txt", "new").await;

    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(old, "infra one\ninfra two\n", "old side must be the parent");
    assert_eq!(
        new, "infra one\nDISLIKED two\n",
        "new side must be reviewed"
    );
    assert_eq!(
        added, "DISLIKED new file\n",
        "added file must come from patch"
    );
}

#[tokio::test]
async fn test_non_working_copy_commit_raw_sides_use_patch_blobs() {
    // Hold the lock first: the fake-jj tests put a stub `jj` on PATH, which
    // would make jj_available() succeed without a real jj installed.
    let _guard = PATH_LOCK.lock().await;
    if !jj_available() {
        eprintln!("skipping: jj not installed");
        return;
    }
    let (repo_dir, patch, _rev) = build_issue_tree("issue6-raw");

    let state = make_state_from_patch(&repo_dir, &patch);
    let app = lrv::server::create_router(state, false);

    let (old_status, old) = get_raw_content(app.clone(), "base.txt", "old").await;
    let (new_status, new) = get_raw_content(app, "base.txt", "new").await;

    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(old_status, axum::http::StatusCode::OK);
    assert_eq!(new_status, axum::http::StatusCode::OK);
    assert_eq!(old, "infra one\ninfra two\n");
    assert_eq!(new, "infra one\nDISLIKED two\n");
}

/// A `jj`-only checkout without `.git` keeps its objects in
/// `.jj/repo/store/git`; the patch OIDs must still resolve there.
#[tokio::test]
async fn test_non_colocated_jj_store_resolves_patch_blobs() {
    // Hold the lock first: the fake-jj tests put a stub `jj` on PATH, which
    // would make jj_available() succeed without a real jj installed.
    let _guard = PATH_LOCK.lock().await;
    if !jj_available() {
        eprintln!("skipping: jj not installed");
        return;
    }
    let repo_dir = unique_dir("issue6-no-colocate");
    let _ = fs::remove_dir_all(&repo_dir);
    fs::create_dir_all(&repo_dir).unwrap();
    fs::write(repo_dir.join("jj-config.toml"), "").unwrap();

    jj_in(&repo_dir, &["git", "init", "--no-colocate"]);
    fs::write(repo_dir.join("base.txt"), "infra one\n").unwrap();
    jj_in(&repo_dir, &["describe", "-m", "Infrastructure"]);
    jj_in(&repo_dir, &["new", "-m", "disliked attempt"]);
    fs::write(repo_dir.join("base.txt"), "DISLIKED one\n").unwrap();
    jj_in(&repo_dir, &["describe", "-m", "disliked attempt"]);
    jj_in(&repo_dir, &["new", "-m", "working copy"]);
    fs::write(repo_dir.join("base.txt"), "WORKING copy\n").unwrap();

    assert!(
        !repo_dir.join(".git").exists(),
        "test requires a non-colocated repo"
    );
    let patch = jj_in(&repo_dir, &["diff", "-r", "@-", "--git"]);

    let state = make_state_from_patch(&repo_dir, &patch);
    let app = lrv::server::create_router(state, false);
    let old = get_content(app.clone(), "base.txt", "old").await;
    let new = get_content(app, "base.txt", "new").await;

    let _ = fs::remove_dir_all(&repo_dir);

    assert_eq!(old, "infra one\n");
    assert_eq!(new, "DISLIKED one\n");
}
