//! Searchfox code navigation: maps a clicked identifier to searchfox symbols and runs searches.
//!
//! Searchfox indexes one revision of the tree, its head, and numbers lines at it. Every lookup is
//! pinned to that revision's git hash: the analysis and the file text come from it, and the
//! reviewed text is mapped onto it line by line.

use anyhow::{bail, ensure, Context, Result};
use searchfox_lib::SearchfoxClient;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use similar::{capture_diff_slices, Algorithm, DiffOp};
use std::collections::HashMap;
use std::future::Future;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, OnceCell};

pub const SEARCHFOX_TREE: &str = "firefox-main";

/// How often a lookup re-reads searchfox's head when the head moves while it is being read.
const REVISION_ATTEMPTS: usize = 3;
const GH_TIMEOUT: Duration = Duration::from_secs(30);

pub struct Searchfox {
    client: SearchfoxClient,
    /// The reviewed working directory: its git objects may include searchfox's revision.
    working_dir: String,
    /// searchfox's analysis per (path, revision): `None` for files it doesn't index. Only stored
    /// when the head was still that revision once the analysis was read.
    analyses: Memo<Option<Arc<Tokens>>>,
    /// searchfox's copy of each file per (path, revision).
    texts: Memo<Arc<Vec<String>>>,
}

/// Analysis tokens (`"source":1` records) by 1-based line.
type Tokens = HashMap<usize, Vec<Token>>;

/// Values per (path, revision), each computed once. A failed computation is not kept.
struct Memo<T> {
    cells: Mutex<HashMap<Key, Arc<OnceCell<T>>>>,
}

/// (path, revision)
type Key = (String, String);

impl<T> Default for Memo<T> {
    fn default() -> Self {
        Self {
            cells: Mutex::default(),
        }
    }
}

impl<T: Clone> Memo<T> {
    async fn get_or_try_init<Fut>(
        &self,
        path: &str,
        revision: &str,
        init: impl FnOnce() -> Fut,
    ) -> Result<T>
    where
        Fut: Future<Output = Result<T>>,
    {
        let key = (path.to_owned(), revision.to_owned());
        let cell = Arc::clone(self.cells.lock().await.entry(key).or_default());
        cell.get_or_try_init(init).await.cloned()
    }
}

/// searchfox's head moved while a read was in flight, so the read is stale.
#[derive(Debug)]
struct RevisionMoved;

impl std::fmt::Display for RevisionMoved {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "searchfox's revision changed while it was read")
    }
}

impl std::error::Error for RevisionMoved {}

struct Indexed {
    /// searchfox's copy of the file; `lines[n - 1]` is line `n`.
    lines: Arc<Vec<String>>,
    tokens: Arc<Tokens>,
}

struct Token {
    start: usize,
    end: usize,
    pretty: String,
    symbols: Vec<String>,
}

/// Which side of the review the clicked line is on.
#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Old,
    New,
}

impl Side {
    pub fn as_str(self) -> &'static str {
        match self {
            Side::Old => "old",
            Side::New => "new",
        }
    }
}

/// A click on an identifier. `line` is 1-based; `col` is the 0-based UTF-16 offset of the click
/// within `text`, the full text of that line on `side` of commit `commit_idx`.
#[derive(Deserialize)]
pub struct Target {
    pub path: String,
    pub line: usize,
    pub col: usize,
    pub word: String,
    pub text: String,
    pub side: Side,
    pub commit_idx: usize,
}

#[derive(Serialize)]
pub struct Resolved {
    pub query: String,
    pub pretty: Option<String>,
    pub symbols: Vec<String>,
}

/// A line of searchfox's revision in the reviewed file. `line` is the exact line when `exact`;
/// otherwise it is the nearest unchanged line before the searchfox line (or after, if none is
/// before). `None` when the reviewed file has no unchanged line at all.
#[derive(Serialize)]
pub struct RevealedLine {
    pub line: Option<usize>,
    pub exact: bool,
}

