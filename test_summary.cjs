const jwt = require('jsonwebtoken');
const token = jwt.sign({ sub: '9238b830-51a1-4447-9cb8-759c116fed99', role: 'admin' }, 'dinhvantam21052007@admi', { expiresIn: '7d' });

async function run() {
  const res = await fetch('http://localhost:4000/api/mt5/accounts', { headers: { 'Authorization': `Bearer ${token}` }});
  const data1 = await res.json();
  const accId = data1.accounts[0].id;
  const jRes = await fetch(`http://localhost:4000/api/journal/data/${accId}`, { headers: { 'Authorization': `Bearer ${token}` }});
  const data = await jRes.json();
  
  function mergeDealsIntoTrades(deals) {
    const positions = {};
    for (const d of deals) {
      if (d.type === 2) continue;
      const pid = d.position_id || d.ticket;
      if (!positions[pid]) {
        positions[pid] = { id: pid, volume: 0, profit: 0, commission: 0, fee: 0, openTime: null, closeTime: null, inVolume: 0, outVolume: 0, inCost: 0, outCost: 0 };
      }
      const p = positions[pid];
      p.profit += (d.profit || 0) + (d.swap || 0);
      p.commission += d.commission || 0;
      p.fee += d.fee || 0;
      p.volume = Math.max(p.volume, d.volume);
      if (d.entry === 0) {
        if (!p.openTime || d.time * 1000 < p.openTime) p.openTime = d.time * 1000;
        p.inVolume += d.volume;
        p.inCost += d.price * d.volume;
      } else if (d.entry === 1) {
        if (!p.closeTime || d.time * 1000 > p.closeTime) p.closeTime = d.time * 1000;
        p.outVolume += d.volume;
        p.outCost += d.price * d.volume;
      }
    }
    return Object.values(positions).map(p => {
      p.time = p.openTime || p.closeTime;
      p.pnl = p.profit + p.commission + p.fee;
      return p;
    }).sort((a, b) => b.time - a.time);
  }

  const merged = mergeDealsIntoTrades(data.rawTrades || []);
  
  const statsMap = {};
  for (const t of merged) {
    const d = new Date(t.time || Date.now());
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    if (!statsMap[dateStr]) {
      statsMap[dateStr] = { date: dateStr, trades: [], totalTrades: 0, winners: 0, losers: 0, grossProfit: 0, grossLoss: 0, netProfit: 0, volume: 0 };
    }
    const s = statsMap[dateStr];
    s.trades.push(t);
    s.totalTrades++;
    s.volume += (t.volume || 0);
    if (t.pnl >= 0) { s.winners++; s.grossProfit += t.pnl; } else { s.losers++; s.grossLoss += Math.abs(t.pnl); }
    s.netProfit += t.pnl;
  }
  
  const statsArray = Object.values(statsMap);
  for (const s of statsArray) {
    s.winRate = s.totalTrades > 0 ? (s.winners / s.totalTrades) * 100 : 0;
    s.profitFactor = s.grossLoss > 0 ? (s.grossProfit / s.grossLoss).toFixed(2) : (s.grossProfit > 0 ? "999" : "0.00");
  }
  
  const dailyStats = statsArray.sort((a,b) => b.date.localeCompare(a.date));
  
  let net = 0, gross = 0, loss = 0, wins = 0, trades = 0, vol = 0, comm = 0;
  dailyStats.forEach(d => {
    net += d.netProfit; gross += d.grossProfit; loss += d.grossLoss; wins += d.winners; trades += d.totalTrades; vol += d.volume; comm += d.commission;
  });
  console.log("Summary => Trades:", trades, "Net:", net);
}
run();
