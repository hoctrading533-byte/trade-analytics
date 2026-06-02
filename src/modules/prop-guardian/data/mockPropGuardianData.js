const DAY = 24 * 60 * 60 * 1000

function iso(daysAgo, hour, minute = 0) {
  const date = new Date(Date.now() - daysAgo * DAY)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function dayKey(daysAgo) {
  return new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10)
}

export const propGuardianAccounts = [
  {
    id: 'acc-exness-100k',
    userId: 'mock-user',
    brokerName: 'Exness',
    brokerServer: 'Exness-MT5Trial14',
    loginId: '91548201',
    accountName: 'LuminaFox 100K Challenge',
    currency: 'USD',
    initialBalance: 100000,
    currentBalance: 103420,
    currentEquity: 102180,
    margin: 1840,
    freeMargin: 100340,
    marginLevel: 5553,
    leverage: 100,
    floatingProfit: -1240,
    credit: 0,
    accountType: 'prop',
    status: 'active'
  },
  {
    id: 'acc-exness-50k',
    userId: 'mock-user',
    brokerName: 'Exness',
    brokerServer: 'Exness-MT5Real8',
    loginId: '71548311',
    accountName: 'Conservative Funded 50K',
    currency: 'USD',
    initialBalance: 50000,
    currentBalance: 52180,
    currentEquity: 51860,
    margin: 620,
    freeMargin: 51240,
    marginLevel: 8364,
    leverage: 100,
    floatingProfit: -320,
    credit: 0,
    accountType: 'funded',
    status: 'active'
  }
]

export const propChallenges = [
  {
    id: 'challenge-alpha-100k',
    userId: 'mock-user',
    tradingAccountId: 'acc-exness-100k',
    propFirmName: 'Lumina Funding',
    challengeName: '100K Evaluation',
    phase: 'phase_1',
    accountSize: 100000,
    startBalance: 100000,
    profitTargetAmount: 8000,
    profitTargetPercent: 8,
    dailyLossLimitAmount: 5000,
    dailyLossLimitPercent: 5,
    maxLossLimitAmount: 10000,
    maxLossLimitPercent: 10,
    drawdownType: 'static',
    dailyLossCalculation: 'start_of_day_balance',
    minTradingDays: 5,
    maxTradingDays: 30,
    consistencyRuleEnabled: true,
    consistencyMaxDayProfitPercent: 35,
    newsTradingAllowed: false,
    weekendHoldingAllowed: false,
    copyTradingAllowed: false,
    eaAllowed: true,
    status: 'active',
    personalRiskPercent: 0.5,
    maxTradesPerDay: 4,
    alertRefreshSeconds: 5,
    executionPermission: false
  }
]

export const symbolMeta = {
  XAUUSD: { point: 0.01, pipValuePerLot: 1, contractSize: 100, spreadPoints: 24, digits: 2 },
  EURUSD: { point: 0.0001, pipValuePerLot: 10, contractSize: 100000, spreadPoints: 12, digits: 5 },
  GBPUSD: { point: 0.0001, pipValuePerLot: 10, contractSize: 100000, spreadPoints: 14, digits: 5 },
  US30: { point: 1, pipValuePerLot: 1, contractSize: 1, spreadPoints: 3, digits: 1 },
  NAS100: { point: 1, pipValuePerLot: 1, contractSize: 1, spreadPoints: 2, digits: 1 }
}

export const openPositions = [
  {
    ticket: '84120451',
    positionId: 'P-1201',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    symbol: 'XAUUSD',
    type: 'BUY',
    volume: 1.2,
    openPrice: 2364.2,
    currentPrice: 2355.1,
    sl: 2344.2,
    tp: 2396.5,
    swap: -4.2,
    commission: -8.4,
    profit: -1092,
    timeOpen: iso(0, 9, 12),
    magic: 0,
    comment: 'London sweep continuation'
  },
  {
    ticket: '84120588',
    positionId: 'P-1202',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    symbol: 'EURUSD',
    type: 'SELL',
    volume: 0.8,
    openPrice: 1.0864,
    currentPrice: 1.0882,
    sl: 1.0914,
    tp: 1.0784,
    swap: -1.1,
    commission: -5.6,
    profit: -148,
    timeOpen: iso(0, 10, 4),
    magic: 0,
    comment: 'NY continuation attempt'
  }
]

export const pendingOrders = [
  {
    ticket: '9125501',
    accountId: 'acc-exness-100k',
    symbol: 'GBPUSD',
    type: 'BUY_LIMIT',
    price: 1.268,
    sl: 1.2648,
    tp: 1.2762,
    volume: 0.7,
    expiration: iso(-1, 20, 0)
  }
]