#[derive(Serialize, Deserialize)]
pub struct SearchLine {
    pub lno: usize,
    pub line: String,
    /// Byte offsets from searchfox, converted to UTF-16 offsets for the browser.
    pub bounds: Option<(usize, usize)>,
    pub context: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SearchFile {
    pub path: String,
    pub lines: Vec<SearchLine>,
}

#[derive(Serialize, Deserialize)]
pub struct SearchGroup {
    pub kind: String,
    pub category: String,
    pub files: Vec<SearchFile>,
}

#[derive(Serialize)]
pub struct SearchResults {
    pub query: String,
    /// The git revision the line numbers in `groups` refer to.
    pub revision: String,
    pub groups: Vec<SearchGroup>,
}

#[derive(Deserialize)]
struct AnalysisRecord {
    #[serde(default)]
    source: u8,
    #[serde(default)]
    loc: String,
    #[serde(default)]
    sym: String,
    #[serde(default)]
    pretty: String,
}

impl Searchfox {
    pub fn new(working_dir: String) -> Result<Self> {
        let mut client = SearchfoxClient::new(SEARCHFOX_TREE.to_owned(), false)?;
        // The source page is only searchfox's head while it is read fresh; the client's cache
        // would keep serving an older head for an hour after a reindex.
        client.set_cache_enabled(false);
        Ok(Self {
            client,
            working_dir,
            analyses: Memo::default(),
            texts: Memo::default(),
        })
    }

    /// Resolves a click against searchfox's analysis at its head, with the clicked line mapped
    /// onto that revision. `reviewed` is the full text of the clicked side.
    pub async fn resolve(&self, target: &Target, reviewed: &str) -> Result<Resolved> {
        let unresolved = Resolved {
            query: format!("id:{}", target.word),
            pretty: None,
            symbols: Vec::new(),
        };
        let Some(file) = self.indexed(&target.path).await? else {
            return Ok(unresolved);
        };
        let searchfox: Vec<&str> = file.lines.iter().map(String::as_str).collect();
        let reviewed: Vec<&str> = reviewed.lines().collect();
        let pairs = matched_lines(&searchfox, &reviewed);
        let Ok(index) = pairs.binary_search_by_key(&target.line, |&(_, reviewed)| reviewed) else {
            return Ok(unresolved);
        };
        let line = pairs[index].0;
        let Some(tokens) = file.tokens.get(&line) else {
            return Ok(unresolved);
        };
        // Matched lines are equal, so the click's byte column applies to searchfox's copy too.
        let Some(col) = byte_offset(&target.text, target.col) else {
            return Ok(unresolved);
        };
        let hits = covering(searchfox[line - 1], tokens, col, &target.word);
        let Some(first) = hits.first() else {
            return Ok(unresolved);
        };
        let symbols = symbols_of(&hits);
        Ok(Resolved {
            query: format!("symbol:{}", symbols.join(",")),
            pretty: Some(first.pretty.clone()),
            symbols,
        })
    }

    /// Searches searchfox's head. The results are numbered at the revision they report.
    pub async fn search(&self, query: &str) -> Result<SearchResults> {
        at_revision(
            || self.head_revision(),
            |revision| async move {
                let body = self.fetch_search(query).await?;
                self.ensure_head(&revision).await?;
                Ok(SearchResults {
                    query: query.to_owned(),
                    revision,
                    groups: group_results(body)?,
                })
            },
        )
        .await
    }

    /// Where line `lno` of searchfox's `revision` of `path` is in `reviewed`, the reviewed text.
    pub async fn hit_line(
        &self,
        path: &str,
        revision: &str,
        reviewed: &str,
        lno: usize,
    ) -> Result<RevealedLine> {
        let lines = self.text_at(path, revision).await?;
        let searchfox: Vec<&str> = lines.iter().map(String::as_str).collect();
        let reviewed: Vec<&str> = reviewed.lines().collect();
        Ok(reveal(&matched_lines(&searchfox, &reviewed), lno))
    }

