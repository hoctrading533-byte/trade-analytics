const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: '9238b830-51a1-4447-9cb8-759c116fed99', role: 'admin' }, 'dinhvantam21052007@admi', { expiresIn: '7d' });
async function run() {
  const res = await fetch('http://localhost:4000/api/mt5/accounts', { headers: { 'Authorization': `Bearer ${token}` }});
  const data1 = await res.json();
  const accId = data1.accounts[0].id;
  const jRes = await fetch(`http://localhost:4000/api/journal/data/${accId}`, { headers: { 'Authorization': `Bearer ${token}` }});
  const data2 = await jRes.json();
  console.log("Raw Trades count:", data2.rawTrades ? data2.rawTrades.length : 0);
  console.log("Last 15 raw trades:", JSON.stringify(data2.rawTrades.slice(-15), null, 2));
}
run();
