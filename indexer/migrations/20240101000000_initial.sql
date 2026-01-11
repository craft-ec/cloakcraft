-- CloakCraft Indexer Schema

-- Commitments table (note commitments in the merkle tree)
CREATE TABLE IF NOT EXISTS commitments (
    id SERIAL PRIMARY KEY,
    commitment BYTEA NOT NULL UNIQUE,
    leaf_index INTEGER NOT NULL,
    pool_id BYTEA NOT NULL,
    encrypted_note BYTEA NOT NULL,
    slot BIGINT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_commitments_pool_index ON commitments(pool_id, leaf_index);
CREATE INDEX idx_commitments_slot ON commitments(slot);

-- Nullifiers table (spent notes)
CREATE TABLE IF NOT EXISTS nullifiers (
    id SERIAL PRIMARY KEY,
    nullifier BYTEA NOT NULL UNIQUE,
    pool_id BYTEA NOT NULL,
    slot BIGINT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nullifiers_pool ON nullifiers(pool_id);
CREATE INDEX idx_nullifiers_slot ON nullifiers(slot);

-- Orders table (market orders)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id BYTEA NOT NULL UNIQUE,
    escrow_commitment BYTEA NOT NULL,
    terms_hash BYTEA NOT NULL,
    expiry BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    slot BIGINT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_expiry ON orders(expiry);

-- AMM pools table
CREATE TABLE IF NOT EXISTS amm_pools (
    id SERIAL PRIMARY KEY,
    pool_id BYTEA NOT NULL UNIQUE,
    token_a_mint BYTEA NOT NULL,
    token_b_mint BYTEA NOT NULL,
    state_hash BYTEA NOT NULL,
    slot BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voting aggregations table
CREATE TABLE IF NOT EXISTS aggregations (
    id SERIAL PRIMARY KEY,
    aggregation_id BYTEA NOT NULL UNIQUE,
    threshold_pubkey BYTEA NOT NULL,
    num_options INTEGER NOT NULL,
    deadline BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    vote_count INTEGER NOT NULL DEFAULT 0,
    slot BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_aggregations_status ON aggregations(status);
CREATE INDEX idx_aggregations_deadline ON aggregations(deadline);

-- Action nullifiers (for voting without consuming notes)
CREATE TABLE IF NOT EXISTS action_nullifiers (
    id SERIAL PRIMARY KEY,
    nullifier BYTEA NOT NULL UNIQUE,
    aggregation_id BYTEA NOT NULL,
    slot BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_action_nullifiers_aggregation ON action_nullifiers(aggregation_id);
