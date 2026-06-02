function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, number(value)))
}

function minutesBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000
}

function severityFromScore(score) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'danger'
  if (score >= 35) return 'warning'
  return 'info'
}

function buildIssue(type, score, title, evidence, recommendation, suggestedTask) {
  return {
    issueType: type,
    score: Math.round(clamp(score)),
    severity: severityFromScore(score),
    title,
    evidence,
    recommendation,
    suggestedTask
  }
}

export function detectRevengeTrading({ closedTrades, openPositions }) {
  const sorted = closedTrades.slice().sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime))
  let lossStreak = 0
  for (const trade of sorted) {
    if (number(trade.netProfit) < 0) lossStreak += 1
    else break
  }
  const lastLoss = sorted.find((trade) => number(trade.netProfit) < 0)
  const avgLot =
    sorted.slice(0, 20).reduce((sum, trade) => sum + number(trade.volume), 0) / Math.max(1, Math.min(20, sorted.length))
  const currentLot = openPositions.reduce((sum, position) => sum + number(position.volume), 0)
  const lotIncrease = avgLot > 0 ? currentLot / avgLot : 1
  const newestOpen = openPositions.slice().sort((a, b) => new Date(b.timeOpen) - new Date(a.timeOpen))[0]
  const reentryMinutes = lastLoss && newestOpen ? minutesBetween(lastLoss.exitTime, newestOpen.timeOpen) : 999
  const negativeEmotion = sorted[0]?.emotionBefore === 'Revenge' || sorted[0]?.emotionAfter === 'Angry'
  const score =
    (lossStreak >= 2 ? 30 : lossStreak * 10) +
    clamp((lotIncrease - 1) * 60, 0, 30) +
    (reentryMinutes < 10 ? 25 : reentryMinutes < 30 ? 12 : 0) +
    (negativeEmotion ? 15 : 0)

  return buildIssue(
    'REVENGE_TRADING',
    score,
    'Revenge trading risk',
    {
      lossStreak,
      avgLot: Number(avgLot.toFixed(2)),
      currentLot: Number(currentLot.toFixed(2)),
      lotIncrease: Number(lotIncrease.toFixed(2)),
      reentryMinutes: Math.round(reentryMinutes)
    },
    'Pause for 30-45 minutes and reduce next trade risk to 0.25%.',
    'Take a 30 minute break after the loss streak.'
  )
}

export function detectOvertrading({ closedTrades, challenge }) {
  const today = new Date().toISOString().slice(0, 10)
  const tradesToday = closedTrades.filter((trade) => String(trade.exitTime || '').slice(0, 10) === today).length
  const byDay = new Map()
  for (const trade of closedTrades) {
    const key = String(trade.exitTime || '').slice(0, 10)
    byDay.set(key, (byDay.get(key) || 0) + 1)
  }
  const avgTradesPerDay = [...byDay.values()].reduce((sum, value) => sum + value, 0) / Math.max(1, byDay.size)
  const maxTrades = number(challenge.maxTradesPerDay, 4)
  const score =
    (tradesToday > maxTrades ? 45 : 0) +
    (tradesToday > avgTradesPerDay * 1.5 ? 35 : 0) +
    (tradesToday >= 4 ? 15 : 0)

  return buildIssue(
    'OVERTRADING',
    score,
    'Overtrading risk',
    { tradesToday, avgTradesPerDay: Number(avgTradesPerDay.toFixed(2)), maxTrades },
    'Stop after the next invalid setup. The account does not need more volume today.',
    'Set max trades today and stop after the limit.'
  )
}

export function detectFomo({ closedTrades }) {
  const recent = closedTrades.slice(0, 8)
  const fomoTrades = recent.filter((trade) => {
    const noSetup = !String(trade.strategyTag || '').trim()
    const tag = String(trade.emotionBefore || '').toLowerCase().includes('fomo')
    const mistake = (trade.mistakeTags || []).includes('late_entry')
    return noSetup || tag || mistake
  })
  const score = recent.length ? (fomoTrades.length / recent.length) * 100 : 0
  return buildIssue(
    'FOMO',
    score,
    'FOMO entries',
    { fomoTrades: fomoTrades.length, sampleSize: recent.length },
    'Require setup tag and planned entry zone before any new order.',
    'Write the setup name before entering the next trade.'
  )
}

