use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::SystemTime;

fn main() {
    // Re-run when frontend sources/assets/config/deps change so embedded web assets are refreshed.
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/assets");
    println!("cargo:rerun-if-changed=web/dist/index.html");
    println!("cargo:rerun-if-changed=rolldown.config.mjs");
    println!("cargo:rerun-if-changed=tsconfig.web.json");
    println!("cargo:rerun-if-changed=package.json");
    println!("cargo:rerun-if-changed=package-lock.json");

    let bundle = Path::new("web/assets/app/main.js");
    if is_source_checkout() && frontend_needs_rebuild(bundle) {
        run_web_build();
    }
}

fn is_source_checkout() -> bool {
    Path::new(".git").exists()
}

fn frontend_needs_rebuild(bundle: &Path) -> bool {
    if !bundle.exists() {
        return true;
    }

    let bundle_mtime = mtime(bundle).unwrap_or(SystemTime::UNIX_EPOCH);
    newest_frontend_input_mtime()
        .map(|input_mtime| bundle_mtime < input_mtime)
        .unwrap_or(false)
}

fn newest_frontend_input_mtime() -> Option<SystemTime> {
    let mut newest: Option<SystemTime> = None;
    for path in [
        Path::new("web/src"),
        Path::new("web/assets"),
        Path::new("web/dist/index.html"),
        Path::new("rolldown.config.mjs"),
        Path::new("tsconfig.web.json"),
        Path::new("package.json"),
        Path::new("package-lock.json"),
    ] {
        if let Some(t) = newest_mtime(path) {
            newest = Some(match newest {
                Some(cur) => cur.max(t),
                None => t,
            });
        }
    }
    newest
}

fn run_web_build() {
    println!("cargo:warning=web bundle missing or stale; running `npm run build:web`");
    let npm = if cfg!(windows) { "npm.cmd" } else { "npm" };
    let output = Command::new(npm).args(["run", "build:web"]).output();
    match output {
        Ok(output) if output.status.success() => {}
        Ok(output) => {
            panic!(
                "Failed to rebuild web bundle with `npm run build:web` (status: {}).\nstdout:\n{}\nstderr:\n{}",
                output.status,
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr),
            );
        }
        Err(err) => {
            panic!("Failed to run `npm run build:web`: {err}. Install Node.js + npm, then retry.");
        }
    }
}

fn newest_mtime(path: &Path) -> Option<SystemTime> {
    if path.is_file() {
        return mtime(path);
    }
    if !path.is_dir() {
        return None;
    }
    let mut newest: Option<SystemTime> = None;
    for child in walk(path) {
        if let Some(t) = mtime(&child) {
            newest = Some(match newest {
                Some(cur) => cur.max(t),
                None => t,
            });
        }
    }
    newest
}

fn mtime(path: &Path) -> Option<SystemTime> {
    fs::metadata(path).ok()?.modified().ok()
}

fn walk(root: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(root) else {
        return out;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            out.extend(walk(&p));
        } else if p.is_file() {
            out.push(p);
        }
    }
    out
}
