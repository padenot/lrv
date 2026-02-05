/// Benchmark: series precompute on a real large jj branch (Firefox-4).
///
/// Run with:
///   cargo test --test bench_series_precompute -- --ignored --nocapture
///
/// Requires /home/padenot/src/trees/firefox-4 to exist and have a branch at trunk()..@.
use std::process::Command;
use std::time::Instant;

const FIREFOX_DIR: &str = "/home/padenot/src/trees/firefox-4";
const REVSET: &str = "trunk()..@";

fn enumerate_commits(revset: &str, dir: &str) -> Vec<String> {
    let out = Command::new("jj")
        .args([
            "log",
            "--no-graph",
            "--reversed",
            "-r",
            revset,
            "-T",
            "commit_id ++ \"\\n\"",
        ])
        .current_dir(dir)
        .output()
        .expect("jj log failed");
    String::from_utf8(out.stdout)
        .unwrap()
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect()
}

fn get_diff_text(commit_id: &str, dir: &str) -> String {
    let out = Command::new("jj")
        .args(["show", "--git", "-r", commit_id])
        .current_dir(dir)
        .output()
        .expect("jj show failed");
    String::from_utf8(out.stdout).unwrap()
}

#[tokio::test]
#[ignore]
async fn bench_precompute_firefox_series() {
    if !std::path::Path::new(FIREFOX_DIR).join(".jj").exists() {
        eprintln!("Skipping: {} not found", FIREFOX_DIR);
        return;
    }

    let t0 = Instant::now();

    // Phase 1: enumerate commits
    let commit_ids = enumerate_commits(REVSET, FIREFOX_DIR);
    let t_enum = t0.elapsed();
    eprintln!(
        "Enumerated {} commits in {:.1}ms",
        commit_ids.len(),
        t_enum.as_secs_f64() * 1000.0
    );

    // Phase 2: parse all diffs in parallel (jj show + parse)
    let t_parse_start = Instant::now();
    let mut handles = Vec::with_capacity(commit_ids.len());
    for (i, id) in commit_ids.iter().enumerate() {
        let id = id.clone();
        handles.push(tokio::task::spawn_blocking(move || {
            let text = get_diff_text(&id, FIREFOX_DIR);
            let d = lrv::diff::parse_diff(&text).expect("parse failed");
            (i, d)
        }));
    }
    let mut parsed_indexed: Vec<(usize, _)> = Vec::with_capacity(handles.len());
    for h in handles {
        parsed_indexed.push(h.await.expect("join failed"));
    }
    parsed_indexed.sort_by_key(|(i, _)| *i);
    let diffs: Vec<_> = parsed_indexed.into_iter().map(|(_, d)| d).collect();
    let t_parse = t_parse_start.elapsed();
    let total_files: usize = diffs.iter().map(|d| d.files.len()).sum();
    eprintln!(
        "Parsed {} diffs ({} total file entries) in {:.1}ms",
        diffs.len(),
        total_files,
        t_parse.as_secs_f64() * 1000.0
    );

    // Phase 3: precompute all file content (parallel jj file show + diff-forward)
    let t_pre_start = Instant::now();
    let (old_maps, new_maps) = lrv::server::precompute_series_content(&diffs, FIREFOX_DIR).await;
    let t_pre = t_pre_start.elapsed();

    let old_total: usize = old_maps.iter().map(|m| m.len()).sum();
    let new_total: usize = new_maps.iter().map(|m| m.len()).sum();
    eprintln!(
        "Precomputed {} old + {} new file versions in {:.1}ms",
        old_total,
        new_total,
        t_pre.as_secs_f64() * 1000.0
    );

    let t_total = t0.elapsed();
    eprintln!(
        "Total startup time: {:.1}ms",
        t_total.as_secs_f64() * 1000.0
    );

    // Sanity: every commit should have at least one file pre-populated
    for (i, d) in diffs.iter().enumerate() {
        if !d.files.is_empty() {
            assert!(
                !old_maps[i].is_empty() || !new_maps[i].is_empty(),
                "commit {} has files but empty caches",
                i
            );
        }
    }

    // Perf guard: full startup should be under 60s even on a slow machine
    assert!(
        t_total.as_secs() < 60,
        "startup took {}s, expected < 60s",
        t_total.as_secs()
    );
}
