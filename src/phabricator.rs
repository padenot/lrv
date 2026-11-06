use crate::types::{Comment, CommentLine, NoteOrigin, ReviewAction, ReviewNote, Side};
use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Deserialize)]
struct ConduitResponse<T> {
    error_code: Option<String>,
    error_info: Option<String>,
    result: Option<T>,
}

impl<T> ConduitResponse<T> {
    fn into_result(self) -> Result<T> {
        if let Some(error_code) = self.error_code {
            anyhow::bail!(
                "Phabricator API error {}: {}",
                error_code,
                self.error_info.unwrap_or_default()
            );
        }
        self.result
            .context("Phabricator response did not include result")
    }
}

#[derive(Debug, Deserialize)]
struct RevisionSearchData {
    data: Vec<RevisionData>,
}

#[derive(Debug, Deserialize)]
struct RevisionData {
    id: u32,
    fields: RevisionFields,
}

#[derive(Debug, Deserialize)]
struct RevisionFields {
    title: Option<String>,
    uri: Option<String>,
    #[serde(rename = "diffPHID")]
    diff_phid: Option<String>,
    #[serde(rename = "authorPHID")]
    author_phid: Option<String>,
    status: Option<RevisionStatus>,
}

#[derive(Debug, Deserialize)]
struct RevisionStatus {
    /// e.g. `needs-review`, `accepted`, `needs-revision`, `changes-planned`.
    value: Option<String>,
    name: Option<String>,
    #[serde(default)]
    closed: bool,
}

#[derive(Debug, Deserialize)]
struct TransactionSearchData {
    data: Vec<TransactionData>,
    cursor: Option<SearchCursor>,
}

#[derive(Debug, Deserialize)]
struct SearchCursor {
    after: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TransactionData {
    #[serde(rename = "type")]
    transaction_type: Option<String>,
    #[serde(rename = "authorPHID")]
    author_phid: Option<String>,
    fields: Option<serde_json::Value>,
    comments: Vec<CommentData>,
}

#[derive(Debug, Deserialize)]
struct CommentData {
    id: serde_json::Value,
    #[serde(rename = "authorPHID")]
    author_phid: Option<String>,
    removed: Option<bool>,
    content: CommentContent,
}

#[derive(Debug, Deserialize)]
struct CommentContent {
    raw: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UserSearchData {
    data: Vec<UserData>,
}

#[derive(Debug, Deserialize)]
struct UserData {
    phid: String,
    fields: UserFields,
}

#[derive(Debug, Deserialize)]
struct UserFields {
    #[serde(rename = "realName")]
    real_name: Option<String>,
    username: Option<String>,
}

/// Result of `phid.query`: the display name of any object, e.g. the Herald application.
#[derive(Debug, Deserialize)]
struct PhidInfo {
    name: Option<String>,
}

#[derive(Clone)]
pub struct PhabricatorClient {
    base_url: String,
    token: String,
    client: Client,
}

impl PhabricatorClient {
    pub fn new(base_url: String, token: String) -> Result<Self> {
        let client = Client::builder()
            .user_agent(concat!("lrv/", env!("CARGO_PKG_VERSION")))
            .build()
            .context("Failed to create Phabricator HTTP client")?;
        Ok(Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            token,
            client,
        })
    }

