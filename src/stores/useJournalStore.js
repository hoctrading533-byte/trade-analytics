import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from './useUserStore.js'

export const useJournalStore = defineStore('journal', () => {
  const userStore = useUserStore()
  
  const loading = ref(false)
  const error = ref('')
  
  // Accounts
  const accounts = ref([])
  const selectedAccountId = ref(null)
  
  const dailyStats = ref([])
  const rawTrades = ref([])
  const totalTradesFound = ref(0)
  const accountSnapshot = ref({})
  
  // Filters
  const dateFrom = ref('')
  const dateTo = ref('')
  const searchQuery = ref('')
  
  const authHeader = () => {
    return userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
  }
  
  async function fetchAccounts(silent = false) {
    if (!silent) loading.value = true
    try {
      const data = await apiRequest(`/api/mt5/accounts?_t=${Date.now()}`, { headers: authHeader() })
      
      const newAccountsJson = JSON.stringify(data?.accounts || [])
      const oldAccountsJson = JSON.stringify(accounts.value)
      
      if (newAccountsJson !== oldAccountsJson) {
        accounts.value = data?.accounts || []
        // Auto select first active account if none selected
        if (!selectedAccountId.value && accounts.value.length > 0) {
          selectedAccountId.value = accounts.value[0].id
        }
      }
    } catch (err) {
      if (!silent) error.value = err.message || 'Error fetching accounts'
    } finally {
      if (!silent) loading.value = false
    }
  }

  let lastFetchedRawTradesJson = null;
  let lastFetchedAccountJson = null;

  async function fetchJournalData(silent = false) {
    if (!selectedAccountId.value) {
      dailyStats.value = []
      rawTrades.value = []
      totalTradesFound.value = 0
      accountSnapshot.value = {}
      return
    }

    if (!silent) loading.value = true
    error.value = null
    try {
      const data = await apiRequest(`/api/journal/data/${selectedAccountId.value}?_t=${Date.now()}`, { headers: authHeader() })
      
      const newRawTradesJson = JSON.stringify(data.rawTrades || [])
      const newAccountJson = JSON.stringify(data.accountSnapshot || {})
      
      function mergeDealsIntoTrades(deals) {
        const positions = {};
        for (const d of deals) {
          if (d.type === 2) continue;
          const pid = d.position_id || d.ticket;
          if (!positions[pid]) {
            positions[pid] = {
              id: pid,
              symbol: d.symbol || '',
              type: d.type,
              volume: 0,
              profit: 0,
              commission: 0,
              fee: 0,
              openTime: null,
              closeTime: null,
              entryPrice: null,
              exitPrice: null,
              inVolume: 0,
              outVolume: 0,
              inCost: 0,
              outCost: 0
            };
          }
          const p = positions[pid];
          p.profit += (d.profit || 0) + (d.swap || 0);
          p.commission += d.commission || 0;
          p.fee += d.fee || 0;
          p.volume = Math.max(p.volume, d.volume);
          
          if (d.entry === 0) {
            if (!p.openTime || d.time * 1000 < p.openTime) p.openTime = d.time * 1000;
            p.inVolume += d.volume;
            p.inCost += d.price * d.volume;
            p.type = d.type;
          } else if (d.entry === 1) {
            if (!p.closeTime || d.time * 1000 > p.closeTime) p.closeTime = d.time * 1000;
            p.outVolume += d.volume;
            p.outCost += d.price * d.volume;
          }
        }
        return Object.values(positions).map(p => {
          if (p.inVolume > 0) p.entryPrice = p.inCost / p.inVolume;
          if (p.outVolume > 0) p.exitPrice = p.outCost / p.outVolume;
          p.time = p.openTime || p.closeTime;
          p.pnl = p.profit + p.commission + p.fee;
          return p;
        }).sort((a, b) => b.time - a.time);
      }

      if (newRawTradesJson !== lastFetchedRawTradesJson || newAccountJson !== lastFetchedAccountJson) {
        lastFetchedRawTradesJson = newRawTradesJson;
        lastFetchedAccountJson = newAccountJson;
        
        const merged = mergeDealsIntoTrades(data.rawTrades || []);
        
        const statsMap = {};
        for (const t of merged) {
          const d = new Date(t.time || Date.now());
          const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          if (!statsMap[dateStr]) {
            statsMap[dateStr] = {
              date: dateStr,
              trades: [],
              totalTrades: 0,
              winners: 0,
              losers: 0,
              grossProfit: 0,
              grossLoss: 0,
              netProfit: 0,
              volume: 0
            };
          }
          const s = statsMap[dateStr];
          s.trades.push(t);
          s.totalTrades++;
          s.volume += (t.volume || 0);
          if (t.pnl >= 0) {
            s.winners++;
            s.grossProfit += t.pnl;
          } else {
            s.losers++;
            s.grossLoss += Math.abs(t.pnl);
          }
          s.netProfit += t.pnl;
        }
        
        const statsArray = Object.values(statsMap);
        for (const s of statsArray) {
          s.winRate = s.totalTrades > 0 ? (s.winners / s.totalTrades) * 100 : 0;
          s.profitFactor = s.grossLoss > 0 ? (s.grossProfit / s.grossLoss).toFixed(2) : (s.grossProfit > 0 ? "999" : "0.00");
        }
        
        dailyStats.value = statsArray.sort((a,b) => b.date.localeCompare(a.date));
        totalTradesFound.value = merged.length;
        accountSnapshot.value = data.accountSnapshot || {};
        rawTrades.value = merged;
      }
    } catch (err) {
      if (!silent) error.value = err.message || 'Error fetching journal data'
      console.error('Failed to fetch journal data:', err)
    } finally {
      if (!silent) loading.value = false
    }
  }

  let syncInterval = null
  
  function startRealtimeSync() {
    stopRealtimeSync()
    syncInterval = setInterval(() => {
      fetchAccounts(true)
      if (selectedAccountId.value) {
        fetchJournalData(true)
      }
    }, 3000) // Poll every 3 seconds for near real-time updates
  }
  
  function stopRealtimeSync() {
    if (syncInterval) {
      clearInterval(syncInterval)
      syncInterval = null
    }
  }

  // Auto fetch data when account changes
  watch(selectedAccountId, () => {
    if (selectedAccountId.value) {
      fetchJournalData()
      startRealtimeSync()
    }
  })

  // Getters
  const filteredDailyStats = computed(() => {
    let result = dailyStats.value
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.map(d => {
        const filteredTrades = d.trades.filter(t => {
          return (t.symbol && t.symbol.toLowerCase().includes(q)) || 
                 (t.ticket && String(t.ticket).includes(q))
        })
        return { ...d, trades: filteredTrades }
      }).filter(d => d.trades.length > 0)
    }
    
    if (dateFrom.value) {
      result = result.filter(d => d.date >= dateFrom.value)
    }
    if (dateTo.value) {
      result = result.filter(d => d.date <= dateTo.value)
    }
    return result
  })

  const filteredTrades = computed(() => {
    const trades = []
    filteredDailyStats.value.forEach(d => {
      if (d.trades && Array.isArray(d.trades)) {
        trades.push(...d.trades)
      }
    })
    return trades
  })
  
  const aggregatedSummary = computed(() => {
    const stats = filteredDailyStats.value
    let net = 0, gross = 0, loss = 0, wins = 0, trades = 0, vol = 0, comm = 0
    stats.forEach(d => {
      net += d.netProfit
      gross += d.grossProfit
      loss += d.grossLoss
      wins += d.winners
      trades += d.totalTrades
      vol += d.volume
      comm += d.commission
    })
    const winRate = trades > 0 ? (wins / trades) * 100 : 0
    const pf = loss > 0 ? (gross / loss) : (gross > 0 ? 999 : 0)
    
    return {
      netProfit: Number(net.toFixed(2)),
      grossProfit: Number(gross.toFixed(2)),
      grossLoss: Number(loss.toFixed(2)),
      totalTrades: trades,
      winners: wins,
      losers: trades - wins,
      winRate: Number(winRate.toFixed(2)),
      volume: Number(vol.toFixed(2)),
      commission: Number(comm.toFixed(2)),
      profitFactor: Number(pf.toFixed(2))
    }
  })

  return {
    loading,
    error,
    accounts,
    selectedAccountId,
    dailyStats,
    rawTrades,
    filteredDailyStats,
    filteredTrades,
    aggregatedSummary,
    totalTradesFound,
    accountSnapshot,
    dateFrom,
    dateTo,
    searchQuery,
    fetchAccounts,
    fetchJournalData,
    startRealtimeSync,
    stopRealtimeSync
  }
})
