<template>
  <section class="th-page">
    <div class="th-wrap">
      <header class="th-head">
        <div>
          <h1>{{ t('history.title') }}</h1>
          <p>{{ t('history.sub') }}</p>
        </div>
        <div class="th-actions">
          <button class="th-btn ghost" @click="moveRange(-1)">{{ t('history.prev') }}</button>
          <button class="th-btn ghost" @click="moveRange(1)">{{ t('history.next') }}</button>
          <button class="th-btn" :disabled="loading" @click="refreshAll">{{ loading ? t('history.loading') : t('history.refresh') }}</button>
          <button class="th-btn pink" :disabled="sendingReport" @click="sendMonthlyReportNow">
            {{ sendingReport ? t('history.sending') : t('history.sendMonth') }}
          </button>
        </div>
      </header>

      <div class="th-tabs">
        <button class="th-tab" :class="{ active: activeView === 'daily' }" @click="setView('daily')">{{ t('history.daily') }}</button>
        <button class="th-tab" :class="{ active: activeView === 'weekly' }" @click="setView('weekly')">{{ t('history.weekly') }}</button>
        <button class="th-tab" :class="{ active: activeView === 'monthly' }" @click="setView('monthly')">{{ t('history.monthly') }}</button>
      </div>

      <div v-if="errorMessage" class="th-alert danger">{{ errorMessage }}</div>
      <div v-if="successMessage" class="th-alert success">{{ successMessage }}</div>

      <article class="th-summary">
        <div>
          <small>{{ t('history.period') }}</small>
          <strong>{{ rangeLabel }}</strong>
        </div>
        <div>
          <small>{{ t('history.netIncome') }}</small>
          <strong :class="Number(summary.netIncome || 0) >= 0 ? 'up' : 'down'">{{ money(summary.netIncome) }}</strong>
        </div>
        <div>
          <small>{{ t('history.totalTrades') }}</small>
          <strong>{{ summary.totalTrades || 0 }}</strong>
        </div>
        <div>
          <small>{{ t('history.winRate') }}</small>
          <strong>{{ Number(summary.winRate || 0).toFixed(2) }}%</strong>
        </div>
      </article>

      <article class="th-cards">
        <div class="th-card">
          <h3>{{ t('history.behaviorAnalysis') }}</h3>
          <dl>
            <div><dt>{{ locale === 'vi' ? 'Điểm TB' : 'Avg score' }}</dt><dd>{{ Number(behavior.avgTotalScore || 0).toFixed(2) }}</dd></div>
            <div><dt>{{ locale === 'vi' ? 'Emotion TB' : 'Avg emotion' }}</dt><dd>{{ Number(behavior.avgEmotionScore || 0).toFixed(2) }}</dd></div>
            <div><dt>{{ locale === 'vi' ? 'Plan TB' : 'Avg plan' }}</dt><dd>{{ Number(behavior.avgPlanScore || 0).toFixed(2) }}</dd></div>
          </dl>
        </div>
        <div class="th-card">
          <h3>{{ t('history.monthlyReport') }}</h3>
          <dl>
            <div><dt>{{ t('history.latestMonth') }}</dt><dd>{{ reportStatus.latestMonth || '--' }}</dd></div>
            <div><dt>{{ t('history.status') }}</dt><dd>{{ reportStatus.latestStatus || '--' }}</dd></div>
            <div><dt>{{ t('history.sentAt') }}</dt><dd>{{ dt(reportStatus.latestSentAt) }}</dd></div>
          </dl>
          <p class="th-hint">{{ t('history.reportHint') }}</p>
        </div>
      </article>

      <article class="th-bar-card">
        <h3>
          {{
            t('history.incomeBy', {
              unit: activeView === 'daily' ? t('history.daily').toLowerCase() : activeView === 'weekly' ? t('history.weekly').toLowerCase() : t('history.monthly').toLowerCase()
            })
          }}
        </h3>
        <div class="th-bars">
          <div v-for="item in bars" :key="item.key" class="th-bar-col">
            <div class="th-bar-wrap">
              <div class="th-bar" :class="barClass(item.amount)" :style="{ height: barHeight(item.amount) }"></div>
            </div>
            <small>{{ item.label }}</small>
            <strong :class="barClass(item.amount)">{{ money(item.amount) }}</strong>
          </div>
          <p v-if="!bars.length" class="th-empty">{{ t('history.noBars') }}</p>
        </div>
      </article>

      <article class="th-log-card">
        <h3>{{ t('history.detailHistory') }}</h3>
        <div class="th-log-head">
          <span>{{ t('history.time') }}</span>
          <span>{{ t('history.pair') }}</span>
          <span>{{ t('history.side') }}</span>
          <span>{{ t('history.close') }}</span>
          <span>{{ t('history.pnl') }}</span>
        </div>
        <div v-if="entries.length">
          <div v-for="row in entries" :key="`${row.id}-${row.closedAt}`" class="th-log-row">
            <span>{{ dt(row.closedAt) }}</span>
            <span>{{ row.symbol }}</span>
            <span :class="row.side === 'SHORT' ? 'down' : 'up'">{{ row.side }}</span>
            <span>{{ row.closeReason || '--' }}</span>
            <span :class="Number(row.profit || 0) >= 0 ? 'up' : 'down'">{{ money(row.profit) }}</span>
          </div>
        </div>
        <p v-else class="th-empty">{{ t('history.noEntries') }}</p>
      </article>

      <article class="th-report-card">
        <h3>{{ t('history.recentReports') }}</h3>
        <div class="th-report-head">
          <span>{{ t('history.month') }}</span>
          <span>Net</span>
          <span>{{ t('history.trades') }}</span>
          <span>{{ t('history.winRate') }}</span>
          <span>{{ t('history.behaviorScore') }}</span>
          <span>{{ t('history.status') }}</span>
        </div>
        <div v-if="monthlyLogs.length">
          <div v-for="item in monthlyLogs" :key="item.reportMonth" class="th-report-row">
            <span>{{ item.reportMonth }}</span>
            <span :class="Number(item.netProfit || 0) >= 0 ? 'up' : 'down'">{{ money(item.netProfit) }}</span>
            <span>{{ item.totalTrades || 0 }}</span>
            <span>{{ Number(item.winRate || 0).toFixed(2) }}%</span>
            <span>{{ Number(item.avgBehaviorScore || 0).toFixed(2) }}</span>
            <span>{{ item.status || '--' }}</span>
          </div>
        </div>
        <p v-else class="th-empty">{{ t('history.noReports') }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import './trading-history.css'
import { useTradingHistory } from './useTradingHistory.js'
import { useI18n } from '../../composables/useI18n.js'

const { t, locale } = useI18n()

const {
  loading,
  sendingReport,
  errorMessage,
  successMessage,
  activeView,
  summary,
  bars,
  entries,
  behavior,
  rangeLabel,
  reportStatus,
  monthlyLogs,
  barHeight,
  barClass,
  setView,
  moveRange,
  sendMonthlyReportNow,
  refreshAll
} = useTradingHistory()

function money(value) {
  return Number(value || 0).toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function dt(value) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US')
}
</script>