    pub fn with_base_url(&self, base_url: String) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            ..self.clone()
        }
    }

    pub async fn fetch_review_notes(
        &self,
        revision: &str,
        include_done: bool,
    ) -> Result<Vec<ReviewNote>> {
        let revision_id = parse_revision_id(revision).context("Invalid Phabricator revision")?;
        let monogram = format!("D{revision_id}");
        let (revision, transactions) = tokio::try_join!(
            self.fetch_revision(revision_id),
            self.fetch_transactions(&monogram),
        )?;
        let users = self.fetch_user_names(&transactions).await;

        let mut notes = Vec::new();
        for transaction in transactions {
            match transaction.transaction_type.as_deref() {
                Some("inline") => {
                    self.append_inline_notes(
                        &mut notes,
                        &revision,
                        &transaction,
                        &users,
                        include_done,
                    );
                }
                Some("comment") => {
                    self.append_revision_notes(&mut notes, &revision, &transaction, &users);
                }
                _ => {}
            }
        }

        notes.sort_by_key(|note| {
            (
                note.commit_idx.unwrap_or(usize::MAX),
                note.file.clone(),
                note_line_start(&note.line),
            )
        });
        Ok(notes)
    }

    async fn fetch_revision(&self, revision_id: u32) -> Result<RevisionData> {
        let url = format!("{}/api/differential.revision.search", self.base_url);
        let params = vec![
            ("api.token".to_string(), self.token.clone()),
            ("constraints[ids][0]".to_string(), revision_id.to_string()),
        ];
        let response = self
            .client
            .post(url)
            .form(&params)
            .send()
            .await
            .context("Failed to fetch Phabricator revision")?;
        let response = response
            .json::<ConduitResponse<RevisionSearchData>>()
            .await
            .context("Failed to parse Phabricator revision response")?
            .into_result()?;
        response
            .data
            .into_iter()
            .next()
            .with_context(|| format!("No Phabricator revision found for D{}", revision_id))
    }

    async fn fetch_transactions(&self, object_identifier: &str) -> Result<Vec<TransactionData>> {
        let mut after: Option<String> = None;
        let mut all = Vec::new();

        loop {
            let url = format!("{}/api/transaction.search", self.base_url);
            let mut params = vec![
                ("api.token".to_string(), self.token.clone()),
                (
                    "objectIdentifier".to_string(),
                    object_identifier.to_string(),
                ),
            ];
            if let Some(cursor) = after.as_ref() {
                params.push(("after".to_string(), cursor.clone()));
            }
            let response = self
                .client
                .post(url)
                .form(&params)
                .send()
                .await
                .context("Failed to fetch Phabricator transactions")?;
            let response = response
                .json::<ConduitResponse<TransactionSearchData>>()
                .await
                .context("Failed to parse Phabricator transaction response")?
                .into_result()?;
            all.extend(response.data);
            after = response.cursor.and_then(|cursor| cursor.after);
            if after.is_none() {
                break;
            }
        }

        Ok(all)
    }

    async fn fetch_user_names(&self, transactions: &[TransactionData]) -> HashMap<String, String> {
        let mut phids = HashSet::new();
        for transaction in transactions {
            if let Some(phid) = transaction.author_phid.as_ref() {
                phids.insert(phid.clone());
            }
            for comment in &transaction.comments {
                if let Some(phid) = comment.author_phid.as_ref() {
                    phids.insert(phid.clone());
                }
            }
        }
        if phids.is_empty() {
            return HashMap::new();
        }

        let url = format!("{}/api/user.search", self.base_url);
        let mut params = vec![("api.token".to_string(), self.token.clone())];
        for (idx, phid) in phids.iter().enumerate() {
            params.push((format!("constraints[phids][{}]", idx), phid.clone()));
        }

        let Ok(response) = self.client.post(url).form(&params).send().await else {
            return HashMap::new();
        };
        let Ok(response) = response.json::<ConduitResponse<UserSearchData>>().await else {
            return HashMap::new();
        };
        let Ok(data) = response.into_result() else {
            return HashMap::new();
        };

        let mut users = HashMap::new();
        for user in data.data {
            let display_name = display_user_name(&user.fields).unwrap_or_else(|| user.phid.clone());
            users.insert(user.phid, display_name);
        }
        // Authors that aren't users, such as Herald rules, only resolve through `phid.query`.
        let unresolved: Vec<&String> = phids.iter().filter(|p| !users.contains_key(*p)).collect();
        users.extend(self.fetch_phid_names(&unresolved).await);
        users
    }

    async fn fetch_phid_names(&self, phids: &[&String]) -> HashMap<String, String> {
        if phids.is_empty() {
            return HashMap::new();
        }
        let url = format!("{}/api/phid.query", self.base_url);
        let mut params = vec![("api.token".to_string(), self.token.clone())];
        for (idx, phid) in phids.iter().enumerate() {
            params.push((format!("phids[{}]", idx), (*phid).clone()));
        }
        let Ok(response) = self.client.post(url).form(&params).send().await else {
            return HashMap::new();
        };
        let Ok(response) = response
            .json::<ConduitResponse<HashMap<String, PhidInfo>>>()
            .await
        else {
            return HashMap::new();
        };
        let Ok(infos) = response.into_result() else {
            return HashMap::new();
        };
        infos
            .into_iter()
            .filter_map(|(phid, info)| Some((phid, info.name.filter(|n| !n.is_empty())?)))
            .collect()
    }

    fn append_inline_notes(
        &self,
        notes: &mut Vec<ReviewNote>,
        revision: &RevisionData,
        transaction: &TransactionData,
        users: &HashMap<String, String>,
        include_done: bool,
    ) {
        let fields = transaction
            .fields
            .as_ref()
            .unwrap_or(&serde_json::Value::Null);
        let is_done = fields
            .get("isDone")
            .and_then(|value| value.as_bool())
            .unwrap_or(false);
        if is_done && !include_done {
            return;
        }

        let Some(file_path) = fields.get("path").and_then(|value| value.as_str()) else {
            return;
        };
        let Some(line) = fields.get("line").and_then(|value| value.as_u64()) else {
            return;
        };
        if line == 0 {
            return;
        }
        let length = fields
            .get("length")
            .and_then(|value| value.as_u64())
            .unwrap_or(1)
            .max(1);
        let side = if fields.get("isNewFile").and_then(|v| v.as_bool()) == Some(false) {
            Side::Old
        } else {
            Side::New
        };
        let line = line as usize;
        let line = if length > 1 {
            CommentLine::Range((line, line + length as usize - 1))
        } else {
            CommentLine::Single(line)
        };

        for comment in &transaction.comments {
            if comment.removed.unwrap_or(false) {
                continue;
            }
            let body = comment.content.raw.as_deref().unwrap_or("").trim();
            if body.is_empty() {
                continue;
            }
            let author_phid = comment
                .author_phid
                .as_ref()
                .or(transaction.author_phid.as_ref());
            notes.push(ReviewNote {
                origin: NoteOrigin::Host,
                id: Some(comment.id.to_string()),
                file: file_path.to_string(),
                line: line.clone(),
                side,
                body: body.to_string(),
                author: author_phid.and_then(|phid| users.get(phid).cloned()),
                date: None,
                source_url: revision.fields.uri.clone(),
                commit_idx: None,
                summary: false,
                discussion_id: None,
                read_only: false,
            });
        }
    }

    fn append_revision_notes(
        &self,
        notes: &mut Vec<ReviewNote>,
        revision: &RevisionData,
        transaction: &TransactionData,
        users: &HashMap<String, String>,
    ) {
        for comment in &transaction.comments {
            if comment.removed.unwrap_or(false) {
                continue;
            }
            let body = comment.content.raw.as_deref().unwrap_or("").trim();
            if body.is_empty() {
                continue;
            }
            let author_phid = comment
                .author_phid
                .as_ref()
                .or(transaction.author_phid.as_ref());
            notes.push(ReviewNote::overall(
                Some(comment.id.to_string()),
                body.to_string(),
                author_phid.and_then(|phid| users.get(phid).cloned()),
                None,
                revision.fields.uri.clone(),
                None,
            ));
        }
    }
}

/// The user the API token belongs to.
#[derive(Debug, Clone)]
pub struct Viewer {
    pub phid: String,
    pub username: String,
}

/// A revision's active diff, as far as it is needed to check that a local commit matches it.
#[derive(Debug, Clone)]
pub struct ActiveDiff {
    pub title: String,
    pub uri: String,
    pub author_phid: Option<String>,
    /// Closed or abandoned revisions can still be commented on, but rarely should be.
    pub closed: bool,
    /// The revision's status value (`accepted`, `needs-review`, ...) and display name.
    pub status: Option<String>,
    pub status_name: Option<String>,
    pub diff_id: u64,
    /// The diff's top commit as the submitting tool recorded it, if it did.
    pub commit: Option<CommitIdentity>,
}

/// A commit's Git tree and first parent: enough to tell whether two commits have the same content,
/// and if they don't, whether the difference could lie in an earlier commit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommitIdentity {
    pub tree: String,
    pub parent: Option<String>,
}

/// How a local commit compares with a revision's latest diff.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiffCheck {
    Matches,
    /// Same parent, different content.
    Mismatch(String),
    /// Nothing to compare, or a different parent, so the difference may come from earlier commits.
    Unverified(String),
}

/// A draft inline comment: `length` is the number of lines it covers.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InlineDraft {
    pub file: String,
    pub is_new_file: bool,
    pub line: usize,
    pub length: usize,
    pub body: String,
}

/// Everything to publish on one revision.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RevisionPublish {
    pub inlines: Vec<InlineDraft>,
    pub comment: Option<String>,
    pub action: ReviewAction,
}

/// How far publishing a revision got, so that retrying after a failure doesn't repeat it.
#[derive(Debug, Clone, Copy, Default)]
pub struct PublishProgress {
    pub inlines_created: usize,
    pub published: bool,
}