export function detectOversizing({ closedTrades, openPositions, challenge }) {
  const avgLot =
    closedTrades.slice(0, 20).reduce((sum, trade) => sum + number(trade.volume), 0) /
    Math.max(1, Math.min(20, closedTrades.length))
  const currentLargestLot = Math.max(0, ...openPositions.map((position) => number(position.volume)))
  const plannedRisk = number(challenge.personalRiskPercent, 0.5)
  const recentRisk = Math.max(0, ...closedTrades.slice(0, 5).map((trade) => number(trade.riskPercent)))
  const score =
    (avgLot > 0 && currentLargestLot > avgLot * 1.5 ? 45 : 0) +
    (recentRisk > plannedRisk * 1.5 ? 35 : 0) +
    (closedTrades[0]?.netProfit < 0 && currentLargestLot > avgLot ? 20 : 0)
  return buildIssue(
    'OVERSIZING',
    score,
    'Oversizing risk',
    { avgLot: Number(avgLot.toFixed(2)), currentLargestLot, plannedRisk, recentRisk },
    'Cap risk to the planned percentage and reduce lot after losses.',
    'Reduce lot size before the next trade.'
  )
}

export function detectHoldingLoser({ openPositions, evaluation }) {
  const risky = openPositions.filter((position) => number(position.profit) < -number(evaluation.dailyLoss.remaining) * 0.25)
  const score = risky.length ? 65 : 12
  return buildIssue(
    'HOLDING_LOSER',
    score,
    'Holding loser too long',
    { riskyPositions: risky.map((position) => ({ ticket: position.ticket, symbol: position.symbol, profit: position.profit })) },
    'Do not widen SL. If thesis is invalid, reduce or close.',
    'Review open position risk now.'
  )
}

export function detectCuttingWinners({ closedTrades }) {
  const sample = closedTrades.slice(0, 20)
  const early = sample.filter((trade) => number(trade.netProfit) > 0 && number(trade.rMultiple) < 0.5 && number(trade.mfe) > number(trade.netProfit) * 2)
  const score = sample.length ? (early.length / sample.length) * 100 : 0
  return buildIssue(
    'CUTTING_WINNER',
    score,
    'Cutting winners early',
    { earlyExits: early.length, sampleSize: sample.length },
    'Use partials or a fixed management rule instead of closing winners too early.',
    'Review exit rules after the session.'
  )
}

export function analyzeSessionPerformance(closedTrades) {
  const groups = new Map()
  for (const trade of closedTrades) {
    const key = trade.session || 'Unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(trade)
  }
  const rows = [...groups.entries()].map(([session, trades]) => {
    const pnl = trades.reduce((sum, trade) => sum + number(trade.netProfit), 0)
    const wins = trades.filter((trade) => number(trade.netProfit) > 0).length
    return {
      session,
      pnl,
      count: trades.length,
      winRate: trades.length ? (wins / trades.length) * 100 : 0,
      expectancy: trades.length ? pnl / trades.length : 0
    }
  })
  rows.sort((a, b) => a.expectancy - b.expectancy)
  return {
    worst: rows[0] || null,
    best: rows[rows.length - 1] || null,
    rows
  }
}

export function analyzeBehavior({ closedTrades, openPositions, challenge, evaluation }) {
  const issues = [
    detectRevengeTrading({ closedTrades, openPositions }),
    detectOvertrading({ closedTrades, challenge }),
    detectFomo({ closedTrades }),
    detectOversizing({ closedTrades, openPositions, challenge }),
    detectHoldingLoser({ openPositions, evaluation }),
    detectCuttingWinners({ closedTrades })
  ]
  const sessionPerformance = analyzeSessionPerformance(closedTrades)
  const badSessionScore = sessionPerformance.worst && sessionPerformance.worst.expectancy < 0 ? 55 : 15
  issues.push(
    buildIssue(
      'BAD_SESSION',
      badSessionScore,
      'Bad session window',
      sessionPerformance.worst || {},
      'Avoid the weakest session until the playbook is updated.',
      'Review session performance this week.'
    )
  )

  const aggregateRisk = issues.reduce((sum, issue) => sum + issue.score, 0) / Math.max(1, issues.length)
  const behaviorScore = Math.round(clamp(100 - aggregateRisk))
  const disciplineScore = Math.round(
    clamp(100 - issues.find((issue) => issue.issueType === 'REVENGE_TRADING').score * 0.3 - issues.find((issue) => issue.issueType === 'OVERTRADING').score * 0.25)
  )
  const riskScore = Math.round(clamp(aggregateRisk))
  const coach = buildCoachCopy({ issues, evaluation })

  return {
    issues,
    behaviorScore,
    disciplineScore,
    riskScore,
    sessionPerformance,
    coach
  }
}

export function buildCoachCopy({ issues, evaluation }) {
  const main = issues.slice().sort((a, b) => b.score - a.score)[0]
  const daily = evaluation?.dailyLoss || {}
  return {
    problem: main?.title || 'No critical behavior risk',
    evidence: main?.evidence || {},
    risk: `If the current risk continues, daily drawdown usage can rise from ${Math.round(number(daily.usedPercent))}%.`,
    action: main?.recommendation || 'Keep risk within plan and continue journaling.',
    rule: main?.suggestedTask || 'Follow the daily risk plan.',
    disclaimer: 'This is a risk management and journaling assistant, not financial advice.'
  }
}