    /// The analysis and text of `path` at searchfox's head, or `None` when it isn't indexed.
    async fn indexed(&self, path: &str) -> Result<Option<Indexed>> {
        at_revision(
            || self.head_revision(),
            |revision| async move {
                let tokens = self
                    .analyses
                    .get_or_try_init(path, &revision, || async {
                        let tokens = self.fetch_analysis(path).await?;
                        self.ensure_head(&revision).await?;
                        Ok(tokens)
                    })
                    .await?;
                let Some(tokens) = tokens else {
                    return Ok(None);
                };
                let lines = self.text_at(path, &revision).await?;
                Ok(Some(Indexed { lines, tokens }))
            },
        )
        .await
    }

    /// The git hash of searchfox's head. Its commit-info entry names the head's hg changeset, and
    /// searchfox's hgrev redirect maps that to git. The entry's `parent` is the head's parent, so
    /// it is never used.
    async fn head_revision(&self) -> Result<String> {
        let base = self.client.base_url();
        let info = self
            .client
            .get_raw(&format!("{base}/{SEARCHFOX_TREE}/commit-info/HEAD"))
            .await?;
        let hg = hg_revision_of_head(&info)?;
        let final_url = self
            .client
            .get_final_url(&format!("{base}/{SEARCHFOX_TREE}/hgrev/{hg}"))
            .await?;
        git_revision_of_hgrev(&final_url, &hg)
    }

    async fn ensure_head(&self, revision: &str) -> Result<()> {
        if self.head_revision().await? == revision {
            Ok(())
        } else {
            Err(RevisionMoved.into())
        }
    }

    /// searchfox's analysis of `path` at its head; `None` when it doesn't index the file.
    async fn fetch_analysis(&self, path: &str) -> Result<Option<Arc<Tokens>>> {
        let url = format!(
            "{}/{SEARCHFOX_TREE}/raw-analysis/{path}",
            self.client.base_url()
        );
        let response = self.client.get(url.parse()?).await?;
        if response.status().as_u16() == 404 {
            return Ok(None);
        }
        let tokens = parse_analysis(&response.error_for_status()?.text().await?)?;
        Ok(Some(Arc::new(tokens)))
    }

    async fn fetch_search(&self, query: &str) -> Result<Map<String, Value>> {
        let mut url = reqwest::Url::parse(&format!(
            "{}/{SEARCHFOX_TREE}/search",
            self.client.base_url()
        ))?;
        url.query_pairs_mut().append_pair("q", query);
        let response = self.client.get(url.as_str().parse()?).await?;
        Ok(response.error_for_status()?.json().await?)
    }

