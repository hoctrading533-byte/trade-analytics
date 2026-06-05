<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  dailyStats: {
    type: Array,
    default: () => []
  }
})

const currentDate = ref(new Date())

const currentMonth = computed(() => currentDate.value.getMonth())
const currentYear = computed(() => currentDate.value.getFullYear())

const currentMonthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1)
}

function formatMoney(val) {
  if (val >= 1000 || val <= -1000) return '$' + (val / 1000).toFixed(2) + 'K'
  return '$' + Math.abs(val).toFixed(2) // We'll add - sign separately for style
}

function getStatForDate(dateStr) {
  return props.dailyStats.find(s => s.date === dateStr)
}

const calendarCells = computed(() => {
  const cells = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
  const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  
  // Fill empty cells before the 1st
  for (let i = 0; i < firstDay; i++) {
    cells.push({ empty: true })
  }
  
  // Fill actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const stat = getStatForDate(dStr)
    
    let winRate = 0
    if (stat && stat.totalTrades > 0) {
      winRate = (stat.winners / stat.totalTrades) * 100
    }

    cells.push({
      empty: false,
      day: i,
      dateStr: dStr,
      stat: stat || null,
      winRate
    })
  }
  
  // Fill empty cells after the last day to complete the grid (up to 42 cells = 6 rows of 7)
  const totalCells = cells.length
  const remaining = 42 - totalCells
  for (let i = 0; i < remaining; i++) {
    cells.push({ empty: true })
  }
  
  // Group into weeks for the weekly stats
  const weeks = []
  for (let i = 0; i < 6; i++) {
    const weekCells = cells.slice(i * 7, (i + 1) * 7)
    // Only add week if it has actual days from this month
    if (weekCells.some(c => !c.empty)) {
      
      let weekNet = 0
      let daysTraded = 0
      weekCells.forEach(c => {
        if (!c.empty && c.stat) {
          weekNet += c.stat.netProfit
          daysTraded++
        }
      })
      
      weeks.push({
        cells: weekCells,
        weekNet,
        daysTraded
      })
    }
  }
  
  return weeks
})

const monthlyNet = computed(() => {
  return calendarCells.value.reduce((sum, w) => sum + w.weekNet, 0)
})
const monthlyDaysTraded = computed(() => {
  return calendarCells.value.reduce((sum, w) => sum + w.daysTraded, 0)
})

</script>

<template>
  <div class="tz-monthly-calendar">
    <div class="tz-cal-toolbar">
      <div class="tz-cal-nav">
        <button class="tz-btn-icon" @click="prevMonth">‹</button>
        <span class="tz-cal-title">{{ currentMonthLabel }}</span>
        <button class="tz-btn-icon" @click="nextMonth">›</button>
        <button class="tz-btn-outline">This month</button>
      </div>
      
      <div class="tz-cal-stats-summary">
        <span class="text-muted">Monthly stats:</span>
        <span class="tz-badge-green" :class="{'tz-badge-red': monthlyNet < 0}">
          {{ monthlyNet >= 0 ? '' : '-' }}{{ formatMoney(monthlyNet) }}
        </span>
        <span class="text-muted">{{ monthlyDaysTraded }} days</span>
      </div>
    </div>
    
    <div class="tz-cal-content">
      <!-- Calendar Grid -->
      <div class="tz-cal-grid-wrapper">
        <div class="tz-cal-header">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        
        <div class="tz-cal-body">
          <div v-for="(week, wIdx) in calendarCells" :key="wIdx" class="tz-cal-row">
            <div v-for="(cell, cIdx) in week.cells" :key="cIdx" class="tz-cal-cell" :class="{ 'is-empty': cell.empty, 'is-profit': cell.stat && cell.stat.netProfit >= 0, 'is-loss': cell.stat && cell.stat.netProfit < 0 }">
              <template v-if="!cell.empty">
                <span class="tz-cell-date">{{ cell.day }}</span>
                <div v-if="cell.stat" class="tz-cell-data">
                  <div class="tz-cell-pnl">
                    {{ cell.stat.netProfit >= 0 ? '' : '-' }}{{ formatMoney(cell.stat.netProfit) }}
                  </div>
                  <div class="tz-cell-trades">{{ cell.stat.totalTrades }} trade{{ cell.stat.totalTrades > 1 ? 's' : '' }}</div>
                  <div class="tz-cell-winrate">{{ cell.winRate.toFixed(1) }}%</div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Weekly Stats Column -->
      <div class="tz-cal-weekly-stats">
        <div class="tz-weekly-header"></div> <!-- Spacer to align with days header -->
        <div v-for="(week, wIdx) in calendarCells" :key="'w'+wIdx" class="tz-weekly-card">
          <div class="tz-weekly-label">Week {{ wIdx + 1 }}</div>
          <div class="tz-weekly-val" :class="{'text-profit': week.weekNet >= 0, 'text-loss': week.weekNet < 0}">
            {{ week.weekNet >= 0 ? '' : '-' }}{{ formatMoney(week.weekNet) }}
          </div>
          <div class="tz-weekly-days">{{ week.daysTraded }} day{{ week.daysTraded !== 1 ? 's' : '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tz-monthly-calendar {
  background: var(--lf-card);
  border: 1px solid var(--lf-border-soft);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.tz-cal-toolbar {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--lf-border-soft);
}

.tz-cal-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tz-btn-icon {
  background: transparent;
  border: none;
  color: var(--lf-text);
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
}
.tz-btn-icon:hover { color: var(--lf-primary); }

.tz-cal-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--lf-text);
  min-width: 120px;
  text-align: center;
}