export const closedTrades = [
  {
    id: 'TR-3001',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    brokerTradeId: '819001',
    positionId: 'P-1101',
    symbol: 'XAUUSD',
    side: 'BUY',
    entryTime: iso(0, 8, 10),
    exitTime: iso(0, 8, 44),
    entryPrice: 2351.2,
    exitPrice: 2358.7,
    volume: 0.8,
    sl: 2342.1,
    tp: 2369.4,
    grossProfit: 600,
    commission: -5.6,
    swap: 0,
    fee: 0,
    netProfit: 594.4,
    mae: 120,
    mfe: 760,
    durationSeconds: 2040,
    rMultiple: 0.82,
    riskAmount: 728,
    riskPercent: 0.73,
    session: 'London',
    strategyTag: 'Liquidity Sweep',
    emotionBefore: 'Calm',
    emotionAfter: 'Focused',
    mistakeTags: [],
    qualityScore: 84,
    disciplineScore: 88,
    notes: 'Clean reclaim after sweep.'
  },
  {
    id: 'TR-3002',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    brokerTradeId: '819022',
    positionId: 'P-1102',
    symbol: 'EURUSD',
    side: 'SELL',
    entryTime: iso(0, 9, 22),
    exitTime: iso(0, 9, 40),
    entryPrice: 1.0832,
    exitPrice: 1.0859,
    volume: 1.4,
    sl: 1.0854,
    tp: 1.0782,
    grossProfit: -378,
    commission: -9.8,
    swap: 0,
    fee: 0,
    netProfit: -387.8,
    mae: 420,
    mfe: 80,
    durationSeconds: 1080,
    rMultiple: -1.26,
    riskAmount: 308,
    riskPercent: 0.31,
    session: 'London',
    strategyTag: 'Break Retest',
    emotionBefore: 'FOMO',
    emotionAfter: 'Frustrated',
    mistakeTags: ['late_entry'],
    qualityScore: 48,
    disciplineScore: 52,
    notes: 'Chased after a missed candle.'
  },
  {
    id: 'TR-3003',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    brokerTradeId: '819040',
    positionId: 'P-1103',
    symbol: 'XAUUSD',
    side: 'SELL',
    entryTime: iso(0, 9, 48),
    exitTime: iso(0, 10, 2),
    entryPrice: 2357.4,
    exitPrice: 2364.6,
    volume: 1.6,
    sl: 2363.2,
    tp: 2344.5,
    grossProfit: -1152,
    commission: -11.2,
    swap: 0,
    fee: 0,
    netProfit: -1163.2,
    mae: 1260,
    mfe: 90,
    durationSeconds: 840,
    rMultiple: -1.25,
    riskAmount: 928,
    riskPercent: 0.93,
    session: 'London',
    strategyTag: '',
    emotionBefore: 'Revenge',
    emotionAfter: 'Angry',
    mistakeTags: ['revenge', 'oversize', 'no_setup'],
    qualityScore: 26,
    disciplineScore: 31,
    notes: 'Re-entry after loss with larger size.'
  },
  {
    id: 'TR-2998',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    brokerTradeId: '818810',
    positionId: 'P-1098',
    symbol: 'NAS100',
    side: 'BUY',
    entryTime: iso(1, 14, 32),
    exitTime: iso(1, 15, 12),
    entryPrice: 18420,
    exitPrice: 18478,
    volume: 2,
    sl: 18388,
    tp: 18510,
    grossProfit: 1160,
    commission: -8,
    swap: 0,
    fee: 0,
    netProfit: 1152,
    mae: 240,
    mfe: 1390,
    durationSeconds: 2400,
    rMultiple: 1.8,
    riskAmount: 640,
    riskPercent: 0.64,
    session: 'NewYork',
    strategyTag: 'Opening Drive',
    emotionBefore: 'Calm',
    emotionAfter: 'Confident',
    mistakeTags: [],
    qualityScore: 91,
    disciplineScore: 94,
    notes: 'A+ open drive.'
  },
  {
    id: 'TR-2990',
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    brokerTradeId: '818102',
    positionId: 'P-1090',
    symbol: 'GBPUSD',
    side: 'BUY',
    entryTime: iso(2, 11, 12),
    exitTime: iso(2, 12, 4),
    entryPrice: 1.2712,
    exitPrice: 1.2687,
    volume: 1.1,
    sl: 1.2688,
    tp: 1.2772,
    grossProfit: -275,
    commission: -7.7,
    swap: 0,
    fee: 0,
    netProfit: -282.7,
    mae: 330,
    mfe: 120,
    durationSeconds: 3120,
    rMultiple: -1.07,
    riskAmount: 264,
    riskPercent: 0.26,
    session: 'London',
    strategyTag: 'Supply Flip',
    emotionBefore: 'Impatient',
    emotionAfter: 'Neutral',
    mistakeTags: ['early_entry'],
    qualityScore: 54,
    disciplineScore: 60,
    notes: 'Invalidated quickly.'
  }
]

