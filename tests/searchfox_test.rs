use axum::{
    body::Body,
    http::{Request, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower::util::ServiceExt;

const PATH: &str = "dom/media/webaudio/AudioNode.cpp";
const SIGNATURE: &str = "void AudioNode::Disconnect(ErrorResult& aRv) {";

const SOURCE: &str = r#"<html><body>
<code role="cell" class="source-line">int x;
</code>
<code role="cell" class="source-line"><span class="syn_type">void</span> AudioNode::<span data-symbols="_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE">Disconnect</span>(ErrorResult&amp; aRv) {
</code>
<code role="cell" class="source-line">}
</code>
</body></html>"#;

const ANALYSIS: &str = concat!(
    r#"{"loc":"00001:0","source":1,"syntax":"def,file","pretty":"file dom/media/webaudio/AudioNode.cpp","sym":"FILE_dom/media/webaudio/AudioNode@2Ecpp"}"#,
    "\n",
    r#"{"loc":"00002:16-26","source":1,"syntax":"def,function","pretty":"function mozilla::dom::AudioNode::Disconnect","sym":"_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE"}"#,
    "\n",
    r#"{"loc":"00002:16-26","target":1,"kind":"def","pretty":"x","sym":"_ZIgnored"}"#,
    "\n",
);

const SEARCH: &str = r#"{
    "normal": {"Definitions": [{"path": "dom/media/webaudio/AudioNode.cpp", "lines": [
        {"lno": 2, "bounds": [16, 26], "line": "void AudioNode::Disconnect(ErrorResult& aRv) {", "context": "", "contextsym": "", "peekRange": "2-2"}
    ]}]},
    "*title*": "Symbol _ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE",
    "*timedout*": false
}"#;

/// Stands in for searchfox.org: serves the analysis and source of one file and a search.
async fn mock_searchfox(uri: Uri) -> Response {
    match uri.path() {
        "/firefox-main/raw-analysis/dom/media/webaudio/AudioNode.cpp" => ANALYSIS.into_response(),
        "/firefox-main/source/dom/media/webaudio/AudioNode.cpp" => SOURCE.into_response(),
        "/firefox-main/search" => SEARCH.into_response(),
        _ => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn start_mock() -> String {
    let app = axum::Router::new().fallback(mock_searchfox);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    format!("http://{address}")
}

fn state(is_public: bool) -> lrv::server::AppState {
    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);
    let context = lrv::types::ProjectContext {
        working_directory: "/tmp".to_string(),
        git_branch: None,
        title: None,
        is_public,
        launch_available: false,
        claude_skill_installed: false,
        comment_store_error: None,
        phabricator_available: false,
        phabricator_revisions: Vec::new(),
        own_revisions: Vec::new(),
        searchfox_tree: lrv::searchfox::SEARCHFOX_TREE.to_owned(),
    };
    lrv::server::AppState {
        diffs: Arc::new(Vec::new()),
        comments: Arc::new(Mutex::new(vec![])),
        overall_comment: Arc::new(Mutex::new(None)),
        notes_version: Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
        launcher: lrv::launch::AgentLauncher::new(),
        review_notes: Arc::new(Mutex::new(vec![])),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(lrv::config::UserConfig::default())),
        context: Arc::new(context),
        old_caches: Arc::new(vec![Mutex::new(Default::default())]),
        new_caches: Arc::new(vec![Mutex::new(Default::default())]),
        is_series: false,
        pull_requests: Default::default(),
        store: None,
        publish: None,
        searchfox: Arc::new(lrv::searchfox::Searchfox::new().expect("searchfox client")),
    }
}

async fn send(app: &axum::Router, request: Request<Body>) -> (StatusCode, serde_json::Value) {
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = serde_json::from_slice(&bytes).unwrap_or(serde_json::Value::Null);
    (status, body)
}

fn resolve_request(path: &str) -> Request<Body> {
    let body = serde_json::json!({
        "path": path,
        "line": 3,
        "col": 20,
        "word": "Disconnect",
        "text": SIGNATURE,
    });
    Request::builder()
        .method("POST")
        .uri("/api/searchfox/resolve")
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

fn search_request() -> Request<Body> {
    Request::builder()
        .uri("/api/searchfox/search?q=symbol:_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE")
        .body(Body::empty())
        .unwrap()
}

// One test, because the mock's URL is passed to every client through SEARCHFOX_BASE_URL.
#[tokio::test]
async fn searchfox_endpoints_gate_and_resolve() {
    std::env::set_var("SEARCHFOX_BASE_URL", start_mock().await);

    let app = lrv::server::create_router(state(false), false);
    let (status, _) = send(&app, resolve_request(PATH)).await;
    assert_eq!(status, StatusCode::CONFLICT, "disabled by default");
    let (status, _) = send(&app, search_request()).await;
    assert_eq!(status, StatusCode::CONFLICT, "disabled by default");

    let enabled = state(false);
    enabled.config.lock().await.searchfox = true;
    let app = lrv::server::create_router(enabled, false);

    let (status, body) = send(&app, resolve_request(PATH)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["query"],
        "symbol:_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE"
    );
    assert_eq!(
        body["pretty"],
        "function mozilla::dom::AudioNode::Disconnect"
    );

    let (status, body) = send(&app, resolve_request("dom/media/webaudio/Missing.cpp")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], "id:Disconnect");
    assert_eq!(body["pretty"], serde_json::Value::Null);

    let (status, body) = send(&app, search_request()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["groups"][0]["kind"], "normal");
    assert_eq!(body["groups"][0]["category"], "Definitions");
    assert_eq!(
        body["groups"][0]["files"][0]["lines"][0]["bounds"],
        serde_json::json!([16, 26])
    );

    let public_state = state(true);
    public_state.config.lock().await.searchfox = true;
    let app = lrv::server::create_router(public_state, false);
    let (status, _) = send(&app, resolve_request(PATH)).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
    let (status, _) = send(&app, search_request()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}
