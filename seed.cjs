const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:369@localhost:5433/luminafox' });

async function seedMockData() {
  const accountId = 2; // from the previous query

  const trades = [];
  const now = new Date();
  let currentEquity = 10000;
  
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const isWin = Math.random() > 0.4; // 60% win rate
    const profit = isWin ? (Math.random() * 200 + 50) : -(Math.random() * 150 + 50);
    
    currentEquity += profit;
    
    trades.push({
      ticket: 1000000 + i,
      symbol: ['EURUSD', 'XAUUSD', 'GBPUSD', 'US30'][Math.floor(Math.random() * 4)],
      type: Math.random() > 0.5 ? 'BUY' : 'SELL',
      volume: (Math.random() * 2 + 0.1).toFixed(2),
      openPrice: 1.0500 + Math.random() * 0.05,
      closePrice: 1.0500 + Math.random() * 0.05,
      openTime: new Date(date.getTime() - 3600000).toISOString(),
      closeTime: date.toISOString(),
      profit: profit,
      commission: -(Math.random() * 5 + 1),
      swap: 0
    });
  }
  
  const dataJson = {
    tradeBook: { trades: trades },
    snapshot: {
      account: { balance: currentEquity, equity: currentEquity },
      historyDeals: trades
    }
  };

  const accountRes = await pool.query('SELECT user_id FROM user_mt5_accounts WHERE id = $1', [accountId]);
  if (accountRes.rows.length === 0) throw new Error('Account not found');
  const userId = accountRes.rows[0].user_id;

  await pool.query('DELETE FROM user_mt5_account_cache WHERE mt5_account_id = $1', [accountId]);
  await pool.query(
    'INSERT INTO user_mt5_account_cache (mt5_account_id, user_id, data_json, updated_at) VALUES ($1, $2, $3, NOW())',
    [accountId, userId, dataJson]
  );
  
  console.log('Mock data seeded successfully for account', accountId);
  pool.end();
}

seedMockData().catch(console.error);
