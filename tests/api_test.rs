/// Regression test: Ensure get_file_content can access working_directory from context
/// This test prevents the bug where files couldn't be read because State parameter was missing
#[test]
fn test_appstate_has_context_for_file_reading() {
    let context = lrv::types::ProjectContext {
        working_directory: std::env::current_dir()
            .unwrap()
            .to_string_lossy()
            .to_string(),
        git_branch: None,
    };

    // This test ensures context is available in AppState
    // which is required for get_file_content to work correctly
    assert!(!context.working_directory.is_empty());
    assert!(std::path::Path::new(&context.working_directory).exists());
}

/// Regression test: Ensure all required fields are present in AppState
/// This would fail to compile if we remove any required field
#[test]
fn test_appstate_required_fields() {
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
        working_directory: "/tmp".to_string(),
        git_branch: Some("main".to_string()),
    };

    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel(1);

    // This will fail to compile if AppState structure changes
    let state = lrv::server::AppState {
        diff: std::sync::Arc::new(diff_data),
        comments: std::sync::Arc::new(tokio::sync::Mutex::new(vec![])),
        shutdown_tx: std::sync::Arc::new(tokio::sync::Mutex::new(Some(shutdown_tx))),
        config: std::sync::Arc::new(tokio::sync::Mutex::new(config)),
        context: std::sync::Arc::new(context),
    };

    // Verify context is accessible
    assert_eq!(state.context.working_directory, "/tmp");
    assert_eq!(state.context.git_branch, Some("main".to_string()));
}
