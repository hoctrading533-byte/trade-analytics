const data = {
  rawTrades: [
    { type: 0, position_id: 1, symbol: 'BTC', volume: 1, profit: 10, commission: -1, fee: 0, time: 1000000, entry: 0, price: 50000 },
    { type: 0, position_id: 1, symbol: 'BTC', volume: 1, profit: 5, commission: 0, fee: 0, time: 1000500, entry: 1, price: 50015 }
  ],
  accountSnapshot: {}
};

function mergeDealsIntoTrades(deals) {
  const positions = {};
  for (const d of deals) {
    if (d.type === 2) continue;
    const pid = d.position_id || d.ticket;
    if (!positions[pid]) {
      positions[pid] = {
        id: pid,
        symbol: d.symbol || '',
        type: d.type,
        volume: 0,
        profit: 0,
        commission: 0,
        fee: 0,
        openTime: null,
        closeTime: null,
        entryPrice: null,
        exitPrice: null,
        inVolume: 0,
        outVolume: 0,
        inCost: 0,
        outCost: 0
      };
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
      p.type = d.type;
    } else if (d.entry === 1) {
      if (!p.closeTime || d.time * 1000 > p.closeTime) p.closeTime = d.time * 1000;
      p.outVolume += d.volume;
      p.outCost += d.price * d.volume;
    }
  }
  return Object.values(positions).map(p => {
    if (p.inVolume > 0) p.entryPrice = p.inCost / p.inVolume;
    if (p.outVolume > 0) p.exitPrice = p.outCost / p.outVolume;
    p.time = p.openTime || p.closeTime;
    p.pnl = p.profit + p.commission + p.fee;
    return p;
  }).sort((a, b) => b.time - a.time);
}

const merged = mergeDealsIntoTrades(data.rawTrades || []);
console.log("Merged:", merged);

const statsMap = {};
for (const t of merged) {
  const d = new Date(t.time || Date.now());
  const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  if (!statsMap[dateStr]) {
    statsMap[dateStr] = {
      date: dateStr,
      trades: [],
      totalTrades: 0,
      winners: 0,
      losers: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      volume: 0
    };
  }
  const s = statsMap[dateStr];
  s.trades.push(t);
  s.totalTrades++;
  s.volume += (t.volume || 0);
  if (t.pnl >= 0) {
    s.winners++;
    s.grossProfit += t.pnl;
  } else {
    s.losers++;
    s.grossLoss += Math.abs(t.pnl);
  }
  s.netProfit += t.pnl;
}
console.log("StatsMap:", statsMap);
