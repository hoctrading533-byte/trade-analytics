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
  const sorted = [...props.dailyStats].sort((a, b) => new Date(a.date) - new Date(b.date))
  
  const labels = []
  const data = []
  
  // A simple mock drawdown calculation:
  // Drawdown = Current cumulative - Peak cumulative
  let cumulative = 0
  let peak = 0
  
  sorted.forEach(day => {
    labels.push(day.date)
    cumulative += day.netProfit
    if (cumulative > peak) {
      peak = cumulative
    }
    const drawdown = cumulative - peak
    data.push(drawdown)
  })

  // We want to fill the area under the line to 0, since drawdown is negative
  return {
    labels,
    datasets: [
      {
        label: 'Drawdown',
        data,
        borderColor: 'rgba(239, 68, 68, 1)', // Red line
        backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red fill
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
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
  min-height: 200px;
}
</style>
