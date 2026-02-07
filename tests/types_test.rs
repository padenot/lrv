/// Test DiffResponse structure
#[test]
fn test_diff_response_structure() {
    let response = lrv::types::DiffResponse {
        files: vec![lrv::types::FileDiff {
            path: "test.rs".to_string(),
            old_path: None,
            status: lrv::types::FileStatus::Modified,
            hunks: vec![],
        }],
        stats: lrv::types::DiffStats {
            files_changed: 1,
            additions: 10,
            deletions: 5,
        },
    };

    assert_eq!(response.files.len(), 1);
    assert_eq!(response.files[0].path, "test.rs");
    assert_eq!(response.stats.files_changed, 1);
    assert_eq!(response.stats.additions, 10);
    assert_eq!(response.stats.deletions, 5);
}

/// Test Comment structure
#[test]
fn test_comment_structure() {
    let comment = lrv::types::Comment {
        file: "test.rs".to_string(),
        start_line: 10,
        end_line: 15,
        side: lrv::types::Side::New,
        body: "This needs improvement".to_string(),
        severity: lrv::types::Severity::Issue,
    };

    assert_eq!(comment.file, "test.rs");
    assert_eq!(comment.start_line, 10);
    assert_eq!(comment.end_line, 15);
    assert_eq!(comment.body, "This needs improvement");
}

/// Test ProjectContext structure
#[test]
fn test_project_context() {
    let context = lrv::types::ProjectContext {
        working_directory: "/home/user/project".to_string(),
        git_branch: Some("feature/test".to_string()),
    };

    assert_eq!(context.working_directory, "/home/user/project");
    assert_eq!(context.git_branch, Some("feature/test".to_string()));
}

/// Test Severity enum
#[test]
fn test_severity_serde() {
    use serde_json;

    let comment = serde_json::json!({
        "severity": "issue"
    });

    let severity: lrv::types::Severity =
        serde_json::from_value(comment["severity"].clone()).unwrap();

    assert!(matches!(severity, lrv::types::Severity::Issue));
}

/// Test Side enum
#[test]
fn test_side_serde() {
    use serde_json;

    let data = serde_json::json!({
        "side": "new"
    });

    let side: lrv::types::Side = serde_json::from_value(data["side"].clone()).unwrap();

    assert!(matches!(side, lrv::types::Side::New));
}
