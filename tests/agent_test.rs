use lrv::agent::{AgentChannel, AgentEvent, Discussion};
use lrv::types::{CommentLine, Side};
use std::time::Duration;
use tokio::time::{advance, sleep, Instant};

const LEASE: Duration = Duration::from_secs(300);
const TIMEOUT: Duration = Duration::from_secs(60);

fn discussion() -> AgentEvent {
    AgentEvent::Discussion {
        discussion: Discussion {
            id: "d1".into(),
            created_at: 0,
            file: "src/lib.rs".into(),
            line: CommentLine::Single(3),
            side: Side::New,
            body: "Discuss this".into(),
            commit_idx: None,
        },
    }
}

#[tokio::test(start_paused = true)]
async fn queued_events_and_cursors() {
    let channel = AgentChannel::new(LEASE);
    assert_eq!(channel.push(discussion()), 1);
    assert_eq!(channel.push(discussion()), 2);
    let start = Instant::now();
    let poll = channel.wait(0, TIMEOUT).await;
    assert_eq!(Instant::now(), start);
    assert_eq!(poll.events.len(), 2);
    assert_eq!(poll.cursor, 2);
    assert!(!poll.ended);
    let poll = channel.wait(1, TIMEOUT).await;
    assert_eq!(poll.events.len(), 1);
    assert_eq!(poll.events[0].seq, 2);
    assert_eq!(poll.cursor, 2);
    let encoded = serde_json::to_value(&poll).unwrap();
    assert_eq!(encoded["events"][0]["type"], "discussion");
    assert!(encoded["events"][0]["discussion"]
        .get("commit_idx")
        .is_none());
    let decoded: lrv::agent::Poll = serde_json::from_value(encoded).unwrap();
    assert_eq!(decoded.cursor, 2);
}

#[tokio::test(start_paused = true)]
async fn push_wakes_every_waiter() {
    let channel = AgentChannel::new(LEASE);
    let producer = channel.clone();
    tokio::spawn(async move {
        sleep(Duration::from_secs(1)).await;
        producer.push(discussion());
    });
    let start = Instant::now();
    let (first, second) = tokio::join!(channel.wait(0, TIMEOUT), channel.wait(0, TIMEOUT));
    assert_eq!(start.elapsed(), Duration::from_secs(1));
    for poll in [first, second] {
        assert_eq!(poll.events.len(), 1);
        assert_eq!(poll.cursor, 1);
        assert!(!poll.ended);
    }
}

#[tokio::test(start_paused = true)]
async fn timeout_preserves_cursor() {
    let channel = AgentChannel::new(LEASE);
    let start = Instant::now();
    let poll = channel.wait(42, TIMEOUT).await;
    assert_eq!(start.elapsed(), TIMEOUT);
    assert!(poll.events.is_empty());
    assert_eq!(poll.cursor, 42);
    assert!(!poll.ended);
}

#[tokio::test(start_paused = true)]
async fn close_wakes_waiters_and_preserves_pending_events() {
    let channel = AgentChannel::new(LEASE);
    let closer = channel.clone();
    tokio::spawn(async move {
        sleep(Duration::from_secs(1)).await;
        closer.close();
    });
    let poll = channel.wait(0, TIMEOUT).await;
    assert!(poll.ended);
    assert!(poll.events.is_empty());
    let start = Instant::now();
    assert!(channel.wait(0, TIMEOUT).await.ended);
    assert_eq!(Instant::now(), start);

    let channel = AgentChannel::new(LEASE);
    channel.push(discussion());
    channel.close();
    let poll = channel.wait(0, TIMEOUT).await;
    assert!(poll.ended);
    assert_eq!(poll.events.len(), 1);
    assert_eq!(poll.cursor, 1);
}

#[tokio::test(start_paused = true)]
async fn attachment_tracks_polls_and_lease() {
    let channel = AgentChannel::new(LEASE);
    assert!(!channel.attached());
    let observer = channel.clone();
    let task = tokio::spawn(async move {
        sleep(LEASE * 2).await;
        assert!(observer.attached());
        observer.push(discussion());
    });
    assert_eq!(channel.wait(0, LEASE * 3).await.events.len(), 1);
    task.await.unwrap();
    assert!(channel.attached());
    advance(LEASE - Duration::from_secs(1)).await;
    assert!(channel.attached());
    advance(Duration::from_secs(1)).await;
    assert!(!channel.attached());
    channel.touch();
    assert!(channel.attached());
    advance(LEASE).await;
    assert!(!channel.attached());
}

