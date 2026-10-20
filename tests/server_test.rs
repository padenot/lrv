use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio_stream::StreamExt;
use tower::util::ServiceExt;

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
        jj_change_id: None,
    };

    let config = lrv::config::UserConfig::default();
    let context = lrv::types::ProjectContext {
        working_directory: "/tmp".to_string(),
        git_branch: Some("main".to_string()),
        title: None,
        is_public: false,
        claude_skill_installed: false,
        comment_store_error: None,
        phabricator_available: false,
    };

    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);

    // This would fail to compile if AppState fields change
    let _state = lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(Mutex::new(vec![])),
        overall_comment: Arc::new(Mutex::new(None)),
        notes_version: std::sync::Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
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
        pull_requests: Default::default(),
        store: None,
        publish: None,
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
        jj_change_id: None,
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
        comment_store_error: None,
        phabricator_available: false,
    };

    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);

    let state = lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(Mutex::new(vec![])),
        overall_comment: Arc::new(Mutex::new(None)),
        notes_version: std::sync::Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
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
        pull_requests: Default::default(),
        store: None,
        publish: None,
    };

    // Should not panic
    let _router = lrv::server::create_router(state, false);
}

fn review_note_state() -> lrv::server::AppState {
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
        jj_change_id: None,
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
        comment_store_error: None,
        phabricator_available: false,
    };

    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);

    lrv::server::AppState {
        diffs: Arc::new(vec![diff_data]),
        comments: Arc::new(Mutex::new(vec![])),
        overall_comment: Arc::new(Mutex::new(None)),
        notes_version: std::sync::Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
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
        is_series: true,
        pull_requests: Default::default(),
        store: None,
        publish: None,
    }
}

