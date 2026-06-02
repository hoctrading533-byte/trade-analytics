function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(number(value) * factor) / factor
}

export function calculateSafeLot({
  equity,
  dailyLossRemaining,
  maxLossRemaining,
  personalRiskPercent,
  stopLossPoints,
  pipValuePerLot,
  spreadPoints = 0,
  commissionPerLot = 7
}) {
  const hasStopLoss = number(stopLossPoints) > 0
  if (!hasStopLoss) {
    return {
      hasStopLoss: false,
      shouldTakeTrade: false,
      allowedRisk: 0,
      suggestedLot: 0,
      maxSafeLot: 0,
      riskToSl: 0,
      lossIfSlHit: 0,
      remainingDailyDdAfterSl: number(dailyLossRemaining),
      warning: 'No stop loss. Risk cannot be calculated accurately.'
    }
  }

  const equityRisk = number(equity) * (number(personalRiskPercent, 0.5) / 100)
  const dailyBufferRisk = Math.max(0, number(dailyLossRemaining)) * 0.5
  const maxBufferRisk = Math.max(0, number(maxLossRemaining)) * 0.5
  const allowedRisk = Math.max(0, Math.min(equityRisk, dailyBufferRisk, maxBufferRisk))
  const estimatedLossPerLotAtSl =
    number(stopLossPoints) * number(pipValuePerLot, 10) +
    number(spreadPoints) * number(pipValuePerLot, 10) +
    number(commissionPerLot)
  const maxSafeLot = estimatedLossPerLotAtSl > 0 ? allowedRisk / estimatedLossPerLotAtSl : 0
  const suggestedLot = Math.max(0, Math.floor(maxSafeLot * 100) / 100)
  const lossIfSlHit = suggestedLot * estimatedLossPerLotAtSl
  const remainingDailyDdAfterSl = number(dailyLossRemaining) - lossIfSlHit
  const shouldTakeTrade = suggestedLot > 0 && remainingDailyDdAfterSl > number(dailyLossRemaining) * 0.35

  return {
    hasStopLoss: true,
    shouldTakeTrade,
    allowedRisk: round(allowedRisk, 2),
    suggestedLot: round(Math.max(0.01, suggestedLot), 2),
    maxSafeLot: round(maxSafeLot, 2),
    estimatedLossPerLotAtSl: round(estimatedLossPerLotAtSl, 2),
    riskToSl: round(lossIfSlHit, 2),
    lossIfSlHit: round(lossIfSlHit, 2),
    remainingDailyDdAfterSl: round(remainingDailyDdAfterSl, 2),
    warning: shouldTakeTrade ? '' : 'Trade is not recommended under the current drawdown buffer.'
  }
}
