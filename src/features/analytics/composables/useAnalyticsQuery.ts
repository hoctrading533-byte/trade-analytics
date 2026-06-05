import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { useAnalyticsUIStore } from '../stores/useAnalyticsUIStore';

// Mocking the axios import for architecture demonstration
const fetchAnalyticsServerState = async (accountId: number, start: Date, end: Date) => {
  // In a real app: return axios.get(`/api/v2/analytics/${accountId}?start=${start}&end=${end}`)
  console.log(`[Vue Query] Fetching heavy server state for Account ${accountId}`);
  return {
    netProfit: 12500.50,
    winRate: 64.2,
    psychTimeline: [
      { time: Date.now() - 86400000, state: 'CALM', color: 'blue' },
      { time: Date.now(), state: 'CONFIDENT', color: 'green' }
    ]
  };
};

export function useAnalyticsQuery() {
  const uiStore = useAnalyticsUIStore();

  // Vue Query automatically tracks dependencies and refetches when they change
  return useQuery({
    queryKey: computed(() => ['analytics', uiStore.selectedAccountId, uiStore.dateRange]),
    queryFn: async () => {
      if (!uiStore.selectedAccountId) return null;
      return fetchAnalyticsServerState(
        uiStore.selectedAccountId, 
        uiStore.dateRange.start, 
        uiStore.dateRange.end
      );
    },
    enabled: computed(() => uiStore.selectedAccountId !== null), // Only run if account is selected
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2
  });
}
