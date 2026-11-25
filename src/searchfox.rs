//! Searchfox code navigation: maps a clicked identifier to searchfox symbols and runs searches.
//!
//! Searchfox indexes its own head revision, which may differ from the reviewed file, so the
//! clicked line is located in searchfox's copy of the file by its text.

use anyhow::{Context, Result};
use searchfox_lib::SearchfoxClient;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, OnceCell};

pub const SEARCHFOX_TREE: &str = "firefox-main";

/// Filled on first use, so concurrent lookups of a path fetch it once. `None` for files searchfox
/// doesn't index.
type FileCell = Arc<OnceCell<Option<Arc<IndexedFile>>>>;

pub struct Searchfox {
    client: SearchfoxClient,
    files: Mutex<HashMap<String, FileCell>>,
}

struct IndexedFile {
    /// searchfox's copy of the file; `lines[n - 1]` is line `n`.
    lines: Vec<String>,
    /// Analysis tokens (`"source":1` records) by 1-based line.
    tokens: HashMap<usize, Vec<Token>>,
}

struct Token {
    start: usize,
    end: usize,
    pretty: String,
    symbols: Vec<String>,
}

/// A click on an identifier. `line` is 1-based; `col` is the 0-based UTF-16 offset of the click
/// within `text`, the full text of that line.
#[derive(Deserialize)]
pub struct Target {
    pub path: String,
    pub line: usize,
    pub col: usize,
    pub word: String,
    pub text: String,
}

#[derive(Serialize)]
pub struct Resolved {
    pub query: String,
    pub pretty: Option<String>,
    pub symbols: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SearchLine {
    pub lno: usize,
    pub line: String,
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
    pub fn new() -> Result<Self> {
        Ok(Self {
            client: SearchfoxClient::new(SEARCHFOX_TREE.to_owned(), false)?,
            files: Mutex::default(),
        })
    }

    pub async fn resolve(&self, target: &Target) -> Result<Resolved> {
        let unresolved = Resolved {
            query: format!("id:{}", target.word),
            pretty: None,
            symbols: Vec::new(),
        };
        let Some(file) = self.indexed(&target.path).await? else {
            return Ok(unresolved);
        };
        let Some((line, col)) = locate(&file.lines, target.line, &target.text, target.col) else {
            return Ok(unresolved);
        };
        let Some(tokens) = file.tokens.get(&line) else {
            return Ok(unresolved);
        };
        let hits = covering(&file.lines[line - 1], tokens, col, &target.word);
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

    pub async fn search(&self, query: &str) -> Result<SearchResults> {
        let mut url = reqwest::Url::parse(&format!(
            "{}/{SEARCHFOX_TREE}/search",
            self.client.base_url()
        ))?;
        url.query_pairs_mut().append_pair("q", query);
        let response = self.client.get(url.as_str().parse()?).await?;
        let body: Map<String, Value> = response.error_for_status()?.json().await?;
        Ok(SearchResults {
            query: query.to_owned(),
            groups: group_results(body)?,
        })
    }

    async fn indexed(&self, path: &str) -> Result<Option<Arc<IndexedFile>>> {
        let cell = Arc::clone(self.files.lock().await.entry(path.to_owned()).or_default());
        Ok(cell
            .get_or_try_init(|| load(&self.client, path))
            .await?
            .clone())
    }
}

async fn load(client: &SearchfoxClient, path: &str) -> Result<Option<Arc<IndexedFile>>> {
    let url = format!("{}/{SEARCHFOX_TREE}/raw-analysis/{path}", client.base_url());
    let response = client.get(url.parse()?).await?;
    if response.status().as_u16() == 404 {
        return Ok(None);
    }
    let tokens = parse_analysis(&response.error_for_status()?.text().await?)?;
    let lines: Vec<String> = client
        .get_file(path)
        .await?
        .lines()
        .map(str::to_owned)
        .collect();
    Ok(Some(Arc::new(IndexedFile { lines, tokens })))
}

fn parse_analysis(ndjson: &str) -> Result<HashMap<usize, Vec<Token>>> {
    let mut tokens: HashMap<usize, Vec<Token>> = HashMap::new();
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
            groups.push(SearchGroup {
                kind: kind.clone(),
                category,
                files: serde_json::from_value(files)?,
            });
        }
    }
    Ok(groups)
}

fn nearest(lines: &[String], line: usize, matches: impl Fn(&str) -> bool) -> Option<usize> {
    lines
        .iter()
        .enumerate()
        .filter(|(_, text)| matches(text))
        .map(|(index, _)| index + 1)
        .min_by_key(|n| n.abs_diff(line))
}

/// The line of searchfox's copy nearest to `line` whose text is `text`, and the byte column on
/// it of UTF-16 column `col` of `text`. Failing an exact match, matches with surrounding
/// whitespace trimmed and shifts the column by the difference in leading whitespace.
fn locate(lines: &[String], line: usize, text: &str, col: usize) -> Option<(usize, usize)> {
    let col = byte_offset(text, col)?;
    if let Some(n) = nearest(lines, line, |l| l == text) {
        return Some((n, col));
    }
    let trimmed = text.trim();
    let n = nearest(lines, line, |l| l.trim() == trimmed)?;
    let col = col.checked_sub(leading(text))? + leading(&lines[n - 1]);
    Some((n, col))
}

fn leading(text: &str) -> usize {
    text.len() - text.trim_start().len()
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

    fn lines(text: &[&str]) -> Vec<String> {
        text.iter().map(|l| l.to_string()).collect()
    }

    #[test]
    fn locate_exact_line() {
        let head = lines(&["int a;", "void f() {", "}"]);
        assert_eq!(locate(&head, 2, "void f() {", 5), Some((2, 5)));
    }

    #[test]
    fn locate_prefers_nearest_duplicate() {
        let head = lines(&["  }", "x", "  }", "y", "  }"]);
        assert_eq!(locate(&head, 5, "  }", 1), Some((5, 1)));
        assert_eq!(locate(&head, 3, "  }", 1), Some((3, 1)));
        assert_eq!(locate(&head, 1, "  }", 1), Some((1, 1)));
    }

    #[test]
    fn locate_trimmed_shifts_column() {
        let head = lines(&["void f() {", "    return g();", "}"]);
        // Local copy is indented by two spaces less than searchfox's head.
        assert_eq!(locate(&head, 2, "  return g();", 9), Some((2, 11)));

        let head = lines(&["return g();"]);
        assert_eq!(locate(&head, 1, "  return g();", 5), Some((1, 3)));
        // A click in the leading whitespace has no counterpart on a less-indented head line.
        assert_eq!(locate(&head, 1, "  return g();", 1), None);
    }

    #[test]
    fn locate_no_match() {
        let head = lines(&["int a;"]);
        assert_eq!(locate(&head, 1, "int b;", 0), None);
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
        let head = lines(&[line]);
        assert_eq!(locate(&head, 1, line, 8), Some((1, 9)));
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
                    "Definitions": [{"path": "b.cpp", "lines": [{"lno": 9, "line": "void x() {", "bounds": [5, 6], "context": null}]}]
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
        let line = &groups[0].files[0].lines[0];
        assert_eq!((line.lno, line.bounds), (3, Some((0, 1))));
        assert_eq!(line.context.as_deref(), Some(""));
    }
}
