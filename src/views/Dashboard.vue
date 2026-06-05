<script setup>
import { computed, onMounted, ref } from 'vue'
import { useJournalStore } from '../stores/useJournalStore.js'
import { useUserStore } from '../stores/useUserStore.js'

// Import chart components
import ZellaScoreChart from '../components/dashboard/ZellaScoreChart.vue'
import ProgressHeatmap from '../components/dashboard/ProgressHeatmap.vue'
import CumulativePnlChart from '../components/dashboard/CumulativePnlChart.vue'
import DailyPnlChart from '../components/dashboard/DailyPnlChart.vue'
import RecentTradesTable from '../components/dashboard/RecentTradesTable.vue'
import MonthlyCalendar from '../components/dashboard/MonthlyCalendar.vue'
import DrawdownChart from '../components/dashboard/DrawdownChart.vue'
import TradeTimePerformance from '../components/dashboard/TradeTimePerformance.vue'

const journalStore = useJournalStore()
const userStore = useUserStore()

// Local state for UI
const selectedDateRange = ref('this_month')

// Fetch data on mount
onMounted(async () => {
  await journalStore.fetchAccounts()
})

// Metrics Calculation
const summary = computed(() => journalStore.aggregatedSummary)
const trades = computed(() => journalStore.filteredTrades)
const dailyStats = computed(() => journalStore.filteredDailyStats)

// Top Row Metrics
const netPnl = computed(() => summary.value.netProfit || 0)
const winRate = computed(() => summary.value.winRate || 0)
const profitFactor = computed(() => summary.value.profitFactor || 0)

const dayWinRate = computed(() => {
  if (!dailyStats.value.length) return 0
  const winningDays = dailyStats.value.filter(d => d.netProfit > 0).length
  return (winningDays / dailyStats.value.length) * 100
})

const avgWin = computed(() => {
  const winningTrades = trades.value.filter(t => (t.pnl || t.profit) > 0)
  if (!winningTrades.length) return 0
  const totalWin = winningTrades.reduce((sum, t) => sum + (t.pnl || t.profit), 0)
  return totalWin / winningTrades.length
})

const avgLoss = computed(() => {
  const losingTrades = trades.value.filter(t => (t.pnl || t.profit) < 0)
  if (!losingTrades.length) return 0
  const totalLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl || t.profit), 0)
  return totalLoss / losingTrades.length
})

const avgWinLossRatio = computed(() => {
  if (avgLoss.value === 0) return avgWin.value > 0 ? 99 : 0
  return avgWin.value / avgLoss.value
})

// Zella Score logic (mocked calculation for UI)
const zellaMetrics = computed(() => {
  return {
    winRate: Math.min(100, winRate.value || 0),
    profitFactor: Math.min(100, ((profitFactor.value || 0) / 3) * 100),
    avgWinLoss: Math.min(100, ((avgWinLossRatio.value || 0) / 3) * 100),
    recoveryFactor: 80, // Requires historical max drawdown calculation
    maxDrawdown: 70, // Requires historical equity calculation
    consistency: dayWinRate.value || 0
  }
})

const overallZellaScore = computed(() => {
  const vals = Object.values(zellaMetrics.value)
  return vals.reduce((a, b) => a + b, 0) / vals.length
})

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatPercent(value) {
  return Number(value).toFixed(2) + '%'
}

function handleAccountChange(event) {
  journalStore.selectedAccountId = event.target.value
}
</script>

