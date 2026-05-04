/// Test DiffResponse structure
#[test]
fn test_diff_response_structure() {
    let response = lrv::types::DiffResponse {
        files: vec![lrv::types::FileDiff {
            path: "test.rs".to_string(),
            old_path: None,
            status: lrv::types::FileStatus::Modified,
            hunks: vec![],
            old_blob: None,
            new_blob: None,
        }],
        stats: lrv::types::DiffStats {
            files_changed: 1,
            additions: 10,
            deletions: 5,
        },
        commit_hash: None,
        commit_author: None,
        commit_date: None,
        commit_message: None,
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
        line: lrv::types::CommentLine::Range((10, 15)),
        side: lrv::types::Side::New,
        body: "This needs improvement".to_string(),
        commit_idx: None,
    };

    assert_eq!(comment.file, "test.rs");
    match comment.line {
        lrv::types::CommentLine::Range((start, end)) => {
            assert_eq!(start, 10);
            assert_eq!(end, 15);
        }
        _ => panic!("expected line range"),
    }
    assert_eq!(comment.body, "This needs improvement");
}

/// Test ProjectContext structure
#[test]
fn test_project_context() {
    let context = lrv::types::ProjectContext {
        working_directory: "/home/user/project".to_string(),
        git_branch: Some("feature/test".to_string()),
        title: None,
        is_public: false,
    };

    assert_eq!(context.working_directory, "/home/user/project");
    assert_eq!(context.git_branch, Some("feature/test".to_string()));
}

/// Test CommentLine enum
#[test]
fn test_comment_line_serde() {
    use serde_json;

    let single = serde_json::json!(12);
    let range = serde_json::json!([10, 15]);

    let l1: lrv::types::CommentLine = serde_json::from_value(single).unwrap();
    let l2: lrv::types::CommentLine = serde_json::from_value(range).unwrap();

    assert!(matches!(l1, lrv::types::CommentLine::Single(12)));
    assert!(matches!(l2, lrv::types::CommentLine::Range((10, 15))));
}

#[test]
fn test_comment_line_validation() {
    assert!(lrv::types::CommentLine::Single(1).is_valid());
    assert!(lrv::types::CommentLine::Range((3, 8)).is_valid());
    assert!(!lrv::types::CommentLine::Single(0).is_valid());
    assert!(!lrv::types::CommentLine::Range((0, 8)).is_valid());
    assert!(!lrv::types::CommentLine::Range((9, 8)).is_valid());
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