/// Build the inlines and general comment for one revision.
pub fn build_revision_publish(
    comments: &[Comment],
    overall_comment: Option<&str>,
    action: ReviewAction,
) -> RevisionPublish {
    let mut revision = RevisionPublish {
        inlines: Vec::new(),
        comment: None,
        action,
    };
    let mut general = Vec::new();
    for comment in comments {
        // A reply to a note with nothing to say only asks the agent to address the note.
        if comment.body.trim().is_empty() {
            continue;
        }
        if comment.file == "(commit)" {
            general.push(comment.body.as_str());
            continue;
        }
        let (line, length) = match comment.line {
            CommentLine::Single(line) => (line, 1),
            CommentLine::Range((start, end)) => (start, end - start + 1),
        };
        revision.inlines.push(InlineDraft {
            file: comment.file.clone(),
            is_new_file: comment.side == Side::New,
            line,
            length,
            body: comment.body.clone(),
        });
    }
    if let Some(overall) = overall_comment.filter(|s| !s.trim().is_empty()) {
        general.push(overall);
    }
    if !general.is_empty() {
        revision.comment = Some(general.join("\n\n"));
    }
    revision
}

/// The top commit recorded in a diff's `local:commits` property (moz-phab and arc record each
/// submitted commit with its tree and parents). The top commit is the one no other commit lists as
/// a parent.
fn diff_commit(diff: &serde_json::Value) -> Option<CommitIdentity> {
    let commits = diff.get("properties")?.get("local:commits")?.as_object()?;
    let parents_of = |commit: &serde_json::Value| -> Vec<String> {
        commit
            .get("parents")
            .and_then(|p| p.as_array())
            .into_iter()
            .flatten()
            .filter_map(|parent| parent.as_str().map(str::to_string))
            .collect()
    };
    let parents: HashSet<String> = commits.values().flat_map(parents_of).collect();
    let mut tops = commits.iter().filter(|(sha, commit)| {
        !parents.contains(sha.as_str())
            && !commit
                .get("commit")
                .and_then(|c| c.as_str())
                .is_some_and(|c| parents.contains(c))
    });
    let (_, top) = tops.next()?;
    if tops.next().is_some() {
        return None;
    }
    let tree = top.get("tree")?.as_str().filter(|t| !t.is_empty())?;
    Some(CommitIdentity {
        tree: tree.to_string(),
        parent: parents_of(top).into_iter().next(),
    })
}

fn short(sha: &str) -> &str {
    &sha[..sha.len().min(12)]
}

/// Inline comments are anchored to lines of the revision's diff, so publishing from a commit that
/// differs from it would put them on the wrong lines. Git trees cover the whole repository, so
/// identical trees prove the content matches. Different trees on the same parent prove it doesn't;
/// on different parents the difference may lie in earlier commits (a rebase, or a stack applied on
/// another base), so the commit can't be verified.
pub fn check_diff_matches(
    revision: &str,
    local: Option<&CommitIdentity>,
    active: &ActiveDiff,
) -> DiffCheck {
    let diff = format!("the latest diff (id {}) of {revision}", active.diff_id);
    let Some(local) = local else {
        return DiffCheck::Unverified(format!("there is no local commit to compare with {diff}"));
    };
    let Some(remote) = &active.commit else {
        return DiffCheck::Unverified(format!("{diff} records no Git tree to compare with"));
    };
    if local.tree == remote.tree {
        return DiffCheck::Matches;
    }
    match (&local.parent, &remote.parent) {
        (Some(ours), Some(theirs)) if ours == theirs => DiffCheck::Mismatch(format!(
            "the local commit doesn't match {diff}"
        )),
        (ours, theirs) => DiffCheck::Unverified(format!(
            "the local commit doesn't match {diff}, but it is on a different parent ({} instead of {}), so earlier commits may differ instead",
            ours.as_deref().map_or("none", short),
            theirs.as_deref().map_or("unknown", short),
        )),
    }
}

impl PhabricatorClient {
    async fn conduit<T: serde::de::DeserializeOwned>(
        &self,
        method: &str,
        mut params: Vec<(String, String)>,
    ) -> Result<T> {
        params.push(("api.token".to_string(), self.token.clone()));
        self.client
            .post(format!("{}/api/{}", self.base_url, method))
            .form(&params)
            .send()
            .await
            .with_context(|| format!("Phabricator {method} request failed"))?
            .json::<ConduitResponse<T>>()
            .await
            .with_context(|| format!("Failed to parse Phabricator {method} response"))?
            .into_result()
    }

    /// The user the token belongs to; also proves the token works.
    pub async fn whoami(&self) -> Result<Viewer> {
        let value: serde_json::Value = self.conduit("user.whoami", Vec::new()).await?;
        let text = |key: &str| value.get(key).and_then(|v| v.as_str()).map(str::to_string);
        Ok(Viewer {
            phid: text("phid").context("user.whoami returned no phid")?,
            username: text("userName").context("user.whoami returned no userName")?,
        })
    }

    /// The revisions and the files of their latest diffs, with per-revision failures preserved.
    pub async fn fetch_active_diffs(
        &self,
        ids: &[u32],
    ) -> Result<HashMap<u32, Result<ActiveDiff>>> {
        if ids.is_empty() {
            return Ok(HashMap::new());
        }
        let revisions: RevisionSearchData = self
            .conduit(
                "differential.revision.search",
                ids.iter()
                    .enumerate()
                    .map(|(i, id)| (format!("constraints[ids][{i}]"), id.to_string()))
                    .collect(),
            )
            .await?;
        let mut revisions: HashMap<_, _> = revisions
            .data
            .into_iter()
            .map(|revision| (revision.id, revision))
            .collect();
        let diff_phids: HashSet<_> = revisions
            .values()
            .filter_map(|revision| revision.fields.diff_phid.clone())
            .collect();
        let mut diff_ids = HashMap::new();
        let mut queried = serde_json::Value::Null;
        if !diff_phids.is_empty() {
            let search: serde_json::Value = self
                .conduit(
                    "differential.diff.search",
                    diff_phids
                        .iter()
                        .enumerate()
                        .map(|(i, phid)| (format!("constraints[phids][{i}]"), phid.clone()))
                        .collect(),
                )
                .await?;
            if let Some(data) = search.get("data").and_then(|v| v.as_array()) {
                for diff in data {
                    if let (Some(phid), Some(id)) = (
                        diff.get("phid").and_then(|v| v.as_str()),
                        diff.get("id").and_then(|v| v.as_u64()),
                    ) {
                        diff_ids.insert(phid.to_string(), id);
                    }
                }
            }
            if !diff_ids.is_empty() {
                queried = self
                    .conduit(
                        "differential.querydiffs",
                        diff_ids
                            .values()
                            .enumerate()
                            .map(|(i, id)| (format!("ids[{i}]"), id.to_string()))
                            .collect(),
                    )
                    .await?;
            }
        }
        Ok(ids
            .iter()
            .map(|&id| {
                let active = (|| {
                    let revision = revisions
                        .remove(&id)
                        .with_context(|| format!("No Phabricator revision found for D{id}"))?;
                    let diff_phid = revision
                        .fields
                        .diff_phid
                        .as_ref()
                        .context("Phabricator revision has no diff")?;
                    let diff_id = *diff_ids
                        .get(diff_phid)
                        .context("Phabricator diff not found")?;
                    Self::parse_active_diff(revision, diff_id, &queried)
                })();
                (id, active)
            })
            .collect())
    }