<template>
  <div class="tz-dashboard-page">
    <!-- Header -->
    <header class="tz-header">
      <div class="tz-header-left">
        <h1>{{ $t('dashboard.title') }}</h1>
        <div class="tz-last-import">
          <span>{{ $t('dashboard.last_import') }} {{ $t('dashboard.just_now') }}</span>
          <a href="#" @click.prevent="journalStore.fetchAccounts()" class="tz-resync">{{ $t('dashboard.resync') }}</a>
        </div>
      </div>
      <div class="tz-header-right">
        <!-- Account Selector -->
        <div class="tz-control-group">
          <select 
            class="tz-select" 
            :value="journalStore.selectedAccountId" 
            @change="handleAccountChange"
          >
            <option value="" disabled>{{ $t('dashboard.select_account') }}</option>
            <option v-for="acc in journalStore.accounts" :key="acc.id" :value="acc.id">
              {{ acc.name || acc.login }}
            </option>
          </select>
        </div>
        
        <!-- Date Range -->
        <div class="tz-control-group">
          <select v-model="selectedDateRange" class="tz-select">
            <option value="today">{{ $t('dashboard.ranges.today') }}</option>
            <option value="this_week">{{ $t('dashboard.ranges.this_week') }}</option>
            <option value="this_month">{{ $t('dashboard.ranges.this_month') }}</option>
            <option value="all_time">{{ $t('dashboard.ranges.all_time') }}</option>
          </select>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="journalStore.loading" class="tz-loading">
      Loading your trading data...
    </div>

    <!-- Empty State -->
    <div v-else-if="!journalStore.selectedAccountId" class="tz-empty">
      Please select an MT5 account to view the dashboard.
    </div>

    <!-- Dashboard Content -->
    <div v-else class="tz-dashboard-grid">
      
      <!-- Top Metrics Row -->
      <section class="tz-top-metrics">
        <!-- Net P&L -->
        <div class="tz-metric-card">
          <div class="tz-metric-title">{{ $t('dashboard.metrics.total_pnl') }}</div>
          <div class="tz-metric-value" :class="{ 'text-profit': netPnl >= 0, 'text-loss': netPnl < 0 }">
            {{ formatMoney(netPnl) }}
          </div>
        </div>

        <!-- Trade Win % -->
        <div class="tz-metric-card">
          <div class="tz-metric-title">{{ $t('dashboard.metrics.win_rate') }}</div>
          <div class="tz-metric-value">{{ formatPercent(winRate) }}</div>
        </div>

        <!-- Profit Factor -->
        <div class="tz-metric-card">
          <div class="tz-metric-title">{{ $t('dashboard.metrics.profit_factor') }}</div>
          <div class="tz-metric-value" :class="{ 'text-profit': profitFactor >= 1.0, 'text-loss': profitFactor < 1.0 }">
            {{ profitFactor.toFixed(2) }}
          </div>
        </div>

        <!-- Day Win % -->
        <div class="tz-metric-card">
          <div class="tz-metric-title">{{ $t('dashboard.metrics.day_win_rate') }}</div>
          <div class="tz-metric-value">{{ formatPercent(dayWinRate) }}</div>
        </div>

        <!-- Avg Win/Loss -->
        <div class="tz-metric-card">
          <div class="tz-metric-title">{{ $t('dashboard.metrics.avg_win_loss_ratio', 'Avg win/loss trade') }}</div>
          <div class="tz-metric-value">{{ avgWinLossRatio.toFixed(2) }}</div>
          <div class="tz-metric-sub">
            <span class="text-profit">{{ formatMoney(avgWin) }}</span> / 
            <span class="text-loss">-${{ avgLoss.toFixed(2) }}</span>
          </div>
        </div>
      </section>

      <!-- Middle Row -->
      <section class="tz-middle-row">
        <!-- Radar Chart -->
        <div class="tz-panel tz-panel-radar">
          <div class="tz-panel-header">
            <h3>{{ $t('dashboard.charts.zella_score') }}</h3>
          </div>
          <div class="tz-panel-body">
            <ZellaScoreChart :score="overallZellaScore" :metrics="zellaMetrics" />
          </div>
        </div>

        <!-- Calendar Heatmap -->
        <div class="tz-panel tz-panel-calendar">
          <div class="tz-panel-header">
            <h3>{{ $t('dashboard.charts.progress_heatmap') }}</h3>
          </div>
          <div class="tz-panel-body">
            <ProgressHeatmap :daily-stats="dailyStats" />
          </div>
        </div>

        <!-- Trade Time Performance -->
        <div class="tz-panel tz-panel-time">
          <div class="tz-panel-header">
            <h3>{{ $t('dashboard.charts.detailed_performance', 'Detailed Performance') }}</h3>
          </div>
          <div class="tz-panel-body">
            <TradeTimePerformance :trades="trades" />
          </div>
        </div>
      </section>

      <!-- Bottom Row -->
      <section class="tz-bottom-row">
        
        <!-- Cumulative P&L -->
        <div class="tz-panel tz-panel-cumulative">
          <div class="tz-panel-header">
            <h3>{{ $t('dashboard.charts.cumulative_pnl') }}</h3>
          </div>
          <div class="tz-panel-body">
            <CumulativePnlChart :daily-stats="dailyStats" />
          </div>
        </div>

        <!-- Daily P&L -->
        <div class="tz-panel tz-panel-daily">
          <div class="tz-panel-header">
            <h3>{{ $t('dashboard.charts.daily_pnl') }}</h3>
          </div>
          <div class="tz-panel-body">
            <DailyPnlChart :daily-stats="dailyStats" />
          </div>
        </div>
      </section>

      <!-- Additional Data Row -->
      <section class="tz-data-row">
        <div class="tz-panel tz-panel-full">
          <div class="tz-panel-header">
            <h3>{{ $t('dashboard.tables.recent_trades') }}</h3>
          </div>
          <div class="tz-panel-body">
            <RecentTradesTable :trades="trades.slice(0, 5)" />
          </div>
        </div>
      </section>

      <!-- Detailed Performance Section -->
      <section class="tz-detailed-row">
        <!-- Monthly Calendar (Left, takes 2/3 width) -->
        <div class="tz-cal-container">
          <MonthlyCalendar :daily-stats="dailyStats" />
        </div>

        <!-- Right Side Charts (takes 1/3 width) -->
        <div class="tz-detailed-right">
          <!-- Drawdown Chart -->
          <div class="tz-panel">
            <div class="tz-panel-header">
              <h3>Drawdown <span class="tz-info-icon">ℹ</span></h3>
            </div>
            <div class="tz-panel-body">
              <DrawdownChart :daily-stats="dailyStats" />
            </div>
          </div>

          <!-- Trade Time Performance -->
          <div class="tz-panel">
            <div class="tz-panel-header">
              <h3>Trade time performance <span class="tz-info-icon">ℹ</span></h3>
            </div>
            <div class="tz-panel-body">
              <TradeTimePerformance :trades="trades" />
            </div>
          </div>
        </div>
      </section>
      
    </div>
  </div>
