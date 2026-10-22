use lrv::launch::{build_command, build_prompt, LaunchRequest};
use lrv::types::ProjectContext;
use std::path::PathBuf;

fn context() -> ProjectContext {
    serde_json::from_value(serde_json::json!({
        "working_directory": "/tmp/review repo", "git_branch": null, "title": null,
        "is_public": false, "claude_skill_installed": false, "comment_store_error": null
    }))
    .unwrap()
}

#[test]
fn request_validation_and_provider_arguments() {
    for provider in ["claude", "codex"] {
        for options in [false, true] {
            let req = LaunchRequest {
                provider: provider.into(),
                model: if options { "model-1.2:tag[fast]" } else { "" }.into(),
                effort: if options { "high" } else { "" }.into(),
                initial_review: true,
            };
            req.validate().unwrap();
            let ctx = context();
            let command = build_command(&req, &ctx, "the prompt");
            let command = command.as_std();
            assert_eq!(command.get_program(), provider);
            assert_eq!(
                command.get_current_dir().unwrap(),
                std::path::Path::new(&ctx.working_directory)
            );
            let args: Vec<_> = command.get_args().map(|s| s.to_str().unwrap()).collect();
            let mut expected = if provider == "claude" {
                vec!["-p", "the prompt"]
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
                    "--tools",
                    "Bash,Read,Grep,Glob",
                    "--allowedTools",
                    "Bash(lrv:*)",
                    "Read",
                    "Grep",
                    "Glob",
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
                &req,
                &[
                    PathBuf::from("/tmp/commit-0.diff"),
                    PathBuf::from("/tmp/commit-1.diff"),
                ],
                &[],
            );
            assert!(prompt.contains("commit_idx 1: file /tmp/commit-1.diff"));
            assert!(prompt.contains("First review the supplied diff files"));
            assert!(prompt.contains("--listen-timeout 540"));
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
