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
        "#!/bin/sh\nREV=\"$4\"\ncase \"$REV\" in\n  parents*) printf '%s' '{}' ;;\n  *)        printf '%s' '{}' ;;\nesac\n",
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
    commit_hash: &str,
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
        }],
        stats: lrv::types::DiffStats {
            files_changed: 1,
            additions: 1,
            deletions: 1,
        },
        commit_hash: Some(commit_hash.to_string()),
        commit_author: None,
        commit_date: None,
        commit_message: None,
            jj_change_id: None,
    };
    let (shutdown_tx, _rx) = mpsc::channel::<()>(1);
    lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(tokio::sync::Mutex::new(vec![])),
        review_notes: Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: Arc::new(tokio::sync::Mutex::new(lrv::config::UserConfig::default())),
        context: Arc::new(lrv::types::ProjectContext {
            working_directory: working_dir.to_str().unwrap().to_string(),
            git_branch: None,
            title: None,
            is_public: false,
            claude_skill_installed: false,
        }),
        old_caches: Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        new_caches: Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        is_series: false,
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

    let state = make_jj_state(&repo_dir, "deadbeef", "file.c");
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

    let state = make_jj_state(&repo_dir, "deadbeef", "file.c");
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

    let state = make_jj_state(&repo_dir, "cafebabe", "file.c");
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
