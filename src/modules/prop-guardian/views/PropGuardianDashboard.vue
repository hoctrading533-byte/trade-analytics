<template>
  <section class="pg-page">
    <PropGuardianHeader
      :accounts="accounts"
      :account-id="accountId"
      :risk-mode="evaluation.riskMode"
      @update:account-id="setAccount"
    />

    <main class="pg-content pg-command-content">
      <section class="pg-command-hero">
        <article class="pg-card pg-command-title">
          <div>
            <span class="pg-kicker">{{ pgT('dashboard.kicker') }}</span>
            <h1>{{ pgT('dashboard.title') }}</h1>
            <p>{{ pgT('dashboard.subtitle') }}</p>
          </div>
          <div class="pg-live-meta">
            <span :class="dataSource === 'exness-mt5' ? 'pg-ok' : 'pg-warn'">
              {{ dataSource === 'exness-mt5' ? pgT('common.liveExnessMt5') : pgT('common.mockRealtime') }}
            </span>
            <small>{{ mt5Status.login }} - {{ lastSyncAt ? dateTime(lastSyncAt) : pgT('common.waitingSync') }}</small>
            <label class="pg-live-switch">
              <input v-model="isLivePolling" type="checkbox" />
              {{ pgT('common.polling') }}
            </label>
            <button type="button" :disabled="isLoadingLive" @click="loadLiveData({ silent: false })">
              {{ isLoadingLive ? pgT('common.syncing') : pgT('common.syncNow') }}
            </button>
          </div>
        </article>
      </section>

      <p v-if="liveError" class="pg-live-error">{{ pgText(liveError) }}</p>

      <section class="pg-command-top">
        <article class="pg-card pg-command-stat" :class="`pg-card--${commandCenter.accountHealth.tone}`">
          <span>{{ pgT('dashboard.accountHealth') }}</span>
          <strong>{{ commandCenter.accountHealth.score }}/100</strong>
          <p>{{ healthLabel(commandCenter.accountHealth.label) }} - {{ pgText(commandCenter.accountHealth.summary) }}</p>
        </article>

        <article class="pg-card pg-command-stat" :class="riskToneClass(evaluation.riskMode)">
          <span>{{ pgT('dashboard.riskMode') }}</span>
          <strong>{{ riskModeLabel(evaluation.riskMode) }}</strong>
          <p>{{ statusLabel(evaluation.ruleStatus) }} - {{ pgT('dashboard.lossStreak') }} {{ evaluation.lossStreak }}</p>
        </article>

        <article class="pg-card pg-command-stat">
          <span>{{ pgT('dashboard.survivalScore') }}</span>
          <strong>{{ evaluation.survivalScore }}/100</strong>
          <p>{{ pgT('dashboard.passProbability') }}: {{ bandLabel(evaluation.passProbability.band) }} - MC {{ evaluation.passProbability.monteCarloScore }}%</p>
        </article>

        <article class="pg-card pg-command-stat pg-command-stat--action">
          <span>{{ pgT('dashboard.todayAction') }}</span>
          <strong>{{ pgText(commandCenter.oneBestAction.title) }}</strong>
          <p>{{ pgText(commandCenter.todayAction) }}</p>
        </article>
      </section>

      <section class="pg-command-layout">
        <aside class="pg-command-column pg-command-column--left">
          <article class="pg-card pg-rule-panel">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.ruleStatus') }}</span>
                <h3>{{ pgT('dashboard.challengeRules') }}</h3>
              </div>
              <RiskModeBadge :mode="evaluation.riskMode" />
            </div>
            <div class="pg-rule-list">
              <div>
                <span>{{ pgT('dashboard.dailyLossMode') }}</span>
                <strong>{{ dailyLossModeLabel(evaluation.dailyLoss.mode) }}</strong>
                <small>{{ pgT('dashboard.floor') }} {{ money(evaluation.dailyLoss.floor) }}</small>
              </div>
              <div>
                <span>{{ pgT('dashboard.maxDdMode') }}</span>
                <strong>{{ drawdownTypeLabel(evaluation.maxDrawdown.type) }}</strong>
                <small>{{ pgT('dashboard.floor') }} {{ money(evaluation.maxDrawdown.floor) }}</small>
              </div>
              <div>
                <span>{{ pgT('dashboard.tradingHours') }}</span>
                <strong :class="evaluation.tradingWindow.allowed ? 'pg-ok' : 'pg-danger'">
                  {{ evaluation.tradingWindow.allowed ? pgT('common.openStatus') : pgT('common.closedStatus') }}
                </strong>
                <small>{{ pgText(evaluation.tradingWindow.label) }}</small>
              </div>
              <div>
                <span>{{ pgT('dashboard.consistencyRule') }}</span>
                <strong :class="evaluation.consistencyRule.status === 'OK' ? 'pg-ok' : 'pg-warn'">
                  {{ statusLabel(evaluation.consistencyRule.status) }}
                </strong>
                <small>{{ evaluation.consistencyRule.contributionPercent }}% / {{ evaluation.consistencyRule.limitPercent }}%</small>
              </div>
            </div>
          </article>

          <ProfitTargetProgress :progress="evaluation.targetProgress" />

          <DrawdownGauge
            :kicker="pgT('dashboard.dailyRule')"
            :title="pgT('dashboard.dailyDdRemaining')"
            :used="evaluation.dailyLoss.used"
            :remaining="evaluation.dailyLoss.remaining"
            :floor="evaluation.dailyLoss.floor"
            :percent="evaluation.dailyLoss.usedPercent"
          />

          <DrawdownGauge
            :kicker="pgT('dashboard.maxRule')"
            :title="pgT('dashboard.maxDdRemaining')"
            :used="evaluation.maxDrawdown.used"
            :remaining="evaluation.maxDrawdown.remaining"
            :floor="evaluation.maxDrawdown.floor"
            :percent="evaluation.maxDrawdown.usedPercent"
          />
        </aside>

        <section class="pg-command-column pg-command-column--center">
          <article class="pg-card pg-chart-card pg-equity-panel">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.realtimeEquity') }}</span>
                <h3>{{ pgT('dashboard.equityCurve') }}</h3>
              </div>
              <strong :class="liveAccount.floatingProfit >= 0 ? 'pg-ok' : 'pg-danger'">
                {{ signedMoney(liveAccount.floatingProfit) }}
              </strong>
            </div>
            <svg class="pg-svg-chart" viewBox="0 0 720 240" role="img" :aria-label="pgT('dashboard.equityCurve')">
              <line v-for="line in chartGrid" :key="line" x1="0" :y1="line" x2="720" :y2="line" class="pg-svg-grid" />
              <polygon :points="equityAreaPoints" class="pg-svg-area" />
              <polyline :points="equityLinePoints" class="pg-svg-line" />
            </svg>
            <div class="pg-equity-meta">
              <span>{{ pgT('common.balance') }} <strong>{{ money(liveAccount.currentBalance) }}</strong></span>
              <span>{{ pgT('common.equity') }} <strong>{{ money(liveAccount.currentEquity) }}</strong></span>
              <span>{{ pgT('common.closedToday') }} <strong>{{ signedMoney(todayStats.closedPnl) }}</strong></span>
            </div>
          </article>

          <OpenPositionRiskTable :positions="evaluation.openPositionRisks" />

          <section class="pg-grid-2 pg-tight-grid">
            <SafeLotCalculator :result="safeLot" />
            <article class="pg-card pg-decision-card" :class="`pg-card--${commandCenter.shouldTradeNow.tone}`">
              <div class="pg-card-head">
                <div>
                  <span class="pg-kicker">{{ pgT('dashboard.decisionEngine') }}</span>
                  <h3>{{ pgText(commandCenter.shouldTradeNow.title) }}</h3>
                </div>
                <strong>{{ decisionLabel(commandCenter.shouldTradeNow.answer) }}</strong>
              </div>
              <p>{{ pgText(commandCenter.shouldTradeNow.summary) }}</p>
              <ul class="pg-compact-list">
                <li v-for="reason in commandCenter.shouldTradeNow.reasons" :key="reason">{{ pgText(reason) }}</li>
              </ul>
              <div class="pg-alert-card__action">
                <span>{{ pgT('common.action') }}</span>
                <strong>{{ pgText(commandCenter.shouldTradeNow.action) }}</strong>
              </div>
            </article>
          </section>

          <article class="pg-card pg-pass-card">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.mockMonteCarlo') }}</span>
                <h3>{{ pgT('dashboard.passProbability') }}</h3>
              </div>
              <strong>{{ evaluation.passProbability.score }}%</strong>
            </div>
            <div class="pg-progress-track">
              <span :style="{ width: `${Math.min(100, evaluation.passProbability.score)}%` }"></span>
            </div>
            <div class="pg-pass-grid">
              <div>
                <span>{{ pgT('dashboard.band') }}</span>
                <strong>{{ bandLabel(evaluation.passProbability.band) }}</strong>
              </div>
              <div>
                <span>{{ pgT('dashboard.paths') }}</span>
                <strong>{{ evaluation.passProbability.paths }}</strong>
              </div>
              <div>
                <span>{{ pgT('dashboard.failRate') }}</span>
                <strong>{{ evaluation.passProbability.failRate }}%</strong>
              </div>
            </div>
            <p>{{ pgText(evaluation.passProbability.disclaimer) }}</p>
          </article>
        </section>

        <aside class="pg-command-column pg-command-column--right">
          <article class="pg-card pg-alert-list">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.aiGuardian') }}</span>
                <h3>{{ pgT('dashboard.protectionFeed') }}</h3>
              </div>
              <strong>{{ alerts.length }}</strong>
            </div>
            <GuardianAlertCard v-for="alert in alerts.slice(0, 4)" :key="alert.id" :alert="alert" />
            <p v-if="!alerts.length" class="pg-empty">{{ pgT('common.noActiveAlerts') }}</p>
          </article>

          <article class="pg-card pg-best-action" :class="`pg-card--${commandCenter.oneBestAction.tone}`">
            <span class="pg-kicker">{{ pgT('dashboard.oneBestAction') }}</span>
            <h3>{{ pgText(commandCenter.oneBestAction.title) }}</h3>
            <p>{{ pgText(commandCenter.oneBestAction.action) }}</p>
            <small>{{ pgText(commandCenter.oneBestAction.why) }}</small>
          </article>

          <TaskcareChecklist
            :title="pgT('dashboard.taskcareCommandList')"
            :tasks="taskcareTasks.slice(0, 7)"
            @update-status="updateTaskStatus"
          />

          <EmergencyStopPanel :risk-mode="evaluation.riskMode" />

          <article class="pg-card pg-killer-card">
            <span class="pg-kicker">{{ pgT('dashboard.challengeKillersKicker') }}</span>
            <h3>{{ pgT('dashboard.challengeKillers') }}</h3>
            <div class="pg-killer-list">
              <div v-for="killer in commandCenter.challengeKillers" :key="killer.title" :class="`pg-killer--${killer.severity}`">
                <strong>{{ pgText(killer.title) }}</strong>
                <span>{{ pgText(killer.evidence) }}</span>
                <small>{{ pgText(killer.action) }}</small>
              </div>
            </div>
          </article>

          <article class="pg-card pg-preserve-card" :class="`pg-card--${commandCenter.capitalPreservation.tone}`">
            <span class="pg-kicker">{{ pgT('dashboard.fundedProtection') }}</span>
            <h3>{{ pgText(commandCenter.capitalPreservation.title) }}</h3>
            <p>{{ pgText(commandCenter.capitalPreservation.reason) }}</p>
            <ul class="pg-compact-list">
              <li v-for="item in commandCenter.capitalPreservation.plan" :key="item">{{ pgText(item) }}</li>
            </ul>
          </article>
        </aside>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import DrawdownGauge from '../components/DrawdownGauge.vue'
