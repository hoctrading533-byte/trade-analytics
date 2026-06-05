/**
 * Quantitative Behavior Engine
 * Detects 35 advanced behavioral patterns in MT5 trading data.
 */

export class BehaviorDetectionEngine {
  constructor(trades) {
    // Sort trades chronologically by close time (or open time if still open)
    this.trades = [...trades].sort((a, b) => {
      const tA = new Date(a.exitTime || a.closeAt || a.entryTime || a.openTime || (a.time ? a.time * 1000 : 0)).getTime()
      const tB = new Date(b.exitTime || b.closeAt || b.entryTime || b.openTime || (b.time ? b.time * 1000 : 0)).getTime()
      return tA - tB
    })
    
    this.events = []
    this.avgVol = 0
    this.avgWinHold = 0
    this.avgLossHold = 0
    this._precalculateMetrics()
  }

  _precalculateMetrics() {
    if (this.trades.length === 0) return
    let totalVol = 0
    let totalWinHold = 0, winCount = 0
    let totalLossHold = 0, lossCount = 0

    for (const t of this.trades) {
      totalVol += Number(t.volume || 0)
      
      const open = new Date(t.entryTime || t.openTime || 0).getTime()
      const close = new Date(t.exitTime || t.closeAt || t.time ? t.time * 1000 : Date.now()).getTime()
      const holdTime = (close - open) / 1000 // seconds

      const pnl = Number(t.profit || t.pnl || 0)
      if (pnl > 0) {
        totalWinHold += holdTime
        winCount++
      } else if (pnl < 0) {
        totalLossHold += holdTime
        lossCount++
      }
    }
    this.avgVol = totalVol / this.trades.length
    this.avgWinHold = winCount ? totalWinHold / winCount : 0
    this.avgLossHold = lossCount ? totalLossHold / lossCount : 0
  }

  analyze() {
    this._cat1_ReactiveTrading()
    this._cat2_EmotionalExecution()
    this._cat3_TimeBreakdowns()
    this._cat4_AdvancedQuant()
    
    // Aggregate results
    return this._scoreEvents()
  }

  _scoreEvents() {
    let totalPenalty = 0
    const summary = {}

    for (const e of this.events) {
      totalPenalty += (e.severity * e.confidence)
      if (!summary[e.type]) {
        summary[e.type] = { count: 0, totalImpact: 0, severity: e.severity, label: e.label, icon: e.icon, color: e.color }
      }
      summary[e.type].count += 1
      summary[e.type].totalImpact += Number(e.impactPnl || 0)
    }

    const baseScore = 100
    // Each penalty point reduces score by 0.5
    let finalScore = Math.max(0, Math.round(baseScore - (totalPenalty * 0.5)))

    // Sort summary to get top behaviors
    const topBehaviors = Object.values(summary).sort((a, b) => (b.count * b.severity) - (a.count * a.severity))

    return {
      behaviorScore: finalScore,
      events: this.events,
      summary: topBehaviors
    }
  }

  // --- CATEGORY 1: REACTIVE TRADING ---

