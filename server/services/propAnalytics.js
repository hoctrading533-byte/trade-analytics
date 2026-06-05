export function calculatePropMetrics(account, trades) {
  const rules = typeof account.rules_config === 'object' && account.rules_config ? account.rules_config : {}
  const initialBalance = Number(account.initial_balance || 0)
  const currentEquity = Number(account.current_equity || account.current_balance || 0)
  const currentBalance = Number(account.current_balance || 0)

  // Rules extraction
  const dailyLossLimitPercent = Number(rules.dailyLossLimitPercent || 5)
  const maxDrawdownLimitPercent = Number(rules.maxDrawdownLimitPercent || 10)
  const profitTargetPercent = Number(rules.profitTargetPercent || 8)

  // Absolute limits based on initial balance
  const maxDailyLossAmount = (initialBalance * dailyLossLimitPercent) / 100
  const maxDrawdownAmount = (initialBalance * maxDrawdownLimitPercent) / 100
  const profitTargetAmount = (initialBalance * profitTargetPercent) / 100

  // Daily Loss calculation (Simplified: Assuming we track today's realized/floating PnL from trades)
  const todayStr = new Date().toISOString().split('T')[0]
  const todaysTrades = trades.filter(t => {
    const tradeDate = new Date(t.exit_time || t.entry_time || t.created_at).toISOString().split('T')[0]
    return tradeDate === todayStr
  })
  
  const todayRealizedPnL = todaysTrades.reduce((sum, t) => sum + Number(t.net_profit || t.pnl || 0), 0)
  const floatingPnL = currentEquity - currentBalance // Approximation
  const currentDailyPnL = todayRealizedPnL + floatingPnL

  let remainingDailyLoss = maxDailyLossAmount + currentDailyPnL
  if (remainingDailyLoss < 0) remainingDailyLoss = 0

  // Trailing Max Drawdown
  // This varies by prop firm (equity-based, balance-based, high-water mark). 
  // Simple static drawdown from initial balance:
  const currentTotalDrawdown = initialBalance - currentEquity
  let remainingMaxDrawdown = maxDrawdownAmount - currentTotalDrawdown
  if (remainingMaxDrawdown < 0) remainingMaxDrawdown = 0
  if (remainingMaxDrawdown > maxDrawdownAmount) remainingMaxDrawdown = maxDrawdownAmount

  // Consistency Index: Evaluate volume consistency
  const volumes = trades.filter(t => Number(t.volume) > 0).map(t => Number(t.volume))
  let consistencyIndex = 100
  if (volumes.length > 0) {
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    let totalDeviation = 0
    volumes.forEach(v => {
      totalDeviation += Math.abs(v - avgVolume)
    })
    const avgDeviation = totalDeviation / volumes.length
    // Higher deviation = lower consistency
    consistencyIndex = Math.max(0, 100 - (avgDeviation / avgVolume) * 100)
  }

  // Pass Rate Forecasting
  const realizedProfit = currentEquity - initialBalance
  const profitProgress = realizedProfit > 0 ? (realizedProfit / profitTargetAmount) * 100 : 0
  const winRate = trades.length > 0 ? (trades.filter(t => Number(t.net_profit || t.pnl || 0) > 0).length / trades.length) * 100 : 0
  
  // Forecast formula: Progress + WinRate factor (cap at 99%)
  let passRateForecast = (profitProgress * 0.7) + (winRate * 0.3)
  if (passRateForecast < 5) passRateForecast = 5
  if (passRateForecast >= 100 && profitProgress >= 100) passRateForecast = 100
  else if (passRateForecast > 99) passRateForecast = 99

  return {
    dailyLossLimitAmount: maxDailyLossAmount,
    maxDrawdownAmount: maxDrawdownAmount,
    profitTargetAmount: profitTargetAmount,
    currentDailyPnL,
    remainingDailyLoss,
    remainingMaxDrawdown,
    currentTotalDrawdown,
    profitProgress,
    consistencyIndex,
    passRateForecast,
    status: currentTotalDrawdown >= maxDrawdownAmount || currentDailyPnL <= -maxDailyLossAmount ? 'failed' : profitProgress >= 100 ? 'passed' : 'active'
  }
}

export function analyzeBehavior(trades) {
  const analysis = {
    revengeTrades: 0,
    timePerformance: {}, // key: hour -> { wins, losses, pnl }
    lossMistakes: {}, // key: mistake_tag -> count
    totalLosses: 0
  }

  const sortedTrades = [...trades].sort((a, b) => new Date(a.entry_time || a.created_at) - new Date(b.entry_time || b.created_at))

  let lastLossTime = null

  sortedTrades.forEach(trade => {
    const entryTime = new Date(trade.entry_time || trade.created_at)
    const pnl = Number(trade.net_profit || trade.pnl || 0)
    
    // Time Performance
    const hour = entryTime.getHours()
    if (!analysis.timePerformance[hour]) {
      analysis.timePerformance[hour] = { wins: 0, losses: 0, pnl: 0 }
    }
    analysis.timePerformance[hour].pnl += pnl
    if (pnl > 0) analysis.timePerformance[hour].wins++
    else if (pnl < 0) analysis.timePerformance[hour].losses++

    if (pnl < 0) {
      analysis.totalLosses++
      lastLossTime = entryTime
      
      // Loss Mistakes Correlation
      const mistakes = Array.isArray(trade.mistake_tags) ? trade.mistake_tags : 
                      (Array.isArray(trade.custom_tags) ? trade.custom_tags : [])
      mistakes.forEach(tag => {
        analysis.lossMistakes[tag] = (analysis.lossMistakes[tag] || 0) + 1
      })
    } else {
      // Revenge Trading check: opened trade < 15 mins after a loss
      if (lastLossTime) {
        const diffMins = (entryTime - lastLossTime) / (1000 * 60)
        if (diffMins > 0 && diffMins < 15) {
          analysis.revengeTrades++
        }
      }
    }
  })

  // Format time performance for frontend charting
  const timePerformanceArray = Object.keys(analysis.timePerformance).map(hour => ({
    hour: `${hour}:00`,
    ...analysis.timePerformance[hour]
  })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

  return {
    revengeTrades: analysis.revengeTrades,
    timePerformance: timePerformanceArray,
    lossMistakes: analysis.lossMistakes,
    totalLosses: analysis.totalLosses
  }
}
