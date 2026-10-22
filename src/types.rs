use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffResponse {
    pub files: Vec<FileDiff>,
    pub stats: DiffStats,
    pub commit_hash: Option<String>,
    pub commit_author: Option<String>,
    pub commit_date: Option<String>,
    pub commit_message: Option<String>,
    pub jj_change_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileStatus,
    pub hunks: Vec<Hunk>,
    // Optional Git object IDs from the diff's `index <old>..<new>` line
    // (abbreviated or full). If present, prefer using these to load file
    // contents for the old/new sides.
    pub old_blob: Option<String>,
    pub new_blob: Option<String>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub is_binary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
    Copied,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hunk {
    pub header: String,
    pub old_start: usize,
    pub new_start: usize,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffLine {
    #[serde(rename = "type")]
    pub line_type: LineType,
    pub content: String,
    pub old_line: Option<usize>,
    pub new_line: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LineType {
    Context,
    Add,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffStats {
    pub additions: usize,
    pub deletions: usize,
    pub files_changed: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub file: String,
    pub line: CommentLine,
    pub side: Side,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_idx: Option<usize>,
    /// The review note this comment responds to. With no body, the comment asks the agent to
    /// address the note; with a body, it is a reply that can also be published.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub in_reply_to: Option<ReplyTarget>,
}

/// A copy of the review note a comment responds to, so the comment can be understood without
/// the notes it was written against (e.g. by `--recover`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReplyTarget {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewNote {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discussion_id: Option<String>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub summary: bool,
    pub file: String,
    pub line: CommentLine,
    pub side: Side,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_idx: Option<usize>,
    /// Overall comments from a code host can't be answered or resolved from lrv, so the UI shows
    /// them without actions.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub read_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum CommentLine {
    Single(usize),
    Range((usize, usize)),
}

impl CommentLine {
    pub fn is_valid(&self) -> bool {
        match self {
            CommentLine::Single(line) => *line > 0,
            CommentLine::Range((start, end)) => *start > 0 && *end > 0 && start <= end,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    New,
    Old,
}

/// How a review published to a code host ends: a plain comment, or a verdict.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReviewAction {
    #[default]
    Comment,
    Accept,
    RequestChanges,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComplete {
    pub comments: Vec<Comment>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub overall_comment: Option<String>,
}

impl Comment {
    pub fn is_valid(&self) -> bool {
        self.line.is_valid() && (self.in_reply_to.is_some() || !self.body.trim().is_empty())
    }
}

impl ReviewNote {
    /// A read-only note about the review as a whole (not tied to a line), shown like a general
    /// comment on the commit message.
    pub fn overall(
        id: Option<String>,
        body: String,
        author: Option<String>,
        date: Option<String>,
        source_url: Option<String>,
        commit_idx: Option<usize>,
    ) -> Self {
        Self {
            id,
            file: "(commit)".to_string(),
            line: CommentLine::Single(1),
            side: Side::New,
            body,
            author,
            date,
            source_url,
            commit_idx,
            summary: false,
            discussion_id: None,
            read_only: true,
        }
    }

    pub fn is_valid(&self) -> bool {
        !self.file.is_empty() && !self.body.trim().is_empty() && self.line.is_valid()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewOutput {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published: Option<Vec<String>>,
    pub status: String,
    pub comments: Vec<Comment>,
    pub summary: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub overall_comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitReview {
    pub idx: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_message: Option<String>,
    pub comments: Vec<Comment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesReviewOutput {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published: Option<Vec<String>>,
    pub status: String,
    pub summary: String,
    pub commits: Vec<CommitReview>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub overall_comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub working_directory: String,
    pub git_branch: Option<String>,
    pub title: Option<String>,
    pub is_public: bool,
    #[serde(default)]
    pub launch_available: bool,
    pub claude_skill_installed: bool,
    /// Set when no comment database could be opened, so comments are not
    /// saved for recovery.
    pub comment_store_error: Option<String>,
    #[serde(default)]
    pub phabricator_available: bool,
    /// Each commit's Phabricator revision id ("D123"), resolved locally so the UI
    /// doesn't wait for Conduit validation to show it.
    #[serde(default)]
    pub phabricator_revisions: Vec<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitSummary {
    pub idx: usize,
    pub commit_hash: Option<String>,
    pub commit_author: Option<String>,
    pub commit_date: Option<String>,
    pub commit_message: Option<String>,
    pub jj_change_id: Option<String>,
    pub stats: DiffStats,
    /// Index into `SeriesInfo::prs` of the pull request this commit belongs to.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pr: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesInfo {
    pub is_series: bool,
    pub commits: Vec<CommitSummary>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub prs: Vec<PrInfo>,
}

/// A GitHub pull request the reviewed commits belong to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PrInfo {
    pub owner: String,
    pub repo: String,
    pub number: u64,
    pub title: Option<String>,
    pub url: Option<String>,
}

/// Which pull request each commit of the series belongs to.
#[derive(Debug, Clone, Default)]
pub struct PullRequests {
    pub prs: Vec<PrInfo>,
    /// Per commit, an index into `prs`.
    pub commit_prs: Vec<Option<usize>>,
}

/// The series UI only shows notes whose `commit_idx` matches the selected commit, but loaders
/// leave it unset when there is a single diff. Pin those notes to commit 0 so they stay visible
/// in a one-commit series.
pub fn tag_single_commit_notes(notes: &mut [ReviewNote], is_series: bool, commit_count: usize) {
    if !is_series || commit_count != 1 {
        return;
    }
    for note in notes {
        if note.commit_idx.is_none() {
            note.commit_idx = Some(0);
        }
    }
}

/// Give every note without an `id` one derived from its content, so the server and the browser
/// identify notes the same way and resending an id-less note is still recognised as a duplicate.
/// Call after `tag_single_commit_notes`, since `commit_idx` is part of the identity.
pub fn assign_note_ids(notes: &mut [ReviewNote]) {
    for note in notes {
        if note.id.is_none() {
            let key =
                serde_json::json!([note.file, note.side, note.line, note.commit_idx, note.body]);
            let mut hash = 0xcbf29ce484222325u64;
            for byte in key.to_string().bytes() {
                hash ^= u64::from(byte);
                hash = hash.wrapping_mul(0x100000001b3);
            }
            note.id = Some(format!("lrv-{hash:016x}"));
        }
    }
}

/// Format server timestamps using the same clock as discussion creation.
pub fn rfc3339_utc(time: std::time::SystemTime) -> String {
    let elapsed = time
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let seconds = elapsed.as_secs();
    let days = (seconds / 86400) as i64 + 719468;
    let era = days / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let mut year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = mp + if mp < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        seconds / 3600 % 24,
        seconds / 60 % 60,
        seconds % 60,
        elapsed.subsec_millis()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_timestamp_format() {
        use std::time::{Duration, UNIX_EPOCH};
        assert_eq!(rfc3339_utc(UNIX_EPOCH), "1970-01-01T00:00:00.000Z");
        assert_eq!(
            rfc3339_utc(UNIX_EPOCH + Duration::from_millis(1709210096789)),
            "2024-02-29T12:34:56.789Z"
        );
    }

    fn note(file: &str, commit_idx: Option<usize>) -> ReviewNote {
        ReviewNote {
            id: None,
            file: file.to_string(),
            line: CommentLine::Single(1),
            side: Side::New,
            body: "x".to_string(),
            author: None,
            date: None,
            source_url: None,
            commit_idx,
            summary: false,
            discussion_id: None,
            read_only: false,
        }
    }

    #[test]
    fn single_commit_series_notes_are_pinned_to_commit_zero() {
        let mut notes = vec![
            note("(commit)", None),
            note("a.rs", None),
            note("b.rs", Some(0)),
        ];
        tag_single_commit_notes(&mut notes, true, 1);
        let got: Vec<_> = notes.iter().map(|n| n.commit_idx).collect();
        assert_eq!(got, [Some(0), Some(0), Some(0)]);
    }

    #[test]
    fn notes_untouched_outside_single_commit_series() {
        for (is_series, count) in [(false, 1), (true, 2)] {
            let mut notes = vec![note("a.rs", None)];
            tag_single_commit_notes(&mut notes, is_series, count);
            assert_eq!(notes[0].commit_idx, None);
        }
    }

    #[test]
    fn note_ids_are_derived_from_content() {
        let mut notes = vec![
            note("a.rs", None),
            note("a.rs", None),
            note("a.rs", Some(0)),
            ReviewNote {
                id: Some("given".to_string()),
                ..note("a.rs", None)
            },
        ];
        assign_note_ids(&mut notes);
        let ids: Vec<_> = notes.iter().map(|n| n.id.clone().unwrap()).collect();
        assert!(ids[0].starts_with("lrv-"));
        assert_eq!(ids[0], ids[1]);
        assert_ne!(ids[0], ids[2]);
        assert_eq!(ids[3], "given");
    }
}
