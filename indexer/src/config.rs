//! Indexer configuration

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct IndexerConfig {
    /// Solana RPC URL
    pub rpc_url: String,

    /// WebSocket URL for subscriptions
    pub ws_url: String,

    /// PostgreSQL database URL
    pub database_url: String,

    /// HTTP server port
    pub port: u16,

    /// CloakCraft program ID
    pub program_id: String,

    /// Starting slot for indexing
    pub start_slot: Option<u64>,
}

impl Default for IndexerConfig {
    fn default() -> Self {
        Self {
            rpc_url: "http://localhost:8899".to_string(),
            ws_url: "ws://localhost:8900".to_string(),
            database_url: "postgres://localhost/cloakcraft".to_string(),
            port: 3000,
            program_id: "CLoAKcRaFt1111111111111111111111111111111111".to_string(),
            start_slot: None,
        }
    }
}

impl IndexerConfig {
    pub fn from_env() -> Result<Self, crate::IndexerError> {
        Ok(Self {
            rpc_url: std::env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "http://localhost:8899".to_string()),
            ws_url: std::env::var("SOLANA_WS_URL")
                .unwrap_or_else(|_| "ws://localhost:8900".to_string()),
            database_url: std::env::var("DATABASE_URL")
                .map_err(|_| crate::IndexerError::Config("DATABASE_URL not set".to_string()))?,
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            program_id: std::env::var("PROGRAM_ID")
                .unwrap_or_else(|_| "CLoAKcRaFt1111111111111111111111111111111111".to_string()),
            start_slot: std::env::var("START_SLOT")
                .ok()
                .and_then(|s| s.parse().ok()),
        })
    }
}
