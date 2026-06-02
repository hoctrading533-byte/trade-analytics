function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, number(value)))
}

function dateKey(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(number(value) * factor) / factor
}

function seededRandom(seed) {
  let state = Math.max(1, Math.floor(Math.abs(number(seed, 1)))) % 2147483647
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

export function calculateTargetProgress({ challenge, account }) {
  const start = number(challenge.startBalance || challenge.accountSize)
  const currentBalance = number(account.currentBalance || account.balance)
  const target = Math.max(1, number(challenge.profitTargetAmount))
  const profit = currentBalance - start
  return {
    profit,
    target,
    percent: clamp((profit / target) * 100, 0, 200),
    remaining: Math.max(0, target - profit)
  }
}

export function calculateDailyLoss({ challenge, account, todaySnapshot }) {
  const currentEquity = number(account.currentEquity || account.equity)
  const startBalance = number(todaySnapshot?.startBalance, challenge.startBalance)
  const startEquity = number(todaySnapshot?.startEquity, startBalance)
  const initialBalance = number(challenge.startBalance || challenge.accountSize)
  const mode = challenge.dailyLossCalculation || 'start_of_day_balance'
  let reference = startBalance
  if (mode === 'start_of_day_equity' || mode === 'equity_based') reference = startEquity
  if (mode === 'initial_balance') reference = initialBalance

  // Prop firms measure daily loss against a configured reference point.
  const used = Math.max(0, reference - currentEquity)
  const limit = Math.max(1, number(challenge.dailyLossLimitAmount))
  const floor = reference - limit
  const remaining = currentEquity - floor
  return {
    mode,
    reference,
    floor,
    used,
    remaining,
    limit,
    usedPercent: clamp((used / limit) * 100, 0, 200),
    violated: currentEquity <= floor
  }
}

export function calculateMaxDrawdown({ challenge, account, dailySnapshots = [] }) {
  const currentEquity = number(account.currentEquity || account.equity)
  const start = number(challenge.startBalance || challenge.accountSize)
  const limit = Math.max(1, number(challenge.maxLossLimitAmount))
  const type = challenge.drawdownType || 'static'
  const highestEquity = Math.max(start, ...dailySnapshots.map((row) => number(row.highEquity || row.endEquity)))
  const highestEndBalance = Math.max(start, ...dailySnapshots.map((row) => number(row.endBalance)))
  let floor = start - limit

  if (type === 'trailing' || type === 'intraday_trailing') floor = highestEquity - limit
  if (type === 'eod_trailing') floor = highestEndBalance - limit

  const remaining = currentEquity - floor
  const used = clamp(limit - remaining, 0, limit * 2)
  return {
    type,
    floor,
    limit,
    highestEquity,
    highestEndBalance,
    used,
    remaining,
    usedPercent: clamp((used / limit) * 100, 0, 200),
    violated: currentEquity <= floor
  }
}

export function calculateOpenPositionRisk(position, meta = {}) {
  const volume = number(position.volume)
  const entry = number(position.openPrice)
  const sl = number(position.sl)
  const current = number(position.currentPrice)
  const point = Math.max(Number.EPSILON, number(meta.point, 0.0001))
  const pipValue = number(meta.pipValuePerLot, 10)
  const hasStopLoss = sl > 0
  const distancePoints = hasStopLoss ? Math.abs(entry - sl) / point : 0
  const riskToSlAmount = hasStopLoss ? distancePoints * pipValue * volume : 0
  const floating = number(position.profit)
  const side = position.type === 'SELL' ? 'SELL' : 'BUY'
  const adverseDistance = side === 'BUY' ? Math.max(0, entry - current) : Math.max(0, current - entry)
  const adversePoints = adverseDistance / point

  return {
    ...position,
    side,
    hasStopLoss,
    riskToSlAmount,
    adversePoints,
    riskToSlPercent: 0,
    floatingProfit: floating
  }
}

export function getRiskMode({ dailyLoss, maxDrawdown, lossStreak = 0 }) {
  if (dailyLoss.usedPercent >= 85 || maxDrawdown.usedPercent >= 90) return 'LOCKDOWN'
  if (dailyLoss.usedPercent >= 70 || maxDrawdown.usedPercent >= 75) return 'DANGER'
  if (dailyLoss.usedPercent >= 50 || lossStreak >= 2) return 'CAUTION'
  return 'SAFE'
}

export function evaluateTradingWindow({ challenge, now = new Date() }) {
  const config = challenge.allowedTradingHours || {}
  const enabled = config.enabled !== false && challenge.allowedTradingHoursEnabled !== false
  const startHour = number(config.startHour ?? challenge.allowedStartHour, 7)
  const endHour = number(config.endHour ?? challenge.allowedEndHour, 22)
  const currentHour = now.getHours() + now.getMinutes() / 60
  const allowed = !enabled || (startHour <= endHour ? currentHour >= startHour && currentHour < endHour : currentHour >= startHour || currentHour < endHour)

  return {
    enabled,
    allowed,
    startHour,
    endHour,
    currentHour: round(currentHour, 2),
    label: enabled ? `${String(Math.floor(startHour)).padStart(2, '0')}:00-${String(Math.floor(endHour)).padStart(2, '0')}:00` : 'Any time',
    message: allowed ? 'Trading window is open.' : 'Trading window is closed for the current plan.'
  }
}

export function evaluateConsistencyRule({ challenge, closedTrades = [], targetProgress }) {
  const enabled = Boolean(challenge.consistencyRuleEnabled)
  const limitPercent = number(challenge.consistencyMaxDayProfitPercent, 35)
  const byDay = new Map()
  for (const trade of closedTrades) {
    const key = dateKey(trade.exitTime || trade.closeTime || trade.timeline || trade.entryTime)
    byDay.set(key, (byDay.get(key) || 0) + number(trade.netProfit ?? trade.profit))
  }

  const dailyProfits = [...byDay.entries()]
    .map(([day, pnl]) => ({ day, pnl: round(pnl) }))
    .sort((a, b) => b.pnl - a.pnl)
  const bestDay = dailyProfits[0] || { day: '', pnl: 0 }
  const totalPositivePnl = dailyProfits.filter((row) => row.pnl > 0).reduce((sum, row) => sum + row.pnl, 0)
  const contributionPercent = totalPositivePnl > 0 ? (Math.max(0, bestDay.pnl) / totalPositivePnl) * 100 : 0
  const nearLimit = enabled && contributionPercent >= limitPercent * 0.85
  const violated = enabled && contributionPercent > limitPercent && targetProgress.percent >= 100

  return {
    enabled,
    limitPercent,
    bestDay,
    totalPositivePnl: round(totalPositivePnl),
    contributionPercent: round(contributionPercent),
    nearLimit,
    violated,
    status: !enabled ? 'OFF' : violated ? 'VIOLATION' : nearLimit ? 'WATCH' : 'OK'
  }
}

function calculateMaxDrawdownAccountPercent({ challenge, maxDrawdown }) {
  const start = Math.max(1, number(challenge.startBalance || challenge.accountSize))
  return (number(maxDrawdown.used) / start) * 100
}

function countTradesToday(closedTrades = []) {
  const today = dateKey(new Date())
  return closedTrades.filter((trade) => dateKey(trade.exitTime || trade.closeTime || trade.timeline || trade.entryTime) === today).length
}

export function buildRuleAlerts({
  challenge,
  dailyLoss,
  maxDrawdown,
  targetProgress,
  openPositionRisks,
  tradingWindow,
  consistencyRule
}) {
  const alerts = []
  function push(type, severity, title, message, recommendedAction, evidence = {}) {
    alerts.push({
      id: `${type}-${alerts.length + 1}`,
      type,
      severity,
      title,
      problem: title,
      message,
      risk: message,
      recommendedAction,
      action: recommendedAction,
      evidence,
      timestamp: new Date().toISOString(),
      isAcknowledged: false
    })
  }

  if (dailyLoss.usedPercent >= 95) {
    push(
      'DAILY_DD_WARNING',
      'critical',
      'Emergency daily loss threshold',
      'Daily drawdown usage is above 95%. New trades can push the account into violation.',
      'Stop trading for today and review open position risk.',
      { usedPercent: dailyLoss.usedPercent, remaining: dailyLoss.remaining }
    )
  } else if (dailyLoss.usedPercent >= 85) {
    push('LOCKDOWN_MODE', 'critical', 'Lockdown mode recommended', 'Daily drawdown usage crossed 85%.', 'Do not open new trades until next session.', {
      usedPercent: dailyLoss.usedPercent
    })
  } else if (dailyLoss.usedPercent >= 70) {
    push('DAILY_DD_DANGER', 'danger', 'Daily drawdown danger', 'Daily loss usage is above 70%.', 'Reduce risk to 0.25% or stop for the session.', {
      usedPercent: dailyLoss.usedPercent
    })
  } else if (dailyLoss.usedPercent >= 50) {
    push('DAILY_DD_WARNING', 'warning', 'Daily drawdown warning', 'Half of the daily loss buffer is used.', 'Lower position size and require A+ setups only.', {
      usedPercent: dailyLoss.usedPercent
    })
  }

  if (maxDrawdown.usedPercent >= 90) {
    push('MAX_DD_WARNING', 'critical', 'Max drawdown critical', 'Max drawdown buffer is nearly exhausted.', 'Switch to capital preservation mode.', {
      usedPercent: maxDrawdown.usedPercent
    })
  } else if (maxDrawdown.usedPercent >= 80) {
    push('MAX_DD_WARNING', 'danger', 'Max drawdown danger', 'Max drawdown usage is above 80%.', 'Cut risk and stop correlated exposure.', {
      usedPercent: maxDrawdown.usedPercent
    })
  }

  const accountDdPercent = calculateMaxDrawdownAccountPercent({ challenge, maxDrawdown })
  if (accountDdPercent >= 6 && accountDdPercent < 7.1) {
    push(
      'PROP_DD_DANGER_ZONE',
      'danger',
      '6-7% drawdown danger zone',
      'The account is entering the drawdown zone where many prop challenges become hard to recover.',
      'Stop adding risk and switch to capital preservation until buffer is rebuilt.',
      { accountDrawdownPercent: round(accountDdPercent), maxDdRemaining: maxDrawdown.remaining }
    )
  }

  if (tradingWindow?.enabled && !tradingWindow.allowed) {
    push(
      'OUTSIDE_TRADING_HOURS',
      'warning',
      'Outside allowed trading hours',
      'The current time is outside the trading window configured for this challenge.',
      'Wait for the planned trading window before taking a new trade.',
      { tradingWindow: tradingWindow.label, currentHour: tradingWindow.currentHour }
    )
  }

  if (consistencyRule?.violated || consistencyRule?.nearLimit) {
    push(
      'CONSISTENCY_RISK',
      consistencyRule.violated ? 'critical' : 'warning',
      'Consistency rule risk',
      'One day is contributing too much of the challenge profit.',
      'Reduce risk and avoid forcing a big single-day profit spike.',
      {
        bestDay: consistencyRule.bestDay,
        contributionPercent: consistencyRule.contributionPercent,
        limitPercent: consistencyRule.limitPercent
      }
    )
  }

  for (const position of openPositionRisks) {
    if (!position.hasStopLoss) {
      push('NO_STOP_LOSS', 'critical', 'Position without stop loss', `${position.symbol} has no stop loss. Risk cannot be controlled precisely.`, 'Add a stop loss or close/reduce the position.', {
        ticket: position.ticket,
        symbol: position.symbol
      })
    }
    if (position.riskToSlAmount > dailyLoss.remaining * 0.75) {
      push('OVERSIZING', 'danger', 'Open risk is too large', `${position.symbol} can consume most of the remaining daily drawdown if SL is hit.`, 'Reduce the position or move to a valid planned risk.', {
        ticket: position.ticket,
        riskToSlAmount: position.riskToSlAmount,
        dailyRemaining: dailyLoss.remaining
      })
    }
  }

  if (targetProgress.percent >= 90 && challenge.minTradingDays > 0) {
    push('PROFIT_TARGET_NEAR', 'info', 'Profit target is near', 'The challenge is close to target. Protect the account and verify min trading days.', 'Avoid oversized trades and preserve buffer.', {
      targetProgress: targetProgress.percent
    })
  }

  return alerts
}

export function calculateSurvivalScore({ dailyLoss, maxDrawdown, behaviorScore, ruleComplianceScore, targetProgress }) {
  const ddBufferScore = clamp(100 - dailyLoss.usedPercent)
  const maxBufferScore = clamp(100 - maxDrawdown.usedPercent)
  const riskConsistency = (ddBufferScore + maxBufferScore) / 2
  const profitScore = clamp(targetProgress.percent)
  return Math.round(
    ddBufferScore * 0.3 +
      riskConsistency * 0.25 +
      clamp(behaviorScore) * 0.2 +
      clamp(ruleComplianceScore) * 0.15 +
      profitScore * 0.1
  )
}

export function estimatePassProbability({
  targetProgress,
  dailyLoss,
  maxDrawdown,
  expectancy,
  ruleComplianceScore,
  challenge,
  account,
  dailySnapshots = [],
  closedTrades = []
}) {
  const startBalance = number(challenge?.startBalance || challenge?.accountSize || account?.initialBalance || account?.currentBalance)
  const currentBalance = number(account?.currentBalance || account?.balance, startBalance)
  const targetAmount = Math.max(1, number(challenge?.profitTargetAmount, 1))
  const maxLossLimit = Math.max(1, number(challenge?.maxLossLimitAmount, 1))
  const dailyLossLimit = Math.max(1, number(challenge?.dailyLossLimitAmount, 1))
  const simulationDays = Math.max(8, Math.min(30, number(challenge?.maxTradingDays, 20)))
  const sampleReturns = dailySnapshots.length
    ? dailySnapshots.map((row) => number(row.closedPnl ?? row.netProfit ?? row.endBalance - row.startBalance, 0))
    : closedTrades.map((trade) => number(trade.netProfit ?? trade.profit, 0))
  const samples = sampleReturns.filter((value) => Number.isFinite(value) && Math.abs(value) > 0)
  const fallback = samples.length ? samples : [number(expectancy, 0), -dailyLossLimit * 0.18, dailyLossLimit * 0.14, -dailyLossLimit * 0.08]
  const rng = seededRandom(currentBalance + targetAmount + fallback.length * 97)
  const paths = 420
  let pass = 0
  let fail = 0
  let endingProfit = 0

  for (let i = 0; i < paths; i += 1) {
    let balance = currentBalance
    let highest = Math.max(startBalance, currentBalance)
    let failed = false
    let passed = false

    for (let day = 0; day < simulationDays; day += 1) {
      const raw = fallback[Math.floor(rng() * fallback.length)]
      const noise = 0.72 + rng() * 0.62
      const projectedDayPnl = raw * noise
      balance += projectedDayPnl
      highest = Math.max(highest, balance)

      const staticFloor = startBalance - maxLossLimit
      const trailingFloor = highest - maxLossLimit
      const floor = challenge?.drawdownType === 'trailing' || challenge?.drawdownType === 'intraday_trailing' ? trailingFloor : staticFloor
      if (projectedDayPnl <= -dailyLossLimit || balance <= floor) {
        failed = true
        break
      }
      if (balance - startBalance >= targetAmount) {
        passed = true
        break
      }
    }

    endingProfit += balance - startBalance
    if (passed) pass += 1
    else if (failed) fail += 1
  }

  const monteCarloScore = (pass / paths) * 100
  const baseScore =
    clamp(targetProgress.percent) * 0.24 +
    clamp(100 - dailyLoss.usedPercent) * 0.2 +
    clamp(100 - maxDrawdown.usedPercent) * 0.2 +
    clamp(50 + number(expectancy) / 20, 0, 100) * 0.1 +
    clamp(ruleComplianceScore) * 0.08 +
    monteCarloScore * 0.18
  const band = baseScore >= 72 ? 'High' : baseScore >= 45 ? 'Medium' : 'Low'
  return {
    score: Math.round(baseScore),
    band,
    monteCarloScore: Math.round(monteCarloScore),
    paths,
    failRate: Math.round((fail / paths) * 100),
    averageProjectedProfit: round(endingProfit / paths),
    disclaimer: 'This is a risk-management estimate, not financial advice.'
  }
}

export function buildCommandCenter({
  challenge,
  account,
  dailyLoss,
  maxDrawdown,
  targetProgress,
  openPositionRisks,
  lossStreak,
  riskMode,
  tradingWindow,
  consistencyRule,
  passProbability,
  closedTrades = []
}) {
  const tradesToday = countTradesToday(closedTrades)
  const maxTrades = number(challenge.maxTradesPerDay, 4)
  const noSlPositions = openPositionRisks.filter((position) => !position.hasStopLoss)
  const accountDdPercent = calculateMaxDrawdownAccountPercent({ challenge, maxDrawdown })
  const blockers = []
  const cautions = []

  if (riskMode === 'LOCKDOWN') blockers.push('Lockdown risk mode is active.')
  if (dailyLoss.usedPercent >= 70) blockers.push(`Daily drawdown is ${Math.round(dailyLoss.usedPercent)}% used.`)
  if (maxDrawdown.usedPercent >= 75) blockers.push(`Max drawdown buffer is ${Math.round(maxDrawdown.usedPercent)}% used.`)
  if (noSlPositions.length) blockers.push(`${noSlPositions.length} open position has no stop loss.`)
  if (tradingWindow?.enabled && !tradingWindow.allowed) blockers.push('Current time is outside the allowed trading window.')
  if (tradesToday > maxTrades) blockers.push(`Trades today exceeded the plan (${tradesToday}/${maxTrades}).`)
  if (consistencyRule?.violated) blockers.push('Consistency rule is violated.')

  if (lossStreak >= 2) cautions.push(`${lossStreak} consecutive losses detected.`)
  if (dailyLoss.usedPercent >= 50 && dailyLoss.usedPercent < 70) cautions.push('Daily drawdown is above 50%.')
  if (accountDdPercent >= 6) cautions.push('Account drawdown is near the dangerous 6-7% challenge zone.')
  if (consistencyRule?.nearLimit && !consistencyRule.violated) cautions.push('Consistency rule is near its limit.')

  const shouldTradeNow = blockers.length
    ? {
        answer: 'NO',
        tone: 'danger',
        title: 'Should I trade now?',
        summary: 'Do not open new trades until the active blockers are handled.',
        reasons: blockers,
        action: 'Protect the challenge first, then reassess after the next valid session.'
      }
    : cautions.length
      ? {
          answer: 'ONLY A+',
          tone: 'warning',
          title: 'Should I trade now?',
          summary: 'Trading is allowed only with reduced risk and a complete plan.',
          reasons: cautions,
          action: 'Use half risk, require SL, and stop after one invalid setup.'
        }
      : {
          answer: 'YES',
          tone: 'success',
          title: 'Should I trade now?',
          summary: 'Risk buffers are healthy and no active blocker is detected.',
          reasons: ['Daily DD, max DD, trading window, and open risk are inside plan.'],
          action: 'Take only planned setups and keep normal risk.'
        }

  const killers = [
    {
      title: 'Daily DD shock',
      severity: dailyLoss.usedPercent >= 70 ? 'danger' : dailyLoss.usedPercent >= 50 ? 'warning' : 'info',
      evidence: `${Math.round(dailyLoss.usedPercent)}% daily DD used, ${round(dailyLoss.remaining)} remaining.`,
      action: dailyLoss.usedPercent >= 70 ? 'Stop or cut risk to minimum.' : 'Keep risk below the daily stop plan.'
    },
    {
      title: 'Max DD compression',
      severity: maxDrawdown.usedPercent >= 75 || accountDdPercent >= 6 ? 'danger' : 'info',
      evidence: `${Math.round(maxDrawdown.usedPercent)}% max DD used, account DD ${round(accountDdPercent)}%.`,
      action: accountDdPercent >= 6 ? 'Pause new risk until the buffer improves.' : 'Avoid correlated exposure.'
    },
    {
      title: 'Unprotected open risk',
      severity: noSlPositions.length ? 'critical' : 'info',
      evidence: noSlPositions.length ? `${noSlPositions.map((position) => position.symbol).join(', ')} has no SL.` : 'All open positions have SL.',
      action: noSlPositions.length ? 'Add SL or reduce exposure immediately.' : 'Keep SL in place.'
    },
    {
      title: 'Behavior spiral',
      severity: lossStreak >= 2 || tradesToday > maxTrades ? 'warning' : 'info',
      evidence: `${lossStreak} loss streak, ${tradesToday}/${maxTrades} trades today.`,
      action: lossStreak >= 2 ? 'Take a 30 minute reset before any new trade.' : 'Stay inside trade count plan.'
    }
  ]

  const oneBestAction = noSlPositions.length
    ? {
        tone: 'critical',
        title: 'Protect open risk now',
        action: 'Add a valid SL or reduce/close the unprotected position.',
        why: 'A no-SL position can break daily or max drawdown faster than the Guardian can forecast.'
      }
    : riskMode === 'LOCKDOWN'
      ? {
          tone: 'critical',
          title: 'Stop trading plan',
          action: 'Stop opening new trades for today and complete post-session review.',
          why: 'Drawdown usage is inside the lockdown threshold.'
        }
      : dailyLoss.usedPercent >= 70
        ? {
            tone: 'danger',
            title: 'Defend daily drawdown',
            action: 'Use capital preservation mode for the rest of the day.',
            why: 'One normal loss can push the challenge toward violation.'
          }
        : lossStreak >= 2
          ? {
              tone: 'warning',
              title: 'Break the revenge loop',
              action: 'Take a 30 minute break and return only with 0.25% risk.',
              why: 'Loss streak plus fast re-entry is the main behavior risk today.'
            }
          : {
              tone: 'success',
              title: 'Execute only the planned setup',
              action: 'Keep risk inside plan and journal the trade before entry.',
              why: 'The challenge is healthy enough for selective execution.'
            }

  const preservationEnabled =
    riskMode === 'LOCKDOWN' ||
    dailyLoss.usedPercent >= 70 ||
    maxDrawdown.usedPercent >= 75 ||
    targetProgress.percent >= 75 ||
    challenge.phase === 'funded'

  const capitalPreservation = {
    enabled: preservationEnabled,
    tone: preservationEnabled ? 'danger' : 'success',
    title: preservationEnabled ? 'Capital Preservation Mode' : 'Normal Risk Mode',
    reason: preservationEnabled
      ? 'The account should prioritize protecting drawdown buffer over pushing profit.'
      : 'Risk buffers are still available, but every trade must stay inside plan.',
    plan: preservationEnabled
      ? ['Reduce planned risk by 50%.', 'Max 1-2 trades today.', 'Avoid high-impact news and correlated positions.', 'Stop after first rule break.']
      : ['Normal planned risk only.', 'Trade only A/A+ setup.', 'Keep SL active.', 'Stop after max trades plan.']
  }

  const accountHealthScore = clamp(
    100 -
      dailyLoss.usedPercent * 0.34 -
      maxDrawdown.usedPercent * 0.34 -
      noSlPositions.length * 16 -
      Math.max(0, tradesToday - maxTrades) * 8 -
      (tradingWindow?.allowed === false ? 8 : 0)
  )

  return {
    accountHealth: {
      score: Math.round(accountHealthScore),
      label: accountHealthScore >= 75 ? 'Healthy' : accountHealthScore >= 55 ? 'Watch' : accountHealthScore >= 35 ? 'Fragile' : 'Critical',
      tone: accountHealthScore >= 75 ? 'success' : accountHealthScore >= 55 ? 'warning' : 'danger',
      summary: `${round(number(account.currentEquity || account.equity))} equity, ${round(dailyLoss.remaining)} daily DD buffer.`
    },
    todayAction: oneBestAction.action,
    shouldTradeNow,
    challengeKillers: killers,
    oneBestAction,
    capitalPreservation,
    tradingWindow,
    consistencyRule,
    passProbability
  }
}

export function evaluatePropFirmRules({ challenge, account, dailySnapshots, openPositions, symbolMeta = {}, closedTrades = [] }) {
  const today = dailySnapshots[dailySnapshots.length - 1] || null
  const targetProgress = calculateTargetProgress({ challenge, account })
  const dailyLoss = calculateDailyLoss({ challenge, account, todaySnapshot: today })
  const maxDrawdown = calculateMaxDrawdown({ challenge, account, dailySnapshots })
  const openPositionRisks = openPositions.map((position) => {
    const risk = calculateOpenPositionRisk(position, symbolMeta[position.symbol] || {})
    return {
      ...risk,
      riskToSlPercent: account.currentEquity > 0 ? (risk.riskToSlAmount / account.currentEquity) * 100 : 0
    }
  })
  const sorted = closedTrades.slice().sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime))
  let lossStreak = 0
  for (const trade of sorted) {
    if (number(trade.netProfit) < 0) lossStreak += 1
    else break
  }
  const riskMode = getRiskMode({ dailyLoss, maxDrawdown, lossStreak })
  const tradingWindow = evaluateTradingWindow({ challenge })
  const consistencyRule = evaluateConsistencyRule({ challenge, closedTrades: accountTradesSafe(closedTrades), targetProgress })
  const ruleAlerts = buildRuleAlerts({
    challenge,
    dailyLoss,
    maxDrawdown,
    targetProgress,
    openPositionRisks,
    tradingWindow,
    consistencyRule
  })
  const violated = dailyLoss.violated || maxDrawdown.violated
  const ruleComplianceScore = clamp(
    100 -
      dailyLoss.usedPercent * 0.45 -
      maxDrawdown.usedPercent * 0.35 -
      (violated ? 40 : 0) -
      (tradingWindow.allowed ? 0 : 8) -
      (consistencyRule.violated ? 20 : consistencyRule.nearLimit ? 8 : 0)
  )
  const expectancy = sorted.length ? sorted.reduce((sum, trade) => sum + number(trade.netProfit), 0) / sorted.length : 0
  const survivalScore = calculateSurvivalScore({
    dailyLoss,
    maxDrawdown,
    behaviorScore: 72,
    ruleComplianceScore,
    targetProgress
  })
  const passProbability = estimatePassProbability({
    targetProgress,
    dailyLoss,
    maxDrawdown,
    expectancy,
    ruleComplianceScore,
    challenge,
    account,
    dailySnapshots,
    closedTrades
  })
  const commandCenter = buildCommandCenter({
    challenge,
    account,
    dailyLoss,
    maxDrawdown,
    targetProgress,
    openPositionRisks,
    lossStreak,
    riskMode,
    tradingWindow,
    consistencyRule,
    passProbability,
    closedTrades
  })

  return {
    targetProgress,
    dailyLoss,
    maxDrawdown,
    openPositionRisks,
    riskMode,
    lossStreak,
    ruleAlerts,
    violated,
    ruleStatus: violated ? 'VIOLATION' : riskMode,
    ruleComplianceScore: Math.round(ruleComplianceScore),
    expectancy,
    survivalScore,
    passProbability,
    tradingWindow,
    consistencyRule,
    commandCenter
  }
}

function accountTradesSafe(closedTrades) {
  return Array.isArray(closedTrades) ? closedTrades : []
}