for (let i = 3; i < 30; i += 1) {
  const win = i % 3 !== 0
  const symbol = ['XAUUSD', 'EURUSD', 'NAS100', 'GBPUSD'][i % 4]
  const amount = win ? 280 + (i % 5) * 95 : -(180 + (i % 4) * 160)
  closedTrades.push({
    id: `TR-${2989 - i}`,
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    brokerTradeId: String(817000 - i),
    positionId: `P-${1080 - i}`,
    symbol,
    side: i % 2 ? 'BUY' : 'SELL',
    entryTime: iso(i, 9 + (i % 7), 10),
    exitTime: iso(i, 10 + (i % 7), 20),
    entryPrice: symbol === 'XAUUSD' ? 2320 + i : symbol === 'NAS100' ? 18100 + i * 8 : 1.07 + i / 10000,
    exitPrice: symbol === 'XAUUSD' ? 2320 + i + (win ? 4.2 : -3.1) : symbol === 'NAS100' ? 18100 + i * 8 + (win ? 38 : -26) : 1.07 + i / 10000 + (win ? 0.002 : -0.0015),
    volume: 0.4 + (i % 4) * 0.25,
    sl: 0,
    tp: 0,
    grossProfit: amount,
    commission: -5,
    swap: 0,
    fee: 0,
    netProfit: amount - 5,
    mae: Math.abs(amount) * 0.55,
    mfe: Math.abs(amount) * 1.3,
    durationSeconds: 1200 + i * 80,
    rMultiple: win ? 0.7 + (i % 4) * 0.22 : -0.8 - (i % 3) * 0.18,
    riskAmount: 350 + (i % 4) * 80,
    riskPercent: 0.35 + (i % 4) * 0.08,
    session: ['Asia', 'London', 'NewYork'][i % 3],
    strategyTag: ['Liquidity Sweep', 'Break Retest', 'Opening Drive', 'Supply Flip'][i % 4],
    emotionBefore: ['Calm', 'Focused', 'Impatient'][i % 3],
    emotionAfter: win ? 'Satisfied' : 'Neutral',
    mistakeTags: win ? [] : ['early_entry'],
    qualityScore: win ? 78 : 55,
    disciplineScore: win ? 82 : 58,
    notes: win ? 'Followed planned setup.' : 'Execution needs review.'
  })
}

export const dailySnapshots = Array.from({ length: 30 }, (_, index) => {
  const daysAgo = 29 - index
  const base = 100000 + index * 125
  const closed = (index % 3 === 0 ? -1 : 1) * (260 + (index % 6) * 90)
  return {
    id: `DAY-${index + 1}`,
    accountId: 'acc-exness-100k',
    challengeId: 'challenge-alpha-100k',
    date: dayKey(daysAgo),
    startBalance: base,
    startEquity: base + (index % 2 ? 130 : -80),
    highEquity: base + Math.max(400, closed + 620),
    lowEquity: base - Math.max(300, Math.abs(closed) + 260),
    endBalance: base + closed,
    endEquity: base + closed + (index % 4 === 0 ? -120 : 80),
    closedPnl: closed,
    floatingPnl: index === 29 ? -1240 : 0,
    totalTrades: 2 + (index % 5),
    wins: 1 + (index % 3),
    losses: index % 2,
    dailyDdUsed: Math.max(0, Math.abs(Math.min(0, closed)) + (index === 29 ? 1240 : 0)),
    maxDdUsed: Math.max(0, 100000 - (base + closed)),
    ruleStatus: index === 29 ? 'danger' : 'ok'
  }
})

export const marketNews = [
  { id: 'NFP', symbol: 'USD', title: 'US Non-Farm Payrolls', impact: 'high', startsAt: iso(0, 19, 30) },
  { id: 'CPI', symbol: 'USD', title: 'US CPI', impact: 'high', startsAt: iso(-2, 19, 30) }
]

export const mockConnectorSnapshot = {
  source: 'mock-exness-mt5',
  fetchedAt: new Date().toISOString(),
  account: propGuardianAccounts[0],
  openPositions,
  pendingOrders,
  historyDeals: closedTrades,
  historyOrders: []
}