    /// searchfox's copy of `path` at `revision`, as lines. It comes from the local repository or
    /// GitHub when either has that exact commit. Otherwise it is searchfox's source page, which
    /// only matches `revision` while the head is `revision`.
    async fn text_at(&self, path: &str, revision: &str) -> Result<Arc<Vec<String>>> {
        self.texts
            .get_or_try_init(path, revision, || async {
                let text = match local_text(&self.working_dir, path, revision).await {
                    Some(text) => text,
                    None => match github_text(&self.working_dir, path, revision).await {
                        Some(text) => text,
                        None => {
                            self.ensure_head(revision).await?;
                            let text = self.client.get_file(path).await?;
                            self.ensure_head(revision).await?;
                            text
                        }
                    },
                };
                Ok(Arc::new(text.lines().map(str::to_owned).collect()))
            })
            .await
    }
}

/// Runs `read` at searchfox's head, retrying while the head moves during it. `head` reads the
/// current head; `read` gets the revision it must read at and fails with `RevisionMoved` when the
/// head has since moved.
async fn at_revision<T, HeadFut, ReadFut>(
    mut head: impl FnMut() -> HeadFut,
    mut read: impl FnMut(String) -> ReadFut,
) -> Result<T>
where
    HeadFut: Future<Output = Result<String>>,
    ReadFut: Future<Output = Result<T>>,
{
    for _ in 0..REVISION_ATTEMPTS {
        let revision = head().await?;
        match read(revision).await {
            Err(error) if error.is::<RevisionMoved>() => continue,
            result => return result,
        }
    }
    bail!("searchfox's revision kept changing; try again")
}

/// The HG changeset of the head's commit-info entry: the last segment of its `fulldiff` link.
fn hg_revision_of_head(commit_info: &str) -> Result<String> {
    let entries: Vec<Value> =
        serde_json::from_str(commit_info).context("searchfox commit-info is not JSON")?;
    let fulldiff = entries
        .first()
        .and_then(|entry| entry.get("fulldiff"))
        .and_then(Value::as_str)
        .context("searchfox commit-info has no fulldiff link")?;
    let hg = fulldiff.rsplit('/').next().unwrap_or_default();
    ensure!(
        is_full_hash(hg),
        "searchfox fulldiff link has no hg changeset: {fulldiff}"
    );
    Ok(hg.to_owned())
}

/// The git revision of searchfox's hgrev redirect target, `.../rev/<git hash>/`. A target naming
/// the hg changeset itself means the mapping failed, so it is rejected.
fn git_revision_of_hgrev(final_url: &str, hg: &str) -> Result<String> {
    let (_, after) = final_url
        .split_once("/rev/")
        .with_context(|| format!("hgrev did not redirect to a revision: {final_url}"))?;
    let git = after.split('/').next().unwrap_or_default();
    ensure!(
        is_full_hash(git) && git != hg,
        "hgrev redirect names no git revision: {final_url}"
    );
    Ok(git.to_owned())
}

/// Whether `s` is a full 40-hex-digit hash, as git and hg name commits.
pub fn is_full_hash(s: &str) -> bool {
    s.len() == 40 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// `path` at `revision` from the working directory's repository, when it has that commit.
async fn local_text(repo: &str, path: &str, revision: &str) -> Option<String> {
    git(repo, &["cat-file", "-e", &format!("{revision}^{{commit}}")]).await?;
    git(repo, &["cat-file", "blob", &format!("{revision}:{path}")]).await
}

/// `path` at `revision` from GitHub, when the working directory's origin is the Firefox repository.
async fn github_text(repo: &str, path: &str, revision: &str) -> Option<String> {
    let origin = git(repo, &["remote", "get-url", "origin"]).await?;
    let (owner, name) = crate::github::parse_github_remote(origin.trim())?;
    if owner != "mozilla-firefox" || name != "firefox" {
        return None;
    }
    let endpoint = contents_endpoint(path, revision);
    let bytes = crate::github::run_gh(
        &["api", "-H", "Accept: application/vnd.github.raw", &endpoint],
        GH_TIMEOUT,
    )
    .await?;
    String::from_utf8(bytes).ok()
}

/// The `gh api` endpoint of `path` at `revision` in the Firefox repository, with `path` encoded
/// segment by segment.
fn contents_endpoint(path: &str, revision: &str) -> String {
    let mut url = reqwest::Url::parse("https://api.github.com/").expect("constant URL");
    url.path_segments_mut()
        .expect("https URLs have path segments")
        .extend(["repos", "mozilla-firefox", "firefox", "contents"])
        .extend(path.split('/'));
    url.set_query(Some(&format!("ref={revision}")));
    format!("{}?{}", url.path(), url.query().unwrap_or_default())
}

/// The stdout of `git <args>` in `repo`, or `None` when git fails or isn't a repository there.
async fn git(repo: &str, args: &[&str]) -> Option<String> {
    let output = tokio::process::Command::new("git")
        .current_dir(repo)
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8(output.stdout).ok()
}

/// Pairs of 1-based (searchfox line, reviewed line) for the lines both texts share in their
/// longest common subsequence, in order. Lines that differ are unpaired. Duplicate lines such as
/// `}` pair by their position in the alignment, not by their text alone.
fn matched_lines(searchfox: &[&str], reviewed: &[&str]) -> Vec<(usize, usize)> {
    let mut pairs = Vec::new();
    for op in capture_diff_slices(Algorithm::Myers, searchfox, reviewed) {
        if let DiffOp::Equal {
            old_index,
            new_index,
            len,
        } = op
        {
            pairs.extend((0..len).map(|i| (old_index + i + 1, new_index + i + 1)));
        }
    }
    pairs
}

/// Where searchfox's line `lno` is, given the `pairs` from `matched_lines`.
fn reveal(pairs: &[(usize, usize)], lno: usize) -> RevealedLine {
    match pairs.binary_search_by_key(&lno, |&(searchfox, _)| searchfox) {
        Ok(index) => RevealedLine {
            line: Some(pairs[index].1),
            exact: true,
        },
        Err(index) => {
            // Mapped lines before `lno` come first; the first one after is only used when there
            // is none before.
            let before = index.checked_sub(1).map(|i| pairs[i]);
            let nearest = before.or(pairs.get(index).copied());
            RevealedLine {
                line: nearest.map(|(_, reviewed)| reviewed),
                exact: false,
            }
        }
    }
}

fn parse_analysis(ndjson: &str) -> Result<Tokens> {
    let mut tokens: Tokens = HashMap::new();
    for json in ndjson.lines() {
        let record: AnalysisRecord = serde_json::from_str(json)?;
        let symbols: Vec<String> = record
            .sym
            .split(',')
            .filter(|s| !s.is_empty())
            .map(str::to_owned)
            .collect();
        if record.source != 1 || symbols.is_empty() {
            continue;
        }
        let (line, cols) = record
            .loc
            .split_once(':')
            .context("analysis loc without a line")?;
        let (start, end) = cols.split_once('-').unwrap_or((cols, cols));
        tokens.entry(line.parse()?).or_default().push(Token {
            start: start.parse()?,
            end: end.parse()?,
            pretty: record.pretty,
            symbols,
        });
    }
    Ok(tokens)
}

fn group_results(body: Map<String, Value>) -> Result<Vec<SearchGroup>> {
    let mut groups = Vec::new();
    for (kind, categories) in body {
        if kind.starts_with('*') {
            continue;
        }
        let categories: Map<String, Value> = serde_json::from_value(categories)?;
        for (category, files) in categories {
            let mut files: Vec<SearchFile> = serde_json::from_value(files)?;
            for line in files.iter_mut().flat_map(|f| &mut f.lines) {
                line.bounds = line.bounds.and_then(|(start, end)| {
                    Some((
                        utf16_offset(&line.line, start)?,
                        utf16_offset(&line.line, end)?,
                    ))
                });
            }
            groups.push(SearchGroup {
                kind: kind.clone(),
                category,
                files,
            });
        }
    }
    Ok(groups)
}

/// The byte offset of UTF-16 offset `col` in `text`.
fn byte_offset(text: &str, col: usize) -> Option<usize> {
    let mut units = 0;
    for (byte, c) in text.char_indices() {
        if units >= col {
            return (units == col).then_some(byte);
        }
        units += c.len_utf16();
    }
    (units == col).then_some(text.len())
}

/// The UTF-16 offset of byte offset `byte` in `text`, for the browser.
fn utf16_offset(text: &str, byte: usize) -> Option<usize> {
    Some(text.get(..byte)?.encode_utf16().count())
}

/// The tokens whose span covers byte column `col` of `line` (analysis columns are bytes),
/// preferring those whose text is `word`.
fn covering<'a>(line: &str, tokens: &'a [Token], col: usize, word: &str) -> Vec<&'a Token> {
    let (exact, loose): (Vec<_>, Vec<_>) = tokens
        .iter()
        .filter(|t| t.start <= col && col < t.end)
        .partition(|t| line.get(t.start..t.end) == Some(word));
    if exact.is_empty() {
        loose
    } else {
        exact
    }
}

