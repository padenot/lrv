use crate::types::{Comment, CommentLine, Side};
use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    submitted_at TEXT,
    working_directory TEXT NOT NULL,
    git_branch TEXT,
    title TEXT,
    commit_hash TEXT,
    jj_change_id TEXT,
    is_series INTEGER NOT NULL,
    overall_comment TEXT
);
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    commit_idx INTEGER,
    file TEXT NOT NULL,
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    side TEXT NOT NULL,
    body TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_session_idx ON comments(session_id, position);
";

/// Identifying information about the review being performed, recorded once per
/// session so a stored set of comments can be traced back to its diff.
#[derive(Debug, Clone)]
pub struct SessionMeta {
    pub working_directory: String,
    pub git_branch: Option<String>,
    pub title: Option<String>,
    pub commit_hash: Option<String>,
    pub jj_change_id: Option<String>,
    pub is_series: bool,
}

#[derive(Debug, Clone)]
pub struct StoredSession {
    pub id: i64,
    pub updated_at: String,
    pub submitted_at: Option<String>,
    pub working_directory: String,
    pub git_branch: Option<String>,
    pub title: Option<String>,
    pub commit_hash: Option<String>,
    pub is_series: bool,
    pub overall_comment: Option<String>,
    pub comment_count: usize,
}

/// Durable mirror of the comments held in the browser. Every change the user
/// makes is written here so a review survives losing the browser tab, the
/// `lrv` process, or the terminal output.
pub struct CommentStore {
    conn: Mutex<Connection>,
    meta: SessionMeta,
    session_id: Mutex<Option<i64>>,
}

/// A database location that could not be used, with the reason.
pub type OpenFailure = (PathBuf, anyhow::Error);

/// Candidate database locations, most preferred first. `LRV_COMMENT_DB`
/// overrides everything. Otherwise the platform data directory is used, with
/// the temporary directory as a fallback for environments (e.g. sandboxes) in
/// which the data directory is not accessible.
pub fn db_paths() -> Vec<PathBuf> {
    if let Some(path) = std::env::var_os("LRV_COMMENT_DB") {
        return vec![PathBuf::from(path)];
    }
    let mut paths = Vec::new();
    if let Some(dir) = dirs::data_dir() {
        paths.push(dir.join("lrv").join("comments.db"));
    }
    paths.push(std::env::temp_dir().join("lrv").join("comments.db"));
    paths
}

/// Picks the database to read stored sessions from: the first location in
/// `db_paths()` holding a database that can be opened, or else the first
/// location that did not fail. Also returns the error for each location
/// skipped because its database could not be opened.
pub fn readable_db_path() -> (PathBuf, Vec<OpenFailure>) {
    let paths = db_paths();
    let mut failures = Vec::new();
    for path in &paths {
        match open_existing(path) {
            Ok(Some(_)) => return (path.clone(), failures),
            Ok(None) => {}
            Err(e) => failures.push((path.clone(), e)),
        }
    }
    let fallback = paths
        .iter()
        .find(|path| !failures.iter().any(|(failed, _)| failed == *path))
        .unwrap_or(&paths[0])
        .clone();
    (fallback, failures)
}

/// Prints a prominent banner on stderr, for failures that put the review at
/// risk.
pub fn print_critical_warning(title: &str, lines: &[String]) {
    use std::io::IsTerminal;
    let (start, end) = if std::io::stderr().is_terminal() {
        ("\x1b[1;37;41m", "\x1b[0m")
    } else {
        ("", "")
    };
    let rule = "!".repeat(78);
    eprintln!();
    eprintln!("{start}{rule}{end}");
    eprintln!("{start}!!! CRITICAL: {title}{end}");
    eprintln!("{start}{rule}{end}");
    for line in lines {
        eprintln!("!!! {line}");
    }
    eprintln!("{start}{rule}{end}");
    eprintln!();
}

