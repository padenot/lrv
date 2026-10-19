use crate::types::{CommentLine, Side};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::watch;
use tokio::time::Instant;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Discussion {
    pub id: String,
    pub file: String,
    pub line: CommentLine,
    pub side: Side,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub commit_idx: Option<usize>,
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
}

struct PollGuard<'a>(&'a AgentChannel);

impl Drop for PollGuard<'_> {
    fn drop(&mut self) {
        let mut inner = self.0.inner.lock().unwrap();
        inner.active_polls -= 1;
        inner.last_activity = Some(Instant::now());
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
        })
    }

    pub fn push(&self, event: AgentEvent) -> u64 {
        let mut inner = self.inner.lock().unwrap();
        let seq = inner.next_seq;
        inner.next_seq += 1;
        inner.events.push(QueuedEvent { seq, event });
        self.latest.send_replace(seq);
        seq
    }

    pub async fn wait(&self, after: u64, timeout: Duration) -> Poll {
        {
            let mut inner = self.inner.lock().unwrap();
            inner.active_polls += 1;
            inner.last_activity = Some(Instant::now());
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
        self.inner.lock().unwrap().last_activity = Some(Instant::now());
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