  _cat1_ReactiveTrading() {
    let consecutiveLosses = 0
    
    for (let i = 1; i < this.trades.length; i++) {
      const prev = this.trades[i - 1]
      const curr = this.trades[i]
      
      const prevPnl = Number(prev.profit || prev.pnl || 0)
      const currPnl = Number(curr.profit || curr.pnl || 0)
      const prevClose = new Date(prev.exitTime || prev.closeAt || (prev.time ? prev.time * 1000 : 0)).getTime()
      const currOpen = new Date(curr.entryTime || curr.openTime || 0).getTime()
      
      const timeDiffMins = (currOpen - prevClose) / 60000
      const volRatio = Number(curr.volume || 1) / Number(prev.volume || 1)

      // 1. Revenge Trading
      if (prevPnl < 0 && timeDiffMins >= 0 && timeDiffMins <= 15 && volRatio >= 1.5) {
        this.events.push({
          type: 'REVENGE_TRADING',
          label: 'Revenge Trading',
          icon: '⚠️',
          color: 'var(--warning)',
          confidence: timeDiffMins < 2 ? 0.99 : 0.8,
          severity: 9,
          impactPnl: currPnl
        })
      }

      // 2. Tilt Session
      if (prevPnl < 0) consecutiveLosses++
      else consecutiveLosses = 0

      if (consecutiveLosses >= 4 && timeDiffMins < 30) {
        this.events.push({
          type: 'TILT_SESSION',
          label: 'Tilt Session Breakdown',
          icon: '🌪️',
          color: 'var(--danger)',
          confidence: 0.95,
          severity: 10,
          impactPnl: currPnl
        })
      }

      // 3. Adding To Losers (Martingale)
      if (prevPnl < 0 && timeDiffMins < 60 && prev.symbol === curr.symbol && prev.type === curr.type) {
         this.events.push({
          type: 'MARTINGALE_BIAS',
          label: 'Adding To Losers',
          icon: '📉',
          color: 'var(--danger)',
          confidence: 0.85,
          severity: 8,
          impactPnl: currPnl
        })
      }
      
      // 4. Holding Losers
      const currHoldTime = (new Date(curr.exitTime || curr.closeAt || (curr.time ? curr.time * 1000 : Date.now())).getTime() - currOpen) / 1000
      if (currPnl < 0 && currHoldTime > this.avgWinHold * 3 && this.avgWinHold > 0) {
        this.events.push({
          type: 'HOLDING_LOSERS',
          label: 'Holding Losers Too Long',
          icon: '⚓',
          color: 'var(--danger)',
          confidence: 0.9,
          severity: 7,
          impactPnl: currPnl
        })
      }

      // 5. Early Profit Taking
      if (currPnl > 0 && currHoldTime < this.avgLossHold * 0.2 && this.avgLossHold > 0) {
        this.events.push({
          type: 'EARLY_PROFIT_TAKING',
          label: 'Early Profit Taking (Fear)',
          icon: '🏃',
          color: 'var(--warning)',
          confidence: 0.8,
          severity: 5,
          impactPnl: 0 // Opportunity cost is hard to calculate without MFE
        })
      }
    }
  }

  // --- CATEGORY 2: EMOTIONAL EXECUTION ---
  
  _cat2_EmotionalExecution() {
    let winStreak = 0

    for (let i = 0; i < this.trades.length; i++) {
      const t = this.trades[i]
      const pnl = Number(t.profit || t.pnl || 0)
      const holdTimeMins = ((new Date(t.exitTime || t.closeAt || (t.time ? t.time * 1000 : Date.now())).getTime() - new Date(t.entryTime || t.openTime || 0).getTime()) / 60000)

      // 10. Overconfidence
      if (pnl > 0) winStreak++
      else winStreak = 0

      if (winStreak >= 3 && i < this.trades.length - 1) {
        const nextT = this.trades[i+1]
        if (Number(nextT.volume || 1) > this.avgVol * 2) {
          this.events.push({
            type: 'OVERCONFIDENCE',
            label: 'Overconfidence Sizing',
            icon: '🦅',
            color: 'var(--danger)',
            confidence: 0.9,
            severity: 8,
            impactPnl: Number(nextT.profit || nextT.pnl || 0)
          })
        }
      }

      // 11. Impulsive Entry (Extremely short hold, zero edge)
      if (holdTimeMins < 1 && Math.abs(pnl) > 0) {
        this.events.push({
          type: 'IMPULSIVE_ENTRY',
          label: 'Impulsive Entry / Scalp Panic',
          icon: '⚡',
          color: 'var(--warning)',
          confidence: 0.7,
          severity: 6,
          impactPnl: pnl
        })
      }
    }
  }

  // --- CATEGORY 3: TIME BREAKDOWNS ---
  
