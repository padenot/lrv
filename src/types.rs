use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffResponse {
    pub files: Vec<FileDiff>,
    pub stats: DiffStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileStatus,
    pub hunks: Vec<Hunk>,
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
    pub start_line: usize,
    pub end_line: usize,
    pub side: Side,
    pub body: String,
    pub severity: Severity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    New,
    Old,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Comment,
    Suggestion,
    Issue,
    Nitpick,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComplete {
    pub comments: Vec<Comment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewOutput {
    pub status: String,
    pub comments: Vec<Comment>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub working_directory: String,
    pub git_branch: Option<String>,
    pub title: Option<String>,
}
