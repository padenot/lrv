use lrv::store::{CommentStore, SessionMeta};
use lrv::types::{Comment, CommentLine, Side};

fn meta() -> SessionMeta {
    SessionMeta {
        working_directory: "/tmp/repo".to_string(),
        git_branch: Some("main".to_string()),
        title: Some("A review".to_string()),
        commit_hash: Some("abc123".to_string()),
        jj_change_id: None,
        is_series: false,
    }
}

fn comment(file: &str, line: CommentLine, body: &str, commit_idx: Option<usize>) -> Comment {
    Comment {
        file: file.to_string(),
        line,
        side: Side::New,
        body: body.to_string(),
        commit_idx,
    }
}

fn db_path(name: &str) -> std::path::PathBuf {
    let path = std::env::temp_dir().join(format!("lrv-store-test-{name}"));
    let _ = std::fs::remove_dir_all(&path);
    std::fs::create_dir_all(&path).unwrap();
    path.join("comments.db")
}

#[test]
fn drafts_round_trip_through_sqlite() {
    let path = db_path("round-trip");
    let store = CommentStore::open(&path, meta()).unwrap();

    let comments = vec![
        comment("src/a.rs", CommentLine::Single(12), "first", None),
        comment("src/b.rs", CommentLine::Range((3, 7)), "second", Some(2)),
    ];
    store.replace_comments(&comments).unwrap();

    let (session, stored) = CommentStore::load_session(&path, None).unwrap().unwrap();
    assert_eq!(session.comment_count, 2);
    assert!(session.submitted_at.is_none());
    assert_eq!(session.title.as_deref(), Some("A review"));
    assert_eq!(stored.len(), 2);
    assert_eq!(stored[0].file, "src/a.rs");
    assert!(matches!(stored[0].line, CommentLine::Single(12)));
    assert_eq!(stored[0].commit_idx, None);
    assert_eq!(stored[1].body, "second");
    assert!(matches!(stored[1].line, CommentLine::Range((3, 7))));
    assert_eq!(stored[1].commit_idx, Some(2));
}

#[test]
fn each_sync_replaces_the_previous_state() {
    let path = db_path("replace");
    let store = CommentStore::open(&path, meta()).unwrap();

    store
        .replace_comments(&[
            comment("a", CommentLine::Single(1), "one", None),
            comment("b", CommentLine::Single(2), "two", None),
        ])
        .unwrap();
    store
        .replace_comments(&[comment("a", CommentLine::Single(1), "edited", None)])
        .unwrap();

    let (_, stored) = CommentStore::load_session(&path, None).unwrap().unwrap();
    assert_eq!(stored.len(), 1);
    assert_eq!(stored[0].body, "edited");
    assert_eq!(CommentStore::list_sessions(&path, 10).unwrap().len(), 1);
}

#[test]
fn submitted_comments_are_frozen() {
    let path = db_path("frozen");
    let store = CommentStore::open(&path, meta()).unwrap();

    let comments = vec![comment("a", CommentLine::Single(1), "keep me", None)];
    store.replace_comments(&comments).unwrap();
    store.finish(&comments, Some("looks good")).unwrap();

    // The UI clears its drafts after submitting; that must not erase the record.
    store.replace_comments(&[]).unwrap();

    let (session, stored) = CommentStore::load_session(&path, None).unwrap().unwrap();
    assert!(session.submitted_at.is_some());
    assert_eq!(session.overall_comment.as_deref(), Some("looks good"));
    assert_eq!(stored.len(), 1);
    assert_eq!(stored[0].body, "keep me");
}

#[test]
fn sessions_are_only_created_once_comments_exist() {
    let path = db_path("lazy");
    let store = CommentStore::open(&path, meta()).unwrap();
    assert!(CommentStore::list_sessions(&path, 10).unwrap().is_empty());

    store
        .replace_comments(&[comment("a", CommentLine::Single(1), "x", None)])
        .unwrap();
    assert_eq!(CommentStore::list_sessions(&path, 10).unwrap().len(), 1);
}

#[test]
fn submitting_an_empty_review_records_nothing() {
    let path = db_path("empty-submit");
    let store = CommentStore::open(&path, meta()).unwrap();
    store.finish(&[], None).unwrap();
    assert!(CommentStore::list_sessions(&path, 10).unwrap().is_empty());
}

#[test]
fn sessions_are_loadable_by_id() {
    let path = db_path("by-id");
    for body in ["older", "newer"] {
        let store = CommentStore::open(&path, meta()).unwrap();
        store
            .replace_comments(&[comment("a", CommentLine::Single(1), body, None)])
            .unwrap();
    }

    let sessions = CommentStore::list_sessions(&path, 10).unwrap();
    assert_eq!(sessions.len(), 2);
    // Most recent first.
    let (_, newest) = CommentStore::load_session(&path, None).unwrap().unwrap();
    assert_eq!(newest[0].body, "newer");
    let (_, oldest) = CommentStore::load_session(&path, Some(sessions[1].id))
        .unwrap()
        .unwrap();
    assert_eq!(oldest[0].body, "older");
}

// Both cases live in one test because they set the process-wide
// LRV_COMMENT_DB.
#[test]
fn open_default_reports_unusable_locations() {
    let blocker = db_path("blocker");
    std::fs::write(&blocker, "").unwrap();
    let unusable = blocker.join("sub").join("comments.db");
    std::env::set_var("LRV_COMMENT_DB", &unusable);
    let (opened, failures) = CommentStore::open_default(meta());
    assert!(opened.is_none());
    assert_eq!(failures.len(), 1);
    assert_eq!(failures[0].0, unusable);

    let usable = db_path("default-ok");
    std::env::set_var("LRV_COMMENT_DB", &usable);
    let (opened, failures) = CommentStore::open_default(meta());
    std::env::remove_var("LRV_COMMENT_DB");
    assert!(failures.is_empty());
    assert_eq!(opened.map(|(_, path)| path), Some(usable));
}
