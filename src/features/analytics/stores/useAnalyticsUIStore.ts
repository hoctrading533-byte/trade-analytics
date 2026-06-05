import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Enterprise Architecture Rule:
 * This Pinia store ONLY manages synchronous Client/UI state.
 * It does NOT fetch or store Server State (trades, metrics). Server state is handled by Vue Query.
 */
export const useAnalyticsUIStore = defineStore('analyticsUI', () => {
  const selectedAccountId = ref<number | null>(null);
  
  // Default to Last 30 Days
  const dateRange = ref<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const activeTab = ref<'overview' | 'psychology' | 'assets'>('overview');

  function setDateRange(start: Date, end: Date) {
    dateRange.value = { start, end };
  }

  function setAccount(id: number) {
    selectedAccountId.value = id;
  }

  return {
    selectedAccountId,
    dateRange,
    activeTab,
    setDateRange,
    setAccount
  };
});
