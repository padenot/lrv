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
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewNote {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    New,
    Old,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComplete {
    pub comments: Vec<Comment>,
}

impl Comment {
    pub fn is_valid(&self) -> bool {
        self.line.is_valid()
    }
}

impl ReviewNote {
    pub fn is_valid(&self) -> bool {
        !self.file.is_empty() && !self.body.trim().is_empty() && self.line.is_valid()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewOutput {
    pub status: String,
    pub comments: Vec<Comment>,
    pub summary: String,
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
    pub status: String,
    pub summary: String,
    pub commits: Vec<CommitReview>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub working_directory: String,
    pub git_branch: Option<String>,
    pub title: Option<String>,
    pub is_public: bool,
    pub claude_skill_installed: bool,
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesInfo {
    pub is_series: bool,
    pub commits: Vec<CommitSummary>,
}