#[tokio::test(start_paused = true)]
async fn cancelled_poll_releases_attachment_after_lease() {
    let channel = AgentChannel::new(LEASE);
    tokio::select! {
        _ = channel.wait(0, TIMEOUT) => panic!("poll returned before cancellation"),
        _ = sleep(Duration::from_secs(1)) => {}
    }
    assert!(channel.attached());
    advance(LEASE).await;
    assert!(!channel.attached());
}

#[tokio::test(start_paused = true)]
async fn drain_waits_for_closed_poll() {
    let channel = AgentChannel::new(LEASE);
    let start = Instant::now();
    channel.drain(TIMEOUT).await;
    assert_eq!(Instant::now(), start);
    let waiter = channel.clone();
    let task = tokio::spawn(async move { waiter.wait(0, TIMEOUT).await });
    tokio::task::yield_now().await;
    let closer = channel.clone();
    tokio::spawn(async move {
        sleep(Duration::from_secs(1)).await;
        closer.close();
    });
    channel.drain(TIMEOUT).await;
    assert!(start.elapsed() >= Duration::from_secs(1));
    assert!(start.elapsed() < TIMEOUT);
    assert!(task.await.unwrap().ended);
}

#[tokio::test(start_paused = true)]
async fn drain_is_bounded_with_an_open_poll() {
    let channel = AgentChannel::new(LEASE);
    let waiter = channel.clone();
    let task = tokio::spawn(async move { waiter.wait(0, TIMEOUT).await });
    tokio::task::yield_now().await;
    let start = Instant::now();
    channel.drain(Duration::from_secs(1)).await;
    assert_eq!(start.elapsed(), Duration::from_secs(1));
    assert!(!task.is_finished());
    channel.close();
    assert!(task.await.unwrap().ended);
}

#[tokio::test(start_paused = true)]
async fn presence_tracks_polls_touch_expiry_and_close() {
    let channel = AgentChannel::new(LEASE);
    let tracker = channel.clone();
    let tracker = tokio::spawn(async move { tracker.track_presence().await });
    let mut presence = channel.presence();
    assert!(!*presence.borrow_and_update());

    let waiter = channel.clone();
    let poll = tokio::spawn(async move { waiter.wait(0, LEASE * 3).await });
    presence.changed().await.unwrap();
    assert!(*presence.borrow_and_update());
    advance(LEASE * 2).await;
    tokio::task::yield_now().await;
    assert!(*presence.borrow());
    channel.push(discussion());
    assert_eq!(poll.await.unwrap().events.len(), 1);
    assert!(*presence.borrow());

    advance(LEASE - Duration::from_secs(1)).await;
    channel.touch();
    tokio::task::yield_now().await;
    advance(Duration::from_secs(2)).await;
    tokio::task::yield_now().await;
    assert!(*presence.borrow());
    assert!(!presence.has_changed().unwrap());
    advance(LEASE).await;
    presence.changed().await.unwrap();
    assert!(!*presence.borrow_and_update());

    channel.touch();
    presence.changed().await.unwrap();
    assert!(*presence.borrow_and_update());
    channel.close();
    presence.changed().await.unwrap();
    assert!(!*presence.borrow_and_update());
    tracker.await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn add_discussion_uses_shared_sequence_and_wakes_waiter() {
    let channel = AgentChannel::new(LEASE);
    channel.push(discussion());
    let producer = channel.clone();
    let task = tokio::spawn(async move {
        sleep(Duration::from_secs(1)).await;
        producer.add_discussion(lrv::agent::DiscussionRequest {
            file: "src/lib.rs".into(),
            line: CommentLine::Single(3),
            side: Side::New,
            body: "A new discussion".into(),
            commit_idx: None,
        })
    });
    let start = Instant::now();
    let poll = channel.wait(1, TIMEOUT).await;
    assert_eq!(start.elapsed(), Duration::from_secs(1));
    assert_eq!(poll.events.len(), 1);
    assert_eq!(poll.events[0].seq, 2);
    assert_eq!(poll.cursor, 2);
    let created = task.await.unwrap();
    assert_eq!(created.id, "lrv-discussion-2");
    assert!(created.created_at > 0);
    let discussions = channel.discussions();
    assert_eq!(discussions.len(), 2);
    assert_eq!(discussions[0].id, "d1");
    assert_eq!(
        serde_json::to_value(&discussions[1]).unwrap(),
        serde_json::to_value(&created).unwrap()
    );
    let lrv::agent::AgentEvent::Discussion { discussion } = &poll.events[0].event;
    assert_eq!(discussion.id, created.id);
}
