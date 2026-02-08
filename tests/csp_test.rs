use axum::{body::Body, http::Request};
use tower::util::ServiceExt;

#[tokio::test]
async fn test_csp_header_present() {
    // minimal state
    let diff_data = lrv::types::DiffResponse {
        files: vec![],
        stats: lrv::types::DiffStats {
            files_changed: 0,
            additions: 0,
            deletions: 0,
        },
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
    };
    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);
    let state = lrv::server::AppState {
        diff: std::sync::Arc::new(diff_data),
        comments: std::sync::Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: std::sync::Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: std::sync::Arc::new(tokio::sync::Mutex::new(config)),
        context: std::sync::Arc::new(context),
    };

    let app = lrv::server::create_router(state);

    let res = app
        .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
        .await
        .unwrap();

    let headers = res.headers();
    assert!(headers.get("content-security-policy").is_some());
    assert_eq!(headers.get("x-frame-options").unwrap(), "DENY");
}

#[tokio::test]
async fn test_csp_on_assets_and_api() {
    // minimal state
    let diff_data = lrv::types::DiffResponse {
        files: vec![],
        stats: lrv::types::DiffStats {
            files_changed: 0,
            additions: 0,
            deletions: 0,
        },
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
    };
    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);
    let state = lrv::server::AppState {
        diff: std::sync::Arc::new(diff_data),
        comments: std::sync::Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: std::sync::Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: std::sync::Arc::new(tokio::sync::Mutex::new(config)),
        context: std::sync::Arc::new(context),
    };

    let app = lrv::server::create_router(state);

    // Assets route (will 404 for random file but should include headers)
    let res_assets = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/assets/does-not-exist.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let h_assets = res_assets.headers();
    assert!(h_assets.get("content-security-policy").is_some());
    assert_eq!(h_assets.get("x-frame-options").unwrap(), "DENY");

    // API route
    let res_api = app
        .oneshot(
            Request::builder()
                .uri("/api/diff")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let h_api = res_api.headers();
    assert!(h_api.get("content-security-policy").is_some());
    assert_eq!(h_api.get("x-frame-options").unwrap(), "DENY");
}