</template>

<style scoped>
/* Dashboard Container */
.tz-dashboard-page {
  padding: 24px;
  background-color: transparent;
  min-height: 100vh;
  color: var(--lf-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow-y: auto;
}

.tz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.tz-header-left h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--lf-text);
}

.tz-last-import {
  font-size: 12px;
  color: var(--lf-text-muted);
  display: flex;
  gap: 8px;
}

.tz-resync {
  color: var(--lf-primary);
  text-decoration: none;
}
.tz-resync:hover { text-decoration: underline; }

.tz-header-right {
  display: flex;
  gap: 12px;
}

.tz-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--lf-border);
  background-color: var(--lf-card);
  color: var(--lf-text);
  font-size: 14px;
  outline: none;
  cursor: pointer;
}
.tz-select:focus { border-color: var(--lf-primary); }

/* Grid Layouts */
.tz-dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Top Metrics Row */
.tz-top-metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.tz-metric-card {
  background: var(--lf-card);
  border: 1px solid var(--lf-border-soft);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.tz-metric-title {
  font-size: 13px;
  color: var(--lf-text-muted);
  margin-bottom: 8px;
  font-weight: 500;
}

.tz-metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--lf-text);
}

.tz-metric-sub {
  font-size: 12px;
  margin-top: 4px;
  font-weight: 500;
}

/* Middle Row */
.tz-middle-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr;
  gap: 16px;
}

/* Bottom Row */
.tz-bottom-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
}

/* Detailed Row (Calendar & Performance) */
.tz-detailed-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.tz-cal-container {
  height: auto;
  min-height: 600px; /* Give it plenty of room to match the screenshot */
}

.tz-detailed-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tz-info-icon {
  font-size: 12px;
  color: var(--lf-text-muted);
  font-weight: normal;
  border: 1px solid var(--lf-border);
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}

/* Panels */
.tz-panel {
  background: var(--lf-card);
  border: 1px solid var(--lf-border-soft);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
}

.tz-panel-header {
  margin-bottom: 16px;
}

.tz-panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--lf-text);
}

.tz-panel-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

.tz-placeholder {
  color: var(--lf-text-muted);
  font-size: 14px;
  font-style: italic;
}

/* Utilities */
.text-profit { color: var(--lf-success) !important; }
.text-loss { color: var(--lf-danger) !important; }

/* Loading & Empty */
.tz-loading, .tz-empty {
  text-align: center;
  padding: 40px;
  color: var(--lf-text-muted);
  background: var(--lf-card);
  border-radius: 12px;
  border: 1px solid var(--lf-border-soft);
}
</style>
