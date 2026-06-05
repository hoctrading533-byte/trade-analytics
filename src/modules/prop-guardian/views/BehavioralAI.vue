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
      <section class="pg-grid-3">
        <BehavioralScoreCard :title="pgT('behavior.behaviorScore')" :score="behavior.behaviorScore" :description="pgT('behavior.behaviorDesc')" />
        <BehavioralScoreCard :title="pgT('behavior.disciplineScore')" :score="behavior.disciplineScore" :description="pgT('behavior.disciplineDesc')" />
        <BehavioralScoreCard :title="pgT('behavior.riskScore')" :score="100 - behavior.riskScore" :description="pgT('behavior.riskDesc')" />
      </section>

      <section class="pg-grid-2">
        <article class="pg-card pg-alert-list">
          <div class="pg-card-head">
            <div><span class="pg-kicker">{{ pgT('behavior.detectors') }}</span><h3>{{ pgT('behavior.issues') }}</h3></div>
          </div>
          <GuardianAlertCard
            v-for="issue in issueAlerts"
            :key="issue.id"
            :alert="issue"
          />
        </article>

        <article class="pg-card pg-coach">
          <div class="pg-card-head">
            <div><span class="pg-kicker">{{ pgT('behavior.mentorFormat') }}</span><h3>{{ pgT('behavior.coachOutput') }}</h3></div>
          </div>
          <div><span>{{ pgT('alert.problem') }}</span><p>{{ pgText(behavior.coach.problem) }}</p></div>
          <div><span>{{ pgT('alert.evidence') }}</span><p>{{ formatEvidence(behavior.coach.evidence) }}</p></div>
          <div><span>{{ pgT('behavior.risk') }}</span><p>{{ pgText(behavior.coach.risk) }}</p></div>
          <div><span>{{ pgT('common.action') }}</span><p>{{ pgText(behavior.coach.action) }}</p></div>
          <div><span>{{ pgT('behavior.rule') }}</span><p>{{ pgText(behavior.coach.rule) }}</p></div>
        </article>
      </section>

      <article class="pg-card pg-table-card">
        <div class="pg-card-head">
          <div><span class="pg-kicker">{{ pgT('behavior.sessionStats') }}</span><h3>{{ pgT('behavior.bestWorstSession') }}</h3></div>
        </div>
        <div class="pg-table-wrap">
          <table class="pg-table">
            <thead><tr><th>{{ pgT('behavior.session') }}</th><th>{{ pgT('behavior.trades') }}</th><th>{{ pgT('behavior.winRate') }}</th><th>{{ pgT('behavior.expectancy') }}</th><th>PnL</th></tr></thead>
            <tbody>
              <tr v-for="row in behavior.sessionPerformance.rows" :key="row.session">
                <td>{{ row.session }}</td>
                <td>{{ row.count }}</td>
                <td>{{ row.winRate.toFixed(1) }}%</td>
                <td :class="row.expectancy >= 0 ? 'pg-ok' : 'pg-danger'">{{ signedMoney(row.expectancy) }}</td>
                <td :class="row.pnl >= 0 ? 'pg-ok' : 'pg-danger'">{{ signedMoney(row.pnl) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import BehavioralScoreCard from '../components/BehavioralScoreCard.vue'
import GuardianAlertCard from '../components/GuardianAlertCard.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const { accounts, accountId, setAccount, evaluation, behavior } = usePropGuardian()
const { pgT, pgText, alertEvidenceLabel } = usePropGuardianI18n()
const issueAlerts = computed(() =>
  behavior.value.issues.map((issue) => ({
    id: issue.issueType,
    type: issue.issueType,
    severity: issue.severity,
    title: issue.title,
    message: issue.recommendation,
    recommendedAction: issue.suggestedTask
  }))
)

function formatEvidence(value) {
  if (value === null || value === undefined || value === '') return '--'
  if (Array.isArray(value)) return value.map(formatEvidence).join(', ')
  if (typeof value !== 'object') return String(value)
  return Object.entries(value)
    .map(([key, item]) => `${alertEvidenceLabel(key)}: ${formatEvidence(item)}`)
    .join(', ')
}

function signedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : '-'}$${Math.abs(number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
