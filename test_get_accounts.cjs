const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:369@localhost:5433/luminafox' });

function maskSecret(value) {
  const str = String(value || '')
  if (!str) return ''
  if (str.length <= 6) return '*'.repeat(str.length)
  return `${str.slice(0, 3)}${'*'.repeat(str.length - 6)}${str.slice(-3)}`
}

function sanitizeMt5AccountRow(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    loginId: maskSecret(row.mt5_login),
    loginRaw: row.mt5_login,
    server: row.mt5_server,
    terminalPath: row.mt5_terminal_path || '',
    accountName: row.account_name || '',
    accountType: row.account_type || 'prop',
    initialBalance: Number(row.initial_balance || 0),
    isActive: Boolean(row.is_active),
    lastSyncAt: row.last_sync_at || null,
    lastSyncStatus: row.last_sync_status || 'pending',
    lastSyncError: row.last_sync_error || '',
    syncDays: Number(row.sync_days || 365),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function sanitizeMt5AccountPublic(row) {
  const base = sanitizeMt5AccountRow(row)
  if (!base) return null
  delete base.loginRaw
  return base
}

async function test() {
  const userId = '9238b830-51a1-4447-9cb8-759c116fed99'; // from previous output
  const result = await pool.query(
    `SELECT a.*, c.updated_at AS cache_updated_at, c.data_json->'account' AS cached_account_json
     FROM user_mt5_accounts a
     LEFT JOIN user_mt5_account_cache c ON c.mt5_account_id = a.id
     WHERE a.user_id = $1 ORDER BY a.created_at ASC`,
    [userId]
  )
  const accounts = result.rows.map((row) => {
    const base = sanitizeMt5AccountPublic(row)
    try {
      const ca = row.cached_account_json || null
      if (ca && typeof ca === 'object') {
        base.currentBalance = Number(ca.balance || base.initialBalance)
        base.currentEquity = Number(ca.equity || base.currentBalance)
        base.profit = Number(ca.profit || 0)
        base.leverage = Number(ca.leverage || 0)
        base.currency = ca.currency || 'USD'
        base.company = ca.company || ''
        base.brokerName = ca.company || 'MetaQuotes'
      } else {
        base.currentBalance = base.initialBalance; base.currentEquity = base.initialBalance
        base.profit = 0; base.leverage = 0; base.currency = 'USD'; base.company = ''; base.brokerName = 'MetaQuotes'
      }
    } catch { base.currentBalance = base.initialBalance; base.currentEquity = base.initialBalance }
    base.cacheUpdatedAt = row.cache_updated_at || null
    return base
  })
  console.log(JSON.stringify(accounts, null, 2));
  pool.end();
}
test().catch(console.error);
