use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};

#[test]
fn add_notes_without_running_review() {
    let dir = std::env::temp_dir().join(format!("lrv-add-notes-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let mut child = Command::new(env!("CARGO_BIN_EXE_lrv"))
        .args(["--add-notes", "-"])
        .env("LRV_SERVER_DIR", &dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.take().unwrap().write_all(b"[]").unwrap();
    let output = child.wait_with_output().unwrap();
    assert_eq!(output.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&output.stderr).contains("No running lrv found for"));
    assert!(output.stdout.is_empty());
    fs::remove_dir_all(dir).unwrap();
}

const DISCUSSION_REPLY: &str = r#"[{"file":"src/lib.rs","line":[3,5],"side":"new","body":"Reply","discussion_id":"lrv-discussion-1"}]"#;

#[test]
fn startup_notes_reject_discussion_replies() {
    let dir = std::env::temp_dir().join(format!("lrv-startup-notes-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let notes = dir.join("notes.json");
    let diff = dir.join("change.diff");
    fs::write(&notes, DISCUSSION_REPLY).unwrap();
    fs::write(
        &diff,
        "diff --git a/src/lib.rs b/src/lib.rs\n--- a/src/lib.rs\n+++ b/src/lib.rs\n@@ -1 +1 @@\n-old\n+new\n",
    )
    .unwrap();

    for flag in ["--validate-review-notes", "--review-notes-file"] {
        let output = Command::new(env!("CARGO_BIN_EXE_lrv"))
            .arg(flag)
            .arg(&notes)
            .arg("--file")
            .arg(&diff)
            .arg("--no-open")
            .output()
            .unwrap();
        assert_eq!(output.status.code(), Some(1));
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(stderr.contains("src/lib.rs:3-5"), "{flag}: {stderr}");
        assert!(
            stderr.contains("discussion_id is only accepted by a running review"),
            "{flag}: {stderr}"
        );
    }
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn add_notes_validation_accepts_discussion_replies() {
    let dir = std::env::temp_dir().join(format!("lrv-add-replies-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let mut child = Command::new(env!("CARGO_BIN_EXE_lrv"))
        .args(["--add-notes", "-"])
        .env("LRV_SERVER_DIR", &dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(DISCUSSION_REPLY.as_bytes())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert_eq!(output.status.code(), Some(1));
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("No running lrv found for"), "{stderr}");
    assert!(output.stdout.is_empty());
    fs::remove_dir_all(dir).unwrap();
}
