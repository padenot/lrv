//! Fetching a PR's comments, against a fake `gh` script.

use lrv::diff::parse_diff;
use lrv::github::{fetch_pr_notes, PrRef};
use std::os::unix::fs::PermissionsExt;

const PATCH: &str = "diff --git a/f.txt b/f.txt\nindex 111..222 100644\n--- a/f.txt\n+++ b/f.txt\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n";

/// One fake `gh` for every test: they share the process environment, so they can't each install
/// their own.
fn install_fake_gh() {
    static INSTALL: std::sync::Once = std::sync::Once::new();
    INSTALL.call_once(|| {
        let dir = std::env::temp_dir().join(format!("lrv-gh-pr-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let script = dir.join("gh");
        std::fs::write(
            &script,
            r#"#!/bin/bash
case "$*" in
  *"repos/o/r/pulls/7/comments"*)
    echo '{"id":1,"body":"first","path":"f.txt","line":2,"side":"RIGHT","user":{"login":"alice"}}'
    echo '{"id":2,"body":"reply","path":"f.txt","line":2,"in_reply_to_id":1,"user":{"login":"bob"}}'
    ;;
  *"repos/o/r/issues/7/comments"*)
    echo '{"id":5,"body":"conversation","created_at":"2026-01-02T00:00:00Z","user":{"login":"carol"}}'
    ;;
  *"repos/o/r/pulls/7/reviews"*)
    echo '{"id":6,"body":"","submitted_at":"2026-01-01T00:00:00Z","user":{"login":"dave"}}'
    echo '{"id":7,"body":"summary","submitted_at":"2026-01-03T00:00:00Z","user":{"login":"dave"}}'
    ;;
  *"repos/o/r/pulls/9/comments"*)
    echo '{"id":1,"body":"stale","path":"f.txt","line":2,"side":"RIGHT","commit_id":"gone","user":{"login":"alice"}}'
    ;;
  *"repos/o/r/issues/9/comments"*)
    echo '{"id":5,"body":"conversation","created_at":"2026-01-02T00:00:00Z","user":{"login":"carol"}}'
    ;;
  *"repos/o/r/pulls/9/reviews"*) ;;
  *) exit 1 ;;
esac
"#,
        )
        .unwrap();
        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).unwrap();
        std::env::set_var("LRV_GH_BIN", &script);
    });
}

#[tokio::test]
async fn fetches_pr_comments() {
    install_fake_gh();

    let diff = parse_diff(PATCH).unwrap();
    let pr = PrRef {
        owner: "o".into(),
        repo: "r".into(),
        number: 7,
    };
    let notes = fetch_pr_notes(&pr, &[diff], 0..=0).await.unwrap();
    assert_eq!(notes.len(), 3, "the reply folds into its parent");
    assert!(notes[0].body.contains("**bob:** reply"));
    let review: Vec<_> = notes.iter().filter(|n| n.file == "(commit)").collect();
    let bodies: Vec<_> = review.iter().map(|n| n.body.as_str()).collect();
    assert_eq!(bodies, ["conversation", "summary"], "empty review skipped");
    assert!(review.iter().all(|n| n.read_only));
    assert!(!notes[0].read_only, "inline comments stay actionable");
}

#[tokio::test]
async fn attributes_comments_within_the_prs_commit_range() {
    install_fake_gh();

    let diffs: Vec<_> = (0..4).map(|_| parse_diff(PATCH).unwrap()).collect();
    let pr = PrRef {
        owner: "o".into(),
        repo: "r".into(),
        number: 9,
    };
    let notes = fetch_pr_notes(&pr, &diffs, 1..=2).await.unwrap();
    assert_eq!(notes.len(), 2);
    assert!(
        notes.iter().all(|n| n.commit_idx == Some(2)),
        "unknown-commit and PR-level notes land on the PR's last commit"
    );
}
