<template>
  <div class="prop-eval-dashboard">
    <div class="header-actions">
      <h2>{{ t('propEval.dashboardTitle') }}</h2>
      <select v-model="selectedAccountId" @change="loadAccountData" class="account-switcher">
        <option v-for="acc in propAccounts" :key="acc.id" :value="acc.id">
          {{ acc.account_name }} ({{ acc.initial_balance }} {{ acc.currency }})
        </option>
      </select>
    </div>

    <!-- Survival Header Widget -->
    <div v-if="metrics" :class="['survival-widget', survivalStatusClass]">
      <div class="metric-card">
        <span class="label">{{ t('propEval.remainingDailyLoss') }}</span>
        <span :class="['value', metrics.remainingDailyLoss < metrics.dailyLossLimitAmount * 0.2 ? 'red' : 'green']">
          {{ formatCurrency(metrics.remainingDailyLoss) }}
        </span>
      </div>
      <div class="metric-card">
        <span class="label">{{ t('propEval.remainingMaxDrawdown') }}</span>
        <span :class="['value', metrics.remainingMaxDrawdown < metrics.maxDrawdownAmount * 0.2 ? 'red' : 'green']">
          {{ formatCurrency(metrics.remainingMaxDrawdown) }}
        </span>
      </div>
      <div class="metric-card">
        <span class="label">{{ t('propEval.profitTarget') }}</span>
        <span class="value">{{ formatCurrency(metrics.profitTargetAmount) }}</span>
      </div>
      <div class="metric-card">
        <span class="label">{{ t('propEval.passForecast') }}</span>
        <span :class="['value', metrics.passRateForecast > 70 ? 'green' : metrics.passRateForecast < 40 ? 'red' : 'yellow']">
          {{ metrics.passRateForecast.toFixed(1) }}%
        </span>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Chart Area -->
      <div class="chart-section">
        <h3>{{ t('propEval.equityCurve') }}</h3>
        <canvas ref="equityChartRef"></canvas>
      </div>

      <!-- Behavioral Warnings -->
      <div class="behavioral-warnings" v-if="analytics">
        <h3>{{ t('propEval.behavioralWarnings') }}</h3>
        
        <div class="warning-card revenge" v-if="analytics.revengeTrades > 0">
          <h3>{{ t('propEval.warningRevengeTitle') }}</h3>
          <p>{{ t('propEval.warningRevengeDesc', { count: analytics.revengeTrades }) }}</p>
        </div>

        <div class="warning-card time" v-if="worstTradingHour">
          <h3>{{ t('propEval.warningTimeTitle') }}</h3>
          <p>{{ t('propEval.warningTimeDesc', { hour: worstTradingHour.hour, losses: worstTradingHour.losses }) }}</p>
        </div>

        <div class="warning-card" v-if="topMistake">
          <h3>{{ t('propEval.warningMistakeTitle') }}</h3>
          <p>{{ t('propEval.warningMistakeDesc', { mistake: topMistake.tag, count: topMistake.count }) }}</p>
        </div>

        <div v-if="!analytics.revengeTrades && !worstTradingHour && !topMistake" style="color: var(--text-secondary)">
          {{ t('propEval.noWarnings') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '../../composables/useI18n.js'
import Chart from 'chart.js/auto'
import { useUserStore } from '../../stores/useUserStore'
import './prop-evaluation.css'

const { t } = useI18n()
const userStore = useUserStore()

const propAccounts = ref([])
const selectedAccountId = ref(null)
const metrics = ref(null)
const analytics = ref(null)
const equityChartRef = ref(null)
let chartInstance = null

const survivalStatusClass = computed(() => {
  if (!metrics.value) return 'safe'
  if (metrics.value.status === 'failed') return 'danger'
  
  const dailyRatio = metrics.value.remainingDailyLoss / metrics.value.dailyLossLimitAmount
  const maxRatio = metrics.value.remainingMaxDrawdown / metrics.value.maxDrawdownAmount
  
  if (dailyRatio < 0.2 || maxRatio < 0.2) return 'danger'
  if (dailyRatio < 0.5 || maxRatio < 0.5) return 'warning'
  return 'safe'
})

const worstTradingHour = computed(() => {
  if (!analytics.value || !analytics.value.timePerformance) return null
  const badHours = analytics.value.timePerformance.filter(h => h.pnl < 0 && h.losses > 1)
  if (badHours.length === 0) return null
  return badHours.sort((a, b) => a.pnl - b.pnl)[0] // most negative pnl
})

const topMistake = computed(() => {
  if (!analytics.value || !analytics.value.lossMistakes) return null
  const mistakes = Object.entries(analytics.value.lossMistakes)
  if (mistakes.length === 0) return null
  mistakes.sort((a, b) => b[1] - a[1])
  return { tag: mistakes[0][0], count: mistakes[0][1] }
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)
}

const loadAccounts = async () => {
  try {
    // Assuming there is an endpoint to get all accounts, filtering manually here if needed
    // In a real app, this might be /api/trading-accounts?type=PROP_EVAL
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/trading/accounts`, {
      headers: { 'Authorization': `Bearer ${userStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      propAccounts.value = data.filter(acc => acc.account_type === 'prop' || acc.account_type === 'PROP_EVAL')
      if (propAccounts.value.length > 0) {
        selectedAccountId.value = propAccounts.value[0].id
        await loadAccountData()
      }
    }
  } catch (error) {
    console.error('Failed to load accounts', error)
  }
}

const loadAccountData = async () => {
  if (!selectedAccountId.value) return
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
    const headers = { 'Authorization': `Bearer ${userStore.token}` }

    const [metricsRes, analyticsRes] = await Promise.all([
      fetch(`${baseUrl}/prop-accounts/${selectedAccountId.value}/metrics`, { headers }),
      fetch(`${baseUrl}/prop-accounts/${selectedAccountId.value}/analytics`, { headers })
    ])

    if (metricsRes.ok) metrics.value = await metricsRes.json()
    if (analyticsRes.ok) analytics.value = await analyticsRes.json()

    renderChart()
  } catch (error) {
    console.error('Failed to load account data', error)
  }
}

const renderChart = () => {
  if (!equityChartRef.value || !metrics.value) return

  if (chartInstance) {
    chartInstance.destroy()
  }

  // Placeholder data - in a real app, you would pass equity history from the backend
  const labels = ['Start', 'Day 1', 'Day 2', 'Day 3', 'Today']
  const initial = metrics.value.currentTotalDrawdown + metrics.value.profitTargetAmount // Approximate
  const data = [0, 50, -20, 100, metrics.value.currentDailyPnL] 

  chartInstance = new Chart(equityChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Equity Curve',
        data,
        borderColor: '#10b981',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: '#374151' },
          ticks: { color: '#9ca3af' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af' }
        }
      }
    }
  })
}

onMounted(() => {
  loadAccounts()
})
</script>