/// The union of the matched tokens' symbols in order. `FILE_` symbols only count when nothing
/// else matched.
fn symbols_of(hits: &[&Token]) -> Vec<String> {
    let symbols = unique(
        hits.iter()
            .flat_map(|t| &t.symbols)
            .filter(|s| !s.starts_with("FILE_")),
    );
    if symbols.is_empty() {
        unique(hits.iter().flat_map(|t| &t.symbols))
    } else {
        symbols
    }
}

fn unique<'a>(symbols: impl Iterator<Item = &'a String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for symbol in symbols {
        if !out.contains(symbol) {
            out.push(symbol.clone());
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn head_revision_is_the_hg_changeset_not_the_parent() {
        let hg = "618eadc8".repeat(5);
        let info = format!(
            r#"[{{"header":"h","parent":"{}","date":"d","fulldiff":"https://hg.mozilla.org/mozilla-central/rev/{hg}","phab":null}}]"#,
            "1".repeat(40)
        );
        assert_eq!(hg_revision_of_head(&info).unwrap(), hg);

        let without_fulldiff = format!(r#"[{{"parent":"{}"}}]"#, "1".repeat(40));
        assert!(hg_revision_of_head(&without_fulldiff).is_err());
        assert!(hg_revision_of_head("[]").is_err());
        assert!(hg_revision_of_head("not json").is_err());
    }

    #[test]
    fn hgrev_redirect_must_name_a_git_revision() {
        let hg = "a".repeat(40);
        let git = "b".repeat(40);
        let target = format!("https://searchfox.org/firefox-main/rev/{git}/");
        assert_eq!(git_revision_of_hgrev(&target, &hg).unwrap(), git);
        // The redirect target is not a revision page: no fallback to some other revision.
        assert!(git_revision_of_hgrev("https://searchfox.org/firefox-main/hgrev/", &hg).is_err());
        assert!(git_revision_of_hgrev("https://searchfox.org/firefox-main/rev/xyz/", &hg).is_err());
        // Mapping failed and the hg changeset came back.
        assert!(git_revision_of_hgrev(&format!("https://x/rev/{hg}/"), &hg).is_err());
    }

    #[test]
    fn contents_endpoint_encodes_path_segments() {
        let endpoint = contents_endpoint("dom/a b#c.cpp", &"b".repeat(40));
        assert_eq!(
            endpoint,
            format!(
                "/repos/mozilla-firefox/firefox/contents/dom/a%20b%23c.cpp?ref={}",
                "b".repeat(40)
            )
        );
    }

    #[test]
    fn matched_lines_pair_equal_lines_only() {
        let searchfox = ["int a;", "void f() {", "  x();", "}"];
        // A line inserted before `x();`, and `x();` changed to `y();`.
        let reviewed = ["int a;", "void f() {", "  new();", "  y();", "}"];
        assert_eq!(
            matched_lines(&searchfox, &reviewed),
            [(1, 1), (2, 2), (4, 5)]
        );
    }

    #[test]
    fn matched_lines_follow_position_for_duplicate_lines() {
        let searchfox = ["}", "a", "}", "b", "}"];
        // Lines are inserted before the second and third `}`.
        let reviewed = ["}", "a", "new", "}", "b", "x", "}"];
        assert_eq!(
            matched_lines(&searchfox, &reviewed),
            [(1, 1), (2, 2), (3, 4), (4, 5), (5, 7)]
        );
    }

    #[test]
    fn matched_lines_leave_changed_lines_unpaired() {
        let searchfox = ["a", "b", "c"];
        let reviewed = ["a", "B", "c"];
        assert_eq!(matched_lines(&searchfox, &reviewed), [(1, 1), (3, 3)]);
        assert!(matched_lines(&searchfox, &["x"]).is_empty());
    }

    #[test]
    fn reveal_maps_exact_lines_and_falls_back_to_the_nearest_before() {
        // searchfox line 2 and 3 changed; 1, 4 and 5 are unchanged and map to reviewed 1, 3, 4.
        let pairs = [(1, 1), (4, 3), (5, 4)];
        let exact = reveal(&pairs, 4);
        assert_eq!((exact.line, exact.exact), (Some(3), true));
        let changed = reveal(&pairs, 3);
        assert_eq!((changed.line, changed.exact), (Some(1), false));
        // Nothing before line 1: the nearest is the first mapped line after it.
        let after = reveal(&[(2, 1)], 1);
        assert_eq!((after.line, after.exact), (Some(1), false));
        // Past the end of the file: the last mapped line.
        let past = reveal(&pairs, 99);
        assert_eq!((past.line, past.exact), (Some(4), false));
        let none = reveal(&[], 1);
        assert_eq!((none.line, none.exact), (None, false));
    }

    #[tokio::test]
    async fn at_revision_retries_only_when_the_head_moved() {
        let heads = std::cell::RefCell::new(vec!["r1", "r2", "r2"].into_iter());
        let reads = std::cell::RefCell::new(Vec::new());
        let value = at_revision(
            || async { Ok(heads.borrow_mut().next().unwrap().to_owned()) },
            |revision| {
                reads.borrow_mut().push(revision.clone());
                async move {
                    if revision == "r1" {
                        Err(RevisionMoved.into())
                    } else {
                        Ok(revision)
                    }
                }
            },
        )
        .await
        .unwrap();
        assert_eq!(value, "r2");
        assert_eq!(*reads.borrow(), ["r1", "r2"]);

        let moved = at_revision(
            || async { Ok("r".to_owned()) },
            |_| async { Err::<(), _>(RevisionMoved.into()) },
        )
        .await
        .unwrap_err();
        assert_eq!(
            moved.to_string(),
            "searchfox's revision kept changing; try again"
        );

        let failure = at_revision(
            || async { Ok("r".to_owned()) },
            |_| async { Err::<(), _>(anyhow::anyhow!("network down")) },
        )
        .await
        .unwrap_err();
        assert_eq!(failure.to_string(), "network down");
    }

    #[test]
    fn analysis_keeps_source_records_and_splits_symbols() {
        let ndjson = concat!(
            r#"{"loc":"00001:0","source":1,"syntax":"def,file","pretty":"file a.cpp","sym":"FILE_a@2Ecpp"}"#,
            "\n",
            r#"{"loc":"00395:16-26","source":1,"syntax":"def,function","pretty":"function mozilla::dom::AudioNode::Disconnect","sym":"_ZN1A,_ZN2B"}"#,
            "\n",
            r#"{"loc":"00395:16-26","target":1,"kind":"use","pretty":"x","sym":"_ZN3C"}"#,
            "\n",
            r#"{"loc":"00550:22-29","structured":1,"pretty":"p","sym":"F_<T_1>_"}"#,
            "\n",
        );
        let tokens = parse_analysis(ndjson).unwrap();
        assert_eq!(tokens.len(), 2);
        let token = &tokens[&395][0];
        assert_eq!((token.start, token.end), (16, 26));
        assert_eq!(token.symbols, ["_ZN1A", "_ZN2B"]);
        assert_eq!(tokens[&1][0].symbols, ["FILE_a@2Ecpp"]);
    }

    #[test]
    fn covering_uses_end_exclusive_columns() {
        let line = "void AudioNode::Disconnect(ErrorResult& aRv) {";
        let tokens =
            parse_analysis(r#"{"loc":"00395:16-26","source":1,"pretty":"p","sym":"_ZN1A"}"#)
                .unwrap();
        let tokens = &tokens[&395];
        assert_eq!(covering(line, tokens, 16, "Disconnect").len(), 1);
        assert_eq!(covering(line, tokens, 25, "Disconnect").len(), 1);
        assert!(covering(line, tokens, 26, "Disconnect").is_empty());
        assert!(covering(line, tokens, 15, "Disconnect").is_empty());
    }

    #[test]
    fn non_ascii_columns_map_to_bytes() {
        // "é" is one UTF-16 unit but two bytes: "Foo" is at UTF-16 8 and byte 9.
        let line = "/* é */ Foo();";
        assert_eq!(byte_offset(line, 8), Some(9));
        let tokens =
            parse_analysis(r#"{"loc":"00001:9-12","source":1,"pretty":"p","sym":"_ZFoo"}"#)
                .unwrap();
        assert_eq!(covering(line, &tokens[&1], 9, "Foo").len(), 1);
        assert!(covering(line, &tokens[&1], 8, "Foo").is_empty());
        // Columns inside a surrogate pair don't exist.
        assert_eq!(byte_offset("😀a", 1), None);
        assert_eq!(byte_offset("😀a", 2), Some(4));
    }

    #[test]
    fn covering_prefers_spans_whose_text_is_the_word() {
        let line = "a.Foo(Foo)";
        let tokens = parse_analysis(concat!(
            r#"{"loc":"00001:1-5","source":1,"pretty":"other","sym":"_ZOther"}"#,
            "\n",
            r#"{"loc":"00001:2-5","source":1,"pretty":"member","sym":"_ZMember"}"#,
            "\n",
        ))
        .unwrap();
        let tokens = &tokens[&1];
        // Both spans cover column 2; only the second reads as "Foo".
        let hits = covering(line, tokens, 2, "Foo");
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].pretty, "member");
    }

    #[test]
    fn symbols_skip_file_symbols_unless_alone() {
        let token = |sym: &str| Token {
            start: 0,
            end: 0,
            pretty: String::new(),
            symbols: sym.split(',').map(str::to_owned).collect(),
        };
        let file = token("FILE_a@2Ecpp,FILE_b@2Eh");
        let member = token("_ZA,_ZB");
        let again = token("_ZB,_ZC");
        assert_eq!(symbols_of(&[&file, &member, &again]), ["_ZA", "_ZB", "_ZC"]);
        assert_eq!(symbols_of(&[&file]), ["FILE_a@2Ecpp", "FILE_b@2Eh"]);
    }

    #[test]
    fn search_results_keep_order_and_skip_metadata() {
        let body: Map<String, Value> = serde_json::from_str(
            r#"{
                "normal": {
                    "Uses": [{"path": "a.cpp", "lines": [{"lno": 3, "line": "x();", "bounds": [0, 1], "context": "", "contextsym": "", "peekRange": "3-3"}]}],
                    "Definitions": [{"path": "b.cpp", "lines": [{"lno": 9, "line": "/*é*/x() {", "bounds": [6, 7], "context": null}]}]
                },
                "generated": {"Uses": [{"path": "__GENERATED__/c.cpp", "lines": []}]},
                "*title*": "Symbol x",
                "*timedout*": false,
                "*limits*": []
            }"#,
        )
        .unwrap();
        let groups = group_results(body).unwrap();
        let summary: Vec<_> = groups
            .iter()
            .map(|g| (g.kind.as_str(), g.category.as_str(), g.files.len()))
            .collect();
        assert_eq!(
            summary,
            [
                ("normal", "Uses", 1),
                ("normal", "Definitions", 1),
                ("generated", "Uses", 1)
            ]
        );
        let line = &groups[1].files[0].lines[0];
        assert_eq!(line.bounds, Some((5, 6)));
        let line = &groups[0].files[0].lines[0];
        assert_eq!((line.lno, line.bounds), (3, Some((0, 1))));
        assert_eq!(line.context.as_deref(), Some(""));
    }
}
