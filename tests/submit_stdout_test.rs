use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Review {
    child: Option<Child>,
    dir: PathBuf,
}

impl Drop for Review {
    fn drop(&mut self) {
        if let Some(child) = &mut self.child {
            let _ = child.kill();
            let _ = child.wait();
        }
        let _ = fs::remove_dir_all(&self.dir);
    }
}

#[tokio::test]
async fn submitted_review_stdout_is_entirely_json() {
    for (name, rust_log, dev_log, expect_shutdown) in [
        ("default", None, false, true),
        ("off", Some("off"), false, false),
        ("invalid", Some("lrv=invalid"), false, false),
        ("target", Some("lrv=info"), false, true),
        ("dev-log", Some("debug"), true, true),
    ] {
        let dir = std::env::temp_dir().join(format!("lrv-submit-{name}-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("a.diff"),
            "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n",
        )
        .unwrap();
        let mut command = Command::new(env!("CARGO_BIN_EXE_lrv"));
        command
            .args(["--no-open", "--file", "a.diff", "--port", "0"])
            .current_dir(&dir)
            .env("LRV_SERVER_DIR", dir.join("servers"))
            .env("LRV_COMMENT_DB", dir.join("comments.db"))
            .env("XDG_CONFIG_HOME", dir.join("config"))
            .env_remove("RUST_LOG")
            .env_remove("SSH_CONNECTION")
            .env_remove("SSH_CLIENT")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(rust_log) = rust_log {
            command.env("RUST_LOG", rust_log);
        }
        if dev_log {
            command.arg("--dev-log");
        }
        let mut review = Review {
            child: Some(command.spawn().unwrap()),
            dir,
        };
        let deadline = Instant::now() + Duration::from_secs(10);
        let discovery: serde_json::Value = loop {
            let discovery = fs::read_dir(review.dir.join("servers"))
                .ok()
                .and_then(|entries| {
                    entries.flatten().find_map(|entry| {
                        let bytes = fs::read(entry.path()).ok()?;
                        serde_json::from_slice(&bytes).ok()
                    })
                });
            if let Some(discovery) = discovery {
                break discovery;
            }
            if review.child.as_mut().unwrap().try_wait().unwrap().is_some() {
                let output = review.child.take().unwrap().wait_with_output().unwrap();
                panic!(
                    "{name}: lrv exited before advertising: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
            assert!(Instant::now() < deadline, "{name}: lrv never advertised");
            tokio::time::sleep(Duration::from_millis(50)).await;
        };

        let response = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap()
            .post(format!(
                "{}/api/complete",
                discovery["url"].as_str().unwrap()
            ))
            .json(&serde_json::json!({ "comments": [] }))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), reqwest::StatusCode::OK, "{name}");

        let deadline = Instant::now() + Duration::from_secs(5);
        while review.child.as_mut().unwrap().try_wait().unwrap().is_none() {
            assert!(Instant::now() < deadline, "{name}: lrv did not exit");
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        let output = review.child.take().unwrap().wait_with_output().unwrap();
        let stderr = String::from_utf8_lossy(&output.stderr);
        assert!(output.status.success(), "{name}: {stderr}");
        let json: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap_or_else(|e| {
            panic!(
                "{name}: stdout is not JSON: {e}\nstdout: {}\nstderr: {stderr}",
                String::from_utf8_lossy(&output.stdout)
            )
        });
        assert_eq!(json["status"], "completed", "{name}");
        assert_eq!(json["comments"], serde_json::json!([]), "{name}");
        assert_eq!(
            stderr.contains("Received shutdown signal"),
            expect_shutdown,
            "{name}: {stderr}"
        );
        if name == "invalid" {
            assert!(stderr.contains("Ignoring `RUST_LOG="), "{stderr}");
        }
        if dev_log {
            assert!(stderr.contains("finished processing request"), "{stderr}");
        }
    }
}
