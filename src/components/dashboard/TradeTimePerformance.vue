<script setup>
import { computed } from 'vue'
import { Scatter } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip
} from 'chart.js'
// We might need an adapter for time scale, but we can simulate it with a simple linear scale of hours (0-24)

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip
)

const props = defineProps({
  trades: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  const winData = []
  const lossData = []
  
  props.trades.forEach(trade => {
    // Determine time of day in decimal hours (e.g. 14:30 = 14.5)
    // We assume trade.entryTime or trade.exitTime or trade.closeAt exists
    const timeStr = trade.entryTime || trade.exitTime || trade.closeAt || trade.time
    if (!timeStr) return
    
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) return
    
    const hour = date.getHours() + (date.getMinutes() / 60)
    
    const pnl = trade.pnl || trade.profit || 0
    const point = { x: hour, y: pnl, trade }
    
    if (pnl >= 0) {
      winData.push(point)
    } else {
      lossData.push(point)
    }
  })

  return {
    datasets: [
      {
        label: 'Winning Trades',
        data: winData,
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // green
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Losing Trades',
        data: lossData,
        backgroundColor: 'rgba(239, 68, 68, 0.7)', // red
        pointRadius: 4,
        pointHoverRadius: 6
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
      callbacks: {
        label: function(context) {
          const trade = context.raw.trade;
          const pnlStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw.y);
          
          // Format hours back to HH:mm
          const hours = Math.floor(context.raw.x);
          const mins = Math.floor((context.raw.x - hours) * 60);
          const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          
          return `${trade.symbol || 'Trade'} @ ${timeStr}: ${pnlStr}`;
        }
      }
    }
  },
  scales: {
    x: {
      type: 'linear',
      position: 'bottom',
      min: 0,
      max: 24,
      grid: { display: false },
      ticks: {
        color: '#888',
        stepSize: 4,
        callback: function(value) {
          return String(value).padStart(2, '0') + ':00';
        }
      }
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
    <Scatter :data="chartData" :options="chartOptions" />
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
