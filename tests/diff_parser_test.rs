/// Test parsing empty diff
#[test]
fn test_parse_empty_diff() {
    let result = lrv::diff::parse_diff("");
    assert!(result.is_ok());

    let diff = result.unwrap();
    assert_eq!(diff.files.len(), 0);
    assert_eq!(diff.stats.files_changed, 0);
    assert_eq!(diff.stats.additions, 0);
    assert_eq!(diff.stats.deletions, 0);
}

/// Test parsing simple modification
#[test]
fn test_parse_simple_modification() {
    let diff_text = r#"diff --git a/test.txt b/test.txt
index abc123..def456 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3
"#;

    let result = lrv::diff::parse_diff(diff_text);
    assert!(result.is_ok());

    let diff = result.unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.files[0].path, "test.txt");
    assert_eq!(diff.stats.additions, 1);
    assert_eq!(diff.stats.deletions, 1);
}

/// Test parsing new file
#[test]
fn test_parse_new_file() {
    let diff_text = r#"diff --git a/newfile.txt b/newfile.txt
new file mode 100644
index 0000000..abc123
--- /dev/null
+++ b/newfile.txt
@@ -0,0 +1,2 @@
+line 1
+line 2
"#;

    let result = lrv::diff::parse_diff(diff_text);
    assert!(result.is_ok());

    let diff = result.unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.stats.additions, 2);
    assert_eq!(diff.stats.deletions, 0);
}

/// Test parsing deleted file
#[test]
fn test_parse_deleted_file() {
    let diff_text = r#"diff --git a/oldfile.txt b/oldfile.txt
deleted file mode 100644
index abc123..0000000
--- a/oldfile.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-line 1
-line 2
"#;

    let result = lrv::diff::parse_diff(diff_text);
    assert!(result.is_ok());

    let diff = result.unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.stats.additions, 0);
    assert_eq!(diff.stats.deletions, 2);
}

/// Test parsing multiple files
#[test]
fn test_parse_multiple_files() {
    let diff_text = r#"diff --git a/file1.txt b/file1.txt
index abc123..def456 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-old content
+new content
diff --git a/file2.txt b/file2.txt
index 111222..333444 100644
--- a/file2.txt
+++ b/file2.txt
@@ -1 +1,2 @@
 existing line
+added line
"#;

    let result = lrv::diff::parse_diff(diff_text);
    assert!(result.is_ok());

    let diff = result.unwrap();
    assert_eq!(diff.files.len(), 2);
    assert_eq!(diff.files[0].path, "file1.txt");
    assert_eq!(diff.files[1].path, "file2.txt");
    assert_eq!(diff.stats.files_changed, 2);
}

/// git diff: no metadata header
#[test]
fn test_parse_git_diff_no_metadata() {
    let diff_text = r#"diff --git a/src/lib.rs b/src/lib.rs
index a1b2c3d..e4f5a6b 100644
--- a/src/lib.rs
+++ b/src/lib.rs
@@ -1,3 +1,3 @@
 fn greet() {
-    println!("hello");
+    println!("hi");
 }
"#;

    let diff = lrv::diff::parse_diff(diff_text).unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.files[0].path, "src/lib.rs");
    assert_eq!(diff.stats.additions, 1);
    assert_eq!(diff.stats.deletions, 1);
    assert!(diff.commit_hash.is_none());
    assert!(diff.commit_message.is_none());
}

/// git show: commit hash, author, date and message before the diff
#[test]
fn test_parse_git_show_with_metadata() {
    let diff_text = r#"commit 453ef69a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e
Author: Paul Adenot <paul@paul.cx>
Date:   Wed Feb 18 12:00:00 2026 +0100

    Remove dead expand/range system

    Monaco's hideUnchangedRegions replaced the custom expand/range system.
    hasFullContent was hardcoded to true, making all controls into no-ops.

diff --git a/web/assets/app.js b/web/assets/app.js
index a1b2c3d..e4f5a6b 100644
--- a/web/assets/app.js
+++ b/web/assets/app.js
@@ -1,3 +1,3 @@
 function init() {
-    renderExpandControls();
+    initFileHunks();
 }
"#;

    let diff = lrv::diff::parse_diff(diff_text).unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.files[0].path, "web/assets/app.js");
    assert_eq!(diff.stats.additions, 1);
    assert_eq!(diff.stats.deletions, 1);
    assert_eq!(
        diff.commit_hash.as_deref(),
        Some("453ef69a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e")
    );
    assert_eq!(diff.commit_author.as_deref(), Some("Paul Adenot <paul@paul.cx>"));
    assert_eq!(diff.commit_date.as_deref(), Some("Wed Feb 18 12:00:00 2026 +0100"));
    let msg = diff.commit_message.as_deref().unwrap();
    assert!(msg.starts_with("Remove dead expand/range system"));
    assert!(msg.contains("hasFullContent was hardcoded to true"));
}

