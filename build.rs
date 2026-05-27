use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::io::Read;
use std::path::Path;
use std::process::Command;
use std::{env, fs};

fn main() {
    // Watch source inputs only — not the generated output — so cargo re-runs
    // build.rs exactly when sources change, without self-invalidation.
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/assets/app.css");
    println!("cargo:rerun-if-changed=web/assets/vendor");
    println!("cargo:rerun-if-changed=web/dist/index.html");
    println!("cargo:rerun-if-changed=rolldown.config.mjs");
    println!("cargo:rerun-if-changed=tsconfig.web.json");
    println!("cargo:rerun-if-changed=package.json");
    println!("cargo:rerun-if-changed=package-lock.json");

    // Skip when building a crates.io package (pre-built assets are included).
    if Path::new(".git").exists() {
        run_web_build();
    }

    // Write a hash of web assets into OUT_DIR so that server.rs (which
    // includes this file) is recompiled whenever assets change, even if no
    // Rust source changed. This forces rust_embed to re-embed the new assets.
    let hash = hash_web_assets();
    let out = env::var("OUT_DIR").unwrap();
    fs::write(
        format!("{out}/web_asset_hash.rs"),
        format!("const _WEB_ASSET_HASH: u64 = {hash};\n"),
    )
    .unwrap();
}

fn hash_web_assets() -> u64 {
    let mut hasher = DefaultHasher::new();
    for dir in ["web/assets", "web/dist"] {
        hash_dir(Path::new(dir), &mut hasher);
    }
    hasher.finish()
}

fn hash_dir(path: &Path, hasher: &mut DefaultHasher) {
    let Ok(mut entries) = fs::read_dir(path) else {
        return;
    };
    let mut paths: Vec<_> = entries.flatten().map(|e| e.path()).collect();
    paths.sort();
    for p in paths {
        if p.is_dir() {
            hash_dir(&p, hasher);
        } else {
            p.to_string_lossy().hash(hasher);
            if let Ok(mut f) = fs::File::open(&p) {
                let mut buf = Vec::new();
                let _ = f.read_to_end(&mut buf);
                buf.hash(hasher);
            }
        }
    }
}

fn run_web_build() {
    let npm = if cfg!(windows) { "npm.cmd" } else { "npm" };

    let install = Command::new(npm)
        .args(["install", "--prefer-offline"])
        .output();
    match install {
        Ok(o) if o.status.success() => {}
        Ok(o) => panic!(
            "npm install failed (status: {}).\nstdout:\n{}\nstderr:\n{}",
            o.status,
            String::from_utf8_lossy(&o.stdout),
            String::from_utf8_lossy(&o.stderr),
        ),
        Err(e) => panic!("Failed to run `npm install`: {e}. Install Node.js + npm, then retry."),
    }

    println!("cargo:warning=rebuilding web bundle");
    let build = Command::new(npm).args(["run", "build:web"]).output();
    match build {
        Ok(o) if o.status.success() => {}
        Ok(o) => panic!(
            "npm run build:web failed (status: {}).\nstdout:\n{}\nstderr:\n{}",
            o.status,
            String::from_utf8_lossy(&o.stdout),
            String::from_utf8_lossy(&o.stderr),
        ),
        Err(e) => {
            panic!("Failed to run `npm run build:web`: {e}. Install Node.js + npm, then retry.")
        }
    }
}
