/**
 * AI Trading Coach (Gamified Expert System)
 * Generates dynamic Quests, Daily Tasks, and Psychology Exercises based on trader metrics.
 */

export class TradingCoachEngine {
  constructor(scores, behaviorEvents, psychState) {
    this.scores = scores || { behavior: 100, discipline: 100, risk: 100, execution: 100, consistency: 100, psychology: 100 };
    this.behaviorEvents = behaviorEvents || [];
    this.psychState = psychState || 'CALM';
  }

  generateCurriculum() {
    const curriculum = {
      coaching_summary: this._generateSummary(),
      daily_tasks: this._generateDailyTasks(),
      psychology_exercise: this._generatePsychExercise(),
      discipline_challenge: this._generateChallenge()
    };
    return curriculum;
  }

  _generateSummary() {
    if (this.psychState === 'TILTED' || this.psychState === 'PANICKED') {
      return "Your execution edge is entirely destroyed right now. Emotional deviation is severe. Stop focusing on PnL and strictly complete the following tasks to regain control.";
    }
    if (this.scores.risk < 60) {
      return "Your account is exposed to critical risk. You are taking outsized positions or moving stop losses. We must clamp down on risk parameters today.";
    }
    if (this.scores.consistency < 60) {
      return "Your PnL swings are too erratic. You are strategy hopping or trading randomly. We need to build a consistent habit loop.";
    }
    return "You are executing well. Today's goal is to maintain your edge and not give back your profits due to overconfidence.";
  }

  _generateDailyTasks() {
    const tasks = [];
    
    // Core Task based on lowest score
    const lowestScore = Math.min(this.scores.risk, this.scores.discipline, this.scores.execution, this.scores.psychology);
    
    if (lowestScore === this.scores.risk) {
      tasks.push({ id: "task_risk_1", description: "Calculate maximum position size using exactly 0.5% risk BEFORE opening your trading terminal.", type: "RISK_MANAGEMENT" });
      tasks.push({ id: "task_risk_2", description: "Do not exceed 3 total trades for the entire session.", type: "EXECUTION" });
    } else if (lowestScore === this.scores.discipline || this.behaviorEvents.some(e => e.type === 'RULE_VIOLATION_NO_SL')) {
      tasks.push({ id: "task_disc_1", description: "Place a hard physical Stop Loss order on every single trade today.", type: "DISCIPLINE" });
      tasks.push({ id: "task_disc_2", description: "Step away from the computer for 15 minutes immediately after entry.", type: "DISCIPLINE" });
    } else if (lowestScore === this.scores.psychology || this.psychState === 'TILTED') {
      tasks.push({ id: "task_psych_1", description: "Mandatory 24-hour screen break. Trade exclusively on Demo if you must click.", type: "PSYCHOLOGY" });
      tasks.push({ id: "task_psych_2", description: "Review yesterday's losing trades and journal exactly what emotion you felt during the drawdown.", type: "PSYCHOLOGY" });
    } else {
      tasks.push({ id: "task_opt_1", description: "Only execute 'A+' setups today. Skip all mediocre setups.", type: "EXECUTION" });
      tasks.push({ id: "task_opt_2", description: "Close your charts the moment you hit your daily profit target.", type: "DISCIPLINE" });
    }

    // Add a generic physical task
    tasks.push({ id: "task_phys_1", description: "Drink 1 glass of water and stretch before the session starts.", type: "ROUTINE" });
    
    return tasks;
  }

  _generatePsychExercise() {
    if (this.behaviorEvents.some(e => e.type === 'REVENGE_TRADING')) {
      return {
        title: "Loss Acceptance Affirmation",
        description: "Before the session begins, write down on a physical piece of paper: 'I accept that I will take losses today. Losing is a business expense, not an attack on my ego.'",
        duration_mins: 5
      };
    }
    if (this.psychState === 'EUPHORIC') {
      return {
        title: "Ego Check Meditation",
        description: "Sit quietly and visualize giving back all your recent profits. Remind yourself that the market owes you nothing and your edge is only valid if you follow your rules.",
        duration_mins: 5
      };
    }
    return {
      title: "Pre-Market Visualization",
      description: "Visualize your perfect setup forming. Visualize yourself taking it flawlessly, and visualize yourself accepting the outcome whether it hits TP or SL.",
      duration_mins: 5
    };
  }

  _generateChallenge() {
    if (this.scores.discipline < 70) {
      return {
        title: "The 3-Day SL Rule",
        description: "Do not widen or remove a stop-loss for 3 consecutive trading days. Any violation immediately fails the challenge.",
        reward_points: 500
      };
    }
    if (this.behaviorEvents.some(e => e.type === 'FOMO_ENTRY')) {
      return {
        title: "The Sniper's Patience",
        description: "Let 1 valid setup pass by without taking it. Watch it hit Take Profit and do not feel regret. Prove you have abundance mindset.",
        reward_points: 1000
      };
    }
    return {
      title: "The Consistency Streak",
      description: "End 5 consecutive days with a positive Profit Factor (Gross Profit > Gross Loss).",
      reward_points: 2000
    };
  }
}
