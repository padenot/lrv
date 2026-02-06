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
