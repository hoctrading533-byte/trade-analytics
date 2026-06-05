<template>
  <div class="tj-day-card">
    <div class="tj-day-header" :class="{ 'is-expanded': isExpanded }" @click="isExpanded = !isExpanded">
      <div class="tj-day-title">
        <button class="tj-cal-btn" style="transform: rotate(90deg)" v-if="!isExpanded">›</button>
        <button class="tj-cal-btn" style="transform: rotate(-90deg)" v-else>›</button>
        
        <span class="tj-day-date">{{ formatDate(stat.date) }}</span>
        <span class="tj-day-pnl" :class="stat.netProfit >= 0 ? 'text-success' : 'text-danger'">
          Net P&L {{ formatMoneySigned(stat.netProfit) }}
        </span>
      </div>
      <div>
        <button class="tj-btn-outline" @click.stop="addNote">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Add note
        </button>
      </div>
    </div>
    
    <div class="tj-day-body" v-show="isExpanded">
      <div class="tj-day-metrics">
        <div class="tj-chart-container">
          <Line :data="chartData" :options="chartOptions" v-if="chartData.labels.length" />
        </div>
        
        <div class="tj-metrics-grid">
          <div class="tj-metric">
            <span class="tj-metric-label">Total trades</span>
            <span class="tj-metric-value">{{ stat.totalTrades }}</span>
          </div>
          <div class="tj-metric">
            <span class="tj-metric-label">Winners</span>
            <span class="tj-metric-value text-success">{{ stat.winners }}</span>
          </div>
          <div class="tj-metric">
            <span class="tj-metric-label">Gross P&L</span>
            <span class="tj-metric-value" :class="stat.grossProfit - stat.grossLoss >= 0 ? 'text-success' : 'text-danger'">
              {{ formatMoneySigned(stat.grossProfit - stat.grossLoss) }}
            </span>
          </div>
          <div class="tj-metric">
            <span class="tj-metric-label">Commissions</span>
            <span class="tj-metric-value">{{ formatMoney(stat.commission) }}</span>
          </div>
          
          <div class="tj-metric">
            <span class="tj-metric-label">Winrate</span>
            <span class="tj-metric-value">{{ stat.winRate.toFixed(0) }}%</span>
          </div>
          <div class="tj-metric">
            <span class="tj-metric-label">Losers</span>
            <span class="tj-metric-value text-danger">{{ stat.losers }}</span>
          </div>
          <div class="tj-metric">
            <span class="tj-metric-label">Volume</span>
            <span class="tj-metric-value">{{ stat.volume }}</span>
          </div>
          <div class="tj-metric">
            <span class="tj-metric-label">Profit factor</span>
            <span class="tj-metric-value">{{ stat.profitFactor }}</span>
          </div>
        </div>
      </div>
      
      <JournalTradeTable :trades="stat.trades" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import JournalTradeTable from './JournalTradeTable.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const props = defineProps({
  stat: {
    type: Object,
    required: true
  }
})

const isExpanded = ref(true)

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(val) {
  return Number(val || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatMoneySigned(val) {
  const num = Number(val || 0)
  const sign = num > 0 ? '+' : ''
  return `${sign}${formatMoney(num)}`
}

function addNote() {
  alert('Add note feature is a placeholder. Data is loaded from MT5.')
}

const chartData = computed(() => {
  if (!props.stat.trades || !props.stat.trades.length) return { labels: [], datasets: [] }
  
  // Sort trades old to new for equity curve
  const sorted = [...props.stat.trades].sort((a, b) => new Date(a.exitTime || a.closeTime) - new Date(b.exitTime || b.closeTime))
  
  const labels = ['Start']
  const data = [0]
  let currentPnl = 0
  
  sorted.forEach(t => {
    labels.push('')
    currentPnl += Number(t.profit || t.netProfit || 0)
    data.push(currentPnl)
  })
  
  const isProfit = currentPnl >= 0
  
  return {
    labels,
    datasets: [
      {
        data,
        borderColor: isProfit ? '#10b981' : '#ef4444',
        backgroundColor: isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.2
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false }
  },
  scales: {
    x: { display: false },
    y: { display: true, position: 'right', border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } }
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
}
</script>
