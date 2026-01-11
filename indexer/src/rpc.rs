//! RPC API server for indexer queries

use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::database::Database;

/// API server state
pub struct ApiState {
    pub db: Database,
}

/// Create the API router
pub fn create_router(state: Arc<ApiState>) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/commitments", get(get_commitments))
        .route("/nullifier/:nullifier", get(check_nullifier))
        .route("/sync-status", get(sync_status))
        .with_state(state)
}

/// Health check endpoint
async fn health() -> &'static str {
    "OK"
}

#[derive(Deserialize)]
pub struct CommitmentsQuery {
    pub pool_id: String,
    pub since_index: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Serialize)]
pub struct CommitmentResponse {
    pub commitment: String,
    pub leaf_index: u32,
    pub encrypted_note: String,
    pub slot: u64,
}

/// Get commitments for a pool
async fn get_commitments(
    State(state): State<Arc<ApiState>>,
    Query(query): Query<CommitmentsQuery>,
) -> Result<Json<Vec<CommitmentResponse>>, StatusCode> {
    let pool_id = hex::decode(&query.pool_id)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    if pool_id.len() != 32 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let pool_id: [u8; 32] = pool_id.try_into().unwrap();
    let since_index = query.since_index.unwrap_or(0);
    let limit = query.limit.unwrap_or(1000).min(10000);

    let records = state
        .db
        .get_commitments(&pool_id, since_index, limit)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<CommitmentResponse> = records
        .into_iter()
        .map(|r| CommitmentResponse {
            commitment: hex::encode(&r.commitment),
            leaf_index: r.leaf_index as u32,
            encrypted_note: hex::encode(&r.encrypted_note),
            slot: r.slot as u64,
        })
        .collect();

    Ok(Json(response))
}

#[derive(Serialize)]
pub struct NullifierResponse {
    pub spent: bool,
}

/// Check if a nullifier has been spent
async fn check_nullifier(
    State(state): State<Arc<ApiState>>,
    axum::extract::Path(nullifier_hex): axum::extract::Path<String>,
) -> Result<Json<NullifierResponse>, StatusCode> {
    let nullifier = hex::decode(&nullifier_hex)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    if nullifier.len() != 32 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let nullifier: [u8; 32] = nullifier.try_into().unwrap();

    let spent = state
        .db
        .is_nullifier_spent(&nullifier)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(NullifierResponse { spent }))
}

#[derive(Serialize)]
pub struct SyncStatusResponse {
    pub latest_slot: u64,
}

/// Get sync status
async fn sync_status(
    State(state): State<Arc<ApiState>>,
) -> Result<Json<SyncStatusResponse>, StatusCode> {
    let latest_slot = state
        .db
        .get_latest_slot()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(SyncStatusResponse { latest_slot }))
}
