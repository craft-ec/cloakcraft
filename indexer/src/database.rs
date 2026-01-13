//! Database operations for indexer storage

use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::Result;

/// Database connection pool wrapper
pub struct Database {
    pool: PgPool,
}

impl Database {
    /// Create a new database connection pool
    pub async fn connect(url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(url)
            .await?;

        Ok(Self { pool })
    }

    /// Run migrations
    pub async fn migrate(&self) -> Result<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| crate::IndexerError::Database(sqlx::Error::Migrate(Box::new(e))))?;
        Ok(())
    }

    /// Insert a new commitment
    pub async fn insert_commitment(
        &self,
        commitment: &[u8; 32],
        leaf_index: u32,
        pool_id: &[u8; 32],
        encrypted_note: &[u8],
        slot: u64,
        signature: &str,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO commitments (commitment, leaf_index, pool_id, encrypted_note, slot, signature)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (commitment) DO NOTHING
            "#,
            commitment.as_slice(),
            leaf_index as i32,
            pool_id.as_slice(),
            encrypted_note,
            slot as i64,
            signature,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Insert a spent nullifier
    pub async fn insert_nullifier(
        &self,
        nullifier: &[u8; 32],
        pool_id: &[u8; 32],
        slot: u64,
        signature: &str,
    ) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO nullifiers (nullifier, pool_id, slot, signature)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (nullifier) DO NOTHING
            "#,
            nullifier.as_slice(),
            pool_id.as_slice(),
            slot as i64,
            signature,
        )
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Get commitments for a pool since a specific leaf index
    pub async fn get_commitments(
        &self,
        pool_id: &[u8; 32],
        since_index: u32,
        limit: u32,
    ) -> Result<Vec<CommitmentRecord>> {
        let records = sqlx::query_as!(
            CommitmentRecord,
            r#"
            SELECT commitment, leaf_index, encrypted_note, slot
            FROM commitments
            WHERE pool_id = $1 AND leaf_index >= $2
            ORDER BY leaf_index ASC
            LIMIT $3
            "#,
            pool_id.as_slice(),
            since_index as i32,
            limit as i32,
        )
        .fetch_all(&self.pool)
        .await?;
        Ok(records)
    }

    /// Check if a nullifier has been spent
    pub async fn is_nullifier_spent(&self, nullifier: &[u8; 32]) -> Result<bool> {
        let result = sqlx::query!(
            "SELECT 1 as exists FROM nullifiers WHERE nullifier = $1",
            nullifier.as_slice(),
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(result.is_some())
    }

    /// Get the latest indexed slot
    pub async fn get_latest_slot(&self) -> Result<u64> {
        let result = sqlx::query!(
            "SELECT COALESCE(MAX(slot), 0) as slot FROM commitments"
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(result.slot.unwrap_or(0) as u64)
    }
}

/// Commitment record from database
pub struct CommitmentRecord {
    pub commitment: Vec<u8>,
    pub leaf_index: i32,
    pub encrypted_note: Vec<u8>,
    pub slot: i64,
}