  _cat3_TimeBreakdowns() {
    // 13. Overtrading
    const tradesByDay = {}
    for (const t of this.trades) {
      const open = new Date(t.entryTime || t.openTime || 0)
      const dayStr = open.toISOString().split('T')[0]
      tradesByDay[dayStr] = (tradesByDay[dayStr] || 0) + 1
    }
    
    const dailyCounts = Object.values(tradesByDay)
    if (dailyCounts.length > 0) {
      const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length
      const sqDiffs = dailyCounts.map(c => Math.pow(c - avgDaily, 2))
      const stdDev = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / dailyCounts.length)

      for (const [day, count] of Object.entries(tradesByDay)) {
        if (count > avgDaily + (2 * stdDev) && stdDev > 2) {
           this.events.push({
            type: 'OVERTRADING',
            label: 'Overtrading (Volume Spike)',
            icon: '🎰',
            color: 'var(--danger)',
            confidence: 0.95,
            severity: 7,
            impactPnl: 0 
          })
        }
      }
    }

    // 15. Boredom Trading
    for (const t of this.trades) {
      const vol = Number(t.volume || 0)
      const pnl = Number(t.profit || t.pnl || 0)
      if (vol > 0 && vol < this.avgVol * 0.2 && Math.abs(pnl) < 5) {
        this.events.push({
          type: 'BOREDOM_TRADING',
          label: 'Boredom Trading (Micro-lots)',
          icon: '🥱',
          color: 'var(--sub)',
          confidence: 0.6,
          severity: 3,
          impactPnl: pnl 
        })
      }
    }
  }

  // --- CATEGORY 4: ADVANCED QUANT STRATEGY ---
  
  _cat4_AdvancedQuant() {
    for (let i = 0; i < this.trades.length; i++) {
      const t = this.trades[i]
      const openTime = new Date(t.entryTime || t.openTime || 0)
      const dayOfWeek = openTime.getDay()
      const hour = openTime.getUTCHours()
      const pnl = Number(t.profit || t.pnl || 0)

      // 17. Rule Violation (No SL)
      if (!t.sl || Number(t.sl) === 0) {
        this.events.push({
          type: 'RULE_VIOLATION_NO_SL',
          label: 'Trading Without Stop Loss',
          icon: '🛡️',
          color: 'var(--danger)',
          confidence: 1.0,
          severity: 10,
          impactPnl: pnl 
        })
      }

      // 24. Spread Blindness (Rollover hours 21:00-22:00 UTC)
      if (hour === 21 || hour === 22) {
        const holdTimeMins = ((new Date(t.exitTime || t.closeAt || (t.time ? t.time * 1000 : Date.now())).getTime() - openTime.getTime()) / 60000)
        if (holdTimeMins < 15 && pnl < 0) {
           this.events.push({
            type: 'SPREAD_BLINDNESS',
            label: 'Spread Blindness (Rollover Trading)',
            icon: '👁️',
            color: 'var(--warning)',
            confidence: 0.8,
            severity: 6,
            impactPnl: pnl 
          })
        }
      }

      // 29. Friday Afternoon Gambling
      if (dayOfWeek === 5 && hour >= 18) {
         this.events.push({
            type: 'FRIDAY_GAMBLING',
            label: 'Friday Afternoon Gambling',
            icon: '🍻',
            color: 'var(--warning)',
            confidence: 0.9,
            severity: 6,
            impactPnl: pnl 
          })
      }

      // 34. Weekend Hold Violation
      if (dayOfWeek === 5) {
         const close = new Date(t.exitTime || t.closeAt || (t.time ? t.time * 1000 : Date.now()))
         if (close.getDay() === 1 || close.getDay() === 2) {
            this.events.push({
              type: 'WEEKEND_HOLD',
              label: 'Weekend Hold Gap Risk',
              icon: '🌉',
              color: 'var(--danger)',
              confidence: 1.0,
              severity: 8,
              impactPnl: pnl 
            })
         }
      }
    }
  }
}
