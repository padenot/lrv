use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower::util::ServiceExt;

const PATH: &str = "dom/media/webaudio/AudioNode.cpp";
const SIGNATURE: &str = "void AudioNode::Disconnect(ErrorResult& aRv) {";
const SYMBOL_QUERY: &str = "symbol:_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE";

/// What searchfox indexed: a file whose lines are `INDEXED`.
const INDEXED: &str = "int x;\nvoid AudioNode::Disconnect(ErrorResult& aRv) {\n}\n";
/// The commit before the indexed one, with different text: a lookup that used its parent (or a
/// stale revision) would map lines onto it.
const PARENT: &str = "unrelated();\n";
/// The reviewed new side: `INDEXED` with a line added above it and a call added below it.
const REVIEWED: &str =
    "// new\nint x;\nvoid AudioNode::Disconnect(ErrorResult& aRv) {\n}\nDisconnect(aRv);\n";

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

/// The source page searchfox serves for the head, for lookups without a local copy.
const SOURCE: &str = r#"<html><body>
<code role="cell" class="source-line">int x;
</code>
<code role="cell" class="source-line"><span class="syn_type">void</span> AudioNode::<span data-symbols="_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE">Disconnect</span>(ErrorResult&amp; aRv) {
</code>
<code role="cell" class="source-line">}
</code>
</body></html>"#;

/// The two revisions searchfox can report: `old` is the head before the reindex, `new` after.
struct Hashes {
    git_old: String,
    git_new: String,
}

/// Stands in for searchfox.org. While `moving`, the first read of the head is the old revision.
struct Mock {
    hashes: Hashes,
    moving: bool,
    /// Whether the GitHub stand-in serves the indexed revision's file.
    github: bool,
    head_reads: AtomicUsize,
    analysis_reads: AtomicUsize,
    github_reads: AtomicUsize,
}

