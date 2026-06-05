<template>
<div class="tz-dashboard-page">
  <header class="tz-header">
    <div class="tz-header-left">
      <h1>{{ $t('analytics.title') }}</h1>
      <div class="tz-last-import">
        <span>{{ $t('analytics.subtitle') }}</span>
      </div>
    </div>
    <div class="tz-header-right">
      <!-- Theme knob if needed, but App.vue might already handle global theme -->
    </div>
  </header>

  <div class="tz-dashboard-content" style="padding-top: 24px; padding-bottom: 60px;">
    <!-- Error Boundary -->
    <div v-if="renderError" style="background: rgba(255,0,0,0.1); color: #ff3366; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ff3366;">
      <h3>Runtime Error!</h3>
      <pre>{{ renderError.message }}</pre>
    </div>

    <!-- Skeleton Loading State -->
    <div v-if="loading" style="padding: 20px;">
      <div class="skeleton-pulse" style="height: 100px; background: var(--lf-card-bg); border-radius: 12px; margin-bottom: 16px;"></div>
      <div class="an-r2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="skeleton-pulse" style="height: 200px; background: var(--lf-card-bg); border-radius: 12px;"></div>
        <div class="skeleton-pulse" style="height: 200px; background: var(--lf-card-bg); border-radius: 12px;"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!currentDayStat && !tradeRows.length" class="empty-state">
      <div style="font-size: 40px; margin-bottom: 16px;">📊</div>
      <h3 style="font-size: 16px; margin-bottom: 8px;">{{ $t('analytics.no_data') }}</h3>
      <p style="color: var(--lf-text-muted); font-size: 13px;">{{ $t('analytics.no_data_desc') }}</p>
    </div>

    <!-- Daily Report Content -->
    <template v-else-if="currentDayStat">
      <!-- Daily Header -->
      <div class="daily-header">
        <div class="daily-nav">
          <button class="nav-btn" @click="prevDay" :disabled="currentIndex >= availableDates.length - 1">‹</button>
          <h2 class="daily-title">
            {{ formattedDate }}
            <span :class="currentDayStat.netProfit >= 0 ? 'pos' : 'neg'" style="margin-left: 12px;">
              {{ $t('analytics.net_pnl') }} {{ money(currentDayStat.netProfit || 0) }}
            </span>
          </h2>
          <button class="nav-btn" @click="nextDay" :disabled="currentIndex <= 0">›</button>
        </div>
        <button class="tz-btn-outline">✎ {{ $t('analytics.add_note') }}</button>
      </div>

      <!-- Top Panel (Chart + Metrics) -->
      <div class="daily-top-panel">
        <div class="equity-chart-container">
          <canvas ref="eqChartRef"></canvas>
        </div>
        
        <div class="metrics-grid">
          <div class="metric">
            <div class="m-label">{{ $t('analytics.metrics.total_trades') }}</div>
            <div class="m-val">{{ currentDayStat.totalTrades || 0 }}</div>
            <div class="m-label" style="margin-top: 16px;">{{ $t('analytics.metrics.winrate') }}</div>
            <div class="m-val">{{ winrate }}%</div>
          </div>
          <div class="metric">
            <div class="m-label">{{ $t('analytics.metrics.winners') }}</div>
            <div class="m-val pos">{{ currentDayStat.winners || 0 }}</div>
            <div class="m-label" style="margin-top: 16px;">{{ $t('analytics.metrics.losers') }}</div>
            <div class="m-val neg">{{ currentDayStat.losers || 0 }}</div>
          </div>
          <div class="metric">
            <div class="m-label">{{ $t('analytics.metrics.gross_pnl') }}</div>
            <div class="m-val" :class="(currentDayStat.grossProfit || 0) >= 0 ? 'pos' : 'neg'">
              {{ money(currentDayStat.grossProfit || 0) }}
            </div>
            <div class="m-label" style="margin-top: 16px;">{{ $t('analytics.metrics.volume') }}</div>
            <div class="m-val">{{ (currentDayStat.volume || 0).toFixed(2) }}</div>
          </div>
          <div class="metric">
            <div class="m-label">{{ $t('analytics.metrics.commissions') }}</div>
            <div class="m-val">{{ money(currentDayStat.commission || 0) }}</div>
            <div class="m-label" style="margin-top: 16px;">{{ $t('analytics.metrics.profit_factor') }}</div>
            <div class="m-val">{{ profitFactor }}</div>
          </div>
        </div>
      </div>

      <!-- AI Daily Summary -->
      <div class="tz-card neon-card" style="margin-bottom: 24px; padding: 20px;">
        <div class="card-title mb-3" style="display: flex; align-items: center; gap: 8px; color: var(--lf-primary);">
          <span style="font-size: 18px;">✨</span> <span>{{ $t('analytics.ai_summary.title') }}</span>
        </div>
        <div style="font-size: 14px; line-height: 1.6; color: var(--lf-text-body);">
          <p style="margin-bottom: 12px;">{{ aiDailySummary.summary }}</p>
          <div v-if="aiDailySummary.action" style="background: rgba(255,0,127,0.1); padding: 12px; border-left: 3px solid var(--lf-primary); border-radius: 4px;">
            <strong>💡 {{ $t('analytics.ai_summary.actionable_habit') }}</strong> {{ aiDailySummary.action }}
          </div>
        </div>
      </div>

      <!-- Trades Table -->
      <div class="tz-card pnl-chart-card neon-card">
        <div class="table-container" style="overflow-x: auto; padding-bottom: 24px;">
          <table class="tz-table" style="min-width: 900px; width: 100%;">
            <thead>
              <tr>
                <th>{{ $t('analytics.table.symbol') }}</th>
                <th>{{ $t('analytics.table.side') }}</th>
                <th>{{ $t('analytics.table.open_time') }}</th>
                <th>{{ $t('analytics.table.close_time') }}</th>
                <th>{{ $t('analytics.table.entry_price') }}</th>
                <th>{{ $t('analytics.table.exit_price') }}</th>
                <th>{{ $t('analytics.table.volume') }}</th>
                <th>{{ $t('analytics.table.commission') }}</th>
                <th style="text-align: right;">{{ $t('analytics.table.net_pnl') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trade in dailyTrades" :key="trade.ticket" @click="openTradeModal(trade)" class="hover-row">
                <td>{{ trade.symbol }}</td>
                <td>
                  <span :class="getSideString(trade) === 'buy' ? 'pos-bg' : 'neg-bg'" style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
                    {{ getSideString(trade).toUpperCase() }}
                  </span>
                </td>
                <td>{{ getDealOpenTime(trade) }}</td>
                <td>{{ getDealCloseTime(trade) }}</td>
                <td>{{ getDealEntryPrice(trade) }}</td>
                <td>{{ getDealExitPrice(trade) }}</td>
                <td>{{ trade.volume }}</td>
                <td>{{ money(trade.commission || trade.fee || 0) }}</td>
                <td style="text-align: right; font-weight: 700; font-family: monospace;" :class="(trade.pnl || 0) >= 0 ? 'pos' : 'neg'">
                  {{ (trade.pnl || 0) >= 0 ? '+' : '' }}{{ money(trade.pnl || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>

  <!-- Isolated Trade Analysis Modal -->
  <div v-if="selectedTrade" class="modal-overlay" @click="selectedTrade = null">
    <div class="neon-modal" @click.stop>
      <div class="modal-header">
        <h2>{{ $t('analytics.modal.title') }} #{{ selectedTrade.ticket }}</h2>
        <button @click="selectedTrade = null" class="close-btn">×</button>
      </div>
      
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-item"><span>{{ $t('analytics.modal.symbol') }}</span><strong>{{ selectedTrade.symbol }}</strong></div>
          <div class="detail-item"><span>{{ $t('analytics.modal.side') }}</span>
            <strong :class="getSideString(selectedTrade) === 'buy' ? 'pos' : 'neg'">{{ getSideString(selectedTrade).toUpperCase() }}</strong>
          </div>
          <div class="detail-item"><span>{{ $t('analytics.modal.volume') }}</span><strong>{{ selectedTrade.volume || 0 }} {{ $t('analytics.modal.lots') }}</strong></div>
          <div class="detail-item"><span>{{ $t('analytics.modal.hold_duration') }}</span><strong>{{ ((selectedTrade.duration || 0) / 60).toFixed(1) }} {{ $t('analytics.modal.mins') }}</strong></div>
          <div class="detail-item"><span>{{ $t('analytics.modal.net_pnl') }}</span>
            <strong style="font-size: 16px;" :class="(selectedTrade.pnl || 0) >= 0 ? 'pos' : 'neg'">
              {{ (selectedTrade.pnl || 0) >= 0 ? '+' : '' }}{{ money(selectedTrade.pnl || 0) }}
            </strong>
          </div>
        </div>

        <div class="ai-reason-box" :class="selectedTradeInsight.type === 'POSITIVE' ? 'ai-pos' : 'ai-neg'">
          <div class="ai-reason-title">
            <span v-if="selectedTradeInsight.type === 'POSITIVE'">✅ {{ $t('analytics.modal.positive_execution') }}</span>
            <span v-else>⚠️ {{ $t('analytics.modal.behavioral_warning') }}</span>
          </div>
          <div class="ai-reason-text">{{ selectedTradeInsight.message }}</div>
        </div>
      </div>
    </div>
  </div>

</div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onErrorCaptured } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useJournalStore } from '../stores/useJournalStore.js'
import { enrichTrade } from '../lib/tradingMetrics.js'

Chart.register(...registerables)

const journalStore = useJournalStore()
const loading = computed(() => journalStore.loading)
const tradeRows = computed(() => journalStore.filteredTrades || [])
let eqChartInstance = null

const renderError = ref(null)
onErrorCaptured((err) => {
  renderError.value = err
  console.error('Analytics Error:', err)
  return false // prevent propagating
})

const eqChartRef = ref(null)
const selectedTrade = ref(null)
const selectedTradeInsight = ref({ type: 'POSITIVE', message: '' })

// Safe Side formatting for MT5 types (type 0 = buy, type 1 = sell)
function getSideString(trade) {
  if (!trade) return 'unknown'
  if (trade.side) return String(trade.side).toLowerCase()
  if (trade.type !== undefined) {
    if (String(trade.type) === '0') return 'buy'
    if (String(trade.type) === '1') return 'sell'
  }
  return 'unknown'
}

// Navigation
const availableDates = computed(() => {
  if (!journalStore.dailyStats) return []
  return [...journalStore.dailyStats].sort((a, b) => {
    const da = new Date(a.date || 0)
    const db = new Date(b.date || 0)
    return (isNaN(db.getTime()) ? 0 : db) - (isNaN(da.getTime()) ? 0 : da)
  }) // newest first
})

const currentIndex = ref(0)

const currentDayStat = computed(() => {
  if (availableDates.value.length === 0) return null
  if (currentIndex.value >= availableDates.value.length) currentIndex.value = availableDates.value.length - 1
  if (currentIndex.value < 0) currentIndex.value = 0
  return availableDates.value[currentIndex.value]
})

function prevDay() {
  if (currentIndex.value < availableDates.value.length - 1) currentIndex.value++
}

function nextDay() {
  if (currentIndex.value > 0) currentIndex.value--
}

const formattedDate = computed(() => {
  if (!currentDayStat.value || !currentDayStat.value.date) return ''
  try {
    const d = new Date(currentDayStat.value.date)
    if (isNaN(d.getTime())) return currentDayStat.value.date
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  } catch(e) { return currentDayStat.value.date }
})

function money(val) {
  const n = Number(val) || 0;
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTime(val) {
  if (!val) return '--:--:--'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    return d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (e) {
    return val
  }
}

function formatPrice(p) {
  if (p === undefined || p === null || p === '--') return '--'
  const n = Number(p)
  if (isNaN(n)) return p
  return parseFloat(n.toFixed(5)).toString()
}

function getDealOpenTime(trade) {
  if (trade.openTime) return formatTime(trade.openTime)
  if (trade.entryTime) return formatTime(trade.entryTime)
  if (trade.time && trade.entry === 0) return formatTime(trade.time * (trade.time < 1e12 ? 1000 : 1))
  if (trade.time && typeof trade.entry === 'undefined') return formatTime(trade.time * (trade.time < 1e12 ? 1000 : 1))
  return '--:--:--'
}

function getDealCloseTime(trade) {
  if (trade.closeTime) return formatTime(trade.closeTime)
  if (trade.exitTime) return formatTime(trade.exitTime)
  if (trade.time && trade.entry === 1) return formatTime(trade.time * (trade.time < 1e12 ? 1000 : 1))
  return '--:--:--'
}

function getDealEntryPrice(trade) {
  if (trade.entryPrice !== undefined && trade.entryPrice !== null) return formatPrice(trade.entryPrice)
  if (trade.price !== undefined && trade.price !== null && trade.entry === 0) return formatPrice(trade.price)
  if (trade.price !== undefined && trade.price !== null && typeof trade.entry === 'undefined') return formatPrice(trade.price)
  return '--'
}

function getDealExitPrice(trade) {
  if (trade.exitPrice !== undefined && trade.exitPrice !== null) return formatPrice(trade.exitPrice)
  if (trade.price !== undefined && trade.price !== null && trade.entry === 1) return formatPrice(trade.price)
  return '--'
}

// Metrics
const winrate = computed(() => {
  if (!currentDayStat.value || !currentDayStat.value.totalTrades) return 0
  return (((currentDayStat.value.winners || 0) / currentDayStat.value.totalTrades) * 100).toFixed(0)
})

const profitFactor = computed(() => {
  if (!currentDayStat.value) return 0
  const gl = Math.abs(currentDayStat.value.grossLoss || 0)
  if (gl === 0) return currentDayStat.value.grossProfit > 0 ? 99.99 : 0
  return ((currentDayStat.value.grossProfit || 0) / gl).toFixed(2)
})

const dailyTrades = computed(() => {
  if (!currentDayStat.value) return []
  const dateStr = currentDayStat.value.date
  return tradeRows.value
    .filter(t => {
      try {
        const d = new Date(t.closeTime || t.exitTime || t.openTime || Date.now())
        if (isNaN(d.getTime())) return false
        const tDate = d.toISOString().split('T')[0]
        return tDate === dateStr
      } catch (e) {
        return false
      }
    })
    .map(t => enrichTrade(t))
    .sort((a, b) => {
      const da = new Date(a.closeTime || a.exitTime || 0)
      const db = new Date(b.closeTime || b.exitTime || 0)
      return (isNaN(da.getTime()) ? 0 : da) - (isNaN(db.getTime()) ? 0 : db)
    })
})

// AI logic
const aiDailySummary = computed(() => {
  if (!currentDayStat.value) return { summary: '', action: '' }
  
  const total = currentDayStat.value.totalTrades || 0
  const pnl = currentDayStat.value.netProfit || 0
  const wr = Number(winrate.value) || 0
  
  let summary = `You executed ${total} trades today, resulting in a Net P&L of ${money(pnl)}.`
  let action = ''
  
  if (wr >= 60 && pnl > 0) {
    summary += ` Excellent precision and strong profitability. You demonstrated good discipline by letting winners run.`
    action = `Keep doing what you are doing. Review your winning setups to reinforce positive patterns.`
  } else if (wr < 50 && pnl < 0) {
    summary += ` Tough session. The market was either uncooperative or execution was poor. Your win rate dropped below optimal levels.`
    action = `Review your losses to see if they were forced setups. Consider reducing risk tomorrow.`
  } else if (total > 15 && pnl <= 0) {
    summary += ` High volume of trades (${total}) with no meaningful profit. This indicates overtrading or churning.`
    action = `Set a strict limit of 3 trades per session tomorrow.`
  } else {
    summary += ` An average session. Focus on eliminating the unnecessary losses to improve the profit factor.`
  }
  
  return { summary, action }
})

function openTradeModal(trade) {
  selectedTrade.value = trade
  
  // Isolated Analysis
  const durationMins = (trade.duration || 0) / 60
  let type = 'POSITIVE'
  let message = 'Standard execution. Risk was managed appropriately.'
  
  if ((trade.pnl || 0) < 0) {
    if (durationMins > 240) {
      type = 'WARNING'
      message = `You held this losing trade for ${durationMins.toFixed(0)} minutes. Holding onto losers in hope they turn around is a massive account killer. Cut losses quickly.`
    } else if ((trade.volume || 0) > ((currentDayStat.value.volume || 0) / (currentDayStat.value.totalTrades || 1) * 2)) {
      type = 'WARNING'
      message = `Oversized position detected. Volume (${trade.volume}) was significantly larger than your daily average. Overleveraging leads to emotional decisions.`
    } else {
      type = 'WARNING'
      message = `Standard loss. Ensure this was taken according to your predefined trading plan and Stop Loss.`
    }
  } else {
    if (durationMins < 1) {
      type = 'WARNING'
      message = `Scalp win (held for < 1 min). Ensure you aren't cutting winners too early out of fear.`
    } else {
      message = `Great job executing your plan. Letting winners play out is the key to a high profit factor.`
    }
  }
  
  selectedTradeInsight.value = { type, message }
}

function buildEquityChart() {
  if (eqChartInstance) {
    eqChartInstance.destroy()
    eqChartInstance = null
  }
  
  if (!eqChartRef.value || dailyTrades.value.length === 0) return
  
  const ctx = eqChartRef.value.getContext('2d')
  
  const eq = [0] // Start at 0 for daily isolated equity
  let current = 0
  const labels = ['Start']
  
  dailyTrades.value.forEach((t, i) => {
    current += (t.pnl || 0)
    eq.push(current)
    labels.push(`#${i+1}`)
  })
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 200)
  gradient.addColorStop(0, 'rgba(255, 0, 127, 0.4)')
  gradient.addColorStop(1, 'rgba(255, 0, 127, 0.0)')

  eqChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Equity',
        data: eq,
        borderColor: '#FF007F',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: '#FF007F'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: 'var(--lf-text-muted)', font: { size: 10 } } },
        y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: 'var(--lf-text-muted)', font: { size: 10, family: 'monospace' }, callback: v => money(v) } }
      }
    }
  })
}

