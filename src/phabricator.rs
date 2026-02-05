use crate::types::{CommentLine, ReviewNote, Side};
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
    phid: String,
    fields: RevisionFields,
}

#[derive(Debug, Deserialize)]
struct RevisionFields {
    uri: Option<String>,
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

    pub async fn fetch_review_notes(
        &self,
        revision: &str,
        include_done: bool,
    ) -> Result<Vec<ReviewNote>> {
        let revision_id = parse_revision_id(revision).context("Invalid Phabricator revision")?;
        let revision = self.fetch_revision(revision_id).await?;
        let transactions = self.fetch_transactions(&revision.phid).await?;
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

    async fn fetch_transactions(&self, object_phid: &str) -> Result<Vec<TransactionData>> {
        let mut after: Option<String> = None;
        let mut all = Vec::new();

        loop {
            let url = format!("{}/api/transaction.search", self.base_url);
            let mut params = vec![
                ("api.token".to_string(), self.token.clone()),
                ("objectIdentifier".to_string(), object_phid.to_string()),
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
        users
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
                id: Some(comment.id.to_string()),
                file: file_path.to_string(),
                line: line.clone(),
                side: Side::New,
                body: body.to_string(),
                author: author_phid.and_then(|phid| users.get(phid).cloned()),
                date: None,
                source_url: revision.fields.uri.clone(),
                commit_idx: None,
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
            notes.push(ReviewNote {
                id: Some(comment.id.to_string()),
                file: "(commit)".to_string(),
                line: CommentLine::Single(1),
                side: Side::New,
                body: body.to_string(),
                author: author_phid.and_then(|phid| users.get(phid).cloned()),
                date: None,
                source_url: revision.fields.uri.clone(),
                commit_idx: None,
            });
        }
    }
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
    use super::parse_revision_id;

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
}
