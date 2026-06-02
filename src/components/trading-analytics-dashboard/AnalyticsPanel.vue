<template>
  <section class="ta-analytics-panel">
    <article class="ta-insight-card ta-insight-card--primary">
      <span class="ta-kicker">{{ t('dashboard.coreAnalytics') }}</span>
      <h2>{{ t('dashboard.bestEdge') }}</h2>
      <div class="ta-best-grid">
        <div>
          <small>{{ t('dashboard.session') }}</small>
          <strong>{{ highlights.bestSession.label }}</strong>
          <span>{{ signedMoney(highlights.bestSession.pnl) }}</span>
        </div>
        <div>
          <small>{{ t('dashboard.strategy') }}</small>
          <strong>{{ highlights.bestStrategy.label }}</strong>
          <span>{{ signedMoney(highlights.bestStrategy.pnl) }}</span>
        </div>
        <div>
          <small>{{ t('dashboard.symbol') }}</small>
          <strong>{{ highlights.bestSymbol.label }}</strong>
          <span>{{ signedMoney(highlights.bestSymbol.pnl) }}</span>
        </div>
      </div>
    </article>

    <article class="ta-insight-card">
      <span class="ta-kicker">{{ t('dashboard.riskProfile') }}</span>
      <h2>{{ t('dashboard.executionStats') }}</h2>
      <dl class="ta-stat-list">
        <div>
          <dt>{{ t('dashboard.maxDrawdown') }}</dt>
          <dd>{{ metrics.drawdownPct.toFixed(2) }}%</dd>
        </div>
        <div>
          <dt>{{ t('dashboard.maxConsecutiveLosses') }}</dt>
          <dd>{{ metrics.maxConsecutiveLosses }}</dd>
        </div>
        <div>
          <dt>{{ t('dashboard.avgHoldingTime') }}</dt>
          <dd>{{ metrics.avgHoldingTime }}</dd>
        </div>
        <div>
          <dt>{{ t('dashboard.grossProfitLoss') }}</dt>
          <dd>{{ signedMoney(metrics.grossProfit) }} / {{ signedMoney(-metrics.grossLoss) }}</dd>
        </div>
      </dl>
    </article>

    <article class="ta-insight-card">
      <span class="ta-kicker">{{ t('dashboard.patternRecognition') }}</span>
      <h2>{{ t('dashboard.whatWorking') }}</h2>
      <div class="ta-pattern-list">
        <div v-for="item in patterns" :key="item.label" class="ta-pattern-row">
          <span>{{ item.label }}</span>
          <strong :class="item.pnl >= 0 ? 'positive' : 'negative'">{{ signedMoney(item.pnl) }}</strong>
          <small>{{ item.winRate.toFixed(0) }}% WR - {{ item.count }} trades</small>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { useI18n } from '../../composables/useI18n.js'

defineProps({
  metrics: { type: Object, required: true },
  highlights: { type: Object, required: true },
  patterns: { type: Array, default: () => [] }
})

const { t } = useI18n()

function signedMoney(value) {
  const numeric = Number(value || 0)
  return `${numeric >= 0 ? '+' : '-'}$${Math.abs(numeric).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`
}
</script>
