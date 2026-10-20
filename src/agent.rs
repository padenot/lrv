use crate::types::{CommentLine, Side};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::{watch, Notify};
use tokio::time::Instant;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Discussion {
    pub id: String,
    #[serde(default)]
    pub created_at: u64,
    pub file: String,
    pub line: CommentLine,
    pub side: Side,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_idx: Option<usize>,
}

#[derive(Deserialize)]
pub struct DiscussionRequest {
    pub file: String,
    pub line: CommentLine,
    pub side: Side,
    pub body: String,
    #[serde(default)]
    pub commit_idx: Option<usize>,
}

impl DiscussionRequest {
    pub fn is_valid(&self) -> bool {
        !self.file.is_empty() && !self.body.trim().is_empty() && self.line.is_valid()
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AgentEvent {
    Discussion { discussion: Discussion },
}

#[derive(Serialize, Deserialize, Clone)]
pub struct QueuedEvent {
    pub seq: u64,
    #[serde(flatten)]
    pub event: AgentEvent,
}

#[derive(Serialize, Deserialize)]
pub struct Poll {
    pub events: Vec<QueuedEvent>,
    pub cursor: u64,
    pub ended: bool,
}

struct Inner {
    events: Vec<QueuedEvent>,
    next_seq: u64,
    active_polls: usize,
    last_activity: Option<Instant>,
    closed: bool,
}

pub struct AgentChannel {
    inner: Mutex<Inner>,
    latest: watch::Sender<u64>,
    lease: Duration,
    presence: watch::Sender<bool>,
    activity: Notify,
}

struct PollGuard<'a>(&'a AgentChannel);

impl Drop for PollGuard<'_> {
    fn drop(&mut self) {
        let mut inner = self.0.inner.lock().unwrap();
        inner.active_polls -= 1;
        inner.last_activity = Some(Instant::now());
        self.0.activity.notify_one();
    }
}

impl AgentChannel {
    pub fn new(lease: Duration) -> Arc<Self> {
        Arc::new(Self {
            inner: Mutex::new(Inner {
                events: Vec::new(),
                next_seq: 1,
                active_polls: 0,
                last_activity: None,
                closed: false,
            }),
            latest: watch::channel(0).0,
            lease,
            presence: watch::channel(false).0,
            activity: Notify::new(),
        })
    }

    pub fn push(&self, event: AgentEvent) -> u64 {
        let mut inner = self.inner.lock().unwrap();
        self.push_locked(&mut inner, event)
    }

    fn push_locked(&self, inner: &mut Inner, event: AgentEvent) -> u64 {
        let seq = inner.next_seq;
        inner.next_seq += 1;
        inner.events.push(QueuedEvent { seq, event });
        self.latest.send_replace(seq);
        seq
    }

    pub fn add_discussion(&self, req: DiscussionRequest) -> Discussion {
        let mut inner = self.inner.lock().unwrap();
        let discussion = Discussion {
            id: format!("lrv-discussion-{}", inner.next_seq),
            created_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            file: req.file,
            line: req.line,
            side: req.side,
            body: req.body,
            commit_idx: req.commit_idx,
        };
        self.push_locked(
            &mut inner,
            AgentEvent::Discussion {
                discussion: discussion.clone(),
            },
        );
        discussion
    }

    pub fn discussions(&self) -> Vec<Discussion> {
        self.inner
            .lock()
            .unwrap()
            .events
            .iter()
            .map(|event| match &event.event {
                AgentEvent::Discussion { discussion } => discussion.clone(),
            })
            .collect()
    }

    pub async fn wait(&self, after: u64, timeout: Duration) -> Poll {
        {
            let mut inner = self.inner.lock().unwrap();
            inner.active_polls += 1;
            inner.last_activity = Some(Instant::now());
            self.set_presence(!inner.closed);
            self.activity.notify_one();
        }
        let _guard = PollGuard(self);
        let mut rx = self.latest.subscribe();
        let _ = tokio::time::timeout(timeout, async {
            loop {
                {
                    let inner = self.inner.lock().unwrap();
                    if inner.closed || inner.events.iter().any(|event| event.seq > after) {
                        break;
                    }
                }
                if rx.changed().await.is_err() {
                    break;
                }
            }
        })
        .await;
        let inner = self.inner.lock().unwrap();
        let events: Vec<_> = inner
            .events
            .iter()
            .filter(|event| event.seq > after)
            .cloned()
            .collect();
        Poll {
            cursor: events.last().map_or(after, |event| event.seq),
            events,
            ended: inner.closed,
        }
    }

    pub fn touch(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.last_activity = Some(Instant::now());
        self.set_presence(!inner.closed);
        self.activity.notify_one();
    }

    fn set_presence(&self, attached: bool) {
        self.presence.send_if_modified(|value| {
            if *value == attached {
                return false;
            }
            *value = attached;
            true
        });
    }

    pub fn presence(&self) -> watch::Receiver<bool> {
        self.presence.subscribe()
    }

    pub async fn track_presence(&self) {
        loop {
            let expiry = {
                let inner = self.inner.lock().unwrap();
                if inner.closed {
                    break;
                }
                let expiry = if inner.active_polls > 0 {
                    None
                } else {
                    inner.last_activity.map(|time| time + self.lease)
                };
                let now = Instant::now();
                self.set_presence(inner.active_polls > 0 || expiry.is_some_and(|time| time > now));
                expiry.filter(|time| *time > now)
            };
            tokio::select! {
                _ = async {
                    if let Some(expiry) = expiry {
                        tokio::time::sleep_until(expiry).await;
                    }
                }, if expiry.is_some() => {}
                _ = self.activity.notified() => {}
            }
        }
    }

    pub fn attached(&self) -> bool {
        let inner = self.inner.lock().unwrap();
        inner.active_polls > 0
            || inner
                .last_activity
                .is_some_and(|t| t.elapsed() < self.lease)
    }

    pub fn close(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.closed = true;
        self.set_presence(false);
        self.activity.notify_one();
        self.latest.send_modify(|version| *version += 1);
    }

    pub async fn drain(&self, max: Duration) {
        let _ = tokio::time::timeout(max, async {
            loop {
                if self.inner.lock().unwrap().active_polls == 0 {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await;
    }
}

pub fn lease_from_env() -> Duration {
    Duration::from_secs(
        std::env::var("LRV_AGENT_LEASE_SECS")
            .ok()
            .and_then(|value| value.parse().ok())
            .unwrap_or(300),
    )
}
