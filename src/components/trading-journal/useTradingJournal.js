import { ref, computed, onMounted } from 'vue'
import { apiRequest } from '../../lib/api.js'
import { useUserStore } from '../../stores/useUserStore.js'
import { fetchMt5MockPayload } from '../../mocks/mt5MockApi.js'
import { enrichTrade, computeTradingMetrics } from '../../lib/tradingMetrics.js'

export function useTradingJournal() {
  const userStore = useUserStore()
  const loading = ref(true)
  const error = ref('')
  
  const activeTab = ref('calendar')
  const rawTrades = ref([])
  
  const enrichedTrades = computed(() => {
    return [...rawTrades.value].map(t => {
      const enriched = enrichTrade(t)
      // Merge local tags and notes
      const localData = localTradeData.value[enriched.id] || {}
      enriched.strategyTag = localData.strategyTag || enriched.strategyTag || ''
      enriched.setupTag = localData.setupTag || enriched.setupTag || ''
      enriched.mistakes = localData.mistakes || []
      enriched.notes = localData.notes || ''
      return enriched
    }).sort((a, b) => {
      const tA = new Date(a.exitTime || a.closeAt || a.entryTime || a.openTime || Date.now()).getTime()
      const tB = new Date(b.exitTime || b.closeAt || b.entryTime || b.openTime || Date.now()).getTime()
      return tB - tA
    })
  })

  const filter = ref({
    symbol: '',
    side: ''
  })

  // Selected trade for drill-down modal
  const selectedTrade = ref(null)
  
  // Local storage for trade tags and notes
  const localTradeData = ref(JSON.parse(localStorage.getItem('luminafox_trade_notes') || '{}'))

  const paginatedTrades = computed(() => {
    let filtered = enrichedTrades.value
    if (filter.value.symbol) {
      filtered = filtered.filter(t => (t.symbol || '').toLowerCase().includes(filter.value.symbol.toLowerCase()))
    }
    if (filter.value.side) {
      filtered = filtered.filter(t => t.side === filter.value.side)
    }
    return filtered
  })

  const currentDate = ref(new Date())

  const prevMonth = () => {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
  }

  const nextMonth = () => {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
  }

  const currentMonthLabel = computed(() => {
    return currentDate.value.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  })

  const currentMonthTrades = computed(() => {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    return enrichedTrades.value.filter(t => {
      const d = new Date(t.exitTime || t.closeAt || t.entryTime || t.openTime || Date.now())
      return d.getFullYear() === year && d.getMonth() === month
    })
  })

  const monthlySummary = computed(() => computeTradingMetrics(currentMonthTrades.value))

  const calendarCells = computed(() => {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const tradesByDate = {}
    currentMonthTrades.value.forEach(t => {
      const d = new Date(t.exitTime || t.closeAt || t.entryTime || t.openTime || Date.now())
      // Fix timezone offset for string grouping
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      const dateStr = d.toISOString().split('T')[0]
      if (!tradesByDate[dateStr]) tradesByDate[dateStr] = { pnl: 0, count: 0, trades: [] }
      tradesByDate[dateStr].pnl += Number(t.pnl || 0)
      tradesByDate[dateStr].count += 1
      tradesByDate[dateStr].trades.push(t)
    })

    const cells = []
    for (let i = 0; i < firstDay.getDay(); i++) {
      cells.push({ empty: true })
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(Date.UTC(year, month, i))
      const dateStr = d.toISOString().split('T')[0]
      const dayData = tradesByDate[dateStr] || { pnl: 0, count: 0, trades: [] }
      
      cells.push({
        empty: false,
        day: i,
        date: dateStr,
        pnl: dayData.pnl,
        count: dayData.count,
        trades: dayData.trades
      })
    }

    return cells
  })

  // Trade Details Actions
  function openTrade(trade) {
    selectedTrade.value = { 
      ...trade,
      mistakes: Array.isArray(trade.mistakes) ? [...trade.mistakes] : [],
      setupTag: trade.setupTag || '',
      strategyTag: trade.strategyTag || '',
      notes: trade.notes || ''
    }
  }

  function closeTrade() {
    selectedTrade.value = null
  }

  function saveTradeDetails() {
    if (!selectedTrade.value || !selectedTrade.value.id) return
    const id = selectedTrade.value.id
    localTradeData.value[id] = {
      strategyTag: selectedTrade.value.strategyTag,
      setupTag: selectedTrade.value.setupTag,
      mistakes: selectedTrade.value.mistakes,
      notes: selectedTrade.value.notes
    }
    localStorage.setItem('luminafox_trade_notes', JSON.stringify(localTradeData.value))
    closeTrade()
  }

  async function loadData() {
    loading.value = true
    error.value = ''
    try {
      const headers = userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
      const analysisData = await apiRequest('/api/trading/exness/analysis', { headers }).catch(() => null)
      if (analysisData && analysisData.hasData && analysisData.tradeBook && Array.isArray(analysisData.tradeBook.trades)) {
        rawTrades.value = analysisData.tradeBook.trades
      } else {
        const mockData = await fetchMt5MockPayload()
        rawTrades.value = mockData.trades || []
      }
    } catch (e) {
      error.value = e.message || 'Failed to load trades.'
    } finally {
      loading.value = false
    }
  }

  onMounted(loadData)

  return {
    loading,
    error,
    activeTab,
    filter,
    paginatedTrades,
    currentDate,
    prevMonth,
    nextMonth,
    currentMonthLabel,
    monthlySummary,
    calendarCells,
    selectedTrade,
    openTrade,
    closeTrade,
    saveTradeDetails
  }
}