watch(currentDayStat, () => {
  nextTick(() => buildEquityChart())
})

onMounted(async () => {
  if (!journalStore.accounts || journalStore.accounts.length === 0) {
    await journalStore.fetchAccounts()
  }
  nextTick(() => buildEquityChart())
})
</script>

<style scoped>
/* Leverage global Dashboard CSS by wrapping it in .tz-dashboard-page */
.daily-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.daily-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav-btn {
  background: var(--lf-card-bg);
  border: 1px solid var(--lf-border-color);
  color: var(--lf-text-body);
  font-size: 20px;
  line-height: 1;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-btn:hover:not(:disabled) {
  border-color: var(--lf-primary);
  color: var(--lf-primary);
}
.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.daily-title {
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.daily-top-panel {
  display: grid;
  grid-template-columns: 2.5fr 1fr;
  gap: 0;
  background: var(--lf-card-bg);
  border: 1px solid var(--lf-border-color);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
}

.equity-chart-container {
  padding: 24px;
  border-right: 1px solid var(--lf-border-color);
  height: 250px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}
.metric {
  padding: 16px 20px;
  border-bottom: 1px solid var(--lf-border-color);
  border-right: 1px solid var(--lf-border-color);
}
.metric:nth-child(2n) { border-right: none; }
.metric:nth-last-child(-n+2) { border-bottom: none; }

.m-label {
  font-size: 11px;
  color: var(--lf-text-muted);
  margin-bottom: 4px;
  font-weight: 600;
}
.m-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--lf-text-title);
  font-family: monospace;
}

