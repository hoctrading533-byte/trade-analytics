<script setup>
import { computed } from 'vue'

const props = defineProps({
  dailyStats: {
    type: Array,
    default: () => []
  }
})

// Generate a grid of the last 90 days
const days = computed(() => {
  const result = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Create map of PnL by date string (YYYY-MM-DD)
  const pnlMap = {}
  props.dailyStats.forEach(d => {
    // Assuming d.date is 'YYYY-MM-DD'
    pnlMap[d.date] = d.netProfit
  })
  
  // Go back 90 days
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().split('T')[0]
    
    let value = null
    let level = 0 // 0: no data, 1-4: profit, -1 to -4: loss
    
    if (pnlMap[dateStr] !== undefined) {
      value = pnlMap[dateStr]
      if (value > 500) level = 4
      else if (value > 100) level = 3
      else if (value > 0) level = 2
      else if (value === 0) level = 1
      else if (value > -100) level = -2
      else if (value > -500) level = -3
      else level = -4
    }
    
    result.push({
      date: dateStr,
      value,
      level,
      dateObj: d
    })
  }
  return result
})

// Calculate grid columns for month labels
const months = computed(() => {
  const result = []
  let lastMonth = -1
  let colIndex = 0
  
  days.value.forEach((day, i) => {
    if (i % 7 === 0) colIndex++ // New column
    const m = day.dateObj.getMonth()
    if (m !== lastMonth) {
      if (i > 0 || day.dateObj.getDate() < 15) { // Only add if enough space
        result.push({ name: day.dateObj.toLocaleDateString('en', { month: 'short' }), col: colIndex })
      }
      lastMonth = m
    }
  })
  return result
})

function getColorClass(level) {
  if (level === 0) return 'tz-heat-0'
  if (level > 0) return `tz-heat-p${level}` // profit
  return `tz-heat-n${Math.abs(level)}` // loss
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
</script>

<template>
  <div class="tz-heatmap-wrap">
    <div class="tz-heatmap-months">
      <span v-for="(m, i) in months" :key="i" :style="{ gridColumn: m.col }">{{ m.name }}</span>
    </div>
    
    <div class="tz-heatmap-body">
      <div class="tz-heatmap-days-y">
        <span>Mon</span>
        <span>Wed</span>
        <span>Fri</span>
      </div>
      
      <div class="tz-heatmap-grid">
        <div 
          v-for="(day, index) in days" 
          :key="index" 
          class="tz-heat-cell"
          :class="getColorClass(day.level)"
          :title="`${day.date}: ${day.value !== null ? formatMoney(day.value) : 'No trades'}`"
        ></div>
      </div>
    </div>
    
    <div class="tz-heatmap-legend">
      <span>Loss</span>
      <div class="tz-legend-colors">
        <div class="tz-heat-cell tz-heat-n4"></div>
        <div class="tz-heat-cell tz-heat-n2"></div>
        <div class="tz-heat-cell tz-heat-0"></div>
        <div class="tz-heat-cell tz-heat-p2"></div>
        <div class="tz-heat-cell tz-heat-p4"></div>
      </div>
      <span>Profit</span>
    </div>
  </div>
</template>

<style scoped>
.tz-heatmap-wrap {
  width: 100%;
  font-size: 12px;
  color: var(--lf-text-muted);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tz-heatmap-months {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  padding-left: 30px;
}

.tz-heatmap-body {
  display: flex;
  gap: 8px;
}

.tz-heatmap-days-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
  height: 108px; /* 7 cells * 12px + 6 gap * 4px = 108px */
}

.tz-heatmap-grid {
  display: grid;
  grid-template-columns: repeat(13, 1fr);
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: 4px;
}

.tz-heat-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background-color: var(--lf-border-soft);
}

.tz-heat-cell:hover {
  outline: 1px solid var(--lf-text-muted);
  outline-offset: 1px;
}

/* Colors matching the TradeZella green/red theme */
.tz-heat-0 { background-color: var(--lf-border-soft); } /* gray */

.tz-heat-p1 { background-color: rgba(16, 185, 129, 0.2); } /* light green */
.tz-heat-p2 { background-color: rgba(16, 185, 129, 0.4); }
.tz-heat-p3 { background-color: rgba(16, 185, 129, 0.7); }
.tz-heat-p4 { background-color: rgba(16, 185, 129, 1); } /* dark green */

.tz-heat-n1 { background-color: rgba(239, 68, 68, 0.2); } /* light red */
.tz-heat-n2 { background-color: rgba(239, 68, 68, 0.4); }
.tz-heat-n3 { background-color: rgba(239, 68, 68, 0.7); }
.tz-heat-n4 { background-color: rgba(239, 68, 68, 1); } /* dark red */

.tz-heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
}

.tz-legend-colors {
  display: flex;
  gap: 4px;
}
</style>
