const { Pool } = require('pg')
require('dotenv').config()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  try {
    await pool.query(
      CREATE TABLE IF NOT EXISTS user_daily_scores (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL,
          mt5_account_id INT NOT NULL,
          record_date DATE NOT NULL,
          
          score_behavior NUMERIC(5,2) DEFAULT 100.00,
          score_discipline NUMERIC(5,2) DEFAULT 100.00,
          score_psychology NUMERIC(5,2) DEFAULT 100.00,
          score_execution NUMERIC(5,2) DEFAULT 100.00,
          score_risk NUMERIC(5,2) DEFAULT 100.00,
          score_consistency NUMERIC(5,2) DEFAULT 100.00,
          
          total_penalties INT DEFAULT 0,
          metrics_snapshot JSONB,
          
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (mt5_account_id, record_date)
      );
      CREATE INDEX IF NOT EXISTS idx_user_daily_scores_date ON user_daily_scores(mt5_account_id, record_date DESC);
    )
    console.log('Table created successfully.')
  } catch (err) {
    console.error(err)
  } finally {
    pool.end()
  }
}
run()