/// jj diff --git / jj diff --git -r @: no metadata, plain unified diff
#[test]
fn test_parse_jj_diff_no_metadata() {
    let diff_text = r#"diff --git a/src/diff.rs b/src/diff.rs
index a1b2c3d..e4f5a6b 100644
--- a/src/diff.rs
+++ b/src/diff.rs
@@ -1,3 +1,3 @@
 fn parse() {
-    let x = old();
+    let x = new();
 }
"#;

    let diff = lrv::diff::parse_diff(diff_text).unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.files[0].path, "src/diff.rs");
    assert_eq!(diff.stats.additions, 1);
    assert_eq!(diff.stats.deletions, 1);
    assert!(diff.commit_hash.is_none());
    assert!(diff.commit_message.is_none());
}

/// jj show --git -r <rev>: jj-style header with Commit ID / Author   : / indented message
#[test]
fn test_parse_jj_show_with_metadata() {
    let diff_text = r#"Commit ID: 4b35c2f2d8600a1b4669709f70db7fb03cae1f67
Change ID: tpxvqmowouxrpptnlmzoqxzqxzpnnuyr
Bookmarks: my-feature
Author   : Paul Adenot <paul@paul.cx> (2026-02-18 14:54:49)
Committer: Paul Adenot <paul@paul.cx> (2026-02-18 15:38:08)

    Fix integer overflow in range comparison

    When aOffset is near INT64_MAX the sum overflows to a negative value,
    causing conditions to evaluate incorrectly.

    Fix by computing the end offset as uint64_t.

diff --git a/dom/media/MediaResource.cpp b/dom/media/MediaResource.cpp
index 31eb1b8241..c0b0d9bd58 100644
--- a/dom/media/MediaResource.cpp
+++ b/dom/media/MediaResource.cpp
@@ -1,3 +1,3 @@
-if (length >= aOffset + aCount) {
+const uint64_t end = uint64_t(aOffset) + aCount;
+if (uint64_t(length) >= end) {
 }
"#;

    let diff = lrv::diff::parse_diff(diff_text).unwrap();
    assert_eq!(diff.files.len(), 1);
    assert_eq!(diff.files[0].path, "dom/media/MediaResource.cpp");
    assert_eq!(diff.stats.additions, 2);
    assert_eq!(diff.stats.deletions, 1);
    assert_eq!(
        diff.commit_hash.as_deref(),
        Some("4b35c2f2d8600a1b4669709f70db7fb03cae1f67")
    );
    assert_eq!(
        diff.commit_author.as_deref(),
        Some("Paul Adenot <paul@paul.cx> (2026-02-18 14:54:49)")
    );
    assert!(diff.commit_date.is_none()); // jj embeds date in author field
    let msg = diff.commit_message.as_deref().unwrap();
    assert!(msg.starts_with("Fix integer overflow in range comparison"));
    assert!(msg.contains("uint64_t"));
}

/// Test that stats are calculated correctly
#[test]
fn test_stats_calculation() {
    let diff_text = r#"diff --git a/test.txt b/test.txt
--- a/test.txt
+++ b/test.txt
@@ -1,5 +1,6 @@
 keep1
-remove1
-remove2
+add1
+add2
+add3
 keep2
"#;

    let result = lrv::diff::parse_diff(diff_text);
    assert!(result.is_ok());

    let diff = result.unwrap();
    assert_eq!(diff.stats.additions, 3);
    assert_eq!(diff.stats.deletions, 2);
}
