use std::sync::Arc;
use tokio::sync::Mutex;

/// Test that AppState can be created with all required fields
#[test]
fn test_app_state_construction() {
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
        working_directory: "/tmp".to_string(),
        git_branch: Some("main".to_string()),
        title: None,
        is_public: false,
            claude_skill_installed: false,
    };

    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);

    // This would fail to compile if AppState fields change
    let _state = lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(Mutex::new(vec![])),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(config)),
        context: Arc::new(context),
        old_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        new_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        is_series: false,
    };
}

/// Test that router can be created without panicking
#[test]
fn test_create_router() {
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
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(Mutex::new(vec![])),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(config)),
        context: Arc::new(context),
        old_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        new_caches: std::sync::Arc::new(vec![tokio::sync::Mutex::new(std::collections::HashMap::new())]),
        is_series: false,
    };

    // Should not panic
    let _router = lrv::server::create_router(state, false);
}

/// Test that comments can be stored in AppState
#[tokio::test]
async fn test_comment_storage() {
    let (_shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);

    let comments = Arc::new(Mutex::new(vec![]));

    // Add a comment
    {
        let mut comments_lock = comments.lock().await;
        comments_lock.push(lrv::types::Comment {
            file: "test.rs".to_string(),
            line: lrv::types::CommentLine::Single(1),
            side: lrv::types::Side::New,
            body: "test comment".to_string(),
            commit_idx: None,
        });
    }

    // Verify it was stored
    let comments_lock = comments.lock().await;
    assert_eq!(comments_lock.len(), 1);
    assert_eq!(comments_lock[0].file, "test.rs");
    assert_eq!(comments_lock[0].body, "test comment");
}

/// Test config mutation
#[tokio::test]
async fn test_config_mutation() {
    let config = Arc::new(Mutex::new(lrv::config::UserConfig::default()));

    // Modify config
    {
        let mut config_lock = config.lock().await;
        config_lock.color_scheme = "github-dark".to_string();
        config_lock.split_view = false;
    }

    // Verify changes persisted
    let config_lock = config.lock().await;
    assert_eq!(config_lock.color_scheme, "github-dark");
    assert!(!config_lock.split_view);
}
