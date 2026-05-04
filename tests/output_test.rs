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

    let text = lrv::output::format_output(comments, &lrv::output::OutputFormat::Text);
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

    let json = lrv::output::format_output(comments, &lrv::output::OutputFormat::Json);
    let value: serde_json::Value = serde_json::from_str(&json).expect("valid json");
    let arr = value["comments"].as_array().expect("comments array");
    assert_eq!(arr[0]["line"], serde_json::json!(7));
    assert_eq!(arr[1]["line"], serde_json::json!([2, 4]));
}
