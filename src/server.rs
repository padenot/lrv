use axum::{
    extract::{State, Query},
    http::StatusCode,
    response::{Html, IntoResponse, Json},
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use serde::Deserialize;
use crate::types::*;

#[derive(Deserialize)]
struct FileQuery {
    path: String,
    side: String,  // "old" or "new"
}

#[derive(Clone)]
pub struct AppState {
    pub diff: Arc<DiffResponse>,
    pub comments: Arc<Mutex<Vec<Comment>>>,
    pub shutdown_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(serve_index))
        .route("/api/diff", get(get_diff))
        .route("/api/file", get(get_file_content))
        .route("/api/comment", post(add_comment))
        .route("/api/complete", post(complete_review))
        .with_state(state)
}

async fn serve_index() -> impl IntoResponse {
    Html(include_str!("../web/dist/index.html"))
}

async fn get_diff(State(state): State<AppState>) -> Json<DiffResponse> {
    Json((*state.diff).clone())
}

async fn get_file_content(
    Query(query): Query<FileQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Try to read the file from disk
    let content = match query.side.as_str() {
        "new" => {
            // For new side, try to read current file
            std::fs::read_to_string(&query.path)
                .unwrap_or_else(|_| String::new())
        }
        "old" => {
            // For old side, try to get from git
            let output = std::process::Command::new("git")
                .args(["show", &format!("HEAD:{}", query.path)])
                .output();

            match output {
                Ok(out) if out.status.success() => {
                    String::from_utf8(out.stdout).unwrap_or_else(|_| String::new())
                }
                _ => String::new()
            }
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    Ok(Json(serde_json::json!({ "content": content })))
}

async fn add_comment(
    State(state): State<AppState>,
    Json(comment): Json<Comment>,
) -> StatusCode {
    let mut comments = state.comments.lock().await;
    comments.push(comment);
    StatusCode::OK
}

async fn complete_review(
    State(state): State<AppState>,
    Json(payload): Json<ReviewComplete>,
) -> StatusCode {
    let mut comments = state.comments.lock().await;
    *comments = payload.comments;

    // Trigger shutdown
    if let Some(tx) = state.shutdown_tx.lock().await.take() {
        let _ = tx.send(()).await;
    }

    StatusCode::OK
}
