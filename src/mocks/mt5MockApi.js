const accounts = [
  {
    id: 'acc-001',
    label: 'Exness Main #415***475',
    currency: 'USD',
    startingBalance: 10000
  },
  {
    id: 'acc-002',
    label: 'Exness Pro #927***120',
    currency: 'USD',
    startingBalance: 6500
  }
]

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function createTrade(seed, accountId, daysAgo) {
  const randA = seededRandom(seed)
  const randB = seededRandom(seed + 11)
  const randC = seededRandom(seed + 29)
  const side = randA > 0.5 ? 'LONG' : 'SHORT'
  const symbolPool = ['XAUUSD', 'ETHUSDm', 'BTCUSDm', 'EURUSD', 'GBPUSD', 'USDJPY']
  const symbol = symbolPool[Math.floor(randB * symbolPool.length)]
  const volume = Number((0.01 + randA * 0.19).toFixed(2))
  const priceBase = 1800 + Math.round(randB * 2500)
  const riskUnit = 5 + Math.round(randC * 45)
  const rr = Number((0.7 + randA * 2.4).toFixed(2))
  const isWin = randB > 0.38
  const entry = priceBase
  const sl = side === 'LONG' ? entry - riskUnit : entry + riskUnit
  const tp = side === 'LONG' ? entry + riskUnit * rr : entry - riskUnit * rr
  const pnlRaw = (isWin ? riskUnit * rr : -riskUnit) * volume * (symbol.includes('XAU') ? 0.8 : 1.2)
  const profit = Number(pnlRaw.toFixed(2))
  const openAt = new Date(Date.now() - daysAgo * 86400000 - Math.round(randA * 36000000))
  const closeAt = new Date(openAt.getTime() + (20 + Math.round(randB * 160)) * 60000)
  const outsidePlan = rr < 1 || randC > 0.92
  const revenge = !isWin && randA > 0.78

  return {
    id: `${accountId}-${seed}`,
    accountId,
    symbol,
    side,
    volume,
    entry,
    exit: Number((entry + (side === 'LONG' ? 1 : -1) * (profit / Math.max(volume, 0.01))).toFixed(2)),
    sl,
    tp,
    rr,
    riskPct: Number((0.2 + randC * 1.8).toFixed(2)),
    profit,
    openAt: openAt.toISOString(),
    closeAt: closeAt.toISOString(),
    closeReason: profit > 0 ? 'TP' : 'SL',
    outsidePlan,
    revenge
  }
}

const trades = (() => {
  const list = []
  for (let d = 0; d < 40; d += 1) {
    const countA = d % 6 === 0 ? 6 : 2 + (d % 4)
    const countB = d % 7 === 0 ? 5 : 1 + (d % 3)
    for (let i = 0; i < countA; i += 1) list.push(createTrade(1000 + d * 13 + i, 'acc-001', d))
    for (let i = 0; i < countB; i += 1) list.push(createTrade(2000 + d * 17 + i, 'acc-002', d))
  }
  return list.sort((a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime())
})()

export async function fetchMt5MockPayload() {
  await new Promise((resolve) => setTimeout(resolve, 250))
  return {
    accounts,
    trades
  }
}