.pos { color: #00FF9D !important; }
.neg { color: #FF003C !important; }

/* Neon Cards and Tables */
.neon-card {
  box-shadow: 0 6px 20px rgba(255, 0, 127, 0.15), 0 2px 10px rgba(0,0,0,0.5);
  border: 1px solid rgba(255, 0, 127, 0.3);
  border-radius: 12px;
  background: var(--lf-card-bg);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  z-index: 1;
}

.neon-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(255, 0, 127, 0.25), 0 8px 20px rgba(0,0,0,0.6);
  z-index: 2;
}

.tz-table th {
  text-align: left;
  padding: 12px 16px;
  color: var(--lf-primary);
  font-weight: 700;
  border-bottom: 1px solid var(--lf-border-color);
  position: sticky;
  top: 0;
  background: #0d0d0d;
  backdrop-filter: blur(10px);
  z-index: 5;
}

.hover-row {
  cursor: pointer;
  transition: background 0.2s;
}
.hover-row:hover {
  background: rgba(255,0,127,0.05);
}

.pos-bg { background: rgba(0, 255, 157, 0.1); color: #00FF9D; }
.neg-bg { background: rgba(255, 0, 60, 0.1); color: #FF003C; }

/* Modal CSS */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.neon-modal {
  background: var(--lf-card-bg);
  border: 1px solid var(--lf-primary);
  box-shadow: 0 0 30px rgba(255,0,127,0.2);
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--lf-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--lf-bg-body);
}
.modal-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--lf-primary);
}
.close-btn {
  background: none;
  border: none;
  color: var(--lf-text-muted);
  font-size: 24px;
  cursor: pointer;
  transition: color 0.2s;
}
.close-btn:hover { color: #FF003C; }
.modal-body {
  padding: 20px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.detail-item {
  display: flex;
  flex-direction: column;
}
.detail-item span {
  font-size: 11px;
  color: var(--lf-text-muted);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.detail-item strong {
  font-size: 14px;
  font-family: monospace;
}

.ai-reason-box {
  padding: 16px;
  border-radius: 12px;
  background: var(--lf-bg-body);
}
.ai-pos { border-left: 4px solid #00FF9D; box-shadow: 0 0 10px rgba(0, 255, 157, 0.1); }
.ai-neg { border-left: 4px solid #FFC000; box-shadow: 0 0 10px rgba(255, 192, 0, 0.1); }

.ai-reason-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}
.ai-pos .ai-reason-title { color: #00FF9D; }
.ai-neg .ai-reason-title { color: #FFC000; }
.ai-reason-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--lf-text-body);
}

.skeleton-pulse { animation: pulse 1.5s infinite; }
@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 0.8; }
  100% { opacity: 0.5; }
}
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; background: var(--lf-card-bg); border: 1px dashed var(--lf-border-color); border-radius: 16px; margin: 20px; padding: 40px; }
</style>
