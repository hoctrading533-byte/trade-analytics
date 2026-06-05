<template>
  <div class="tj-filter-bar">
    <div class="tj-filter-group">
      <select class="tj-select" v-model="journalStore.selectedAccountId">
        <option v-for="acc in journalStore.accounts" :key="acc.id" :value="acc.id">
          {{ acc.accountName }} ({{ acc.loginId }})
        </option>
        <option v-if="!journalStore.accounts.length" value="" disabled>No accounts connected</option>
      </select>
    </div>
    
    <div class="tj-filter-group" style="flex: 1; max-width: 300px; margin: 0 16px;">
      <input type="text" class="tj-input" style="width: 100%" placeholder="Search symbol, ticket..." v-model="journalStore.searchQuery" />
    </div>
    
    <div class="tj-filter-group">
      <span style="font-size: 13px; color: var(--text-secondary)">Date range</span>
      <input type="date" class="tj-input" v-model="journalStore.dateFrom" />
      <span style="font-size: 13px; color: var(--text-secondary)">to</span>
      <input type="date" class="tj-input" v-model="journalStore.dateTo" />
      <button class="tj-btn-outline" @click="resetFilters">Reset</button>
    </div>
  </div>
</template>

<script setup>
import { useJournalStore } from '../../stores/useJournalStore.js'

const journalStore = useJournalStore()

function resetFilters() {
  journalStore.dateFrom = ''
  journalStore.dateTo = ''
  journalStore.searchQuery = ''
}
</script>
