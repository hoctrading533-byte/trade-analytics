<template>
  <section class="pg-page">
    <PropGuardianHeader
      :accounts="accounts"
      :account-id="accountId"
      :risk-mode="evaluation.riskMode"
      :evaluation="evaluation"
      @update:account-id="setAccount"
    />
    <main class="pg-content">
      <section class="pg-grid-4">
        <AccountStatusCard :label="pgT('riskCenter.dailyDdUsed')" :value="`${evaluation.dailyLoss.usedPercent.toFixed(1)}%`" :hint="money(evaluation.dailyLoss.used)" :meta="pgT('riskCenter.daily')" />
        <AccountStatusCard :label="pgT('riskCenter.maxDdUsed')" :value="`${evaluation.maxDrawdown.usedPercent.toFixed(1)}%`" :hint="money(evaluation.maxDrawdown.used)" :meta="pgT('riskCenter.max')" />
        <AccountStatusCard :label="pgT('riskCenter.riskMode')" :value="riskModeLabel(evaluation.riskMode)" :hint="statusLabel(evaluation.ruleStatus)" :meta="pgT('riskCenter.guardian')" :tone="evaluation.riskMode === 'LOCKDOWN' ? 'danger' : ''" />
        <AccountStatusCard :label="pgT('riskCenter.openRisk')" :value="money(openRisk)" :hint="`${positions.length} ${pgT('riskCenter.positions')}`" :meta="pgT('riskCenter.toSl')" />
      </section>

      <section class="pg-grid-2">
        <article class="pg-card pg-chart-card">
          <div class="pg-card-head">
            <div><span class="pg-kicker">{{ pgT('riskCenter.equity') }}</span><h3>{{ pgT('riskCenter.equityCurve') }}</h3></div>
          </div>
          <svg class="pg-svg-chart" viewBox="0 0 720 240" preserveAspectRatio="none">
            <line v-for="y in [40, 80, 120, 160, 200]" :key="y" x1="20" x2="700" :y1="y" :y2="y" class="pg-svg-grid" />
            <path class="pg-svg-area" :d="equityAreaPath" />
            <path class="pg-svg-line" :d="equityPath" />
          </svg>
        </article>

        <article class="pg-card pg-chart-card">
          <div class="pg-card-head">
            <div><span class="pg-kicker">{{ pgT('riskCenter.drawdown') }}</span><h3>{{ pgT('riskCenter.ddUsageTimeline') }}</h3></div>
          </div>
          <svg class="pg-svg-chart" viewBox="0 0 720 240" preserveAspectRatio="none">
            <line v-for="y in [40, 80, 120, 160, 200]" :key="y" x1="20" x2="700" :y1="y" :y2="y" class="pg-svg-grid" />
            <path class="pg-svg-line" :d="drawdownPath" />
          </svg>
        </article>
      </section>

      <OpenPositionRiskTable :positions="evaluation.openPositionRisks" />
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import AccountStatusCard from '../components/AccountStatusCard.vue'
import OpenPositionRiskTable from '../components/OpenPositionRiskTable.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const { accounts, accountId, setAccount, positions, snapshots, evaluation } = usePropGuardian()
const { pgT, riskModeLabel, statusLabel } = usePropGuardianI18n()

const openRisk = computed(() => evaluation.value.openPositionRisks.reduce((sum, position) => sum + Number(position.riskToSlAmount || 0), 0))
const equityPath = computed(() => buildPath(snapshots.value.map((row) => Number(row.endEquity || 0))))
const equityAreaPath = computed(() => `${equityPath.value} L 700 220 L 20 220 Z`)
const drawdownPath = computed(() => buildPath(snapshots.value.map((row) => Number(row.dailyDdUsed || 0))))

function buildPath(values) {
  if (!values.length) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  return values
    .map((value, index) => {
      const x = 20 + (index / Math.max(1, values.length - 1)) * 680
      const y = 220 - ((value - min) / span) * 190
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
