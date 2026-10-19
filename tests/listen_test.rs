use std::fs;
use std::process::Command;

#[test]
fn listen_without_running_review() {
    let dir = std::env::temp_dir().join(format!("lrv-listen-missing-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_lrv"))
        .arg("--listen")
        .current_dir(&dir)
        .env("LRV_SERVER_DIR", &dir)
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&output.stderr).contains("No running lrv found for"));
    assert!(output.stdout.is_empty());
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn listen_timeout_is_validated() {
    for timeout in ["0", "601"] {
        let output = Command::new(env!("CARGO_BIN_EXE_lrv"))
            .args(["--listen", "--listen-timeout", timeout])
            .output()
            .unwrap();
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
    }
}

#[cfg(unix)]
mod unix {
    use super::*;
    use std::path::PathBuf;
    use std::process::{Child, Stdio};
    use std::time::{Duration, Instant};

    struct Review {
        child: Child,
        dir: PathBuf,
    }

    impl Review {
        fn start(name: &str) -> Self {
            let dir =
                std::env::temp_dir().join(format!("lrv-listen-{name}-{}", std::process::id()));
            fs::create_dir_all(&dir).unwrap();
            fs::write(
                dir.join("a.diff"),
                "diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n",
            )
            .unwrap();
            let child = Command::new(env!("CARGO_BIN_EXE_lrv"))
                .args(["--file", "a.diff", "--no-open", "--port", "0"])
                .current_dir(&dir)
                .env("LRV_SERVER_DIR", dir.join("servers"))
                .env("XDG_CONFIG_HOME", dir.join("config"))
                .env("LRV_COMMENT_DB", dir.join("comments.db"))
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .unwrap();
            let mut review = Self { child, dir };
            let deadline = Instant::now() + Duration::from_secs(10);
            loop {
                let advertised = fs::read_dir(review.dir.join("servers")).is_ok_and(|entries| {
                    entries
                        .flatten()
                        .any(|entry| entry.path().extension().is_some_and(|ext| ext == "json"))
                });
                if advertised {
                    break;
                }
                assert!(
                    review.child.try_wait().unwrap().is_none(),
                    "server exited before advertising"
                );
                assert!(Instant::now() < deadline, "lrv never advertised itself");
                std::thread::sleep(Duration::from_millis(50));
            }
            review
        }

        fn listener(&self, timeout: &str) -> Child {
            Command::new(env!("CARGO_BIN_EXE_lrv"))
                .args(["--listen", "--listen-timeout", timeout])
                .current_dir(&self.dir)
                .env("LRV_SERVER_DIR", self.dir.join("servers"))
                .env("XDG_CONFIG_HOME", self.dir.join("config"))
                .env("LRV_COMMENT_DB", self.dir.join("comments.db"))
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .unwrap()
        }

        fn terminate(&mut self) {
            assert!(Command::new("kill")
                .args(["-TERM", &self.child.id().to_string()])
                .status()
                .unwrap()
                .success());
            let deadline = Instant::now() + Duration::from_secs(3);
            wait_for_exit(&mut self.child, deadline);
            assert_eq!(self.child.wait().unwrap().code(), Some(143));
        }
    }

    impl Drop for Review {
        fn drop(&mut self) {
            let _ = self.child.kill();
            let _ = self.child.wait();
            let _ = fs::remove_dir_all(&self.dir);
        }
    }

    fn wait_for_exit(child: &mut Child, deadline: Instant) {
        while child.try_wait().unwrap().is_none() {
            if Instant::now() >= deadline {
                let _ = child.kill();
                let _ = child.wait();
                panic!("process did not exit in time");
            }
            std::thread::sleep(Duration::from_millis(20));
        }
    }

    #[test]
    fn listen_times_out_without_writing_cursor() {
        let mut review = Review::start("timeout");
        let mut listener = review.listener("1");
        wait_for_exit(&mut listener, Instant::now() + Duration::from_secs(5));
        let output = listener.wait_with_output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(
            String::from_utf8(output.stdout).unwrap().trim(),
            r#"{"status":"timeout"}"#
        );
        let entries: Vec<_> = fs::read_dir(review.dir.join("servers")).unwrap().collect();
        assert_eq!(entries.len(), 1);
        assert_eq!(
            entries[0].as_ref().unwrap().path().extension().unwrap(),
            "json"
        );
        review.terminate();
    }

    #[test]
    fn sigterm_ends_pending_listener_without_delaying_exit() {
        let mut review = Review::start("sigterm");
        let mut listener = review.listener("30");
        std::thread::sleep(Duration::from_millis(500));
        assert!(listener.try_wait().unwrap().is_none());
        let deadline = Instant::now() + Duration::from_secs(3);
        review.terminate();
        wait_for_exit(&mut listener, deadline);
        let output = listener.wait_with_output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(
            String::from_utf8(output.stdout).unwrap().trim(),
            r#"{"status":"ended"}"#
        );
        assert_eq!(fs::read_dir(review.dir.join("servers")).unwrap().count(), 0);
    }
}
