use lrv::launch::{build_command, build_prompt, permission_rule_path, LaunchRequest};
use lrv::types::ProjectContext;
use std::path::{Path, PathBuf};

fn context() -> ProjectContext {
    serde_json::from_value(serde_json::json!({
        "working_directory": "/tmp/review repo", "git_branch": null, "title": null,
        "is_public": false, "claude_skill_installed": false, "comment_store_error": null
    }))
    .unwrap()
}

#[test]
fn permission_rule_paths_use_posix_form() {
    let cases: &[(&str, &str)] = if cfg!(windows) {
        &[
            (
                r"C:\mozilla-build\msys2\tmp\lrv-agent-x",
                "/c/mozilla-build/msys2/tmp/lrv-agent-x",
            ),
            (r"\\?\D:\Temp\lrv-agent-x", "/d/Temp/lrv-agent-x"),
            ("C:/Temp/lrv-agent-x", "/c/Temp/lrv-agent-x"),
            ("/tmp/lrv-agent-x", "/tmp/lrv-agent-x"),
        ]
    } else {
        &[
            ("/tmp/lrv-agent-x", "/tmp/lrv-agent-x"),
            ("/tmp//lrv-agent-x/", "/tmp/lrv-agent-x"),
        ]
    };
    for (path, expected) in cases {
        assert_eq!(permission_rule_path(Path::new(path)), *expected);
    }
}

#[test]
fn request_validation_and_provider_arguments() {
    for provider in ["claude", "codex"] {
        for options in [false, true] {
            let req = LaunchRequest {
                provider: provider.into(),
                model: if options { "model-1.2:tag[fast]" } else { "" }.into(),
                effort: if options { "high" } else { "" }.into(),
            };
            req.validate().unwrap();
            let ctx = context();
            let dir = std::path::Path::new("/tmp/lrv-agent-x");
            let command = build_command(&req, &ctx, "the prompt", dir);
            let command = command.as_std();
            assert_eq!(command.get_program(), provider);
            assert_eq!(
                command.get_current_dir().unwrap(),
                std::path::Path::new(&ctx.working_directory)
            );
            let args: Vec<_> = command.get_args().map(|s| s.to_str().unwrap()).collect();
            let mut expected = if provider == "claude" {
                vec![
                    "-p",
                    "the prompt",
                    "--output-format",
                    "stream-json",
                    "--verbose",
                ]
            } else {
                vec!["exec"]
            };
            if options {
                if provider == "claude" {
                    expected.extend(["--model", &req.model, "--effort", "high"]);
                } else {
                    expected.extend(["-m", &req.model, "-c", "model_reasoning_effort=\"high\""]);
                }
            }
            if provider == "claude" {
                expected.extend([
                    "--strict-mcp-config",
                    "--add-dir",
                    "/tmp/lrv-agent-x",
                    "--tools",
                    "Bash,Read,Grep,Glob,Write",
                    "--allowedTools",
                    "Bash(lrv --listen:*)",
                    "Bash(lrv --add-notes:*)",
                    "Read",
                    "Grep",
                    "Glob",
                    "Edit(//tmp/lrv-agent-x/**)",
                ]);
            } else {
                expected.extend([
                    "-s",
                    "workspace-write",
                    "-c",
                    "sandbox_workspace_write.network_access=true",
                    "-C",
                    &ctx.working_directory,
                    "the prompt",
                ]);
            }
            assert_eq!(args, expected);
            let prompt = build_prompt(
                dir,
                &[
                    PathBuf::from("/tmp/commit-0.diff"),
                    PathBuf::from("/tmp/commit-1.diff"),
                ],
                &[],
            );
            assert!(prompt.contains("commit_idx 1: file /tmp/commit-1.diff"));
            assert!(prompt.contains("Immediately run lrv --listen"));
            assert!(prompt.contains("If your permissions allow it, read other files"));
            assert!(prompt.contains("--listen-timeout 540"));
            assert!(prompt
                .contains("inside /tmp/lrv-agent-x (for example /tmp/lrv-agent-x/notes-1.json"));
            assert!(prompt.contains(lrv::skill::EMBEDDED_SKILL));
        }
    }
    let mut req: LaunchRequest = serde_json::from_str(r#"{"provider":"claude"}"#).unwrap();
    for invalid in ["a b", "x/y", "$(id)", "x;y", "é", "\n", &"a".repeat(101)] {
        req.model = invalid.into();
        assert!(req.validate().is_err());
        req.model.clear();
        req.effort = invalid.into();
        assert!(req.validate().is_err());
        req.effort.clear();
    }
    req.provider = "bash".into();
    assert!(req.validate().is_err());
}

#[test]
fn stream_json_events_are_summarized() {
    use lrv::launch::summarize_event;
    let ev = |v: serde_json::Value| summarize_event(&v);
    assert_eq!(
        ev(serde_json::json!({"type":"system","subtype":"init","model":"m1"})),
        ["started (m1)"]
    );
    assert_eq!(
        ev(serde_json::json!({"type":"assistant","message":{"content":[
            {"type":"text","text":"Listening\nnow"},
            {"type":"tool_use","name":"Bash","input":{"command":"lrv --listen"}}
        ]}})),
        ["Listening now", "Bash: lrv --listen"]
    );
    assert!(ev(serde_json::json!({"type":"user","message":{"content":[
        {"type":"tool_result","content":"ok"}
    ]}}))
    .is_empty());
    assert_eq!(
        ev(serde_json::json!({"type":"user","message":{"content":[
            {"type":"tool_result","is_error":true,"content":"boom"}
        ]}})),
        ["tool error: boom"]
    );
    assert_eq!(
        ev(serde_json::json!({"type":"result","subtype":"success","result":"done"})),
        ["finished (success): done"]
    );
    assert_eq!(ev(serde_json::json!({"type":"stream_event"})).len(), 0);
    let long = "x".repeat(400);
    let out = ev(
        serde_json::json!({"type":"assistant","message":{"content":[{"type":"text","text":long}]}}),
    );
    assert_eq!(out[0].chars().count(), 301);
}
