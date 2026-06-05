import { BehaviorDetectionEngine } from './behaviorEngine.js'
import { PsychologyEngine } from './psychologyEngine.js'
import { AIInsightEngine } from './aiInsightEngine.js'
import { TradingCoachEngine } from './tradingCoach.js'

export function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num(v, min)))
}

export function computePnL(trade) {
  const entry = num(trade.entryPrice || trade.entry)
  const exit = num(trade.exitPrice || trade.exit)
  const volume = num(trade.volume)
  const commission = num(trade.commission)
  const fee = num(trade.fee)
  const side = String(trade.side || '').toLowerCase()
  const gross = side === 'long' ? (exit - entry) * volume : (entry - exit) * volume
  return Number((gross - commission - fee).toFixed(2))
}

export function computeRisk(trade) {
  const entry = num(trade.entryPrice || trade.entry)
  const sl = num(trade.stopLoss || trade.sl)
  const volume = num(trade.volume)
  return entry > 0 && sl > 0 ? Number((Math.abs(entry - sl) * volume).toFixed(2)) : 0
}

export function computeReward(trade) {
  const entry = num(trade.entryPrice || trade.entry)
  const tp = num(trade.takeProfit || trade.tp)
  const volume = num(trade.volume)
  return entry > 0 && tp > 0 ? Number((Math.abs(tp - entry) * volume).toFixed(2)) : 0
}

export function computeHoldingMinutes(trade) {
  const entryMs = new Date(trade.entryTime || trade.openTime || trade.openAt || trade.entryDate).getTime()
  const exitMs = new Date(trade.exitTime || trade.closeTime || trade.closeAt || trade.exitDate).getTime()
  if (!entryMs || !exitMs || Number.isNaN(entryMs) || Number.isNaN(exitMs)) return 0
  return Math.max(1, Math.round((exitMs - entryMs) / 60000))
}

export function enrichTrade(trade) {
  const pnl = trade.pnl !== undefined ? trade.pnl : computePnL(trade)
  const risk = computeRisk(trade)
  const reward = computeReward(trade)

  // Calculate individual execution quality score
  let penalties = 0
  const entry = num(trade.entryPrice || trade.entry)
  const stopLoss = num(trade.stopLoss || trade.sl)
  const takeProfit = num(trade.takeProfit || trade.tp)
  
  if (entry > 0 && !stopLoss) {
    penalties += 45 // Severe: trading without SL
  }
  if (trade.slRemoved === true) {
    penalties += 30 // Severe: removed SL in flight
  }
  if (entry > 0 && !takeProfit) {
    penalties += 10 // Mild: no TP
  }
  if (trade.emotionTag === 'FOMO' || trade.emotionTag === 'Revenge') {
    penalties += 20 // Emotional trade
  }
  
  const executionScore = Math.max(0, 100 - penalties)
  const side = String(trade.side || '').toLowerCase()

  return {
    ...trade,
    pnl,
    grossPnL: trade.grossProfit !== undefined ? trade.grossProfit : (side === 'long'
      ? (num(trade.exitPrice || trade.exit) - num(trade.entryPrice || trade.entry)) * num(trade.volume)
      : (num(trade.entryPrice || trade.entry) - num(trade.exitPrice || trade.exit)) * num(trade.volume)),
    risk,
    reward,
    rMultiple: risk > 0 ? Number((pnl / risk).toFixed(2)) : 0,
    rr: risk > 0 ? Number((reward / risk).toFixed(2)) : 0,
    holdingMinutes: computeHoldingMinutes(trade),
    executionScore
  }
}

export function rangeFromKey(key) {
  const now = Date.now()
  if (key === 'today') return { from: new Date(new Date().setHours(0, 0, 0, 0)).getTime(), to: now }
  if (key === '7d') return { from: now - 7 * 86400000, to: now }
  if (key === '30d') return { from: now - 30 * 86400000, to: now }
  if (key === '90d') return { from: now - 90 * 86400000, to: now }
  if (key === 'ytd') {
    const start = new Date(new Date().getFullYear(), 0, 1).getTime()
    return { from: start, to: now }
  }
  return { from: 0, to: now }
}

