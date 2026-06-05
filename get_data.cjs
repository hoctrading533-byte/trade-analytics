const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: '9238b830-51a1-4447-9cb8-759c116fed99', role: 'admin' }, 'dinhvantam21052007@admi', { expiresIn: '7d' });
async function run() {
  const res = await fetch('http://localhost:4000/api/mt5/accounts', { headers: { 'Authorization': `Bearer ${token}` }});
  const data = await res.json();
  const accId = data.accounts[0].id;
  const jRes = await fetch(`http://localhost:4000/api/journal/data/${accId}`, { headers: { 'Authorization': `Bearer ${token}` }});
  const jData = await jRes.json();
  console.log(JSON.stringify(jData.rawTrades[0], null, 2));
}
run();
