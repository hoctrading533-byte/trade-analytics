const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:369@localhost:5433/luminafox' });
async function test() {
  try {
    const res = await pool.query(`SELECT a.*, c.updated_at AS cache_updated_at, c.data_json->'account' AS cached_account_json
     FROM user_mt5_accounts a
     LEFT JOIN user_mt5_account_cache c ON c.mt5_account_id = a.id
     ORDER BY a.created_at ASC`);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