export function filterByRange(trades, rangeKey) {
  const { from, to } = rangeFromKey(rangeKey)
  return (Array.isArray(trades) ? trades : []).filter(t => {
    const ts = new Date(t.exitTime || t.closeAt || t.entryTime || t.openAt || 0).getTime()
    return ts >= from && ts <= to
  })
}

export function computeTradingMetrics(trades, startingBalance = 0) {
  const rows = (Array.isArray(trades) ? trades : []).slice()
    .sort((a, b) => new Date(a.exitTime || a.closeAt || a.entryTime || a.openTime || Date.now()).getTime() - new Date(b.exitTime || b.closeAt || b.entryTime || b.openTime || Date.now()).getTime())

  const total = rows.length
  if (!total) return emptyMetrics()

  const wins = rows.filter(r => num(r.pnl) > 0)
  const losses = rows.filter(r => num(r.pnl) < 0)
  const breakeven = rows.filter(r => num(r.pnl) === 0)
  const winCount = wins.length
  const lossCount = losses.length
  const grossProfit = rows.reduce((s, r) => s + Math.max(0, num(r.pnl)), 0)
  const grossLossAbs = Math.abs(rows.reduce((s, r) => s + Math.min(0, num(r.pnl)), 0))
  const netProfit = grossProfit - grossLossAbs
  const winRate = total ? (winCount / total) * 100 : 0
  const lossRate = total ? (lossCount / total) * 100 : 0
  const avgWin = winCount ? grossProfit / winCount : 0
  const avgLoss = lossCount ? grossLossAbs / lossCount : 0
  const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? grossProfit : 0
  const avgR = total ? rows.reduce((s, r) => s + num(r.rMultiple), 0) / total : 0
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0
  const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss
  const totalRisk = rows.reduce((s, r) => s + num(r.risk), 0)
  const avgRisk = total ? totalRisk / total : 0

  let cumulative = startingBalance
  let peak = startingBalance
  let maxDrawdownAbs = 0
  let peakEquity = startingBalance
  let lowAfterPeak = startingBalance
  const equityCurve = rows.map(r => {
    cumulative += num(r.pnl)
    if (cumulative > peak) {
      peak = cumulative
      peakEquity = cumulative
      lowAfterPeak = cumulative
    } else {
      lowAfterPeak = Math.min(lowAfterPeak, cumulative)
    }
    const ddFromPeak = peak - cumulative
    maxDrawdownAbs = Math.max(maxDrawdownAbs, ddFromPeak)
    return { time: r.exitTime || r.closeAt, equity: Number(cumulative.toFixed(2)) }
  })
  const drawdownPct = peak > 0 ? (maxDrawdownAbs / peak) * 100 : 0

  // Streaks
  let maxConsecutiveWins = 0
  let maxConsecutiveLosses = 0
  let currentWinStreak = 0
  let currentLossStreak = 0
  for (const r of rows) {
    const pnl = num(r.pnl)
    if (pnl > 0) {
      currentWinStreak++
      currentLossStreak = 0
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak)
    } else if (pnl < 0) {
      currentLossStreak++
      currentWinStreak = 0
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak)
    } else {
      currentWinStreak = 0
      currentLossStreak = 0
    }
  }

  const holdingTimes = rows.filter(r => r.holdingMinutes > 0).map(r => r.holdingMinutes)
  const avgHoldingMinutes = holdingTimes.length
    ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length
    : 0

  const sessionMap = {}
  const strategyMap = {}
  const symbolMap = {}
  const emotionMap = {}
  const dayMap = {}
  const hourMap = {}
  const conditionMap = {}

  for (const r of rows) {
    const pnl = num(r.pnl)

    if (r.session) {
      if (!sessionMap[r.session]) sessionMap[r.session] = { trades: 0, wins: 0, pnl: 0 }
      sessionMap[r.session].trades++
      if (pnl > 0) sessionMap[r.session].wins++
      sessionMap[r.session].pnl += pnl
    }
    if (r.strategyTag) {
      if (!strategyMap[r.strategyTag]) strategyMap[r.strategyTag] = { trades: 0, wins: 0, pnl: 0, risk: 0 }
      strategyMap[r.strategyTag].trades++
      if (pnl > 0) strategyMap[r.strategyTag].wins++
      strategyMap[r.strategyTag].pnl += pnl
      strategyMap[r.strategyTag].risk += num(r.risk)
    }
    if (r.symbol) {
      if (!symbolMap[r.symbol]) symbolMap[r.symbol] = { trades: 0, wins: 0, pnl: 0 }
      symbolMap[r.symbol].trades++
      if (pnl > 0) symbolMap[r.symbol].wins++
      symbolMap[r.symbol].pnl += pnl
    }
    if (r.emotionTag) {
      if (!emotionMap[r.emotionTag]) emotionMap[r.emotionTag] = { trades: 0, wins: 0, pnl: 0 }
      emotionMap[r.emotionTag].trades++
      if (pnl > 0) emotionMap[r.emotionTag].wins++
      emotionMap[r.emotionTag].pnl += pnl
    }
    if (r.marketCondition) {
      if (!conditionMap[r.marketCondition]) conditionMap[r.marketCondition] = { trades: 0, wins: 0, pnl: 0 }
      conditionMap[r.marketCondition].trades++
      if (pnl > 0) conditionMap[r.marketCondition].wins++
      conditionMap[r.marketCondition].pnl += pnl
    }
    const dayStr = new Date(r.exitTime || r.closeAt || r.entryTime || r.openTime || Date.now()).toLocaleDateString('en', { weekday: 'long' })
    if (!dayMap[dayStr]) dayMap[dayStr] = { trades: 0, wins: 0, pnl: 0 }
    dayMap[dayStr].trades++
    if (pnl > 0) dayMap[dayStr].wins++
    dayMap[dayStr].pnl += pnl

    const hour = new Date(r.exitTime || r.closeAt || r.entryTime || r.openTime || Date.now()).getHours()
    if (!hourMap[hour]) hourMap[hour] = { trades: 0, wins: 0, pnl: 0 }
    hourMap[hour].trades++
    if (pnl > 0) hourMap[hour].wins++
    hourMap[hour].pnl += pnl
  }

  function bestOf(map) {
    let best = null
    let bestPnl = -Infinity
    for (const [key, val] of Object.entries(map)) {
      if (val.pnl > bestPnl) {
        bestPnl = val.pnl
        best = { key, ...val }
      }
    }
    return best
  }

  function worstOf(map) {
    let worst = null
    let worstPnl = Infinity
    for (const [key, val] of Object.entries(map)) {
      if (val.pnl < worstPnl) {
        worstPnl = val.pnl
        worst = { key, ...val }
      }
    }
    return worst
  }

  const dayCount = rows.reduce((acc, r) => {
    const d = new Date(r.exitTime || r.closeAt || r.entryTime || r.openTime || Date.now()).toISOString().slice(0, 10)
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const dayCounts = Object.values(dayCount)
  const avgTradesPerDay = dayCounts.length ? dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length : 0

  // Kelly Criterion
  const kellyRatio = avgLoss > 0 ? avgWin / avgLoss : 0
  const kellyPct = kellyRatio > 0 ? (winRate / 100) - (1 - (winRate / 100)) / kellyRatio : 0
  const kelly = Math.max(0, Number((kellyPct * 100).toFixed(2)))

  // Holding Time Performance
  const shortTrades = rows.filter(r => r.holdingMinutes > 0 && r.holdingMinutes <= 15)
  const medTrades = rows.filter(r => r.holdingMinutes > 15 && r.holdingMinutes <= 120)
  const longTrades = rows.filter(r => r.holdingMinutes > 120)

  const getHolderStats = (subset) => {
    const tCount = subset.length
    const tWins = subset.filter(r => num(r.pnl) > 0).length
    const tPnL = subset.reduce((s, r) => s + num(r.pnl), 0)
    return {
      trades: tCount,
      winRate: tCount ? Number(((tWins / tCount) * 100).toFixed(1)) : 0,
      pnl: Number(tPnL.toFixed(2))
    }
  }

  const holdingTimePerformance = {
    short: getHolderStats(shortTrades),
    medium: getHolderStats(medTrades),
    long: getHolderStats(longTrades)
  }

  // Sizing recommendation based on behavior
  const partialMetrics = { total, winRate, avgHoldingMinutes, avgTradesPerDay }
  const behaviorObj = computeBehaviorScore(rows, partialMetrics)
  const bScore = behaviorObj.behaviorScore
  let sizingRecommendation = 'Standard (1.0x lot size)'
  if (bScore >= 80) sizingRecommendation = 'Optimal (1.0x - 1.2x lot size)'
  else if (bScore < 50) sizingRecommendation = 'Risk Reduction (0.5x lot size / Cooldown)'
  else sizingRecommendation = 'Cautious (0.8x lot size)'

  return {
    total,
    wins: winCount,
    losses: lossCount,
    breakeven: breakeven.length,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLossAbs: Number(grossLossAbs.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    rr: Number(rr.toFixed(2)),
    avgR: Number(avgR.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    drawdownPct: Number(drawdownPct.toFixed(2)),
    drawdownAbs: Number(maxDrawdownAbs.toFixed(2)),
    avgRisk: Number(avgRisk.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    kelly,
    holdingTimePerformance,
    sizingRecommendation,
    avgHoldingMinutes: Number(avgHoldingMinutes.toFixed(0)),
    avgTradesPerDay: Number(avgTradesPerDay.toFixed(1)),
    bestSession: bestOf(sessionMap),
    worstSession: worstOf(sessionMap),
    bestStrategy: bestOf(strategyMap),
    worstStrategy: worstOf(strategyMap),
    bestSymbol: bestOf(symbolMap),
    worstSymbol: worstOf(symbolMap),
    bestEmotion: bestOf(emotionMap),
    worstEmotion: worstOf(emotionMap),
    bestCondition: bestOf(conditionMap),
    worstCondition: worstOf(conditionMap),
    equityCurve,
    sessionMap,
    strategyMap,
    symbolMap,
    emotionMap,
    dayMap,
    hourMap,
    conditionMap,
    rows
  }
}

function emptyMetrics() {
  return {
    total: 0, wins: 0, losses: 0, breakeven: 0,
    grossProfit: 0, grossLossAbs: 0, netProfit: 0,
    winRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
    rr: 0, avgR: 0, expectancy: 0,
    drawdownPct: 0, drawdownAbs: 0, avgRisk: 0,
    maxConsecutiveLosses: 0, avgHoldingMinutes: 0, avgTradesPerDay: 0,
    bestSession: null, worstSession: null,
    bestStrategy: null, worstStrategy: null,
    bestSymbol: null, worstSymbol: null,
    bestEmotion: null, worstEmotion: null,
    bestCondition: null, worstCondition: null,
    equityCurve: [],
    sessionMap: {}, strategyMap: {}, symbolMap: {},
    emotionMap: {}, dayMap: {}, hourMap: {}, conditionMap: {},
    rows: []
  }
}

export function computeBehaviorScore(trades, metrics) {
  const engine = new BehaviorDetectionEngine(trades)
  const result = engine.analyze()
  
  const psychEngine = new PsychologyEngine(trades, result.events)
  const psychResult = psychEngine.evaluate()
  
  const aiEngine = new AIInsightEngine(metrics || {}, result.events, psychResult.finalState.id)
  const aiInsights = aiEngine.generate()
  
  const coachEngine = new TradingCoachEngine(
    { behavior: result.behaviorScore, discipline: result.behaviorScore, risk: 100 - result.behaviorScore, execution: 100, consistency: 100, psychology: result.behaviorScore },
    result.events,
    psychResult.finalState.id
  )
  const coachingCurriculum = coachEngine.generateCurriculum()
  
  return {
    behaviorScore: result.behaviorScore,
    riskScore: 100 - result.behaviorScore,
    disciplineScore: result.behaviorScore,
    events: result.events,
    summary: result.summary,
    psychTimeline: psychResult.timeline,
    finalState: psychResult.finalState,
    aiInsights: aiInsights,
    coaching: coachingCurriculum,
    // Add legacy fields to prevent breaking older components
    revengeScore: 0,
    fomoScore: 0,
    overtradeScore: 0,
    sizingScore: 0,
    lateEntryScore: 0,
    holdLossScore: 0,
    messages: result.summary.slice(0, 4).map(s => `${s.icon} ${s.label} (${s.count} times, Impact: $${s.totalImpact.toFixed(2)})`)
  }
}

export function computePatterns(metrics) {
  const patterns = []
  function addPattern(groupMap, label, topN = 5) {
    const entries = Object.entries(groupMap || {})
      .map(([key, val]) => ({
        key,
        trades: val.trades,
        wins: val.wins,
        pnl: Number(val.pnl.toFixed(2)),
        winRate: val.trades ? Number(((val.wins / val.trades) * 100).toFixed(1)) : 0,
        avgPnl: val.trades ? Number((val.pnl / val.trades).toFixed(2)) : 0
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, topN)
    return { label, entries }
  }
  if (metrics.strategyMap && Object.keys(metrics.strategyMap).length) patterns.push(addPattern(metrics.strategyMap, 'By Strategy'))
  if (metrics.sessionMap && Object.keys(metrics.sessionMap).length) patterns.push(addPattern(metrics.sessionMap, 'By Session'))
  if (metrics.symbolMap && Object.keys(metrics.symbolMap).length) patterns.push(addPattern(metrics.symbolMap, 'By Symbol'))
  if (metrics.emotionMap && Object.keys(metrics.emotionMap).length) patterns.push(addPattern(metrics.emotionMap, 'By Emotion'))
  if (metrics.conditionMap && Object.keys(metrics.conditionMap).length) patterns.push(addPattern(metrics.conditionMap, 'By Market Condition'))
  if (metrics.dayMap && Object.keys(metrics.dayMap).length) patterns.push(addPattern(metrics.dayMap, 'By Day of Week'))
  return patterns
}

export function computeDailyPnL(rows) {
  const dailyMap = {}
  for (const r of rows) {
    const day = new Date(r.exitTime || r.closeAt || r.entryTime || r.openTime || Date.now()).toISOString().slice(0, 10)
    if (!dailyMap[day]) dailyMap[day] = { date: day, pnl: 0, trades: 0, wins: 0, losses: 0 }
    dailyMap[day].pnl += num(r.pnl)
    dailyMap[day].trades++
    if (num(r.pnl) > 0) dailyMap[day].wins++
    if (num(r.pnl) < 0) dailyMap[day].losses++
  }
  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))
}

export function computeDistribution(rows) {
  const ranges = [
    { key: '> +5R', min: 5, max: Infinity, count: 0 },
    { key: '+2R to +5R', min: 2, max: 5, count: 0 },
    { key: '+1R to +2R', min: 1, max: 2, count: 0 },
    { key: '0 to +1R', min: 0, max: 1, count: 0 },
    { key: '0 to -1R', min: -1, max: 0, count: 0 },
    { key: '-1R to -2R', min: -2, max: -1, count: 0 },
    { key: '< -2R', min: -Infinity, max: -2, count: 0 }
  ]
  for (const r of rows) {
    const rMult = num(r.rMultiple)
    for (const range of ranges) {
      if (rMult >= range.min && rMult < range.max) {
        range.count++
        break
      }
    }
  }
  return ranges
}

export function computeOutcome(rows) {
  const wins = rows.filter(r => num(r.pnl) > 0).length
  const losses = rows.filter(r => num(r.pnl) < 0).length
  const breakeven = rows.length - wins - losses
  return [
    { key: 'Wins', count: wins },
    { key: 'Losses', count: losses },
    { key: 'Breakeven', count: breakeven }
  ].filter(d => d.count > 0)
}

export function computeHeatmap(rows) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const matrix = {}
  for (const r of rows) {
    const d = new Date(r.exitTime || r.closeAt || r.entryTime || r.openTime || Date.now())
    const day = d.toLocaleDateString('en', { weekday: 'long' })
    const hour = d.getHours()
    const hourSlot = Math.floor(hour / 2) * 2
    const key = `${day}|${hourSlot}`
    if (!matrix[key]) matrix[key] = { pnl: 0 }
    matrix[key].pnl += num(r.pnl)
  }
  return days.slice(0, 5).map(day => {
    const hours = Array.from({ length: 12 }, (_, i) => {
      const slot = i * 2
      const val = matrix[`${day}|${slot}`]?.pnl || 0
      return val
    })
    return { day: day.slice(0, 3), hours }
  })
}

export function computePerformanceBySetup(rows) {
  const map = {}
  for (const r of rows) {
    const key = r.strategyTag || 'Other'
    if (!map[key]) map[key] = { trades: 0, wins: 0, pnl: 0 }
    map[key].trades++
    if (num(r.pnl) > 0) map[key].wins++
    map[key].pnl += num(r.pnl)
  }
  return Object.entries(map)
    .map(([key, val]) => ({
      key,
      trades: val.trades,
      wins: val.wins,
      winRate: val.trades ? Number(((val.wins / val.trades) * 100).toFixed(1)) : 0,
      pnl: Number(val.pnl.toFixed(2))
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
}

export function computeAnalyticsTable(rows) {
  if (!rows.length) return []
  const total = rows.length
  const wins = rows.filter(r => num(r.pnl) > 0)
  const losses = rows.filter(r => num(r.pnl) < 0)
  const grossProfit = rows.reduce((s, r) => s + Math.max(0, num(r.pnl)), 0)
  const grossLoss = Math.abs(rows.reduce((s, r) => s + Math.min(0, num(r.pnl)), 0))
  const avgWin = wins.length ? grossProfit / wins.length : 0
  const avgLoss = losses.length ? grossLoss / losses.length : 0
  const winRate = total ? (wins.length / total) * 100 : 0
  const pf = grossLoss > 0 ? grossProfit / grossLoss : 0
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss
  const dayCount = new Set(rows.map(r => new Date(r.exitTime || r.closeAt || r.entryTime || r.openTime || Date.now()).toISOString().slice(0, 10)))
  return [
    { label: 'Total Trades', value: total },
    { label: 'Winning Trades', value: wins.length },
    { label: 'Losing Trades', value: losses.length },
    { label: 'Win Rate', value: winRate.toFixed(1) + '%' },
    { label: 'Gross Profit', value: '$' + grossProfit.toFixed(0) },
    { label: 'Gross Loss', value: '-$' + grossLoss.toFixed(0) },
    { label: 'Net Profit', value: '$' + (grossProfit - grossLoss).toFixed(0) },
    { label: 'Profit Factor', value: pf.toFixed(2) },
    { label: 'Avg Win', value: '$' + avgWin.toFixed(0) },
    { label: 'Avg Loss', value: '-$' + avgLoss.toFixed(0) },
    { label: 'Avg R Multiple', value: rows.length ? (rows.reduce((s, r) => s + num(r.rMultiple), 0) / rows.length).toFixed(2) : '0' },
    { label: 'RR Ratio', value: rr.toFixed(2) },
    { label: 'Expectancy', value: '$' + expectancy.toFixed(0) },
    { label: 'Max Consecutive Losses', value: computeMaxConsLosses(rows) },
    { label: 'Trading Days', value: dayCount.size },
    { label: 'Avg Trades/Day', value: (total / (dayCount.size || 1)).toFixed(1) }
  ]
}

function computeMaxConsLosses(rows) {
  let max = 0, cur = 0
  for (const r of rows) {
    if (num(r.pnl) < 0) { cur++; max = Math.max(max, cur) }
    else cur = 0
  }
  return max
}
