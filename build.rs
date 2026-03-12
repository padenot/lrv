use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

fn main() {
    // Re-run when frontend sources/assets/config change so embedded web assets are refreshed.
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/assets/app.css");
    println!("cargo:rerun-if-changed=web/dist/index.html");
    println!("cargo:rerun-if-changed=rolldown.config.mjs");
    println!("cargo:rerun-if-changed=tsconfig.web.json");
    println!("cargo:rerun-if-changed=package.json");
    println!("cargo:rerun-if-changed=package-lock.json");

    let bundle = Path::new("web/assets/app/main.js");
    if !bundle.exists() {
        panic!(
            "Missing web/assets/app/main.js. Run `npm run build:web` before `cargo build`/`cargo run`."
        );
    }

    let bundle_mtime = mtime(bundle).unwrap_or(SystemTime::UNIX_EPOCH);
    let src_mtime = newest_mtime(Path::new("web/src")).unwrap_or(SystemTime::UNIX_EPOCH);
    let config_mtime = newest_mtime(Path::new("rolldown.config.mjs")).unwrap_or(SystemTime::UNIX_EPOCH);

    let newest_input = src_mtime.max(config_mtime);
    if bundle_mtime < newest_input {
        panic!(
            "Stale web bundle: web/assets/app/main.js is older than web/src or build config. \
Run `npm run build:web` and retry."
        );
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
