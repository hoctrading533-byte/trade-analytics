<template>
  <div class="tj-calendar">
    <div class="tj-cal-header">
      <button class="tj-cal-btn" @click="prevMonth">‹</button>
      <span class="tj-cal-month">{{ currentMonthLabel }}</span>
      <button class="tj-cal-btn" @click="nextMonth">›</button>
    </div>
    
    <div class="tj-cal-grid">
      <div class="tj-cal-day-name" v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="day">{{ day }}</div>
      
      <div 
        v-for="(cell, index) in calendarCells" 
        :key="index" 
        class="tj-cal-cell" 
        :class="{
          'empty': cell.empty,
          'is-win': !cell.empty && cell.stat && cell.stat.netProfit >= 0,
          'is-loss': !cell.empty && cell.stat && cell.stat.netProfit < 0
        }"
        :title="!cell.empty && cell.stat ? `Net P&L: ${cell.stat.netProfit}` : ''"
      >
        <span v-if="!cell.empty">{{ cell.day }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useJournalStore } from '../../stores/useJournalStore.js'

const journalStore = useJournalStore()

const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

const currentMonthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const calendarCells = computed(() => {
  const cells = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
  const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  
  for (let i = 0; i < firstDay; i++) {
    cells.push({ empty: true })
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const stat = journalStore.dailyStats.find(s => s.date === dStr)
    
    cells.push({
      empty: false,
      day: i,
      dateStr: dStr,
      stat: stat || null
    })
  }
  
  return cells
})
</script>
