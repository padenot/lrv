//! Fetching a PR's comments, against a fake `gh` script.

use lrv::diff::parse_diff;
use lrv::github::{fetch_pr_notes, PrRef};
use std::os::unix::fs::PermissionsExt;

const PATCH: &str = "diff --git a/f.txt b/f.txt\nindex 111..222 100644\n--- a/f.txt\n+++ b/f.txt\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n";

#[tokio::test]
async fn fetches_pr_comments() {
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
  *) exit 1 ;;
esac
"#,
    )
    .unwrap();
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).unwrap();
    std::env::set_var("LRV_GH_BIN", &script);

    let diff = parse_diff(PATCH).unwrap();
    let pr = PrRef {
        owner: "o".into(),
        repo: "r".into(),
        number: 7,
    };
    let notes = fetch_pr_notes(&pr, &[diff]).await.unwrap();
    assert_eq!(notes.len(), 1, "the reply folds into its parent");
    assert!(notes[0].body.contains("**bob:** reply"));
}
