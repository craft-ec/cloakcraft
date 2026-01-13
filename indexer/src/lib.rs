//! CloakCraft Indexer
//!
//! Indexes shielded pool events for efficient client queries.
//! Tracks note commitments, nullifiers, and encrypted data.

pub mod config;
pub mod database;
pub mod events;
pub mod rpc;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum IndexerError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("RPC error: {0}")]
    Rpc(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

pub type Result<T> = std::result::Result<T, IndexerError>;
