<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
)

const props = defineProps({
  dailyStats: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  // We need to sort dailyStats by date ascending
  const sorted = [...props.dailyStats].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  const labels = []
  const data = []
  let cumulativePnl = 0

  sorted.forEach(day => {
    labels.push(day.date)
    cumulativePnl += day.netProfit
    data.push(cumulativePnl)
  })

  // Determine gradient color based on final PnL
  const isProfit = cumulativePnl >= 0
  const colorStr = isProfit ? '16, 185, 129' : '239, 68, 68' // green or red
  
  return {
    labels,
    datasets: [
      {
        label: 'Cumulative P&L',
        data,
        borderColor: `rgb(${colorStr})`,
        backgroundColor: `rgba(${colorStr}, 0.2)`,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) label += ': ';
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      grid: { display: false },
      ticks: { maxTicksLimit: 5, color: '#888' }
    },
    y: {
      display: true,
      grid: { color: 'rgba(128, 128, 128, 0.15)' },
      ticks: {
        color: '#888',
        callback: function(value) {
          if (value >= 1000 || value <= -1000) return '$' + (value/1000).toFixed(1) + 'k'
          return '$' + value
        }
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
}
</script>

<template>
  <div class="tz-chart-container">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.tz-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
