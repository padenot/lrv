#[test]
fn test_text_output_single_and_range_lines() {
    let comments = vec![
        lrv::types::Comment {
            file: "a.rs".to_string(),
            line: lrv::types::CommentLine::Single(3),
            side: lrv::types::Side::New,
            body: "single line".to_string(),
            commit_idx: None,
        },
        lrv::types::Comment {
            file: "b.rs".to_string(),
            line: lrv::types::CommentLine::Range((10, 12)),
            side: lrv::types::Side::Old,
            body: "range line".to_string(),
            commit_idx: None,
        },
    ];

    let text = lrv::output::format_output(comments, &lrv::output::OutputFormat::Text, &[], false);
    assert!(text.contains("a.rs:3 [new]"));
    assert!(text.contains("b.rs:10-12 [old]"));
}

#[test]
fn test_json_output_line_shape() {
    let comments = vec![
        lrv::types::Comment {
            file: "a.rs".to_string(),
            line: lrv::types::CommentLine::Single(7),
            side: lrv::types::Side::New,
            body: "single".to_string(),
            commit_idx: None,
        },
        lrv::types::Comment {
            file: "b.rs".to_string(),
            line: lrv::types::CommentLine::Range((2, 4)),
            side: lrv::types::Side::Old,
            body: "range".to_string(),
            commit_idx: None,
        },
    ];

    let json = lrv::output::format_output(comments, &lrv::output::OutputFormat::Json, &[], false);
    let value: serde_json::Value = serde_json::from_str(&json).expect("valid json");
    let arr = value["comments"].as_array().expect("comments array");
    assert_eq!(arr[0]["line"], serde_json::json!(7));
    assert_eq!(arr[1]["line"], serde_json::json!([2, 4]));
}

#[test]
fn test_series_json_output_nested_by_commit() {
    use lrv::types::{DiffResponse, DiffStats};

    let diffs = vec![
        DiffResponse {
            files: vec![],
            stats: DiffStats { files_changed: 1, additions: 2, deletions: 0 },
            commit_hash: Some("abc123".to_string()),
            commit_author: None,
            commit_date: None,
            commit_message: Some("First commit".to_string()),
        },
        DiffResponse {
            files: vec![],
            stats: DiffStats { files_changed: 1, additions: 0, deletions: 1 },
            commit_hash: Some("def456".to_string()),
            commit_author: None,
            commit_date: None,
            commit_message: Some("Second commit".to_string()),
        },
    ];

    let comments = vec![
        lrv::types::Comment {
            file: "a.rs".to_string(),
            line: lrv::types::CommentLine::Single(5),
            side: lrv::types::Side::New,
            body: "comment on first".to_string(),
            commit_idx: Some(0),
        },
        lrv::types::Comment {
            file: "b.rs".to_string(),
            line: lrv::types::CommentLine::Single(10),
            side: lrv::types::Side::New,
            body: "comment on second".to_string(),
            commit_idx: Some(1),
        },
    ];

    let json = lrv::output::format_output(comments, &lrv::output::OutputFormat::Json, &diffs, true);
    let v: serde_json::Value = serde_json::from_str(&json).expect("valid json");

    // Top-level should have commits array, not comments
    assert!(v["commits"].is_array(), "should have commits array");
    assert!(v["comments"].is_null(), "should not have flat comments");

    let commits = v["commits"].as_array().unwrap();
    assert_eq!(commits.len(), 2);

    // Commit 0 has one comment, commit_idx stripped
    assert_eq!(commits[0]["idx"], 0);
    assert_eq!(commits[0]["commit_hash"], "abc123");
    assert_eq!(commits[0]["commit_message"], "First commit");
    let c0 = commits[0]["comments"].as_array().unwrap();
    assert_eq!(c0.len(), 1);
    assert!(c0[0]["commit_idx"].is_null(), "commit_idx should be absent");

    // Commit 1 has one comment
    assert_eq!(commits[1]["idx"], 1);
    let c1 = commits[1]["comments"].as_array().unwrap();
    assert_eq!(c1.len(), 1);
}
