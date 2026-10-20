#[test]
fn test_text_output_single_and_range_lines() {
    let comments = vec![
        lrv::types::Comment {
            file: "a.rs".to_string(),
            line: lrv::types::CommentLine::Single(3),
            side: lrv::types::Side::New,
            body: "single line".to_string(),
            commit_idx: None,
            in_reply_to: None,
        },
        lrv::types::Comment {
            file: "b.rs".to_string(),
            line: lrv::types::CommentLine::Range((10, 12)),
            side: lrv::types::Side::Old,
            body: "range line".to_string(),
            commit_idx: None,
            in_reply_to: None,
        },
    ];

    let text =
        lrv::output::format_output(comments, &lrv::output::OutputFormat::Text, &[], false, None);
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
            in_reply_to: None,
        },
        lrv::types::Comment {
            file: "b.rs".to_string(),
            line: lrv::types::CommentLine::Range((2, 4)),
            side: lrv::types::Side::Old,
            body: "range".to_string(),
            commit_idx: None,
            in_reply_to: None,
        },
    ];

    let json =
        lrv::output::format_output(comments, &lrv::output::OutputFormat::Json, &[], false, None);
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
            stats: DiffStats {
                files_changed: 1,
                additions: 2,
                deletions: 0,
            },
            commit_hash: Some("abc123".to_string()),
            commit_author: None,
            commit_date: None,
            commit_message: Some("First commit".to_string()),
            jj_change_id: None,
        },
        DiffResponse {
            files: vec![],
            stats: DiffStats {
                files_changed: 1,
                additions: 0,
                deletions: 1,
            },
            commit_hash: Some("def456".to_string()),
            commit_author: None,
            commit_date: None,
            commit_message: Some("Second commit".to_string()),
            jj_change_id: None,
        },
    ];

    let comments = vec![
        lrv::types::Comment {
            file: "a.rs".to_string(),
            line: lrv::types::CommentLine::Single(5),
            side: lrv::types::Side::New,
            body: "comment on first".to_string(),
            commit_idx: Some(0),
            in_reply_to: None,
        },
        lrv::types::Comment {
            file: "b.rs".to_string(),
            line: lrv::types::CommentLine::Single(10),
            side: lrv::types::Side::New,
            body: "comment on second".to_string(),
            commit_idx: Some(1),
            in_reply_to: None,
        },
    ];

    let json = lrv::output::format_output(
        comments,
        &lrv::output::OutputFormat::Json,
        &diffs,
        true,
        None,
    );
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

#[test]
fn test_overall_comment_is_top_level_not_attached_to_a_commit() {
    use lrv::types::{DiffResponse, DiffStats};

    let diffs = vec![
        DiffResponse {
            files: vec![],
            stats: DiffStats {
                files_changed: 1,
                additions: 1,
                deletions: 0,
            },
            commit_hash: Some("abc123".to_string()),
            commit_author: None,
            commit_date: None,
            commit_message: Some("First commit".to_string()),
            jj_change_id: None,
        },
        DiffResponse {
            files: vec![],
            stats: DiffStats {
                files_changed: 1,
                additions: 1,
                deletions: 0,
            },
            commit_hash: Some("def456".to_string()),
            commit_author: None,
            commit_date: None,
            commit_message: Some("Second commit".to_string()),
            jj_change_id: None,
        },
    ];

    let json = lrv::output::format_output(
        vec![],
        &lrv::output::OutputFormat::Json,
        &diffs,
        true,
        Some("Looks good overall".to_string()),
    );
    let v: serde_json::Value = serde_json::from_str(&json).expect("valid json");

    assert_eq!(v["overall_comment"], "Looks good overall");
    let commits = v["commits"].as_array().unwrap();
    assert!(commits[0]["comments"].as_array().unwrap().is_empty());
    assert!(commits[1]["comments"].as_array().unwrap().is_empty());
}

#[test]
fn test_no_overall_comment_omits_field() {
    let json =
        lrv::output::format_output(vec![], &lrv::output::OutputFormat::Json, &[], false, None);
    let v: serde_json::Value = serde_json::from_str(&json).expect("valid json");
    assert!(v.get("overall_comment").is_none());
}

#[test]
fn published_output_includes_destinations() {
    use lrv::output::{format_output, with_published, OutputFormat};
    let urls = vec!["https://phab.example/D123".to_string()];
    for series in [false, true] {
        let base = format_output(vec![], &OutputFormat::Json, &[], series, None);
        let agent = with_published(base, &OutputFormat::Json, urls.clone());
        let value: serde_json::Value = serde_json::from_str(&agent).unwrap();
        assert_eq!(value["status"], "completed");
        assert_eq!(value["published"][0], urls[0]);
    }
    assert_eq!(
        with_published("No comments".to_string(), &OutputFormat::Text, urls),
        "No comments\nReview published to Phabricator:\n  https://phab.example/D123"
    );
}

