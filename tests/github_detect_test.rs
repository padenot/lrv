//! PR detection, against a fake `gh` script.

use lrv::diff::parse_diff;
use lrv::github::detect_pr_in;
use std::os::unix::fs::PermissionsExt;

const PATCH: &str = "diff --git a/f.txt b/f.txt\nindex 111..222 100644\n--- a/f.txt\n+++ b/f.txt\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n";

#[tokio::test]
async fn detects_the_open_pr_for_the_top_commit() {
    let dir = std::env::temp_dir().join(format!("lrv-gh-detect-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let script = dir.join("gh");
    std::fs::write(
        &script,
        r#"#!/bin/bash
case "$*" in
  *"commits/abc123/pulls"*) echo '[["o/r",7]]' ;;
  *) exit 1 ;;
esac
"#,
    )
    .unwrap();
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).unwrap();
    std::env::set_var("LRV_GH_BIN", &script);

    let mut diff = parse_diff(PATCH).unwrap();
    diff.commit_hash = Some("abc123".into());

    let remotes = [("o".to_string(), "r".to_string())];
    let pr = detect_pr_in(&remotes, &[diff]).await.unwrap();
    assert_eq!(
        (pr.owner.as_str(), pr.repo.as_str(), pr.number),
        ("o", "r", 7)
    );
}
