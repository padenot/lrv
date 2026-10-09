//! "Files changed" comments (stamped with the PR head) are traced back to the
//! series commit that introduced the line.

use lrv::diff::{attribute_line, parse_diff};
use lrv::github::load_github_notes;
use lrv::types::{CommentLine, DiffResponse, Side};

fn commit(hash: &str, hunk: &str) -> DiffResponse {
    parse_diff(&format!(
        "commit {hash}\nAuthor: a <a@b>\nDate: now\n\n    msg\n\ndiff --git a/f.txt b/f.txt\nindex 111..222 100644\n--- a/f.txt\n+++ b/f.txt\n{hunk}"
    ))
    .unwrap()
}

/// base: a b c d e
/// c0 inserts X after b, c1 inserts Y on top, c2 rewrites e -> E.
/// head: Y a b X c d E
fn series() -> Vec<DiffResponse> {
    vec![
        commit("aaa0", "@@ -1,3 +1,4 @@\n a\n b\n+X\n c\n"),
        commit("bbb1", "@@ -1,2 +1,3 @@\n+Y\n a\n b\n"),
        commit("ccc2", "@@ -5,3 +5,3 @@\n c\n d\n-e\n+E\n"),
    ]
}

#[test]
fn traces_added_line_through_later_shifts() {
    assert_eq!(
        attribute_line(&series(), "f.txt", 4, Side::New),
        Some((0, 3))
    );
}

#[test]
fn last_commit_to_change_a_line_wins() {
    assert_eq!(
        attribute_line(&series(), "f.txt", 7, Side::New),
        Some((2, 7))
    );
}

#[test]
fn traces_deleted_line_on_old_side() {
    assert_eq!(
        attribute_line(&series(), "f.txt", 5, Side::Old),
        Some((2, 7))
    );
}

#[test]
fn unchanged_line_falls_back_to_latest_commit_showing_it() {
    assert_eq!(
        attribute_line(&series(), "f.txt", 2, Side::New),
        Some((1, 2))
    );
}

#[test]
fn untouched_file_has_no_attribution() {
    assert_eq!(attribute_line(&series(), "other.txt", 1, Side::New), None);
}

#[test]
fn github_head_comment_lands_on_owning_commit() {
    let path = std::env::temp_dir().join(format!("lrv-gh-attr-{}.json", std::process::id()));
    std::fs::write(
        &path,
        r#"[
          {"id":1,"body":"files changed","path":"f.txt","line":4,"side":"RIGHT","commit_id":"ccc2"},
          {"id":2,"body":"commit view","path":"f.txt","line":3,"side":"RIGHT","commit_id":"aaa0"}
        ]"#,
    )
    .unwrap();
    let notes = load_github_notes(path.to_str().unwrap(), &series()).unwrap();
    assert_eq!(notes[0].commit_idx, Some(0));
    assert!(matches!(notes[0].line, CommentLine::Single(3)));
    assert_eq!(notes[1].commit_idx, Some(0));
    assert!(matches!(notes[1].line, CommentLine::Single(3)));
}
