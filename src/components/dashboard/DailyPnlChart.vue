<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip
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
  const backgroundColors = []

  sorted.forEach(day => {
    labels.push(day.date)
    data.push(day.netProfit)
    backgroundColors.push(day.netProfit >= 0 ? '#10b981' : '#ef4444')
  })

  return {
    labels,
    datasets: [
      {
        label: 'Daily Net P&L',
        data,
        backgroundColor: backgroundColors,
        borderRadius: 4
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
      ticks: { maxTicksLimit: 10, color: '#888' }
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
  }
}
</script>

<template>
  <div class="tz-chart-container">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.tz-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