fn reply(body: &str) -> lrv::types::Comment {
    lrv::types::Comment {
        file: "a.rs".to_string(),
        line: lrv::types::CommentLine::Single(3),
        side: lrv::types::Side::New,
        body: body.to_string(),
        commit_idx: None,
        in_reply_to: Some(lrv::types::ReplyTarget {
            id: Some("42".to_string()),
            author: Some("alice".to_string()),
            body: "Why a Vec?\nIt is searched a lot.".to_string(),
            source_url: Some("https://phab.example/D1#inline-42".to_string()),
        }),
    }
}

#[test]
fn text_output_quotes_the_note_a_comment_replies_to() {
    use lrv::output::{format_output, OutputFormat};
    let text = format_output(vec![reply("")], &OutputFormat::Text, &[], false, None);
    assert!(text.contains(
        "a.rs:3 [new]\n  Address this review comment from alice:\n  > Why a Vec?\n  > It is searched a lot.\n  Source: https://phab.example/D1#inline-42\n"
    ));

    let text = format_output(
        vec![reply("Use a HashSet.")],
        &OutputFormat::Text,
        &[],
        false,
        None,
    );
    assert!(text
        .contains("  Use a HashSet.\n  In reply to review comment from alice:\n  > Why a Vec?\n"));
}

#[test]
fn json_output_includes_the_note_a_comment_replies_to() {
    use lrv::output::{format_output, OutputFormat};
    let json = format_output(vec![reply("")], &OutputFormat::Json, &[], false, None);
    let v: serde_json::Value = serde_json::from_str(&json).unwrap();
    let comment = &v["comments"][0];
    assert_eq!(comment["body"], "");
    assert_eq!(comment["in_reply_to"]["id"], "42");
    assert_eq!(comment["in_reply_to"]["author"], "alice");
    assert_eq!(
        comment["in_reply_to"]["body"],
        "Why a Vec?\nIt is searched a lot."
    );

    let plain = lrv::types::Comment {
        in_reply_to: None,
        ..reply("x")
    };
    let json = format_output(vec![plain], &OutputFormat::Json, &[], false, None);
    let v: serde_json::Value = serde_json::from_str(&json).unwrap();
    assert!(v["comments"][0].get("in_reply_to").is_none());
}

#[test]
fn listen_formats_events_even_when_ended() {
    use lrv::agent::Poll;
    use lrv::output::{format_listen, OutputFormat};

    let events = serde_json::json!([
        {"seq": 1, "type": "discussion", "discussion": {
            "id": "first", "created_at": 0, "file": "a.rs", "line": 3, "side": "new", "body": "First line\nSecond line"
        }},
        {"seq": 2, "type": "discussion", "discussion": {
            "id": "second", "thread_id": "first", "created_at": 0, "file": "b.rs", "line": [10, 12], "side": "old", "body": "Range", "commit_idx": 0
        }}
    ]);
    let poll = Poll {
        events: serde_json::from_value(events.clone()).unwrap(),
        cursor: 2,
        ended: true,
    };
    let value: serde_json::Value =
        serde_json::from_str(&format_listen(&poll, &OutputFormat::Json)).unwrap();
    assert_eq!(
        value,
        serde_json::json!({"status": "events", "events": events})
    );
    assert_eq!(
        format_listen(&poll, &OutputFormat::Text),
        "Discussion first on a.rs:3 (new)\n    First line\n    Second line\n\nFollow-up second in thread first on b.rs:10-12 (old) [commit 0]\n    Range"
    );
}

#[test]
fn listen_formats_timeout_and_ended() {
    use lrv::agent::Poll;
    use lrv::output::{format_listen, OutputFormat};

    for (ended, status, text) in [
        (
            false,
            "timeout",
            "No discussion yet; run lrv --listen again.",
        ),
        (true, "ended", "The review has ended."),
    ] {
        let poll = Poll {
            events: vec![],
            cursor: 0,
            ended,
        };
        let value: serde_json::Value =
            serde_json::from_str(&format_listen(&poll, &OutputFormat::Json)).unwrap();
        assert_eq!(value, serde_json::json!({"status": status}));
        assert_eq!(format_listen(&poll, &OutputFormat::Text), text);
    }
}