.tz-btn-outline {
  background: transparent;
  border: 1px solid var(--lf-border);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--lf-text-muted);
  cursor: pointer;
}

.tz-cal-stats-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.text-muted { color: var(--lf-text-muted); }

.tz-badge-green {
  background: rgba(16, 185, 129, 0.1);
  color: var(--lf-success);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.tz-badge-red {
  background: rgba(239, 68, 68, 0.1);
  color: var(--lf-danger);
}

.tz-cal-content {
  display: flex;
  flex: 1;
  padding: 20px;
  gap: 20px;
}

.tz-cal-grid-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tz-cal-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--lf-text-muted);
  margin-bottom: 8px;
}

.tz-cal-body {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--lf-border-soft);
  border-left: 1px solid var(--lf-border-soft);
  flex: 1;
}

.tz-cal-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
}

.tz-cal-cell {
  border-right: 1px solid var(--lf-border-soft);
  border-bottom: 1px solid var(--lf-border-soft);
  padding: 8px;
  position: relative;
  min-height: 80px;
  display: flex;
  flex-direction: column;
}

.tz-cal-cell.is-empty {
  background-color: var(--lf-bg-soft);
}

.tz-cal-cell.is-profit {
  background-color: rgba(16, 185, 129, 0.1);
}
.tz-cal-cell.is-loss {
  background-color: rgba(239, 68, 68, 0.1);
}

.tz-cell-date {
  font-size: 12px;
  color: var(--lf-text-muted);
  text-align: right;
  width: 100%;
}

.tz-cell-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  text-align: center;
}

.tz-cell-pnl {
  font-weight: 700;
  font-size: 14px;
  color: var(--lf-text);
}

.tz-cell-trades, .tz-cell-winrate {
  font-size: 11px;
  color: var(--lf-text-muted);
}

/* Weekly Stats */
.tz-cal-weekly-stats {
  width: 120px;
  display: flex;
  flex-direction: column;
}

.tz-weekly-header {
  height: 27px; /* Align with days header */
}

.tz-weekly-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--lf-border-soft);
  border-radius: 8px;
  margin-bottom: 8px; /* Need to match rows, actually better to just rely on flex distribution */
  padding: 8px;
}
.tz-weekly-card:last-child { margin-bottom: 0; }

.tz-weekly-label {
  font-size: 11px;
  color: var(--lf-text-muted);
}

.tz-weekly-val {
  font-size: 15px;
  font-weight: 700;
  margin: 4px 0;
}

.text-profit { color: var(--lf-success); }
.text-loss { color: var(--lf-danger); }

.tz-weekly-days {
  font-size: 11px;
  color: var(--lf-text-muted);
  background: var(--lf-bg-soft);
  padding: 2px 6px;
  border-radius: 10px;
}
</style>
