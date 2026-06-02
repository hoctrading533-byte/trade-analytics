function task(id, title, description, category, priority, reason, dueAt = '') {
  return {
    id,
    title,
    description,
    category,
    priority,
    status: 'todo',
    dueAt,
    generatedBy: 'system',
    reason,
    createdAt: new Date().toISOString()
  }
}

export function generateTaskcareTasks({ challenge, evaluation, behavior }) {
  const tasks = [
    task(
      'pre-rule-status',
      'Check prop firm rule status',
      'Confirm daily loss, max loss, min days, news rules, and weekend holding rules before session.',
      'pre_session',
      'high',
      'Challenge rules must be visible before the first trade.'
    ),
    task(
      'pre-dd-buffer',
      'Confirm drawdown buffer',
      `Daily DD remaining: ${Math.round(evaluation.dailyLoss.remaining)}. Max DD remaining: ${Math.round(evaluation.maxDrawdown.remaining)}.`,
      'pre_session',
      'high',
      'The system protects the challenge by sizing from remaining buffers.'
    ),
    task(
      'pre-risk-plan',
      'Set daily risk limit and max trades',
      `Personal risk cap: ${challenge.personalRiskPercent}%. Max trades today: ${challenge.maxTradesPerDay}.`,
      'pre_session',
      'medium',
      'Clear limits reduce impulsive decisions.'
    ),
    task(
      'pre-mental-state',
      'Confirm mental state',
      'Only trade if rested, focused, and willing to stop after the rule says stop.',
      'pre_session',
      'medium',
      'Emotional state affects rule compliance.'
    ),
    task(
      'in-position-risk',
      'Review open position risk',
      'Check risk to SL, floating loss, and remaining DD after SL.',
      'in_session',
      'high',
      'Open risk can violate rules before closed PnL updates.'
    ),
    task(
      'post-emotion-journal',
      'Complete emotion journal',
      'Tag emotion before and after trades, plus any execution mistakes.',
      'post_session',
      'medium',
      'Behavior data powers the AI Guardian.'
    ),
    task(
      'weekly-session-review',
      'Review session performance',
      'Compare Asia, London, and New York expectancy. Remove the weakest window if needed.',
      'weekly',
      'medium',
      'Bad time windows lower survival score.'
    )
  ]

  if (evaluation.riskMode === 'LOCKDOWN') {
    tasks.unshift(
      task(
        'lockdown-stop-today',
        'Stop trading today',
        'Daily or max drawdown has crossed lockdown threshold. Do not add new trades.',
        'risk',
        'critical',
        'Lockdown mode protects the funded challenge.'
      )
    )
  }

  for (const issue of behavior.issues || []) {
    if (issue.score >= 55) {
      tasks.push(
        task(
          `behavior-${issue.issueType.toLowerCase()}`,
          issue.suggestedTask,
          issue.recommendation,
          'psychology',
          issue.severity === 'critical' ? 'critical' : issue.severity === 'danger' ? 'high' : 'medium',
          issue.title
        )
      )
    }
  }

  return tasks
}

export function mergeTaskStatuses(generatedTasks, savedStatuses = {}) {
  return generatedTasks.map((item) => ({
    ...item,
    status: savedStatuses[item.id] || item.status
  }))
}
