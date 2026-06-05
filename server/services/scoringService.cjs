const { Pool } = require('pg')

function num(val) {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

async function calculateAndSaveDailyScores(pool, userId, mt5AccountId, dailyTrades, accountBalance) {
  // Dynamically import ESM modules
  const { BehaviorDetectionEngine } = await import('../../src/lib/behaviorEngine.js')

  const engine = new BehaviorDetectionEngine(dailyTrades)
  const behaviorResult = engine.analyze()

  let scorePsychology = 100
  let scoreDiscipline = 100
  let scoreExecution = 100
  let scoreRisk = 100
  let scoreConsistency = 100

  // 1. Map Behavior Engine events to Sub-Scores
  for (const ev of behaviorResult.events) {
    if (ev.type === 'REVENGE_TRADING' || ev.type === 'TILT_SESSION' || ev.type === 'FOMO_ENTRY') {
      scorePsychology -= (ev.severity * 2 * ev.confidence)
    }
    if (ev.type === 'RULE_VIOLATION_NO_SL' || ev.type === 'RISK_ESCALATION') {
      scoreDiscipline -= (ev.severity * 3 * ev.confidence)
    }
    if (ev.type === 'SPREAD_BLINDNESS' || ev.type === 'EARLY_PROFIT_TAKING' || ev.type === 'IMPULSIVE_ENTRY') {
      scoreExecution -= (ev.severity * 1.5 * ev.confidence)
    }
    if (ev.type === 'OVERCONFIDENCE' || ev.type === 'MARTINGALE_BIAS' || ev.type === 'WEEKEND_HOLD') {
      scoreRisk -= (ev.severity * 2 * ev.confidence)
    }
  }

  // 2. Calculate Risk Score Details
  for (const t of dailyTrades) {
    const risk = num(t.risk || 0)
    const entry = num(t.entryPrice || t.entry || 0)
    const vol = num(t.volume || 0)
    const riskAmount = risk > 0 && entry > 0 ? (risk / (entry * vol)) * 100 : 0
    // Simplified risk check, assume riskAmount is rough estimate of risk %
    if (riskAmount > 2) scoreRisk -= 10
  }

  // Calculate Daily Drawdown roughly (just peak to trough of the day)
  let peak = accountBalance
  let current = accountBalance
  let maxDd = 0
  for (const t of dailyTrades) {
    current += num(t.profit || t.pnl || 0)
    if (current > peak) peak = current
    const dd = peak > 0 ? ((peak - current) / peak) * 100 : 0
    if (dd > maxDd) maxDd = dd
  }
  if (maxDd > 5) scoreRisk -= (maxDd * 5)

  // 3. Consistency Score
  if (dailyTrades.length >= 3) {
    const pnls = dailyTrades.map(t => num(t.profit || t.pnl || 0))
    const mean = pnls.reduce((a,b)=>a+b,0) / pnls.length
    const sqDiffs = pnls.map(p => Math.pow(p - mean, 2))
    const std = Math.sqrt(sqDiffs.reduce((a,b)=>a+b,0) / pnls.length)
    if (std === 0) {
      scoreConsistency = mean > 0 ? 100 : 0
    } else {
      const sharpe = mean / std
      // Map sharpe roughly [-1 to 3] -> [0 to 100]
      scoreConsistency = ((sharpe + 1) / 4) * 100
    }
  } else {
    scoreConsistency = 50 // Neutral
  }

  // Normalize scores
  scorePsychology = Math.max(0, Math.min(100, scorePsychology))
  scoreDiscipline = Math.max(0, Math.min(100, scoreDiscipline))
  scoreExecution = Math.max(0, Math.min(100, scoreExecution))
  scoreRisk = Math.max(0, Math.min(100, scoreRisk))
  scoreConsistency = Math.max(0, Math.min(100, scoreConsistency))

  // Global Behavior Score
  const scoreBehavior = (scorePsychology * 0.40) + (scoreDiscipline * 0.20) + (scoreRisk * 0.20) + (scoreExecution * 0.10) + (scoreConsistency * 0.10)

  const recordDate = new Date().toISOString().split('T')[0]
  
  // Persist to Database
  try {
    await pool.query(
      `INSERT INTO user_daily_scores 
        (user_id, mt5_account_id, record_date, score_behavior, score_discipline, score_psychology, score_execution, score_risk, score_consistency, metrics_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (mt5_account_id, record_date) 
       DO UPDATE SET 
        score_behavior = EXCLUDED.score_behavior,
        score_discipline = EXCLUDED.score_discipline,
        score_psychology = EXCLUDED.score_psychology,
        score_execution = EXCLUDED.score_execution,
        score_risk = EXCLUDED.score_risk,
        score_consistency = EXCLUDED.score_consistency,
        metrics_snapshot = EXCLUDED.metrics_snapshot,
        created_at = NOW()`,
      [
        userId, mt5AccountId, recordDate, 
        scoreBehavior, scoreDiscipline, scorePsychology, scoreExecution, scoreRisk, scoreConsistency,
        JSON.stringify(behaviorResult.summary)
      ]
    )
  } catch (err) {
    console.error(`[ScoringEngine] Failed to save scores for account ${mt5AccountId}:`, err)
  }

  return { scoreBehavior, scoreDiscipline, scorePsychology, scoreExecution, scoreRisk, scoreConsistency }
}

module.exports = { calculateAndSaveDailyScores }