async fn mock_searchfox(State(mock): State<Arc<Mock>>, uri: Uri) -> Response {
    let path = uri.path();
    if let Some(raw) = path.strip_prefix("/github/") {
        mock.github_reads.fetch_add(1, Ordering::SeqCst);
        if mock.github && raw == format!("{}/{PATH}", mock.hashes.git_new) {
            return INDEXED.into_response();
        }
        return StatusCode::NOT_FOUND.into_response();
    }
    if path == "/firefox-main/commit-info/HEAD" {
        // As searchfox serves it today: no `rev`, and `parent` is the head's parent, which is
        // deliberately not the indexed revision.
        let parent = &mock.hashes.git_old;
        return format!(r#"[{{"header":"h","parent":"{parent}","date":"d","phab":null}}]"#)
            .into_response();
    }
    if path == "/firefox-main/source/.gitignore" {
        let read = mock.head_reads.fetch_add(1, Ordering::SeqCst);
        let git = if mock.moving && read == 0 {
            &mock.hashes.git_old
        } else {
            &mock.hashes.git_new
        };
        return format!(
            r#"<html><a id="panel-permalink" href="/firefox-main/rev/{git}/.gitignore" title="t"></a></html>"#
        )
        .into_response();
    }
    if path == format!("/firefox-main/raw-analysis/{PATH}") {
        mock.analysis_reads.fetch_add(1, Ordering::SeqCst);
        return ANALYSIS.into_response();
    }
    if path == format!("/firefox-main/source/{PATH}") {
        return SOURCE.into_response();
    }
    if path == "/firefox-main/search" {
        return SEARCH.into_response();
    }
    StatusCode::NOT_FOUND.into_response()
}

/// Serves the mock and points searchfox clients at it. Every `Searchfox` built afterwards uses it.
async fn start_mock(hashes: Hashes, moving: bool, github: bool) -> Arc<Mock> {
    let mock = Arc::new(Mock {
        hashes,
        moving,
        github,
        head_reads: AtomicUsize::new(0),
        analysis_reads: AtomicUsize::new(0),
        github_reads: AtomicUsize::new(0),
    });
    let app = axum::Router::new()
        .fallback(mock_searchfox)
        .with_state(Arc::clone(&mock));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    std::env::set_var("SEARCHFOX_BASE_URL", format!("http://{address}"));
    std::env::set_var("LRV_GITHUB_RAW_URL", format!("http://{address}/github"));
    mock
}

fn git(dir: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .env("GIT_AUTHOR_NAME", "lrv")
        .env("GIT_AUTHOR_EMAIL", "lrv@example.invalid")
        .env("GIT_COMMITTER_NAME", "lrv")
        .env("GIT_COMMITTER_EMAIL", "lrv@example.invalid")
        .output()
        .unwrap();
    assert!(output.status.success(), "git {args:?} failed");
    String::from_utf8(output.stdout).unwrap().trim().to_owned()
}

/// A repository whose head commit is what searchfox indexed, with its parent differing.
fn indexed_repository(dir: &Path) -> (String, String) {
    std::fs::create_dir_all(dir.join("dom/media/webaudio")).unwrap();
    git(dir, &["init", "-q"]);
    std::fs::write(dir.join(PATH), PARENT).unwrap();
    git(dir, &["add", "."]);
    git(dir, &["commit", "-q", "-m", "parent"]);
    let git_old = git(dir, &["rev-parse", "HEAD"]);
    std::fs::write(dir.join(PATH), INDEXED).unwrap();
    git(dir, &["commit", "-q", "-a", "-m", "indexed"]);
    let git_new = git(dir, &["rev-parse", "HEAD"]);
    (git_old, git_new)
}

fn scratch_dir(name: &str) -> PathBuf {
    let dir =
        std::env::temp_dir().join(format!("lrv-searchfox-test-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn state(working_dir: &Path, is_public: bool, searchfox: bool) -> lrv::server::AppState {
    let working_dir = working_dir.to_string_lossy().into_owned();
    let (shutdown_tx, _rx) = tokio::sync::mpsc::channel::<()>(1);
    let context = lrv::types::ProjectContext {
        working_directory: working_dir.clone(),
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
    let diff = lrv::types::DiffResponse {
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
    let config = lrv::config::UserConfig {
        searchfox,
        ..Default::default()
    };
    lrv::server::AppState {
        diffs: Arc::new(vec![diff]),
        comments: Arc::new(Mutex::new(vec![])),
        overall_comment: Arc::new(Mutex::new(None)),
        notes_version: Arc::new(tokio::sync::watch::channel(0).0),
        agent_token: Arc::from("test-token"),
        agent: lrv::agent::AgentChannel::new(lrv::agent::lease_from_env()),
        launcher: lrv::launch::AgentLauncher::new(),
        review_notes: Arc::new(Mutex::new(vec![])),
        shutdown_tx: Arc::new(Mutex::new(Some(shutdown_tx))),
        config: Arc::new(Mutex::new(config)),
        context: Arc::new(context),
        // The reviewed new side is served from the cache, so the working directory need not
        // hold the file.
        old_caches: Arc::new(vec![Mutex::new(HashMap::new())]),
        new_caches: Arc::new(vec![Mutex::new(HashMap::from([(
            PATH.to_owned(),
            REVIEWED.to_owned(),
        )]))]),
        is_series: false,
        pull_requests: Default::default(),
        store: None,
        publish: None,
        searchfox: Arc::new(lrv::searchfox::Searchfox::new(working_dir).expect("searchfox client")),
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

fn resolve_request(line: usize, text: &str, col: usize) -> Request<Body> {
    let body = serde_json::json!({
        "path": PATH,
        "line": line,
        "col": col,
        "word": "Disconnect",
        "text": text,
        "side": "new",
        "commit_idx": 0,
    });
    Request::builder()
        .method("POST")
        .uri("/api/searchfox/resolve")
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

fn line_request(line: usize, revision: &str) -> Request<Body> {
    Request::builder()
        .uri(format!(
            "/api/searchfox/line?path={PATH}&line={line}&commit_idx=0&revision={revision}"
        ))
        .body(Body::empty())
        .unwrap()
}

fn search_request() -> Request<Body> {
    Request::builder()
        .uri("/api/searchfox/search?q=symbol:_ZN7mozilla3dom9AudioNode10DisconnectERNS_11ErrorResultE")
        .body(Body::empty())
        .unwrap()
}

// One test, because the mock's URL is shared through SEARCHFOX_BASE_URL.
#[tokio::test]
async fn searchfox_endpoints_gate_and_resolve_at_the_indexed_revision() {
    let repo = scratch_dir("repo");
    let plain = scratch_dir("plain");
    let (git_old, git_new) = indexed_repository(&repo);
    let hashes = || Hashes {
        git_old: git_old.clone(),
        git_new: git_new.clone(),
    };

    // Gating comes first: disabled setting, then public server.
    start_mock(hashes(), false, false).await;
    let app = lrv::server::create_router(state(&repo, false, false), false);
    let (status, _) = send(&app, resolve_request(3, SIGNATURE, 20)).await;
    assert_eq!(status, StatusCode::CONFLICT, "disabled by default");
    let app = lrv::server::create_router(state(&repo, true, true), false);
    let (status, _) = send(&app, resolve_request(3, SIGNATURE, 20)).await;
    assert_eq!(
        status,
        StatusCode::FORBIDDEN,
        "public servers never look up"
    );
    let (status, _) = send(&app, search_request()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);

    // The head moves from the old to the new revision while the first lookup reads it. The
    // lookup at the old revision is dropped and the lookup repeats at the new one, whose analysis
    // and text (from the repository) agree.
    let mock = start_mock(hashes(), true, false).await;
    let app = lrv::server::create_router(state(&repo, false, true), false);
    let (status, body) = send(&app, resolve_request(3, SIGNATURE, 20)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], SYMBOL_QUERY);
    assert_eq!(
        body["pretty"],
        "function mozilla::dom::AudioNode::Disconnect"
    );
    assert_eq!(
        mock.analysis_reads.load(Ordering::SeqCst),
        2,
        "retried once"
    );

    // The word isn't on the clicked line: unresolved.
    let (status, body) = send(&app, resolve_request(1, "// new", 3)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], "id:Disconnect");

    // A line the review adds isn't in searchfox's copy: the word resolves from its occurrence
    // there nearest to where the line sits.
    let (status, body) = send(&app, resolve_request(5, "Disconnect(aRv);", 1)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], SYMBOL_QUERY);

    // A click whose text isn't the reviewed line can't place its column: unresolved.
    let (status, body) = send(
        &app,
        resolve_request(3, "void AudioNode::Disconnect() {", 20),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], "id:Disconnect");

    // Search reports the revision its line numbers are at.
    let (status, body) = send(&app, search_request()).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["revision"], git_new);
    assert_eq!(body["groups"][0]["kind"], "normal");
    assert_eq!(body["groups"][0]["category"], "Definitions");
    assert_eq!(
        body["groups"][0]["files"][0]["lines"][0]["bounds"],
        serde_json::json!([16, 26])
    );

    // searchfox line 2 is the signature, which the review has as line 3.
    let (status, body) = send(&app, line_request(2, &git_new)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, serde_json::json!({"line": 3, "exact": true}));
    // Past the end of searchfox's copy: the last unchanged line.
    let (status, body) = send(&app, line_request(99, &git_new)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, serde_json::json!({"line": 4, "exact": false}));
    let (status, _) = send(&app, line_request(2, "not-a-revision")).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    // Without a repository holding the commit, the text comes from GitHub at the revision.
    let mock = start_mock(hashes(), false, true).await;
    let app = lrv::server::create_router(state(&plain, false, true), false);
    let (status, body) = send(&app, resolve_request(3, SIGNATURE, 20)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], SYMBOL_QUERY);
    assert_eq!(mock.github_reads.load(Ordering::SeqCst), 1);

    // When GitHub doesn't have it either, from searchfox's source page, which is only trusted
    // while the head is the revision.
    let mock = start_mock(hashes(), false, false).await;
    let app = lrv::server::create_router(state(&plain, false, true), false);
    let (status, body) = send(&app, resolve_request(3, SIGNATURE, 20)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["query"], SYMBOL_QUERY);
    assert_eq!(mock.analysis_reads.load(Ordering::SeqCst), 1);
    assert_eq!(mock.github_reads.load(Ordering::SeqCst), 1);

    let _ = std::fs::remove_dir_all(&repo);
    let _ = std::fs::remove_dir_all(&plain);
}
