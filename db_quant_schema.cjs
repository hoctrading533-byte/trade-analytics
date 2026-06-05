const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Identity
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt5_login INT NOT NULL,
    account_type VARCHAR(50) DEFAULT 'Live',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, mt5_login)
);

-- Trades Table (Partitioned)
CREATE TABLE IF NOT EXISTS user_trade_history (
    ticket BIGINT NOT NULL,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    open_time TIMESTAMPTZ NOT NULL,
    close_time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    volume NUMERIC(10, 4) NOT NULL,
    pnl NUMERIC(15, 2) NOT NULL,
    commission NUMERIC(15, 2) DEFAULT 0,
    swap NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ticket, close_time)
) PARTITION BY RANGE (close_time);

CREATE TABLE IF NOT EXISTS user_trade_history_2026_q2 PARTITION OF user_trade_history FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS user_trade_history_2026_q3 PARTITION OF user_trade_history FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS user_trade_history_2026_q4 PARTITION OF user_trade_history FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS idx_uth_brin_close_time ON user_trade_history USING BRIN (close_time);
CREATE INDEX IF NOT EXISTS idx_uth_account_id ON user_trade_history(account_id);

-- Behavior Events (Partitioned)
CREATE TABLE IF NOT EXISTS behavior_events (
    id BIGSERIAL NOT NULL,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    trade_ticket BIGINT NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    severity NUMERIC(5, 2) NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL,
    impact_pnl NUMERIC(15, 2),
    PRIMARY KEY (id, event_time)
) PARTITION BY RANGE (event_time);

CREATE TABLE IF NOT EXISTS behavior_events_2026_h1 PARTITION OF behavior_events FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS behavior_events_2026_h2 PARTITION OF behavior_events FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS idx_behave_brin_time ON behavior_events USING BRIN (event_time);

-- Metadata
CREATE TABLE IF NOT EXISTS trade_tags (
    trade_ticket BIGINT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (trade_ticket, tag_name)
);

CREATE TABLE IF NOT EXISTS trade_notes (
    trade_ticket BIGINT PRIMARY KEY,
    note_content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trade_setups (
    id SERIAL PRIMARY KEY,
    trade_ticket BIGINT NOT NULL,
    setup_name VARCHAR(100) NOT NULL,
    confidence NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trade_setups_ticket ON trade_setups(trade_ticket);

-- AI Insights & Psychology
CREATE TABLE IF NOT EXISTS behavior_insights (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    insight_type VARCHAR(50) NOT NULL,
    insight_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insights_jsonb ON behavior_insights USING GIN (insight_data);

CREATE TABLE IF NOT EXISTS psychology_states (
    id BIGSERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    trigger_event VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id BIGSERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    event_time TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    metrics_snapshot JSONB NOT NULL,
    ai_review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_reviews (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    metrics_snapshot JSONB NOT NULL,
    ai_review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP MATERIALIZED VIEW IF EXISTS heatmap_data CASCADE;

CREATE MATERIALIZED VIEW heatmap_data AS
SELECT 
    account_id,
    EXTRACT(DOW FROM close_time) AS day_of_week,
    FLOOR(EXTRACT(HOUR FROM close_time) / 2) * 2 AS hour_slot,
    COUNT(ticket) AS trade_count,
    SUM(pnl) AS total_pnl,
    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) AS win_count
FROM user_trade_history
GROUP BY account_id, EXTRACT(DOW FROM close_time), FLOOR(EXTRACT(HOUR FROM close_time) / 2) * 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_heatmap_mat_view 
ON heatmap_data (account_id, day_of_week, hour_slot);

`;

async function run() {
  try {
    console.log('Running Quant DB Migration...')
    await pool.query(sql)
    console.log('Migration Completed Successfully.')
  } catch (err) {
    console.error('Migration Failed:', err)
  } finally {
    pool.end()
  }
}
run()