#[tokio::test]
async fn test_review_note_api_round_trip() {
    let state = review_note_state();
    let agent = state.agent.clone();
    assert!(!agent.attached());
    let app = lrv::server::create_router(state, false);
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/phabricator")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    for token in [None, Some("Bearer wrong-token")] {
        let mut request = Request::builder()
            .method("POST")
            .uri("/api/review-notes")
            .header("content-type", "application/json");
        if let Some(token) = token {
            request = request.header("authorization", token);
        }
        let response = app
            .clone()
            .oneshot(request.body(Body::from("[]")).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
    let events = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/events")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(events.status(), StatusCode::OK);
    let mut stream = events.into_body().into_data_stream();
    let mut buffer = String::new();
    tokio::time::timeout(Duration::from_secs(2), async {
        while !buffer.contains("event: notes") || !buffer.contains("event: agent") {
            let chunk = stream.next().await.unwrap().unwrap();
            buffer.push_str(std::str::from_utf8(&chunk).unwrap());
        }
    })
    .await
    .unwrap();
    assert!(buffer.contains("data: {\"version\":0}"));
    assert!(buffer.contains("data: {\"attached\":false}"));
    let waiter = agent.clone();
    let poll = tokio::spawn(async move { waiter.wait(0, Duration::from_secs(5)).await });
    tokio::time::timeout(Duration::from_secs(2), async {
        while !buffer.contains("data: {\"attached\":true}") {
            let chunk = stream.next().await.unwrap().unwrap();
            buffer.push_str(std::str::from_utf8(&chunk).unwrap());
        }
    })
    .await
    .unwrap();
    poll.abort();
    let _ = poll.await;
    let note = serde_json::json!({
        "id": "n1",
        "file": "src/lib.rs",
        "line": [3, 4],
        "side": "new",
        "body": "please consider this\nsecond line",
        "author": "Reviewer"
    });
    let plain =
        serde_json::json!({"file": "src/lib.rs", "line": 1, "side": "new", "body": "no id"});

    let post = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/review-notes")
                .header("authorization", "Bearer test-token")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::json!([note]).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(post.status(), StatusCode::OK);
    assert!(agent.attached());
    let frame = tokio::time::timeout(Duration::from_secs(2), stream.next())
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    let frame = String::from_utf8(frame.to_vec()).unwrap();
    assert!(frame.contains("event: notes"));
    assert!(frame.contains("data: {\"version\":1}"));

    for (batch, expected, status) in [
        (
            serde_json::json!([note]),
            serde_json::json!({"added": 0, "skipped": 1}),
            StatusCode::OK,
        ),
        (
            serde_json::json!([plain, plain]),
            serde_json::json!({"added": 1, "skipped": 1}),
            StatusCode::OK,
        ),
        (
            serde_json::json!([plain]),
            serde_json::json!({"added": 0, "skipped": 1}),
            StatusCode::OK,
        ),
        (
            serde_json::json!([{"file": "a", "line": 0, "side": "new", "body": "bad"}]),
            serde_json::Value::Null,
            StatusCode::BAD_REQUEST,
        ),
        (
            serde_json::json!([{"file": "a", "line": 1, "side": "new", "body": "bad", "commit_idx": 1}]),
            serde_json::Value::Null,
            StatusCode::BAD_REQUEST,
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/review-notes")
                    .header("authorization", "Bearer test-token")
                    .header("content-type", "application/json")
                    .body(Body::from(batch.to_string()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), status);
        if status == StatusCode::OK {
            let bytes = axum::body::to_bytes(response.into_body(), 1024)
                .await
                .unwrap();
            assert_eq!(
                serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
                expected
            );
        }
    }
    // Only the batch that added a note bumps the version.
    let frame = tokio::time::timeout(Duration::from_secs(2), stream.next())
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    let frame = String::from_utf8(frame.to_vec()).unwrap();
    assert!(frame.contains("data: {\"version\":2}"));
    assert!(
        tokio::time::timeout(Duration::from_millis(100), stream.next())
            .await
            .is_err()
    );
    let get = app
        .oneshot(
            Request::builder()
                .uri("/api/review-notes")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(get.into_body(), 1_000_000)
        .await
        .unwrap();
    let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(value[0]["id"], "n1");
    assert_eq!(value[0]["commit_idx"], 0);
    assert_eq!(value[0]["line"], serde_json::json!([3, 4]));
    assert_eq!(value[0]["body"], "please consider this\nsecond line");
    assert_eq!(value.as_array().unwrap().len(), 2);
    assert!(value[1]["id"].as_str().unwrap().starts_with("lrv-"));
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
            in_reply_to: None,
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

#[tokio::test(start_paused = true)]
async fn test_agent_events_api() {
    let state = review_note_state();
    let agent = state.agent.clone();
    let app = lrv::server::create_router(state, false);
    for token in [None, Some("Bearer wrong-token")] {
        let mut request = Request::builder().uri("/api/agent/events");
        if let Some(token) = token {
            request = request.header("authorization", token);
        }
        let response = app
            .clone()
            .oneshot(request.body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
    assert!(!agent.attached());
    for (uri, expected) in [
        (
            "/api/agent/events?timeout=1",
            serde_json::json!({"events": [], "cursor": 0, "ended": false}),
        ),
        (
            "/api/agent/events?after=0",
            serde_json::json!({"events": [{"seq": 1, "type": "discussion", "discussion": {
            "id": "d1", "created_at": 0, "file": "src/lib.rs", "line": 3, "side": "new", "body": "Discuss this"
        }}], "cursor": 1, "ended": false}),
        ),
        (
            "/api/agent/events?after=1&timeout=1",
            serde_json::json!({"events": [], "cursor": 1, "ended": false}),
        ),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(uri)
                    .header("authorization", "Bearer test-token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
            expected
        );
        if uri == "/api/agent/events?timeout=1" {
            agent.push(lrv::agent::AgentEvent::Discussion {
                discussion: lrv::agent::Discussion {
                    thread_id: None,
                    id: "d1".into(),
                    created_at: 0,
                    file: "src/lib.rs".into(),
                    line: lrv::types::CommentLine::Single(3),
                    side: lrv::types::Side::New,
                    body: "Discuss this".into(),
                    commit_idx: None,
                },
            });
        }
    }
}

fn discussion_request(payload: serde_json::Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/discussions")
        .header("content-type", "application/json")
        .body(Body::from(payload.to_string()))
        .unwrap()
}

#[tokio::test]
async fn test_discussion_api_round_trip_and_submission_isolation() {
    let mut state = review_note_state();
    state.is_series = false;
    let app = lrv::server::create_router(state.clone(), false);
    let payload = serde_json::json!({
        "file": "src/lib.rs", "line": [3, 4], "side": "new", "body": "Discuss this"
    });
    let response = app
        .clone()
        .oneshot(discussion_request(payload.clone()))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CONFLICT);
    assert!(state.agent.discussions().is_empty());

    state.agent.touch();
    let response = app
        .clone()
        .oneshot(discussion_request(payload.clone()))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), 4096)
        .await
        .unwrap();
    let discussion: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(discussion["id"], "lrv-discussion-1");
    assert!(discussion["created_at"].as_u64().unwrap() > 0);
    assert!(discussion.get("commit_idx").is_none());
    for key in ["file", "line", "side", "body"] {
        assert_eq!(discussion[key], payload[key]);
    }
    for (uri, expected) in [
        (
            "/api/agent/events?after=0&timeout=1",
            serde_json::json!({"events": [{"seq": 1, "type": "discussion", "discussion": discussion}], "cursor": 1, "ended": false}),
        ),
        ("/api/discussions", serde_json::json!([discussion])),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(uri)
                    .header("authorization", "Bearer test-token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
            expected
        );
    }
    assert!(state.comments.lock().await.is_empty());
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/complete")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"comments":[]}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let comments = state.comments.lock().await.clone();
    assert!(comments.is_empty());
    let output = lrv::output::format_output(
        comments,
        &lrv::output::OutputFormat::Json,
        &state.diffs,
        state.is_series,
        state.overall_comment.lock().await.clone(),
    );
    let output: serde_json::Value = serde_json::from_str(&output).unwrap();
    assert_eq!(output["comments"], serde_json::json!([]));
    assert!(!output.to_string().contains("Discuss this"));
}

#[tokio::test]
async fn test_discussion_validation() {
    let state = review_note_state();
    state.agent.touch();
    let app = lrv::server::create_router(state.clone(), false);
    for invalid in [
        serde_json::json!({"line": 0}),
        serde_json::json!({"line": [4, 3]}),
        serde_json::json!({"body": " \n\t"}),
        serde_json::json!({"file": ""}),
        serde_json::json!({"commit_idx": 1}),
    ] {
        let mut payload = serde_json::json!({
            "file": "src/lib.rs", "line": 3, "side": "new", "body": "Discuss this"
        });
        for (key, value) in invalid.as_object().unwrap() {
            payload[key] = value.clone();
        }
        let response = app
            .clone()
            .oneshot(discussion_request(payload))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
    assert!(state.agent.discussions().is_empty());
}

#[tokio::test]
async fn test_discussion_public_mode_refuses_with_or_without_agent() {
    let mut state = review_note_state();
    Arc::make_mut(&mut state.context).is_public = true;
    let app = lrv::server::create_router(state.clone(), false);
    for attached in [false, true] {
        if attached {
            state.agent.touch();
        }
        let response = app
            .clone()
            .oneshot(discussion_request(serde_json::json!({
                "file": "src/lib.rs", "line": 3, "side": "new", "body": "Discuss this"
            })))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
    assert!(state.agent.discussions().is_empty());
}

#[tokio::test]
async fn test_discussion_single_commit_series_pinning() {
    let state = review_note_state();
    state.agent.touch();
    let app = lrv::server::create_router(state, false);
    let response = app
        .oneshot(discussion_request(serde_json::json!({
            "file": "src/lib.rs", "line": 3, "side": "new", "body": "Discuss this"
        })))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(response.into_body(), 4096)
        .await
        .unwrap();
    let discussion: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(discussion["commit_idx"], 0);
}

async fn response_json(response: axum::response::Response) -> serde_json::Value {
    let bytes = axum::body::to_bytes(response.into_body(), 65536)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

fn reply_request(batch: serde_json::Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/review-notes")
        .header("authorization", "Bearer test-token")
        .header("content-type", "application/json")
        .body(Body::from(batch.to_string()))
        .unwrap()
}

#[tokio::test]
async fn test_discussion_threads_and_agent_replies() {
    let state = review_note_state();
    state.agent.touch();
    let app = lrv::server::create_router(state.clone(), false);
    let root = response_json(
        app.clone()
            .oneshot(discussion_request(serde_json::json!({
                "file": "root.rs", "line": [3, 5], "side": "old", "body": "Question"
            })))
            .await
            .unwrap(),
    )
    .await;
    assert_eq!(root["commit_idx"], 0);
    let follow = response_json(
        app.clone()
            .oneshot(discussion_request(serde_json::json!({
                "thread_id": root["id"], "body": "Follow up"
            })))
            .await
            .unwrap(),
    )
    .await;
    for key in ["file", "line", "side", "commit_idx"] {
        assert_eq!(follow[key], root[key]);
    }
    assert_eq!(follow["thread_id"], root["id"]);
    let poll = response_json(
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/agent/events?after=1&timeout=1")
                    .header("authorization", "Bearer test-token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    assert_eq!(poll["events"][0]["discussion"], follow);
    assert_eq!(poll["events"][0]["seq"], 2);

    for id in [serde_json::json!("unknown"), follow["id"].clone()] {
        let response = app
            .clone()
            .oneshot(discussion_request(serde_json::json!({
                "thread_id": id, "body": "Invalid follow up"
            })))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let response = app.clone().oneshot(reply_request(serde_json::json!([
            {"file": "ordinary.rs", "line": 1, "side": "new", "body": "Don't store this"},
            {"file": "wrong.rs", "line": 1, "side": "new", "body": "Done.", "discussion_id": root["id"]},
            {"file": "wrong.rs", "line": 1, "side": "new", "body": "Done.", "discussion_id": id}
        ]))).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert!(state.review_notes.lock().await.is_empty());
    }
    for missing in ["file", "line", "side"] {
        let mut payload =
            serde_json::json!({"file": "a.rs", "line": 1, "side": "new", "body": "Question"});
        payload.as_object_mut().unwrap().remove(missing);
        assert_eq!(
            app.clone()
                .oneshot(discussion_request(payload))
                .await
                .unwrap()
                .status(),
            StatusCode::BAD_REQUEST
        );
    }
    let mut reply = serde_json::json!({
        "file": "wrong.rs", "line": 9, "side": "new", "body": "Done.",
        "discussion_id": root["id"], "date": "untrusted date"
    });
    let before = lrv::types::rfc3339_utc(std::time::SystemTime::now());
    let response = app
        .clone()
        .oneshot(reply_request(serde_json::json!([reply, reply])))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response_json(response).await,
        serde_json::json!({"added": 2, "skipped": 0})
    );
    reply["id"] = serde_json::json!("idempotent-reply");
    for expected in [
        serde_json::json!({"added": 1, "skipped": 0}),
        serde_json::json!({"added": 0, "skipped": 1}),
    ] {
        let response = app
            .clone()
            .oneshot(reply_request(serde_json::json!([reply])))
            .await
            .unwrap();
        assert_eq!(response_json(response).await, expected);
    }
    let notes = response_json(
        app.clone()
            .oneshot(
                Request::builder()
                    .uri("/api/review-notes")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    let notes = notes.as_array().unwrap();
    assert_eq!(notes.len(), 3);
    assert_ne!(notes[0]["id"], notes[1]["id"]);
    let after = lrv::types::rfc3339_utc(std::time::SystemTime::now());
    for note in notes {
        for key in ["file", "line", "side", "commit_idx"] {
            assert_eq!(note[key], root[key]);
        }
        assert_eq!(note["read_only"], true);
        let date = note["date"].as_str().unwrap();
        assert!(date >= before.as_str() && date <= after.as_str());
        assert_eq!(date.len(), 24);
    }
}
