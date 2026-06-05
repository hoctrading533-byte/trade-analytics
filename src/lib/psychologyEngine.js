/**
 * Trader Psychology State Machine
 * Calculates continuous emotional state based on chronologically sorted trades.
 */

const STATES = {
  CALM: { id: 'CALM', color: 'rgba(0, 168, 255, 0.4)' },
  FOCUSED: { id: 'FOCUSED', color: 'rgba(0, 210, 211, 0.5)' },
  DISCIPLINED: { id: 'DISCIPLINED', color: 'rgba(16, 172, 132, 0.5)' },
  CONFIDENT: { id: 'CONFIDENT', color: 'rgba(29, 209, 161, 0.6)' },
  EUPHORIC: { id: 'EUPHORIC', color: 'rgba(254, 202, 87, 0.6)' },
  FRUSTRATED: { id: 'FRUSTRATED', color: 'rgba(255, 159, 67, 0.6)' },
  TILTED: { id: 'TILTED', color: 'rgba(238, 82, 83, 0.7)' },
  PANICKED: { id: 'PANICKED', color: 'rgba(255, 59, 122, 0.8)' },
  BURNED_OUT: { id: 'BURNED_OUT', color: 'rgba(131, 149, 167, 0.7)' }
}

export class PsychologyEngine {
  constructor(trades, behaviorEvents = []) {
    this.trades = [...trades].sort((a, b) => {
      const tA = new Date(a.exitTime || a.closeAt || a.entryTime || a.openTime || 0).getTime()
      const tB = new Date(b.exitTime || b.closeAt || b.entryTime || b.openTime || 0).getTime()
      return tA - tB
    })
    this.behaviorEvents = behaviorEvents // events mapped by ticket id
    this.timeline = []
    
    // Internal trackers
    this.state = STATES.CALM
    this.winStreak = 0
    this.lossStreak = 0
    this.totalTradesToday = 0
    this.currentDay = null
    this.maxPeakEquity = 0
    this.currentEquity = 0
  }

  evaluate() {
    if (!this.trades.length) return { timeline: [], finalState: this.state }

    for (let i = 0; i < this.trades.length; i++) {
      const t = this.trades[i]
      const pnl = Number(t.profit || t.pnl || 0)
      const timeMs = new Date(t.exitTime || t.closeAt || t.time * 1000 || Date.now()).getTime()
      const dayStr = new Date(timeMs).toISOString().split('T')[0]
      const vol = Number(t.volume || 1)
      const hasSL = t.sl > 0

      // Daily reset logic
      if (this.currentDay !== dayStr) {
        this.currentDay = dayStr
        this.totalTradesToday = 1
        // 12-hour cooldown reset to CALM
        if (i > 0) {
          const prevMs = new Date(this.trades[i-1].exitTime || this.trades[i-1].closeAt || 0).getTime()
          if ((timeMs - prevMs) > 12 * 3600 * 1000) {
            this._transitionTo(STATES.CALM, 'Overnight Cooldown', timeMs)
          }
        }
      } else {
        this.totalTradesToday++
      }

      // Equity tracking
      this.currentEquity += pnl
      if (this.currentEquity > this.maxPeakEquity) this.maxPeakEquity = this.currentEquity
      const drawdown = this.maxPeakEquity > 0 ? ((this.maxPeakEquity - this.currentEquity) / this.maxPeakEquity) * 100 : 0

      // Streaks
      if (pnl > 0) {
        this.winStreak++
        this.lossStreak = 0
      } else if (pnl < 0) {
        this.lossStreak++
        this.winStreak = 0
      } else {
        this.winStreak = 0
        this.lossStreak = 0
      }

      // Context logic
      const avgVol = i > 0 ? this.trades.slice(0, i).reduce((s, x) => s + Number(x.volume || 0), 0) / i : vol

      // Behaviors matching this ticket
      const ticketEvents = this.behaviorEvents.filter(e => e.trade_ticket === t.ticket || e.trade_ticket === t.id)
      const hasRevenge = ticketEvents.some(e => e.type === 'REVENGE_TRADING')
      const hasTilt = ticketEvents.some(e => e.type === 'TILT_SESSION')

      // STATE MACHINE TRANSITIONS
      const sId = this.state.id
      let transitionReason = null
      let nextState = this.state

      // FROM TILTED
      if (sId === 'TILTED') {
        if (!hasSL || drawdown > 10.0) {
          nextState = STATES.PANICKED
          transitionReason = 'Removed SL / Massive DD'
        } else if (this.totalTradesToday > 15) {
          nextState = STATES.BURNED_OUT
          transitionReason = 'Overtrading while tilted'
        }
      }
      // FROM CONFIDENT
      else if (sId === 'CONFIDENT') {
        if (this.winStreak >= 5 && vol > (avgVol * 1.5)) {
          nextState = STATES.EUPHORIC
          transitionReason = 'Sizing up heavily on win streak'
        } else if (pnl < 0) {
          if (hasSL) {
            nextState = STATES.DISCIPLINED
            transitionReason = 'Took loss with SL (Respected rules)'
          } else {
            nextState = STATES.FRUSTRATED
            transitionReason = 'Took loss without SL'
          }
        }
      }
      // FROM CALM / FOCUSED
      else if (sId === 'CALM' || sId === 'FOCUSED') {
        if (this.winStreak >= 3) {
          nextState = STATES.CONFIDENT
          transitionReason = 'Win streak building'
        } else if (this.lossStreak >= 3) {
          nextState = STATES.FRUSTRATED
          transitionReason = 'String of losses'
        } else if (hasRevenge) {
          nextState = STATES.TILTED
          transitionReason = 'Revenge Trading Detected'
        }
      }
      // FROM DISCIPLINED
      else if (sId === 'DISCIPLINED') {
        if (pnl > 0) {
          nextState = STATES.FOCUSED
          transitionReason = 'Regained focus'
        } else if (this.lossStreak >= 3) {
          nextState = STATES.FRUSTRATED
          transitionReason = 'Multiple disciplined losses'
        }
      }
      // FROM EUPHORIC
      else if (sId === 'EUPHORIC') {
        if (pnl < 0 && Math.abs(pnl) > this.currentEquity * 0.05) {
          nextState = STATES.TILTED
          transitionReason = 'Major loss damaging ego'
        } else if (drawdown > 10.0) {
          nextState = STATES.PANICKED
          transitionReason = 'Massive drawdown from euphoria'
        }
      }
      // FROM FRUSTRATED
      else if (sId === 'FRUSTRATED') {
        if (hasRevenge || hasTilt) {
          nextState = STATES.TILTED
          transitionReason = 'Revenge/Tilt execution'
        } else if (pnl > 0) {
          nextState = STATES.CALM
          transitionReason = 'Win stabilized mood'
        }
      }

      // Commit transition
      if (nextState.id !== sId) {
        this._transitionTo(nextState, transitionReason, timeMs)
      }

      // Record point for charting regardless of transition
      this.timeline.push({
        time: timeMs,
        pnl: pnl,
        equity: this.currentEquity,
        state: this.state.id,
        color: this.state.color,
        reason: transitionReason,
        ticket: t.ticket || t.id
      })
    }

    return {
      timeline: this.timeline,
      finalState: this.state
    }
  }

  _transitionTo(newState, reason, timeMs) {
    this.state = newState
  }
}
