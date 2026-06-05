<script setup>
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const props = defineProps({
  score: {
    type: Number,
    default: 0
  },
  metrics: {
    type: Object,
    default: () => ({
      consistency: 0,
      profitFactor: 0,
      avgWinLoss: 0,
      recoveryFactor: 0,
      maxDrawdown: 0,
      winRate: 0
    })
  }
})

const chartData = computed(() => {
  return {
    labels: ['Win %', 'Profit factor', 'Avg win/loss', 'Recovery factor', 'Max drawdown', 'Consistency'],
    datasets: [
      {
        label: 'Your Zella Score',
        data: [
          props.metrics.winRate,
          props.metrics.profitFactor,
          props.metrics.avgWinLoss,
          props.metrics.recoveryFactor,
          props.metrics.maxDrawdown,
          props.metrics.consistency
        ],
        backgroundColor: 'rgba(139, 92, 246, 0.2)', // Purple matching TradeZella
        borderColor: 'rgba(139, 92, 246, 1)',
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    r: {
      angleLines: { display: true, color: 'rgba(128, 128, 128, 0.2)' },
      grid: { color: 'rgba(128, 128, 128, 0.2)' },
      pointLabels: {
        font: { size: 11, family: 'system-ui' },
        color: '#888'
      },
      ticks: {
        display: false,
        min: 0,
        max: 100
      }
    }
  }
}
</script>

<template>
  <div class="tz-radar-container">
    <div class="tz-radar-wrapper">
      <Radar :data="chartData" :options="chartOptions" />
    </div>
    
    <div class="tz-score-bar">
      <div class="tz-score-label">Your Zella Score</div>
      <div class="tz-score-value">{{ props.score.toFixed(2) }}</div>
      
      <div class="tz-gradient-bar">
        <div class="tz-gradient-marker" :style="{ left: props.score + '%' }"></div>
        <div class="tz-gradient-labels">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tz-radar-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.tz-radar-wrapper {
  flex: 1;
  position: relative;
  min-height: 200px;
}

.tz-score-bar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.tz-score-label {
  font-size: 12px;
  color: #64748b;
}

.tz-score-value {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.tz-gradient-bar {
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%);
  position: relative;
  margin-top: 12px;
}

.tz-gradient-marker {
  position: absolute;
  top: -4px;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border: 2px solid #0f172a;
  border-radius: 50%;
  transform: translateX(-50%);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.tz-gradient-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 10px;
  color: #94a3b8;
}
</style>