impl CommentStore {
    pub fn open(path: &Path, meta: SessionMeta) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create {}", parent.display()))?;
        }
        let conn = Connection::open(path)
            .with_context(|| format!("Failed to open comment database {}", path.display()))?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", true)?;
        conn.execute_batch(SCHEMA)
            .context("Failed to initialize comment database schema")?;
        Ok(Self {
            conn: Mutex::new(conn),
            meta,
            session_id: Mutex::new(None),
        })
    }

    /// Opens the first usable database in `db_paths()`. Returns the store and
    /// its path, if any location worked, along with the error for each location
    /// that could not be used.
    pub fn open_default(meta: SessionMeta) -> (Option<(Self, PathBuf)>, Vec<OpenFailure>) {
        let mut failures = Vec::new();
        for path in db_paths() {
            match Self::open(&path, meta.clone()) {
                Ok(store) => return (Some((store, path)), failures),
                Err(e) => failures.push((path, e)),
            }
        }
        (None, failures)
    }

    /// Replace the comments recorded for this session. Called on every change
    /// in the UI, so the database always reflects what the reviewer sees.
    /// Once a session has been submitted its comments are frozen.
    pub fn replace_comments(&self, comments: &[Comment]) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let mut session_id = self.session_id.lock().unwrap();
        let id = ensure_session(&conn, &self.meta, &mut session_id)?;

        let tx = conn.transaction()?;
        if tx.execute(
            "UPDATE sessions
             SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1 AND submitted_at IS NULL",
            params![id],
        )? == 0
        {
            return Ok(());
        }
        write_comments(&tx, id, comments)?;
        tx.commit()?;
        Ok(())
    }

    /// Record the final, submitted state of the review.
    pub fn finish(&self, comments: &[Comment], overall_comment: Option<&str>) -> Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let mut session_id = self.session_id.lock().unwrap();
        if session_id.is_none() && comments.is_empty() && overall_comment.is_none() {
            // Nothing was said; don't record an empty session.
            return Ok(());
        }
        let id = ensure_session(&conn, &self.meta, &mut session_id)?;

        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE sessions
             SET overall_comment = ?2,
                 updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                 submitted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
             WHERE id = ?1",
            params![id, overall_comment],
        )?;
        write_comments(&tx, id, comments)?;
        tx.commit()?;
        Ok(())
    }

    pub fn list_sessions(path: &Path, limit: usize) -> Result<Vec<StoredSession>> {
        let Some(conn) = open_existing(path)? else {
            return Ok(Vec::new());
        };
        let mut stmt = conn.prepare(
            "SELECT s.id, s.updated_at, s.submitted_at, s.working_directory,
                    s.git_branch, s.title, s.commit_hash, s.is_series, s.overall_comment,
                    (SELECT COUNT(*) FROM comments c WHERE c.session_id = s.id)
             FROM sessions s
             ORDER BY s.id DESC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], read_session)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .context("Failed to read stored review sessions")
    }

    /// Load one stored session and its comments. `id` of `None` means the most
    /// recent session that has comments.
    pub fn load_session(
        path: &Path,
        id: Option<i64>,
    ) -> Result<Option<(StoredSession, Vec<Comment>)>> {
        let Some(conn) = open_existing(path)? else {
            return Ok(None);
        };
        let session = match id {
            Some(id) => conn
                .query_row(
                    "SELECT s.id, s.updated_at, s.submitted_at, s.working_directory,
                            s.git_branch, s.title, s.commit_hash, s.is_series, s.overall_comment,
                            (SELECT COUNT(*) FROM comments c WHERE c.session_id = s.id)
                     FROM sessions s WHERE s.id = ?1",
                    params![id],
                    read_session,
                )
                .optional()?,
            None => conn
                .query_row(
                    "SELECT s.id, s.updated_at, s.submitted_at, s.working_directory,
                            s.git_branch, s.title, s.commit_hash, s.is_series, s.overall_comment,
                            COUNT(c.id)
                     FROM sessions s JOIN comments c ON c.session_id = s.id
                     GROUP BY s.id ORDER BY s.id DESC LIMIT 1",
                    [],
                    read_session,
                )
                .optional()?,
        };
        let Some(session) = session else {
            return Ok(None);
        };

        let mut stmt = conn.prepare(
            "SELECT file, line_start, line_end, side, body, commit_idx
             FROM comments WHERE session_id = ?1 ORDER BY position",
        )?;
        let comments = stmt
            .query_map(params![session.id], |row| {
                let line_start: i64 = row.get(1)?;
                let line_end: i64 = row.get(2)?;
                let side: String = row.get(3)?;
                let commit_idx: Option<i64> = row.get(5)?;
                Ok(Comment {
                    file: row.get(0)?,
                    line: if line_start == line_end {
                        CommentLine::Single(line_start as usize)
                    } else {
                        CommentLine::Range((line_start as usize, line_end as usize))
                    },
                    side: if side == "old" { Side::Old } else { Side::New },
                    body: row.get(4)?,
                    commit_idx: commit_idx.map(|i| i as usize),
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()
            .context("Failed to read stored comments")?;

        Ok(Some((session, comments)))
    }
}

fn open_existing(path: &Path) -> Result<Option<Connection>> {
    if !path.exists() {
        return Ok(None);
    }
    Connection::open(path)
        .map(Some)
        .with_context(|| format!("Failed to open comment database {}", path.display()))
}

fn read_session(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredSession> {
    let count: i64 = row.get(9)?;
    Ok(StoredSession {
        id: row.get(0)?,
        updated_at: row.get(1)?,
        submitted_at: row.get(2)?,
        working_directory: row.get(3)?,
        git_branch: row.get(4)?,
        title: row.get(5)?,
        commit_hash: row.get(6)?,
        is_series: row.get(7)?,
        overall_comment: row.get(8)?,
        comment_count: count as usize,
    })
}

fn ensure_session(
    conn: &Connection,
    meta: &SessionMeta,
    session_id: &mut Option<i64>,
) -> Result<i64> {
    if let Some(id) = *session_id {
        return Ok(id);
    }
    conn.execute(
        "INSERT INTO sessions
             (working_directory, git_branch, title, commit_hash, jj_change_id, is_series)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            meta.working_directory,
            meta.git_branch,
            meta.title,
            meta.commit_hash,
            meta.jj_change_id,
            meta.is_series,
        ],
    )?;
    let id = conn.last_insert_rowid();
    *session_id = Some(id);
    Ok(id)
}

fn write_comments(tx: &rusqlite::Transaction<'_>, id: i64, comments: &[Comment]) -> Result<()> {
    tx.execute("DELETE FROM comments WHERE session_id = ?1", params![id])?;
    let mut insert = tx.prepare(
        "INSERT INTO comments
             (session_id, position, commit_idx, file, line_start, line_end, side, body)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )?;
    for (position, comment) in comments.iter().enumerate() {
        let (start, end) = match &comment.line {
            CommentLine::Single(line) => (*line, *line),
            CommentLine::Range((start, end)) => (*start, *end),
        };
        insert.execute(params![
            id,
            position as i64,
            comment.commit_idx.map(|i| i as i64),
            comment.file,
            start as i64,
            end as i64,
            comment.side.to_string(),
            comment.body,
        ])?;
    }
    Ok(())
}