    fn parse_active_diff(
        revision: RevisionData,
        diff_id: u64,
        queried: &serde_json::Value,
    ) -> Result<ActiveDiff> {
        let diff = queried
            .get(diff_id.to_string())
            .context("Phabricator diff missing from querydiffs")?;

        let status = revision.fields.status.as_ref();
        Ok(ActiveDiff {
            title: revision.fields.title.unwrap_or_default(),
            uri: revision.fields.uri.unwrap_or_default(),
            author_phid: revision.fields.author_phid,
            // Phabricator marks abandoned revisions closed too.
            closed: status.is_some_and(|s| s.closed),
            status: status.and_then(|s| s.value.clone()),
            status_name: status.and_then(|s| s.name.clone()),
            diff_id,
            commit: diff_commit(diff),
        })
    }

    async fn create_inline(&self, diff_id: u64, inline: &InlineDraft) -> Result<()> {
        let _: serde_json::Value = self
            .conduit(
                "differential.createinline",
                vec![
                    ("diffID".to_string(), diff_id.to_string()),
                    ("filePath".to_string(), inline.file.clone()),
                    // Phabricator wants 1/0; `true` is read as false.
                    (
                        "isNewFile".to_string(),
                        u8::from(inline.is_new_file).to_string(),
                    ),
                    ("lineNumber".to_string(), inline.line.to_string()),
                    // The number of lines after the first.
                    ("lineLength".to_string(), (inline.length - 1).to_string()),
                    ("content".to_string(), inline.body.clone()),
                ],
            )
            .await?;
        Ok(())
    }

    /// Publish a revision's review: create its inline comments as drafts, then post the comment
    /// (and verdict) with the drafts attached. `progress` records how far it got, so that calling
    /// this again after an error continues instead of creating the inlines twice.
    pub async fn publish_revision(
        &self,
        revision: u32,
        diff_id: u64,
        publish: &RevisionPublish,
        progress: &mut PublishProgress,
    ) -> Result<()> {
        if progress.published {
            return Ok(());
        }
        for inline in publish.inlines.iter().skip(progress.inlines_created) {
            self.create_inline(diff_id, inline).await?;
            progress.inlines_created += 1;
        }
        let mut params = vec![
            ("revision_id".to_string(), revision.to_string()),
            (
                "message".to_string(),
                publish.comment.clone().unwrap_or_default(),
            ),
            ("attach_inlines".to_string(), "1".to_string()),
        ];
        match publish.action {
            ReviewAction::Comment => {}
            ReviewAction::Accept => params.push(("action".to_string(), "accept".to_string())),
            ReviewAction::RequestChanges => {
                params.push(("action".to_string(), "reject".to_string()))
            }
        }
        let _: serde_json::Value = self.conduit("differential.createcomment", params).await?;
        progress.published = true;
        Ok(())
    }
}

/// The Phabricator API token: from the environment, else from `~/.arcrc` (shared with moz-phab
/// and arc), where it is stored per host.
pub fn phabricator_token(base_url: &str) -> Result<String> {
    if let Ok(token) =
        std::env::var("PHABRICATOR_API_KEY").or_else(|_| std::env::var("PHABRICATOR_TOKEN"))
    {
        return Ok(token);
    }
    if let Some(token) =
        dirs::home_dir().and_then(|home| arcrc_token(&home.join(".arcrc"), base_url))
    {
        return Ok(token);
    }
    anyhow::bail!(
        "Set PHABRICATOR_API_KEY or PHABRICATOR_TOKEN (or log in with moz-phab) to load Phabricator comments"
    )
}

