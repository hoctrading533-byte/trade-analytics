/**
 * AI Insight Generator
 * Evaluates raw metrics, psychology states, and behaviors to generate natural language LLM-style insights.
 */

export class AIInsightEngine {
  constructor(metrics, behaviorEvents, psychState) {
    this.metrics = metrics
    this.behaviorEvents = behaviorEvents || []
    this.psychState = psychState || 'CALM'
    this.insights = []
  }

  generate() {
    this._generateDailyReview()
    this._generateWarnings()
    this._generateOpportunity()
    return this._verifyInsights()
  }

  _generateDailyReview() {
    const { total, winRate, pnl, avgR } = this.metrics
    
    let summary = `You executed ${total} trades today.`
    if (total === 0) {
      summary = `No trades taken. Good job preserving capital if no setups were present.`
    } else if (winRate > 60) {
      summary = `Excellent precision today with a ${winRate.toFixed(1)}% win rate.`
    } else if (winRate < 40) {
      summary = `Tough session today with a ${winRate.toFixed(1)}% win rate. Let's focus on execution quality.`
    } else {
      summary = `Average session today with a ${winRate.toFixed(1)}% win rate.`
    }

    let action = 'Focus on protecting your capital and stick strictly to your trading plan tomorrow.'
    if (this.behaviorEvents.some(e => e.type === 'REVENGE_TRADING')) {
      action = 'Strictly limit yourself to 1 trade per session tomorrow to prevent revenge trading.'
    } else if (this.behaviorEvents.some(e => e.type === 'HOLDING_LOSERS')) {
      action = 'Place a hard stop loss on every single trade tomorrow before entry.'
    } else if (this.psychState === 'EUPHORIC') {
      action = 'Cut your lot size in half tomorrow to prevent giving back today\'s massive gains.'
    }

    this.insights.push({
      id: 'daily_review',
      type: 'DAILY_REVIEW',
      summary: summary,
      actionable_habit: action,
      confidence_score: 1.0,
      meta: { requires_trades: 0 }
    })
  }

  _generateWarnings() {
    // Look for the most severe behavior event
    if (!this.behaviorEvents || this.behaviorEvents.length === 0) return

    // Sort by severity
    const sorted = [...this.behaviorEvents].sort((a, b) => b.severity - a.severity)
    const topBehavior = sorted[0]

    let title = 'Behavioral Warning'
    let desc = `We detected a severe emotional deviation: ${topBehavior.label}.`
    let severity = 'MEDIUM'

    if (topBehavior.severity >= 9) severity = 'HIGH'
    else if (topBehavior.severity <= 5) severity = 'LOW'

    if (topBehavior.type === 'REVENGE_TRADING') {
      title = 'Late Day Revenge Trading'
      desc = `You drastically increased your lot size immediately following a loss. This single habit destroys 80% of accounts. Stop trying to "make it back".`
    } else if (topBehavior.type === 'RULE_VIOLATION_NO_SL') {
      title = 'Naked Execution (No SL)'
      desc = `You entered trades without placing a Stop Loss. This exposes your entire account to a single catastrophic market spike.`
    } else if (topBehavior.type === 'TILT_SESSION') {
      title = 'Tilt Session Detected'
      desc = `You absorbed multiple consecutive losses in a tight time window. Your execution edge has dropped to 0. Step away from the charts immediately.`
    }

    this.insights.push({
      id: 'behavior_warning',
      type: 'WARNING',
      key_warning: {
        title: title,
        description: desc,
        severity_level: severity
      },
      confidence_score: 1.0,
      meta: { check_metric: 'behavior_count', condition: '>0' }
    })
  }

  _generateOpportunity() {
    // Find best asset or session
    const { bestSession, worstSession, bestSymbol } = this.metrics

    if (bestSession && bestSession.pnl > 0 && worstSession && worstSession.pnl < 0) {
      this.insights.push({
        id: 'opportunity_session',
        type: 'OPPORTUNITY',
        asset_pair: bestSymbol ? bestSymbol.key : 'Overall',
        session: bestSession.key,
        insight: `You are highly profitable during the ${bestSession.key} session (+$${bestSession.pnl.toFixed(0)}), but you bleed money in the ${worstSession.key} session (-$${Math.abs(worstSession.pnl).toFixed(0)}). Consider strictly trading only ${bestSession.key}.`,
        confidence_score: 0.95,
        meta: { check_metric: 'best_session.pnl', condition: '>0' }
      })
    } else if (bestSymbol && bestSymbol.pnl > 0) {
      this.insights.push({
        id: 'opportunity_asset',
        type: 'OPPORTUNITY',
        asset_pair: bestSymbol.key,
        session: 'All',
        insight: `You have a clear statistical edge trading ${bestSymbol.key} (+$${bestSymbol.pnl.toFixed(0)}). Focus 80% of your risk capital entirely on setups for this specific asset.`,
        confidence_score: 0.90,
        meta: { check_metric: 'best_symbol.pnl', condition: '>0' }
      })
    }
  }

  _verifyInsights() {
    // Confidence Verification Layer (Prevents Hallucinations)
    // In a real LLM scenario, this parses the `meta` tags and executes actual JS checks against `this.metrics`.
    // Since we are using an Expert System, confidence is naturally high, but we simulate the verification filter.
    
    return this.insights.filter(insight => {
      // If LLM says "You made money in London", but London PNL is < 0, drop the insight.
      if (insight.meta?.check_metric === 'best_session.pnl') {
        if (!this.metrics.bestSession || this.metrics.bestSession.pnl <= 0) {
          insight.confidence_score = 0.0
        }
      }
      return insight.confidence_score > 0.5
    })
  }
}
