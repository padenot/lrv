use axum::{body::Body, http::Request};
use tower::util::ServiceExt;

#[tokio::test]
async fn test_context_includes_title_when_set() {
    // minimal state with title
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
        working_directory: std::env::current_dir()
            .unwrap()
            .to_string_lossy()
            .to_string(),
        git_branch: None,
        title: Some("Test Title".to_string()),
        is_public: false,
            claude_skill_installed: false,
    };
    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);
    let state = lrv::server::AppState {
        diffs: std::sync::Arc::new(vec![diff_data]),
        comments: std::sync::Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: std::sync::Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: std::sync::Arc::new(tokio::sync::Mutex::new(config)),
        context: std::sync::Arc::new(context),
        old_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        new_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        is_series: false,
    };

    let app = lrv::server::create_router(state, false);

    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/context")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(res.status().is_success());
    let bytes = axum::body::to_bytes(res.into_body(), 1_000_000)
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(
        v["title"],
        serde_json::Value::String("Test Title".to_string())
    );
}

#[tokio::test]
async fn test_context_title_null_when_unset() {
    // minimal state without title
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
        working_directory: std::env::current_dir()
            .unwrap()
            .to_string_lossy()
            .to_string(),
        git_branch: None,
        title: None,
        is_public: false,
            claude_skill_installed: false,
    };
    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);
    let state = lrv::server::AppState {
        diffs: std::sync::Arc::new(vec![diff_data]),
        comments: std::sync::Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: std::sync::Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: std::sync::Arc::new(tokio::sync::Mutex::new(config)),
        context: std::sync::Arc::new(context),
        old_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        new_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        is_series: false,
    };

    let app = lrv::server::create_router(state, false);

    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/context")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(res.status().is_success());
    let bytes = axum::body::to_bytes(res.into_body(), 1_000_000)
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(v.get("title").is_some());
    assert!(v["title"].is_null());
}