fn arcrc_token(path: &std::path::Path, base_url: &str) -> Option<String> {
    let value: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()?;
    let normalize = |url: &str| {
        url.trim_end_matches('/')
            .trim_end_matches("/api")
            .to_string()
    };
    let wanted = normalize(base_url);
    value
        .get("hosts")?
        .as_object()?
        .iter()
        .find(|(host, _)| normalize(host) == wanted)
        .and_then(|(_, entry)| entry.get("token")?.as_str())
        .map(str::to_string)
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RevisionStatusInfo {
    pub id: String,
    pub title: String,
    pub url: String,
    pub commit_idxs: Vec<usize>,
    pub own: bool,
    pub closed: bool,
    pub status: Option<String>,
    pub status_name: Option<String>,
    pub publishable: bool,
    pub reason: Option<String>,
    pub published: bool,
    #[serde(skip)]
    pub outdated: bool,
    #[serde(skip)]
    diff_id: u64,
}

pub struct Validation {
    pub user: String,
    pub error: Option<String>,
    pub revisions: Vec<RevisionStatusInfo>,
    client: Option<PhabricatorClient>,
}

/// Revisions by someone else whose latest diff the local commit doesn't match.
pub fn foreign_outdated(validation: &Validation) -> Vec<&RevisionStatusInfo> {
    if validation.error.is_some() {
        return Vec::new();
    }
    validation
        .revisions
        .iter()
        .filter(|revision| revision.outdated && !revision.own)
        .collect()
}

pub struct Publisher {
    targets: Vec<Option<PhabTarget>>,
    /// Each commit's tree and parent, when known.
    commits: Vec<Option<CommitIdentity>>,
    validation: tokio::sync::OnceCell<Validation>,
    attempts: tokio::sync::Mutex<HashMap<String, (RevisionPublish, PublishProgress)>>,
}

impl Publisher {
    #[cfg(test)]
    pub(crate) fn published_for_test() -> Self {
        let publisher = Self::new(Vec::new(), Vec::new());
        publisher
            .validation
            .set(Validation {
                user: "reviewer".into(),
                error: None,
                client: None,
                revisions: vec![RevisionStatusInfo {
                    id: "D123".into(),
                    title: "Revision".into(),
                    url: "https://phab.example/D123".into(),
                    commit_idxs: vec![0],
                    own: false,
                    closed: false,
                    status: None,
                    status_name: None,
                    publishable: true,
                    reason: None,
                    published: false,
                    outdated: false,
                    diff_id: 1,
                }],
            })
            .ok()
            .unwrap();
        publisher.attempts.try_lock().unwrap().insert(
            "D123".into(),
            (
                build_revision_publish(&[], Some("review"), ReviewAction::Comment),
                PublishProgress {
                    inlines_created: 0,
                    published: true,
                },
            ),
        );
        publisher
    }

    pub fn new(targets: Vec<Option<PhabTarget>>, commits: Vec<Option<CommitIdentity>>) -> Self {
        Self {
            targets,
            commits,
            validation: Default::default(),
            attempts: Default::default(),
        }
    }

    /// Each commit's revision id, without contacting Phabricator.
    pub fn local_revisions(&self) -> Vec<Option<String>> {
        self.targets
            .iter()
            .map(|target| target.as_ref().map(|target| format!("D{}", target.id)))
            .collect()
    }

    pub async fn validate(&self) -> &Validation {
        self.validation
            .get_or_init(|| async {
                let base = &self
                    .targets
                    .iter()
                    .flatten()
                    .next()
                    .expect("publisher has targets")
                    .base_url;
                let mut revisions: Vec<RevisionStatusInfo> = Vec::new();
                for (idx, target) in self
                    .targets
                    .iter()
                    .enumerate()
                    .filter_map(|(i, t)| t.as_ref().map(|t| (i, t)))
                {
                    let id = format!("D{}", target.id);
                    if let Some(existing) = revisions
                        .iter_mut()
                        .find(|r| r.url == format!("{}/{}", target.base_url, id))
                    {
                        existing.commit_idxs.push(idx);
                        existing.reason = Some("Revision spans several commits".into());
                        continue;
                    }
                    revisions.push(RevisionStatusInfo {
                        id: id.clone(),
                        title: String::new(),
                        url: format!("{}/{}", target.base_url, id),
                        commit_idxs: vec![idx],
                        own: false,
                        closed: false,
                        status: None,
                        status_name: None,
                        publishable: false,
                        published: false,
                        outdated: false,
                        diff_id: 0,
                        reason: (target.base_url != *base)
                            .then(|| "Revision is on a different server".into()),
                    });
                }
                let client = phabricator_token(base)
                    .and_then(|token| PhabricatorClient::new(base.clone(), token));
                let client = match client {
                    Ok(client) => client,
                    Err(e) => {
                        return Validation {
                            user: String::new(),
                            error: Some(format!("{e:#}")),
                            revisions,
                            client: None,
                        }
                    }
                };
                let ids: Vec<u32> = revisions
                    .iter()
                    .filter(|revision| revision.reason.is_none())
                    .map(|revision| revision.id[1..].parse().expect("revision id"))
                    .collect();
                let (viewer, active_diffs) =
                    tokio::join!(client.whoami(), client.fetch_active_diffs(&ids));
                let viewer = match viewer {
                    Ok(viewer) => viewer,
                    Err(e) => {
                        return Validation {
                            user: String::new(),
                            error: Some(format!("{e:#}")),
                            revisions,
                            client: None,
                        }
                    }
                };
                let mut active_diffs = active_diffs;
                for revision in &mut revisions {
                    if revision.reason.is_some() {
                        continue;
                    }
                    let id = revision.id[1..].parse().expect("revision id");
                    let active = match &mut active_diffs {
                        Ok(diffs) => diffs.remove(&id).expect("requested revision"),
                        Err(e) => Err(anyhow::anyhow!("{e:#}")),
                    };
                    match active {
                        Ok(active) => {
                            let local = self.commits.get(revision.commit_idxs[0]);
                            match check_diff_matches(
                                &revision.id,
                                local.and_then(Option::as_ref),
                                &active,
                            ) {
                                DiffCheck::Matches => {}
                                DiffCheck::Mismatch(reason) => {
                                    revision.reason = Some(reason);
                                    revision.outdated = true;
                                }
                                DiffCheck::Unverified(reason) => revision.reason = Some(reason),
                            }
                            revision.title = active.title;
                            revision.url = active.uri;
                            revision.own =
                                active.author_phid.as_deref() == Some(viewer.phid.as_str());
                            revision.closed = active.closed;
                            revision.status = active.status;
                            revision.status_name = active.status_name;
                            revision.diff_id = active.diff_id;
                            revision.publishable = revision.reason.is_none();
                        }
                        Err(e) => revision.reason = Some(format!("{e:#}")),
                    }
                }
                Validation {
                    user: viewer.username,
                    error: None,
                    revisions,
                    client: Some(client),
                }
            })
            .await
    }

    pub async fn statuses(&self) -> Vec<RevisionStatusInfo> {
        let validation = self.validate().await;
        let attempts = self.attempts.lock().await;
        validation
            .revisions
            .iter()
            .cloned()
            .map(|mut r| {
                r.published = attempts.get(&r.id).is_some_and(|(_, p)| p.published);
                r
            })
            .collect()
    }

    pub async fn published_urls(&self) -> Vec<String> {
        // Reading the summary must not trigger authentication.
        if self.validation.get().is_none() {
            return Vec::new();
        }
        self.statuses()
            .await
            .into_iter()
            .filter(|r| r.published)
            .map(|r| r.url)
            .collect()
    }

    pub async fn publish_revision(
        &self,
        id: &str,
        comments: &[Comment],
        overall: Option<&str>,
        action: ReviewAction,
    ) -> Result<String> {
        let validation = self.validate().await;
        if let Some(error) = &validation.error {
            anyhow::bail!("{error}");
        }
        let target = validation
            .revisions
            .iter()
            .find(|r| r.id == id)
            .context("Unknown revision")?;
        if !target.publishable {
            anyhow::bail!("{}", target.reason.as_deref().unwrap_or("Cannot publish"));
        }
        if target.own && action != ReviewAction::Comment {
            anyhow::bail!("{id} is your own revision; you can only comment on it");
        }
        let comments: Vec<Comment> = comments
            .iter()
            .filter(|c| target.commit_idxs.contains(&c.commit_idx.unwrap_or(0)))
            .cloned()
            .collect();
        let revision = build_revision_publish(&comments, overall, action);
        if revision.inlines.is_empty()
            && revision.comment.is_none()
            && action == ReviewAction::Comment
        {
            anyhow::bail!("Nothing to publish");
        }
        let mut attempts = self.attempts.lock().await;
        let (last, progress) = attempts
            .entry(id.into())
            .or_insert_with(|| (revision.clone(), PublishProgress::default()));
        if progress.published {
            anyhow::bail!("Revision already published");
        }
        if *last != revision {
            if progress.inlines_created > 0 {
                anyhow::bail!("The review changed after a failed publish left draft inlines; restore the original review before retrying");
            }
            *last = revision.clone();
        }
        validation
            .client
            .as_ref()
            .context("No Phabricator client")?
            .publish_revision(id[1..].parse()?, target.diff_id, &revision, progress)
            .await?;
        Ok(target.url.clone())
    }
}

/// Find the `Differential Revision: <url>` trailer that moz-phab and arc add to
/// commit messages. Returns the Phabricator base URL and the revision id, so the
/// host comes from the commit itself rather than from configuration.
pub fn detect_revision(commit_message: &str) -> Option<(String, u32)> {
    const TRAILER: &str = "differential revision:";
    let url = commit_message.lines().rev().find_map(|line| {
        let line = line.trim();
        let head = line.get(..TRAILER.len())?;
        head.eq_ignore_ascii_case(TRAILER)
            .then(|| line[TRAILER.len()..].trim())
    })?;
    let (base, _) = url.rsplit_once("/D")?;
    Some((base.to_string(), parse_revision_id(url)?))
}

/// A Phabricator revision a commit is reviewed on.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PhabTarget {
    pub base_url: String,
    pub id: u32,
}

