use crate::config::UserConfig;
use crate::types::*;
use axum::{
    extract::{Path as AxumPath, Query, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use rust_embed::RustEmbed;
use serde::Deserialize;
use std::path::{Component, Path};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use mime_guess;

#[derive(Deserialize)]
struct FileQuery {
    path: String,
    side: String, // "old" or "new"
}

#[derive(Clone)]
pub struct AppState {
    pub diff: Arc<DiffResponse>,
    pub comments: Arc<Mutex<Vec<Comment>>>,
    pub shutdown_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
    pub config: Arc<Mutex<UserConfig>>,
    pub context: Arc<ProjectContext>,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/", get(serve_index))
        .route("/assets/*path", get(serve_asset))
        .route("/api/diff", get(get_diff))
        .route("/api/context", get(get_context))
        .route("/api/config", get(get_config).put(update_config))
        .route("/api/file", get(get_file_content))
        .route("/api/comment", post(add_comment))
        .route("/api/complete", post(complete_review))
        .with_state(state)
}

async fn serve_index() -> impl IntoResponse {
    match WebAssets::get("dist/index.html") {
        Some(content) => Html(String::from_utf8_lossy(content.data.as_ref()).to_string()).into_response(),
        None => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "index.html not found in embedded assets",
        )
            .into_response(),
    }
}

#[derive(RustEmbed)]
#[folder = "web/"]
struct WebAssets;

async fn serve_asset(AxumPath(path): AxumPath<String>) -> Response {
    let asset_path = format!("assets/{}", path);
    if let Some(content) = WebAssets::get(&asset_path) {
        let mime = mime_guess::from_path(&asset_path).first_or_octet_stream();
        Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, mime.as_ref())
            .body(axum::body::Body::from(content.data))
            .unwrap()
    } else {
        Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(axum::body::Body::from("Asset not found"))
            .unwrap()
    }
}

async fn get_diff(State(state): State<AppState>) -> Json<DiffResponse> {
    Json((*state.diff).clone())
}

async fn get_context(State(state): State<AppState>) -> Json<ProjectContext> {
    Json((*state.context).clone())
}

async fn get_file_content(
    State(state): State<AppState>,
    Query(query): Query<FileQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // Get and canonicalize the project root
    let base_path = Path::new(&state.context.working_directory);
    let base_canon =
        std::fs::canonicalize(base_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Basic path validation on input path
    let rel_path = Path::new(&query.path);
    if rel_path.is_absolute()
        || rel_path
            .components()
            .any(|c| matches!(c, Component::ParentDir))
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    // For the "new" side we require the file to exist on disk and stay under root.
    // For the "old" side we allow looking up historical content even if the file
    // doesn't exist locally; we still validate the provided relative path.
    let content = match query.side.as_str() {
        "new" => {
            let joined = base_path.join(rel_path);
            let file_path = std::fs::canonicalize(&joined).map_err(|_| StatusCode::NOT_FOUND)?;
            if !file_path.starts_with(&base_canon) {
                return Err(StatusCode::FORBIDDEN);
            }
            std::fs::read_to_string(&file_path).map_err(|_| StatusCode::NOT_FOUND)?
        }
        "old" => {
            // Use the validated relative path for VCS provider (git HEAD by default)
            let rel_for_vcs = rel_path
                .to_str()
                .map(|s| s.replace(std::path::MAIN_SEPARATOR, "/"))
                .unwrap_or_else(|| query.path.clone());

            let output = std::process::Command::new("git")
                .args(["show", &format!("HEAD:{}", rel_for_vcs)])
                .output()
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            if output.status.success() {
                String::from_utf8(output.stdout).unwrap_or_default()
            } else {
                // Old content not available
                String::new()
            }
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    };

    Ok(Json(serde_json::json!({ "content": content })))
}

async fn add_comment(State(state): State<AppState>, Json(comment): Json<Comment>) -> StatusCode {
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

async fn get_config(State(state): State<AppState>) -> Json<UserConfig> {
    let config = state.config.lock().await;
    Json(config.clone())
}

async fn update_config(
    State(state): State<AppState>,
    Json(new_config): Json<UserConfig>,
) -> Result<StatusCode, StatusCode> {
    let mut config = state.config.lock().await;
    *config = new_config.clone();

    // Persist to disk
    crate::config::save_config(&new_config).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
