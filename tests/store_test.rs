use lrv::store::{CommentStore, SessionMeta};
use lrv::types::{Comment, CommentLine, ReplyTarget, Side};

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
        in_reply_to: None,
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
    store.replace_draft(&comments, &[]).unwrap();

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
fn replies_keep_the_note_they_answer() {
    let path = db_path("reply");
    let store = CommentStore::open(&path, meta()).unwrap();
    let note = ReplyTarget {
        id: Some("42".to_string()),
        author: Some("alice".to_string()),
        body: "Why?".to_string(),
        source_url: None,
    };
    let address = Comment {
        in_reply_to: Some(note.clone()),
        ..comment("src/a.rs", CommentLine::Single(3), "", None)
    };
    store.replace_draft(&[address], &[]).unwrap();

    let (_, stored) = CommentStore::load_session(&path, None).unwrap().unwrap();
    assert_eq!(stored[0].body, "");
    assert_eq!(stored[0].in_reply_to, Some(note));
}

#[test]
fn databases_from_older_versions_are_migrated() {
    let path = db_path("migrate");
    {
        let conn = rusqlite::Connection::open(&path).unwrap();
        conn.execute_batch(
            "CREATE TABLE sessions (
                id INTEGER PRIMARY KEY,
                started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
                submitted_at TEXT,
                working_directory TEXT NOT NULL,
                git_branch TEXT,
                title TEXT,
                commit_hash TEXT,
                jj_change_id TEXT,
                is_series INTEGER NOT NULL,
                overall_comment TEXT
            );
            CREATE TABLE comments (
                id INTEGER PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                commit_idx INTEGER,
                file TEXT NOT NULL,
                line_start INTEGER NOT NULL,
                line_end INTEGER NOT NULL,
                side TEXT NOT NULL,
                body TEXT NOT NULL
            );
            INSERT INTO sessions (working_directory, is_series) VALUES ('/tmp/repo', 0);
            INSERT INTO comments (session_id, position, file, line_start, line_end, side, body)
                VALUES (1, 0, 'old.rs', 1, 1, 'new', 'old comment');",
        )
        .unwrap();
    }

    let store = CommentStore::open(&path, meta()).unwrap();
    let (_, stored) = CommentStore::load_session(&path, Some(1)).unwrap().unwrap();
    assert_eq!(stored[0].body, "old comment");
    assert_eq!(stored[0].in_reply_to, None);

    store
        .replace_draft(
            &[comment("src/a.rs", CommentLine::Single(1), "new", None)],
            &[],
        )
        .unwrap();
    // Opening again must not try to add the column twice.
    CommentStore::open(&path, meta()).unwrap();
}

#[test]
fn each_sync_replaces_the_previous_state() {
    let path = db_path("replace");
    let store = CommentStore::open(&path, meta()).unwrap();

    store
        .replace_draft(
            &[
                comment("a", CommentLine::Single(1), "one", None),
                comment("b", CommentLine::Single(2), "two", None),
            ],
            &[],
        )
        .unwrap();
    store
        .replace_draft(&[comment("a", CommentLine::Single(1), "edited", None)], &[])
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
    store.replace_draft(&comments, &[]).unwrap();
    store.finish(&comments, Some("looks good")).unwrap();

    // The UI clears its drafts after submitting; that must not erase the record.
    store.replace_draft(&[], &[]).unwrap();

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
        .replace_draft(&[comment("a", CommentLine::Single(1), "x", None)], &[])
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
            .replace_draft(&[comment("a", CommentLine::Single(1), body, None)], &[])
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

#[test]
fn dispositions_create_sessions_replace_and_freeze() {
    use lrv::store::{NoteDisposition, StoredNoteDisposition};
    let path = db_path("dispositions");
    let store = CommentStore::open(&path, meta()).unwrap();
    store.replace_draft(&[], &[]).unwrap();
    assert!(CommentStore::list_sessions(&path, 10).unwrap().is_empty());
    let entry = StoredNoteDisposition {
        note: serde_json::from_value(serde_json::json!({
            "id": "note-1", "file": "a.rs", "line": 2, "side": "new", "body": "Fix this"
        }))
        .unwrap(),
        disposition: NoteDisposition::Accepted,
    };
    store
        .replace_draft(&[], std::slice::from_ref(&entry))
        .unwrap();
    assert_eq!(CommentStore::list_sessions(&path, 10).unwrap().len(), 1);
    let conn = rusqlite::Connection::open(&path).unwrap();
    let (state, note): (String, String) = conn
        .query_row(
            "SELECT disposition, note FROM note_dispositions",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(state, "accepted");
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&note).unwrap()["body"],
        "Fix this"
    );
    store
        .replace_draft(
            &[],
            &[StoredNoteDisposition {
                disposition: NoteDisposition::Ignored,
                ..entry
            }],
        )
        .unwrap();
    store.finish(&[], None).unwrap();
    store.replace_draft(&[], &[]).unwrap();
    let state: String = conn
        .query_row("SELECT disposition FROM note_dispositions", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(state, "ignored");
}

#[test]
fn accepted_note_recovery_matches_legacy_output() {
    use lrv::output::{format_output, OutputFormat};
    use lrv::store::{NoteDisposition, StoredNoteDisposition};
    let path = db_path("accepted-output");
    let store = CommentStore::open(&path, meta()).unwrap();
    let note = serde_json::from_value(serde_json::json!({
        "id": "note-1", "file": "a.rs", "line": [2, 3], "side": "old", "body": "Fix this", "author": "Alice"
    })).unwrap();
    store
        .replace_draft(
            &[],
            &[StoredNoteDisposition {
                note,
                disposition: NoteDisposition::Accepted,
            }],
        )
        .unwrap();
    let (session, recovered) = CommentStore::load_session(&path, None).unwrap().unwrap();
    assert_eq!(session.comment_count, 1);
    let legacy: Comment = serde_json::from_value(serde_json::json!({
        "file": "a.rs", "line": [2, 3], "side": "old", "body": "",
        "in_reply_to": { "id": "note-1", "body": "Fix this", "author": "Alice" }
    }))
    .unwrap();
    for format in [OutputFormat::Json, OutputFormat::Text] {
        assert_eq!(
            format_output(recovered.clone(), &format, &[], false, None),
            format_output(vec![legacy.clone()], &format, &[], false, None)
        );
    }
    store.finish(&recovered, None).unwrap();
    assert_eq!(
        CommentStore::load_session(&path, None)
            .unwrap()
            .unwrap()
            .1
            .len(),
        1
    );
}