/// The revision of each commit: the `named` revision at the same position when given, else the
/// commit's `Differential Revision:` trailer. `None` for commits with neither.
pub fn resolve_phab_targets(
    named: &[String],
    base_url: &str,
    commit_messages: &[Option<&str>],
) -> Vec<Option<PhabTarget>> {
    commit_messages
        .iter()
        .enumerate()
        .map(|(i, message)| {
            if let Some(id) = named.get(i).and_then(|r| parse_revision_id(r)) {
                return Some(PhabTarget {
                    base_url: base_url.to_string(),
                    id,
                });
            }
            let (base_url, id) = detect_revision((*message)?)?;
            Some(PhabTarget { base_url, id })
        })
        .collect()
}

fn parse_revision_id(input: &str) -> Option<u32> {
    let trimmed = input.trim();
    if let Some((_, tail)) = trimmed.rsplit_once("/D") {
        return tail
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse()
            .ok();
    }
    trimmed
        .trim_start_matches('D')
        .trim_start_matches('d')
        .parse()
        .ok()
}

fn display_user_name(fields: &UserFields) -> Option<String> {
    match (fields.real_name.as_deref(), fields.username.as_deref()) {
        (Some(real), Some(username)) if !real.is_empty() && !username.is_empty() => {
            Some(format!("{} ({})", real, username))
        }
        (Some(real), _) if !real.is_empty() => Some(real.to_string()),
        (_, Some(username)) if !username.is_empty() => Some(username.to_string()),
        _ => None,
    }
}

