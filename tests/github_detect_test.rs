//! PR detection, against a fake `gh` script.

use lrv::diff::parse_diff;
use lrv::github::detect_prs_in;
use std::os::unix::fs::PermissionsExt;

const PATCH: &str = "diff --git a/f.txt b/f.txt\nindex 111..222 100644\n--- a/f.txt\n+++ b/f.txt\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n";

#[tokio::test]
async fn detects_the_earliest_open_pr_per_commit() {
    let dir = std::env::temp_dir().join(format!("lrv-gh-detect-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let script = dir.join("gh");
    std::fs::write(
        &script,
        r#"#!/bin/bash
case "$*" in
  *"commits/c1/pulls"*) echo '[["o/r",7,"First","u7","alice"]]' ;;
  *"commits/c2/pulls"*) echo '[["o/r",9,"Second","u9","bob"],["o/r",7,"First","u7","alice"]]' ;;
  *"commits/c3/pulls"*) echo '[]' ;;
  *"commits/c4/pulls"*) echo '[["o/r",9,"Second","u9","bob"]]' ;;
  "api user --jq .login") echo 'alice' ;;
  "api repos/o/r/pulls/7 --jq "*) echo '["First","u7","alice"]' ;;
  *) exit 1 ;;
esac
"#,
    )
    .unwrap();
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).unwrap();
    std::env::set_var("LRV_GH_BIN", &script);

    let diffs: Vec<_> = ["c1", "c2", "c3", "c4"]
        .iter()
        .map(|h| {
            let mut d = parse_diff(PATCH).unwrap();
            d.commit_hash = Some((*h).into());
            d
        })
        .collect();

    let remotes = [("o".to_string(), "r".to_string())];
    assert_eq!(lrv::github::viewer_login().await.as_deref(), Some("alice"));
    let info = lrv::github::fetch_pr_info(&lrv::github::PrRef {
        owner: "o".into(),
        repo: "r".into(),
        number: 7,
    })
    .await;
    assert_eq!(info.author.as_deref(), Some("alice"));
    assert_eq!(info.title.as_deref(), Some("First"));
    let groups = detect_prs_in(&remotes, &diffs).await;
    assert_eq!(groups[0].0.author.as_deref(), Some("alice"));
    assert_eq!(
        lrv::github::is_own_pr(&groups[0].0, Some("Alice")),
        Some(true)
    );
    assert_eq!(
        lrv::github::is_own_pr(&groups[0].0, Some("bob")),
        Some(false)
    );
    assert_eq!(lrv::github::is_own_pr(&groups[0].0, None), None);
    let mut unknown = groups[0].0.clone();
    unknown.author = None;
    assert_eq!(lrv::github::is_own_pr(&unknown, Some("alice")), None);
    let got: Vec<_> = groups
        .iter()
        .map(|(pr, commits)| (pr.number, pr.title.as_deref(), commits.clone()))
        .collect();
    assert_eq!(
        got,
        [(7, Some("First"), vec![0, 1]), (9, Some("Second"), vec![3])]
    );
}
