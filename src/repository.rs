use std::path::{Path, PathBuf};
use std::process::Command;

/// Find the repository root containing `cwd`.
///
/// When both jj and Git find a repository, use the one nearest to `cwd`, so a
/// stray `.jj` in a parent directory cannot shadow a Git repository. Prefer jj
/// when both report the same root (a colocated repository).
pub fn root(cwd: &Path) -> Option<PathBuf> {
    let jj = command_root("jj", &["root"], cwd);
    let git = command_root("git", &["rev-parse", "--show-toplevel"], cwd);
    match (jj, git) {
        (Some(jj), Some(git)) if git != jj && git.starts_with(&jj) => Some(git),
        (jj, git) => jj.or(git),
    }
}

pub fn is_jj_repo(root: impl AsRef<Path>) -> bool {
    root.as_ref().join(".jj").exists()
}

fn command_root(program: &str, args: &[&str], cwd: &Path) -> Option<PathBuf> {
    let output = Command::new(program)
        .args(args)
        .current_dir(cwd)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let path = PathBuf::from(String::from_utf8(output.stdout).ok()?.trim());
    (!path.as_os_str().is_empty() && path.is_dir()).then_some(path)
}

#[cfg(test)]
mod tests {
    use super::{is_jj_repo, root};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::sync::Mutex;

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);
    // Tests replace PATH with fake `jj`/`git` scripts, so they must not overlap.
    static PATH_LOCK: Mutex<()> = Mutex::new(());

    fn test_base() -> PathBuf {
        let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!("lrv-repository-test-{}-{id}", std::process::id()))
    }

    #[cfg(unix)]
    fn write_fake_root_command(bin: &Path, name: &str, root: &Path) {
        use std::os::unix::fs::PermissionsExt;

        let script = bin.join(name);
        fs::write(
            &script,
            format!(
                "#!/bin/sh\nprintf '%s\\n' '{}'\n",
                root.to_string_lossy().replace('\'', "'\\''")
            ),
        )
        .unwrap();
        let mut permissions = fs::metadata(&script).unwrap().permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&script, permissions).unwrap();
    }

    fn with_path_prefix<T>(bin: &Path, f: impl FnOnce() -> T) -> T {
        let _guard = PATH_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let original_path = std::env::var_os("PATH");
        let path = match &original_path {
            Some(path) => format!("{}:{}", bin.display(), path.to_string_lossy()),
            None => bin.display().to_string(),
        };
        std::env::set_var("PATH", path);

        let result = f();

        match original_path {
            Some(path) => std::env::set_var("PATH", path),
            None => std::env::remove_var("PATH"),
        }
        result
    }

    #[cfg(unix)]
    #[test]
    fn finds_a_jj_only_repository_from_a_subdirectory() {
        let base = test_base();
        let repo = base.join("repo");
        let nested = repo.join("src");
        let bin = base.join("bin");
        fs::create_dir_all(&nested).unwrap();
        fs::create_dir_all(&bin).unwrap();
        fs::create_dir(repo.join(".jj")).unwrap();
        write_fake_root_command(&bin, "jj", &repo);

        with_path_prefix(&bin, || {
            assert_eq!(root(&nested), Some(PathBuf::from(&repo)));
        });
        assert!(is_jj_repo(&repo));

        let _ = fs::remove_dir_all(base);
    }

    #[cfg(unix)]
    #[test]
    fn prefers_a_git_repository_nested_inside_a_jj_directory() {
        let base = test_base();
        let outer = base.join("home");
        let repo = outer.join("repo");
        let nested = repo.join("src");
        let bin = base.join("bin");
        fs::create_dir_all(&nested).unwrap();
        fs::create_dir_all(&bin).unwrap();
        fs::create_dir(outer.join(".jj")).unwrap();
        write_fake_root_command(&bin, "jj", &outer);
        write_fake_root_command(&bin, "git", &repo);

        with_path_prefix(&bin, || {
            assert_eq!(root(&nested), Some(PathBuf::from(&repo)));
        });
        assert!(!is_jj_repo(&repo));

        let _ = fs::remove_dir_all(base);
    }

    #[cfg(unix)]
    #[test]
    fn prefers_jj_in_a_colocated_repository() {
        let base = test_base();
        let repo = base.join("repo");
        let nested = repo.join("src");
        let bin = base.join("bin");
        fs::create_dir_all(&nested).unwrap();
        fs::create_dir_all(&bin).unwrap();
        fs::create_dir(repo.join(".jj")).unwrap();
        write_fake_root_command(&bin, "jj", &repo);
        write_fake_root_command(&bin, "git", &repo);

        with_path_prefix(&bin, || {
            assert_eq!(root(&nested), Some(PathBuf::from(&repo)));
        });
        assert!(is_jj_repo(&repo));

        let _ = fs::remove_dir_all(base);
    }
}