fn note_line_start(line: &CommentLine) -> usize {
    match line {
        CommentLine::Single(line) => *line,
        CommentLine::Range((start, _)) => *start,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_revision_publish, check_diff_matches, detect_revision, foreign_outdated,
        parse_revision_id, resolve_phab_targets, ActiveDiff, CommitIdentity, DiffCheck, PhabTarget,
        RevisionStatusInfo, Validation,
    };
    use crate::types::{Comment, CommentLine, ReplyTarget, ReviewAction, Side};
    use std::collections::HashMap;

    fn comment(file: &str, line: CommentLine, side: Side, commit_idx: Option<usize>) -> Comment {
        Comment {
            file: file.to_string(),
            line,
            side,
            body: format!("body of {file}"),
            commit_idx,
            in_reply_to: None,
        }
    }

    fn revision_status(id: &str, own: bool, outdated: bool) -> RevisionStatusInfo {
        RevisionStatusInfo {
            id: id.into(),
            title: String::new(),
            url: format!("https://phab.example/{id}"),
            commit_idxs: vec![0],
            own,
            closed: false,
            status: None,
            status_name: None,
            publishable: !outdated,
            reason: outdated.then(|| "Diff mismatch".into()),
            published: false,
            outdated,
            diff_id: 1,
        }
    }

    #[test]
    fn foreign_outdated_only_includes_foreign_mismatches() {
        let mut other_reason = revision_status("D4", false, false);
        other_reason.reason = Some("Revision spans several commits".into());
        other_reason.publishable = false;
        let validation = Validation {
            user: "reviewer".into(),
            error: None,
            revisions: vec![
                revision_status("D1", true, true),
                revision_status("D2", false, true),
                revision_status("D3", false, false),
                other_reason,
            ],
            client: None,
        };
        let ids: Vec<_> = foreign_outdated(&validation)
            .iter()
            .map(|revision| revision.id.as_str())
            .collect();
        assert_eq!(ids, vec!["D2"]);
    }

    #[test]
    fn foreign_outdated_is_empty_when_authentication_failed() {
        let validation = Validation {
            user: String::new(),
            error: Some("Authentication failed".into()),
            revisions: vec![revision_status("D1", false, true)],
            client: None,
        };
        assert!(foreign_outdated(&validation).is_empty());
    }

    #[test]
    fn detects_revision_trailer() {
        let msg = "Bug 1 - Fix it r=reviewer\n\nDifferential Revision: https://phabricator.services.mozilla.com/D301379\n";
        assert_eq!(
            detect_revision(msg),
            Some((
                "https://phabricator.services.mozilla.com".to_string(),
                301379
            ))
        );
        assert_eq!(detect_revision("Bug 1 - no trailer"), None);
        assert_eq!(
            detect_revision("Differential Revision: https://example.com/not-a-revision"),
            None
        );
    }

    #[test]
    fn parse_revision_ids() {
        assert_eq!(parse_revision_id("D301379"), Some(301379));
        assert_eq!(parse_revision_id("301379"), Some(301379));
        assert_eq!(
            parse_revision_id("https://phabricator.services.mozilla.com/D301379"),
            Some(301379)
        );
        assert_eq!(parse_revision_id("Dnope"), None);
    }

    #[test]
    fn resolves_named_then_trailer_targets() {
        let trailer = "Bug 1\n\nDifferential Revision: https://phab.example/D7\n";
        let target = |base: &str, id| {
            Some(PhabTarget {
                base_url: base.to_string(),
                id,
            })
        };
        let targets = resolve_phab_targets(
            &["D5".to_string()],
            "https://named.example",
            &[Some("Bug 0"), Some(trailer), None],
        );
        assert_eq!(
            targets,
            vec![
                target("https://named.example", 5),
                target("https://phab.example", 7),
                None
            ]
        );
    }

    #[tokio::test]
    async fn validation_batches_revisions_and_preserves_individual_failures() {
        use super::Publisher;
        use axum::{
            extract::{Path, State},
            routing::post,
            Form, Json, Router,
        };
        use std::sync::Arc;

        // Give validation a token without changing the environment of other tests.
        const TEST: &str =
            "phabricator::tests::validation_batches_revisions_and_preserves_individual_failures";
        if std::env::var_os("LRV_PHAB_BATCH_TEST").is_none() {
            let output = std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact", TEST, "--nocapture"])
                .env("LRV_PHAB_BATCH_TEST", "1")
                .env("PHABRICATOR_API_KEY", "test-token")
                .output()
                .unwrap();
            assert!(
                output.status.success(),
                "{}\n{}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
            return;
        }
        type Calls = Arc<tokio::sync::Mutex<Vec<(String, HashMap<String, String>)>>>;
        async fn conduit(
            State((calls, missing)): State<(Calls, bool)>,
            Path(method): Path<String>,
            Form(params): Form<HashMap<String, String>>,
        ) -> Json<serde_json::Value> {
            calls.lock().await.push((method.clone(), params));
            let revision = |id| {
                serde_json::json!({
                    "id": id,
                    "fields": {
                        "title": format!("Revision {id}"),
                        "uri": format!("https://phab.example/D{id}"),
                        "diffPHID": format!("PHID-DIFF-{id}"),
                        "authorPHID": "PHID-USER-author",
                        "status": {"value": "needs-review", "name": "Needs Review", "closed": false}
                    }
                })
            };
            let result = match method.as_str() {
                "user.whoami" => {
                    serde_json::json!({"phid": "PHID-USER-reviewer", "userName": "reviewer"})
                }
                "differential.revision.search" => serde_json::json!({
                    "data": if missing { vec![revision(1)] } else { vec![revision(2), revision(1)] }
                }),
                "differential.diff.search" => serde_json::json!({"data": [
                    {"id": 12, "phid": "PHID-DIFF-2"},
                    {"id": 11, "phid": "PHID-DIFF-1"}
                ]}),
                "differential.querydiffs" => serde_json::json!({
                    "11": {"properties": {"local:commits": {
                        "c1": {"commit": "c1", "tree": "tree-1", "parents": ["base"]}
                    }}},
                    "12": {"properties": {"local:commits": {
                        "c2": {"commit": "c2", "tree": "tree-2", "parents": ["c1"]}
                    }}}
                }),
                _ => panic!("unexpected method {method}"),
            };
            Json(serde_json::json!({"error_code": null, "error_info": null, "result": result}))
        }
        for missing in [false, true] {
            let calls: Calls = Default::default();
            let app = Router::new()
                .route("/api/{method}", post(conduit))
                .with_state((calls.clone(), missing));
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let base = format!("http://{}", listener.local_addr().unwrap());
            let server = tokio::spawn(async move {
                axum::serve(listener, app).await.unwrap();
            });
            let publisher = Publisher::new(
                (1..=2)
                    .map(|id| {
                        Some(PhabTarget {
                            base_url: base.clone(),
                            id,
                        })
                    })
                    .collect(),
                ["tree-1", "tree-2"]
                    .map(|tree| {
                        Some(CommitIdentity {
                            tree: tree.into(),
                            parent: None,
                        })
                    })
                    .to_vec(),
            );
            let validation = publisher.validate().await;
            assert!(validation.error.is_none());
            assert!(validation.revisions[0].publishable);
            assert_eq!(validation.revisions[0].diff_id, 11);
            if missing {
                assert!(!validation.revisions[1].publishable);
                assert_eq!(
                    validation.revisions[1].reason.as_deref(),
                    Some("No Phabricator revision found for D2")
                );
            } else {
                assert!(validation.revisions[1].publishable);
                assert_eq!(validation.revisions[1].diff_id, 12);
            }
            let calls = calls.lock().await;
            assert_eq!(calls.len(), 4);
            for method in [
                "user.whoami",
                "differential.revision.search",
                "differential.diff.search",
                "differential.querydiffs",
            ] {
                assert_eq!(calls.iter().filter(|(name, _)| name == method).count(), 1);
            }
            let params = &calls
                .iter()
                .find(|(name, _)| name == "differential.revision.search")
                .unwrap()
                .1;
            assert_eq!(params["constraints[ids][0]"], "1");
            assert_eq!(params["constraints[ids][1]"], "2");
            server.abort();
        }
    }

    #[tokio::test]
    async fn publishing_filters_commits_resumes_inlines_and_rejects_duplicates() {
        use super::{PhabricatorClient, Publisher};
        use axum::{
            extract::{Path, State},
            routing::post,
            Form, Json, Router,
        };
        use std::sync::Arc;

        type Calls = Arc<tokio::sync::Mutex<Vec<(String, HashMap<String, String>)>>>;
        async fn conduit(
            State(calls): State<Calls>,
            Path(method): Path<String>,
            Form(params): Form<HashMap<String, String>>,
        ) -> Json<serde_json::Value> {
            let mut calls = calls.lock().await;
            let fail =
                method == "differential.createcomment" && !calls.iter().any(|(m, _)| m == &method);
            calls.push((method, params));
            Json(if fail {
                serde_json::json!({"error_code": "ERR", "error_info": "retry me", "result": null})
            } else {
                serde_json::json!({"error_code": null, "error_info": null, "result": {}})
            })
        }
        let calls: Calls = Default::default();
        let app = Router::new()
            .route("/api/{method}", post(conduit))
            .with_state(calls.clone());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let mut publisher = Publisher::published_for_test();
        let mut validation = publisher.validation.take().unwrap();
        validation.client = Some(PhabricatorClient::new(base, "test-token".into()).unwrap());
        publisher.validation.set(validation).ok().unwrap();
        publisher.attempts.lock().await.clear();
        let comments = vec![
            comment("a.rs", CommentLine::Range((5, 8)), Side::Old, Some(0)),
            comment("other.rs", CommentLine::Single(1), Side::New, Some(1)),
        ];
        let result = publisher
            .publish_revision("D123", &comments, Some("overall"), ReviewAction::Comment)
            .await;
        assert!(result.unwrap_err().to_string().contains("retry me"));
        assert!(publisher.published_urls().await.is_empty());
        let changed = publisher
            .publish_revision("D123", &comments, Some("changed"), ReviewAction::Comment)
            .await;
        assert!(changed.unwrap_err().to_string().contains("review changed"));
        assert_eq!(
            publisher
                .publish_revision("D123", &comments, Some("overall"), ReviewAction::Comment)
                .await
                .unwrap(),
            "https://phab.example/D123"
        );
        assert_eq!(
            publisher
                .publish_revision("D123", &comments, Some("overall"), ReviewAction::Comment)
                .await
                .unwrap_err()
                .to_string(),
            "Revision already published"
        );
        assert_eq!(
            publisher.published_urls().await,
            vec!["https://phab.example/D123"]
        );
        let calls = calls.lock().await;
        assert_eq!(calls.len(), 3);
        assert_eq!(calls[0].1["filePath"], "a.rs");
        assert_eq!(calls[0].1["isNewFile"], "0");
        assert_eq!(calls[0].1["lineLength"], "3");
        assert_eq!(calls[1].1["message"], "overall");
        assert_eq!(calls[1].1["attach_inlines"], "1");
        server.abort();
    }

    #[tokio::test]
    async fn own_revision_verdict_is_rejected_before_creating_drafts() {
        let mut publisher = super::Publisher::published_for_test();
        let mut validation = publisher.validation.take().unwrap();
        validation.revisions[0].own = true;
        publisher.validation.set(validation).ok().unwrap();
        publisher.attempts.lock().await.clear();
        let error = publisher
            .publish_revision("D123", &[], None, ReviewAction::Accept)
            .await
            .unwrap_err();
        assert!(error.to_string().contains("your own revision"));
        assert!(publisher.attempts.lock().await.is_empty());
    }

    #[test]
    fn revision_publish_joins_general_comments() {
        let comments = vec![
            comment("a.rs", CommentLine::Range((5, 8)), Side::Old, Some(1)),
            comment("(commit)", CommentLine::Single(1), Side::New, Some(1)),
        ];
        let plan = build_revision_publish(&comments, Some("overall"), ReviewAction::Accept);
        assert_eq!(plan.inlines[0].length, 4);
        assert!(!plan.inlines[0].is_new_file);
        assert_eq!(plan.comment.as_deref(), Some("body of (commit)\n\noverall"));
        assert_eq!(plan.action, ReviewAction::Accept);
        assert_eq!(
            build_revision_publish(&[], Some("  "), ReviewAction::Comment).comment,
            None
        );
    }

    #[test]
    fn revision_publish_skips_replies_without_a_body() {
        let note = ReplyTarget {
            origin: crate::types::NoteOrigin::Agent,
            id: Some("7".into()),
            author: Some("alice".into()),
            body: "Why?".into(),
            source_url: None,
        };
        let address = Comment {
            body: String::new(),
            in_reply_to: Some(note.clone()),
            ..comment("a.rs", CommentLine::Single(3), Side::New, None)
        };
        let reply = Comment {
            body: "Because of the cache.".into(),
            in_reply_to: Some(note),
            ..comment("a.rs", CommentLine::Single(3), Side::New, None)
        };
        let plan = build_revision_publish(&[address, reply], None, ReviewAction::Comment);
        assert_eq!(plan.inlines.len(), 1);
        assert_eq!(plan.inlines[0].body, "Because of the cache.");
        assert_eq!(plan.comment, None);
    }

    #[test]
    fn diff_match_compares_trees_and_parents() {
        let identity = |tree: &str, parent: Option<&str>| CommitIdentity {
            tree: tree.into(),
            parent: parent.map(str::to_string),
        };
        let active = ActiveDiff {
            title: String::new(),
            uri: String::new(),
            author_phid: None,
            closed: false,
            status: None,
            status_name: None,
            diff_id: 9,
            commit: Some(identity("tree-1", Some("base"))),
        };
        let check = |local: Option<&CommitIdentity>, active: &ActiveDiff| {
            check_diff_matches("D1", local, active)
        };

        // The same tree matches whatever the parent: a stack re-committed by someone else.
        assert_eq!(
            check(Some(&identity("tree-1", Some("base"))), &active),
            DiffCheck::Matches
        );
        assert_eq!(
            check(Some(&identity("tree-1", Some("other"))), &active),
            DiffCheck::Matches
        );

        // A different tree on the same parent is a real mismatch.
        let DiffCheck::Mismatch(reason) = check(Some(&identity("tree-2", Some("base"))), &active)
        else {
            panic!("expected a mismatch");
        };
        assert!(reason.contains("id 9") && reason.contains("D1"), "{reason}");

        // On another parent the difference may lie in earlier commits.
        let DiffCheck::Unverified(reason) =
            check(Some(&identity("tree-2", Some("0123456789abcdef"))), &active)
        else {
            panic!("expected unverified");
        };
        assert!(reason.contains("0123456789ab instead of base"), "{reason}");

        // Nothing to compare on either side.
        assert!(matches!(check(None, &active), DiffCheck::Unverified(_)));
        let untracked = ActiveDiff {
            commit: None,
            ..active
        };
        assert!(matches!(
            check(Some(&identity("tree-1", Some("base"))), &untracked),
            DiffCheck::Unverified(_)
        ));
    }

    #[test]
    fn diff_commit_takes_the_top_commit() {
        use super::diff_commit;
        let top = |diff: serde_json::Value| diff_commit(&diff).map(|c| (c.tree, c.parent));
        let pair = |tree: &str, parent: &str| Some((tree.to_string(), Some(parent.to_string())));

        assert_eq!(
            top(serde_json::json!({"properties": {"local:commits": {
                "bbb": {"commit": "bbb", "tree": "tree-b", "parents": ["aaa"]},
                "aaa": {"commit": "aaa", "tree": "tree-a", "parents": ["base"]}
            }}})),
            pair("tree-b", "aaa")
        );
        assert_eq!(
            top(serde_json::json!({"properties": {"local:commits": {
                "aaa": {"commit": "aaa", "tree": "tree-a", "parents": ["base"]}
            }}})),
            pair("tree-a", "base")
        );

        // Commits without a tree, or no properties (which Phabricator sends as a list).
        assert_eq!(
            top(serde_json::json!({"properties": {"local:commits": {
                "aaa": {"commit": "aaa", "parents": ["base"]}
            }}})),
            None
        );
        assert_eq!(top(serde_json::json!({"properties": []})), None);

        // Unrelated commits leave no single top.
        assert_eq!(
            top(serde_json::json!({"properties": {"local:commits": {
                "aaa": {"tree": "tree-a", "parents": ["base"]},
                "ccc": {"tree": "tree-c", "parents": ["base"]}
            }}})),
            None
        );
    }
}
