use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use std::sync::atomic::{AtomicU64, Ordering};
use std::{fs, path::PathBuf, sync::Arc};
use tokio::sync::{mpsc, Mutex};
use tower::util::ServiceExt; // for `oneshot`

static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

fn make_temp_dir() -> PathBuf {
    let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut dir = std::env::temp_dir();
    dir.push(format!("lrv-test-{}-{}", std::process::id(), id));
    let _ = fs::create_dir_all(&dir);
    dir
}

fn cleanup_dir(dir: &PathBuf) {
    let _ = fs::remove_dir_all(dir);
}

fn make_state_with_root(root: &str) -> lrv::server::AppState {
    let diff_data = lrv::types::DiffResponse {
        files: vec![],
        stats: lrv::types::DiffStats {
            files_changed: 0,
            additions: 0,
            deletions: 0,
        },
        commit_hash: None,
        commit_author: None,
        commit_date: None,
        commit_message: None,
    };
    let config = lrv::config::UserConfig::default();
    let context = lrv::types::ProjectContext {
        working_directory: root.to_string(),
        git_branch: None,
        title: None,
        is_public: false,
        claude_skill_installed: false,
    };
    let (shutdown_tx, _rx) = mpsc::channel::<()>(1);
    lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(Mutex::new(vec![])),
        review_notes: Arc::new(Mutex::new(vec![])),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(config)),
        context: Arc::new(context),
        old_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        new_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(
            std::collections::HashMap::new(),
        )]),
        is_series: false,
    }
}

#[tokio::test]
async fn test_file_read_new_ok() {
    let root = make_temp_dir();
    let sub = root.join("subdir");
    fs::create_dir_all(&sub).unwrap();
    let file = sub.join("file.txt");
    fs::write(&file, "hello world").unwrap();

    let state = make_state_with_root(root.to_str().unwrap());
    let app = lrv::server::create_router(state, false);

    let uri = "/api/file?path=subdir/file.txt&side=new".to_string();
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), 1_000_000)
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(v["content"].as_str().unwrap(), "hello world");

    cleanup_dir(&root);
}

#[tokio::test]
async fn test_file_read_missing_404() {
    let root = make_temp_dir();
    let state = make_state_with_root(root.to_str().unwrap());
    let app = lrv::server::create_router(state, false);

    let uri = "/api/file?path=does/not/exist.txt&side=new";
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    cleanup_dir(&root);
}

#[tokio::test]
async fn test_file_read_traversal_rejected_parentdir() {
    let root = make_temp_dir();
    let outside = root.parent().unwrap_or(&root).join("evil.txt");
    let _ = fs::write(&outside, "nope");

    let state = make_state_with_root(root.to_str().unwrap());
    let app = lrv::server::create_router(state, false);

    let uri = "/api/file?path=../evil.txt&side=new";
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    let _ = fs::remove_file(outside);
    cleanup_dir(&root);
}

#[tokio::test]
async fn test_file_read_absolute_rejected() {
    let root = make_temp_dir();
    let abs = root.join("abs.txt");
    fs::write(&abs, "abs").unwrap();

    let state = make_state_with_root(root.to_str().unwrap());
    let app = lrv::server::create_router(state, false);

    let uri = format!("/api/file?path={}&side=new", abs.to_str().unwrap());
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    cleanup_dir(&root);
}

#[tokio::test]
async fn test_file_read_old_side_without_git_repo_ok() {
    let root = make_temp_dir();
    let file = root.join("foo.txt");
    fs::write(&file, "newcontent").unwrap();

    let state = make_state_with_root(root.to_str().unwrap());
    let app = lrv::server::create_router(state, false);
    let uri = "/api/file?path=foo.txt&side=old";
    let res = app
        .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(res.into_body(), 1_000_000)
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(v["content"].as_str().is_some()); // empty string acceptable

    cleanup_dir(&root);
}
