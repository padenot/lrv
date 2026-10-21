#![cfg(unix)]

use lrv::discovery::ServerInfo;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::Duration;

struct Server {
    child: Child,
    root: PathBuf,
}

impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = fs::remove_dir_all(&self.root);
    }
}

async fn event(
    response: &mut reqwest::Response,
    pending: &mut String,
    matches: impl Fn(&serde_json::Value) -> bool,
) -> serde_json::Value {
    tokio::time::timeout(Duration::from_secs(15), async {
        loop {
            while let Some(end) = pending.find("\n\n") {
                let frame: String = pending.drain(..end + 2).collect();
                if frame.contains("event: agent") {
                    let data = frame
                        .lines()
                        .find_map(|line| line.strip_prefix("data: "))
                        .unwrap();
                    let value = serde_json::from_str(data).unwrap();
                    if matches(&value) {
                        return value;
                    }
                }
            }
            pending.push_str(&String::from_utf8_lossy(
                &response.chunk().await.unwrap().expect("SSE closed"),
            ));
        }
    })
    .await
    .expect("agent event timeout")
}

#[tokio::test]
async fn fake_provider_launch_presence_failure_and_shutdown() {
    let root = std::env::temp_dir().join(format!(
        "lrv-launch-test-{}",
        lrv::discovery::new_token().unwrap()
    ));
    fs::create_dir_all(root.join("bin")).unwrap();
    fs::write(
        root.join("a.diff"),
        "diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -1 +1 @@\n-old\n+new\n",
    )
    .unwrap();
    let script = root.join("bin/claude");
    fs::write(
        &script,
        r#"#!/bin/sh
printf '%s\n' "$@" > "$LRV_TEST_ROOT/argv"
echo $$ > "$LRV_TEST_ROOT/pid"
if [ -f "$LRV_TEST_ROOT/fail" ]; then exit 7; fi
while [ ! -f "$LRV_TEST_ROOT/attach" ]; do /bin/sleep 0.05; done
lrv --listen --listen-timeout 1
while [ ! -f "$LRV_TEST_ROOT/exit" ]; do /bin/sleep 0.05; done
"#,
    )
    .unwrap();
    fs::set_permissions(&script, fs::Permissions::from_mode(0o700)).unwrap();
    let paths = [root.join("bin")];
    let child = Command::new(env!("CARGO_BIN_EXE_lrv"))
        .args(["--file", "a.diff", "--no-open", "--port", "0"])
        .current_dir(&root)
        .env("PATH", std::env::join_paths(paths).unwrap())
        .env("LRV_TEST_ROOT", &root)
        .env("LRV_SERVER_DIR", root.join("servers"))
        .env("LRV_AGENT_LEASE_SECS", "1")
        .env("LRV_COMMENT_DB", root.join("comments.db"))
        .env("XDG_CONFIG_HOME", root.join("config"))
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .unwrap();
    let mut server = Server { child, root };
    let info: ServerInfo = tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            if let Ok(entries) = fs::read_dir(server.root.join("servers")) {
                if let Some(entry) = entries.flatten().next() {
                    if let Ok(text) = fs::read_to_string(entry.path()) {
                        if let Ok(info) = serde_json::from_str(&text) {
                            break info;
                        }
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
    })
    .await
    .unwrap();
    let client = reqwest::Client::new();
    let launch = || {
        client
            .post(format!("{}/api/agent/launch", info.url))
            .json(&serde_json::json!({"provider":"claude", "initial_review":true}))
    };
    let mut sse = client
        .get(format!("{}/api/events", info.url))
        .send()
        .await
        .unwrap();
    let mut pending = String::new();
    event(&mut sse, &mut pending, |v| {
        v["launch"] == "idle" && v["attached"] == false
    })
    .await;
    let missing = client
        .post(format!("{}/api/agent/launch", info.url))
        .json(&serde_json::json!({"provider":"codex"}))
        .send()
        .await
        .unwrap();
    assert_eq!(missing.status(), 422);
    assert!(missing
        .text()
        .await
        .unwrap()
        .contains("Could not start codex"));
    event(&mut sse, &mut pending, |v| v["launch"] == "failed").await;
    fs::write(server.root.join("fail"), "").unwrap();
    assert_eq!(launch().send().await.unwrap().status(), 202);
    let failed = event(&mut sse, &mut pending, |v| v["launch"] == "failed").await;
    assert!(failed["error"].as_str().unwrap().contains("7"));
    assert!(failed["error"].as_str().unwrap().contains("agent.log"));
    fs::remove_file(server.root.join("fail")).unwrap();
    assert_eq!(launch().send().await.unwrap().status(), 202);
    event(&mut sse, &mut pending, |v| {
        v["launch"] == "running" && v["busy"] == true && v["initial_review"] == true
    })
    .await;
    assert_eq!(launch().send().await.unwrap().status(), 409);
    client
        .post(format!("{}/api/review-notes", info.url))
        .bearer_auth(&info.token)
        .json(&serde_json::json!([]))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap();
    event(&mut sse, &mut pending, |v| {
        v["attached"] == true && v["busy"] == true && v["initial_review"] == true
    })
    .await;
    let argv = fs::read_to_string(server.root.join("argv")).unwrap();
    let diff = argv
        .lines()
        .find_map(|line| line.strip_prefix("commit_idx 0: file "))
        .unwrap()
        .split("; hash ")
        .next()
        .unwrap();
    let diff = PathBuf::from(diff);
    assert!(fs::read_to_string(&diff).unwrap().contains("+new"));
    assert_eq!(
        fs::metadata(diff.parent().unwrap())
            .unwrap()
            .permissions()
            .mode()
            & 0o777,
        0o700
    );
    fs::write(server.root.join("attach"), "").unwrap();
    event(&mut sse, &mut pending, |v| {
        v["attached"] == true && v["busy"] == false && v["launch"] == "running"
    })
    .await;
    fs::write(server.root.join("exit"), "").unwrap();
    event(&mut sse, &mut pending, |v| v["launch"] == "idle").await;
    event(&mut sse, &mut pending, |v| v["attached"] == false).await;
    fs::remove_file(server.root.join("attach")).unwrap();
    fs::remove_file(server.root.join("exit")).unwrap();
    assert_eq!(launch().send().await.unwrap().status(), 202);
    tokio::time::sleep(Duration::from_millis(200)).await;
    let pid = fs::read_to_string(server.root.join("pid")).unwrap();
    let argv = fs::read_to_string(server.root.join("argv")).unwrap();
    let last_dir = PathBuf::from(
        argv.lines()
            .find_map(|l| l.strip_prefix("commit_idx 0: file "))
            .unwrap()
            .split("; hash ")
            .next()
            .unwrap(),
    )
    .parent()
    .unwrap()
    .to_path_buf();
    Command::new("kill")
        .args(["-TERM", &server.child.id().to_string()])
        .status()
        .unwrap();
    tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            if let Some(status) = server.child.try_wait().unwrap() {
                assert_eq!(status.code(), Some(143));
                break;
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
    })
    .await
    .unwrap();
    assert!(!diff.exists());
    assert!(!last_dir.exists());
    assert!(!Command::new("kill")
        .args(["-0", pid.trim()])
        .stderr(Stdio::null())
        .status()
        .unwrap()
        .success());
}
