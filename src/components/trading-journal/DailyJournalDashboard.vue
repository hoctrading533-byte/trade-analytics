<template>
  <div class="tj-journal-page">
    <FilterBar />
    
    <div v-if="journalStore.loading" class="tj-empty-state">
      <div class="tz-spinner" style="margin-bottom: 12px;"></div>
      <p>Loading MT5 Data...</p>
    </div>
    
    <div v-else-if="journalStore.error" class="tj-empty-state">
      <p class="text-danger">{{ journalStore.error }}</p>
    </div>
    
    <div v-else-if="!journalStore.selectedAccountId" class="tj-empty-state">
      <p>Please select an MT5 account from the top bar to view your Daily Journal.</p>
    </div>
    
    <div v-else-if="!journalStore.filteredDailyStats.length" class="tj-empty-state">
      <p>No trades found for this account in the selected date range.</p>
    </div>
    
    <div v-else class="tj-journal-content">
      <!-- Left Panel: Daily Cards -->
      <div class="tj-daily-feed">
        <JournalDayCard 
          v-for="stat in journalStore.filteredDailyStats" 
          :key="stat.date" 
          :stat="stat" 
        />
      </div>
      
      <!-- Right Panel: Calendar & Summary -->
      <div class="tj-side-panel">
        <JournalCalendar />
        
        <!-- Summary Box -->
        <div class="tj-day-card" style="padding: 16px;">
          <h3 style="margin: 0 0 16px 0; font-size: 14px;">Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="tj-metric">
              <span class="tj-metric-label">Net P&L</span>
              <span class="tj-metric-value" :class="summary.netProfit >= 0 ? 'text-success' : 'text-danger'">
                {{ formatMoneySigned(summary.netProfit) }}
              </span>
            </div>
            <div class="tj-metric">
              <span class="tj-metric-label">Win Rate</span>
              <span class="tj-metric-value">{{ summary.winRate }}%</span>
            </div>
            <div class="tj-metric">
              <span class="tj-metric-label">Total Trades</span>
              <span class="tj-metric-value">{{ summary.totalTrades }}</span>
            </div>
            <div class="tj-metric">
              <span class="tj-metric-label">Profit Factor</span>
              <span class="tj-metric-value">{{ summary.profitFactor }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useJournalStore } from '../../stores/useJournalStore.js'
import FilterBar from './FilterBar.vue'
import JournalDayCard from './JournalDayCard.vue'
import JournalCalendar from './JournalCalendar.vue'
import './journal.css'

const journalStore = useJournalStore()

const summary = computed(() => journalStore.aggregatedSummary)

function formatMoneySigned(val) {
  const num = Number(val || 0)
  const sign = num > 0 ? '+' : ''
  return `${sign}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

onMounted(() => {
  journalStore.fetchAccounts()
  journalStore.startRealtimeSync()
})

onUnmounted(() => {
  journalStore.stopRealtimeSync()
})
</script>