import EmergencyStopPanel from '../components/EmergencyStopPanel.vue'
import GuardianAlertCard from '../components/GuardianAlertCard.vue'
import OpenPositionRiskTable from '../components/OpenPositionRiskTable.vue'
import ProfitTargetProgress from '../components/ProfitTargetProgress.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import RiskModeBadge from '../components/RiskModeBadge.vue'
import SafeLotCalculator from '../components/SafeLotCalculator.vue'
import TaskcareChecklist from '../components/TaskcareChecklist.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const {
  accounts,
  accountId,
  setAccount,
  liveAccount,
  evaluation,
  alerts,
  commandCenter,
  safeLot,
  todayStats,
  taskcareTasks,
  updateTaskStatus,
  snapshots,
  dataSource,
  liveError,
  lastSyncAt,
  mt5Status,
  isLivePolling,
  isLoadingLive,
  loadLiveData
} = usePropGuardian()

const {
  locale,
  pgT,
  pgText,
  riskModeLabel,
  statusLabel,
  dailyLossModeLabel,
  drawdownTypeLabel,
  decisionLabel,
  bandLabel,
  healthLabel
} = usePropGuardianI18n()

const chartGrid = [42, 92, 142, 192]

const equityValues = computed(() => {
  const rows = snapshots.value.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const values = rows.map((row) => Number(row.endEquity || row.endBalance || 0)).filter(Boolean)
  return values.length ? values : [Number(liveAccount.value.currentEquity || 0)]
})

const equityLinePoints = computed(() => buildChartPoints(equityValues.value))
const equityAreaPoints = computed(() => {
  const points = buildChartPoints(equityValues.value)
  return points ? `0,226 ${points} 720,226` : ''
})

function buildChartPoints(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(1, max - min)
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 720 : (index / (values.length - 1)) * 720
      const y = 226 - ((value - min) / spread) * 190
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function signedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : '-'}$${Math.abs(number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function dateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })
}

function riskToneClass(mode) {
  if (mode === 'LOCKDOWN') return 'pg-card--critical'
  if (mode === 'DANGER') return 'pg-card--danger'
  if (mode === 'CAUTION') return 'pg-card--warning'
  return 'pg-card--success'
}
</script>
