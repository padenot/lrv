use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerInfo {
    pub pid: u32,
    pub url: String,
    pub token: String,
    pub root: PathBuf,
}

pub fn dir() -> Result<PathBuf> {
    if let Some(path) = std::env::var_os("LRV_SERVER_DIR") {
        return Ok(path.into());
    }
    Ok(dirs::runtime_dir()
        .or_else(dirs::cache_dir)
        .context("Could not determine server discovery directory")?
        .join("lrv/servers"))
}

fn root_hash(root: &Path) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in root.to_string_lossy().bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

pub fn path_for(root: &Path) -> Result<PathBuf> {
    Ok(dir()?.join(format!("{:016x}.json", root_hash(root))))
}

pub fn cursor_path(root: &Path) -> Result<PathBuf> {
    Ok(dir()?.join(format!("{:016x}.cursor", root_hash(root))))
}

#[derive(Serialize, Deserialize)]
struct CursorFile {
    pid: u32,
    cursor: u64,
}

pub fn read_cursor(info: &ServerInfo) -> u64 {
    let read = || -> Option<CursorFile> {
        serde_json::from_slice(&fs::read(cursor_path(&info.root).ok()?).ok()?).ok()
    };
    read()
        .filter(|file| file.pid == info.pid)
        .map_or(0, |file| file.cursor)
}

pub fn write_cursor(info: &ServerInfo, cursor: u64) -> Result<()> {
    write_private(
        &cursor_path(&info.root)?,
        &serde_json::to_vec(&CursorFile {
            pid: info.pid,
            cursor,
        })?,
    )
}

pub fn write(info: &ServerInfo) -> Result<()> {
    write_private(&path_for(&info.root)?, &serde_json::to_vec(info)?)
}

fn write_private(path: &Path, bytes: &[u8]) -> Result<()> {
    fs::create_dir_all(path.parent().unwrap())?;
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    options.mode(0o600);
    let mut file = options.open(path)?;
    #[cfg(unix)]
    {
        file.set_permissions(fs::Permissions::from_mode(0o600))?;
    }
    file.write_all(bytes)?;
    Ok(())
}

pub fn find(cwd: &Path) -> Option<ServerInfo> {
    let root = crate::repository::root(cwd).unwrap_or_else(|| cwd.to_path_buf());
    serde_json::from_slice(&fs::read(path_for(&root).ok()?).ok()?).ok()
}

pub fn remove_if_ours(root: &Path, pid: u32) {
    if let Ok(path) = path_for(root) {
        if let Ok(bytes) = fs::read(&path) {
            if let Ok(info) = serde_json::from_slice::<ServerInfo>(&bytes) {
                if info.pid == pid {
                    let _ = fs::remove_file(path);
                    if let Ok(cursor) = cursor_path(root) {
                        let _ = fs::remove_file(cursor);
                    }
                }
            }
        }
    }
}

pub fn new_token() -> Result<String> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).context("Failed to generate agent token")?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::tests::{with_path_prefix, write_fake_root_command};

    #[cfg(unix)]
    #[test]
    fn discovery_round_trip_and_owner_cleanup() {
        let base = std::env::temp_dir().join(format!("lrv-discovery-{}", std::process::id()));
        let root = base.join("repo");
        let subdir = root.join("subdir");
        let bin = base.join("bin");
        fs::create_dir_all(&subdir).unwrap();
        fs::create_dir_all(&bin).unwrap();
        write_fake_root_command(&bin, "jj", &root);
        write_fake_root_command(&bin, "git", &root);
        with_path_prefix(&bin, || {
            std::env::set_var("LRV_SERVER_DIR", base.join("servers"));
            let info = ServerInfo {
                pid: 123,
                url: "http://127.0.0.1:1234".into(),
                token: new_token().unwrap(),
                root: root.clone(),
            };
            write(&info).unwrap();
            let found = find(&subdir).unwrap();
            assert_eq!(found.token, info.token);
            assert_eq!(found.url, info.url);
            assert_eq!(found.root, root);
            assert_eq!(found.token.len(), 64);
            assert_eq!(
                fs::metadata(path_for(&root).unwrap())
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
            assert_eq!(read_cursor(&info), 0);
            let cursor = cursor_path(&root).unwrap();
            fs::write(&cursor, b"invalid JSON").unwrap();
            assert_eq!(read_cursor(&info), 0);
            write_cursor(&info, 42).unwrap();
            assert_eq!(read_cursor(&info), 42);
            assert_eq!(read_cursor(&ServerInfo { pid: 456, ..found }), 0);
            assert_eq!(
                fs::metadata(&cursor).unwrap().permissions().mode() & 0o777,
                0o600
            );
            remove_if_ours(&root, 456);
            assert!(cursor.exists());
            assert!(find(&subdir).is_some());
            remove_if_ours(&root, 123);
            assert!(find(&subdir).is_none());
            assert!(!cursor.exists());
            std::env::remove_var("LRV_SERVER_DIR");
        });
        fs::remove_dir_all(base).unwrap();
    }
}
