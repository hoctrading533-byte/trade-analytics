import { computed, onMounted, reactive, ref } from 'vue'
import { apiRequest } from '../../lib/api.js'
import { useUserStore } from '../../stores/useUserStore.js'

function todayInput() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function emptyForm() {
  return {
    id: null,
    accountId: '',
    symbol: 'XAUUSD',
    assetClass: 'forex',
    side: 'LONG',
    status: 'closed',
    entryTime: todayInput(),
    exitTime: todayInput(),
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    volume: '',
    fees: 0,
    session: 'London',
    strategyTag: '',
    emotionTag: '',
    setupTag: '',
    customTagsText: '',
    notes: '',
    source: 'manual',
    importRef: '',
    mae: 0,
    mfe: 0
  }
}

function toInputDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function toNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

export function useTradingJournal() {
  const userStore = useUserStore()
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const accounts = ref([])
  const trades = ref([])
  const summary = ref({
    totalTrades: 0,
    closedTrades: 0,
    winRate: 0,
    avgRr: 0,
    profitFactor: 0,
    expectancy: 0,
    netPnl: 0
  })

  const filter = reactive({
    accountId: '',
    symbol: '',
    dateFrom: '',
    dateTo: '',
    tag: ''
  })

  const accountForm = reactive({
    name: '',
    broker: '',
    market: 'multi',
    currency: 'USD'
  })

  const form = reactive(emptyForm())
  const authHeaders = computed(() => (userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}))
  const isEdit = computed(() => Boolean(form.id))
  const tradePreview = computed(() => {
    const entry = toNumber(form.entryPrice)
    const exit = toNumber(form.exitPrice)
    const stopLoss = toNumber(form.stopLoss)
    const takeProfit = toNumber(form.takeProfit)
    const volume = toNumber(form.volume)
    const fees = Math.max(0, toNumber(form.fees))
    const direction = form.side === 'SHORT' ? -1 : 1
    const isClosed = form.status === 'closed' && entry > 0 && exit > 0 && volume > 0
    const pnl = isClosed ? Number((((exit - entry) * volume * direction) - fees).toFixed(2)) : 0
    const riskPerUnit = entry > 0 && stopLoss > 0 ? Math.abs(entry - stopLoss) : 0
    const rewardPerUnit = entry > 0 && takeProfit > 0 ? Math.abs(takeProfit - entry) : 0
    const riskAmount = riskPerUnit > 0 && volume > 0 ? Number((riskPerUnit * volume).toFixed(2)) : 0
    const rewardAmount = rewardPerUnit > 0 && volume > 0 ? Number((rewardPerUnit * volume).toFixed(2)) : 0
    const rr = isClosed && riskAmount > 0 ? Number((pnl / riskAmount).toFixed(4)) : 0
    const plannedRr = riskPerUnit > 0 && rewardPerUnit > 0 ? Number((rewardPerUnit / riskPerUnit).toFixed(4)) : 0

    return {
      pnl,
      rr,
      plannedRr,
      riskAmount,
      rewardAmount,
      isClosed,
      outcome: pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Breakeven'
    }
  })

  function setMessage({ error = '', success = '' } = {}) {
    errorMessage.value = error
    successMessage.value = success
  }

  function resetForm() {
    Object.assign(form, emptyForm())
    form.accountId = accounts.value[0]?.id || ''
  }

  function tradePayload() {
    return {
      accountId: Number(form.accountId || 0),
      symbol: form.symbol,
      assetClass: form.assetClass,
      side: form.side,
      status: form.status,
      entryTime: form.entryTime,
      exitTime: form.status === 'closed' ? form.exitTime : '',
      entryPrice: Number(form.entryPrice || 0),
      exitPrice: form.status === 'closed' ? Number(form.exitPrice || 0) : 0,
      stopLoss: Number(form.stopLoss || 0),
      takeProfit: Number(form.takeProfit || 0),
      volume: Number(form.volume || 0),
      fees: Number(form.fees || 0),
      session: form.session,
      strategyTag: form.strategyTag,
      emotionTag: form.emotionTag,
      setupTag: form.setupTag,
      customTags: form.customTagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      notes: form.notes,
      source: form.source,
      importRef: form.importRef,
      mae: Number(form.mae || 0),
      mfe: Number(form.mfe || 0)
    }
  }

  function validateForm() {
    if (!form.accountId) return 'Select an account.'
    if (!String(form.symbol || '').trim()) return 'Symbol is required.'
    if (!['LONG', 'SHORT'].includes(form.side)) return 'Side must be LONG or SHORT.'
    if (!['closed', 'open'].includes(form.status)) return 'Status must be Open or Closed.'
    if (!form.entryTime || Number.isNaN(new Date(form.entryTime).getTime())) return 'Entry time is invalid.'
    if (!(Number(form.entryPrice) > 0)) return 'Entry price must be greater than 0.'
    if (!(Number(form.volume) > 0)) return 'Volume must be greater than 0.'
    if (form.status === 'closed' && !(Number(form.exitPrice) > 0)) return 'Closed trade requires exit price.'
    if (form.status === 'closed' && (!form.exitTime || Number.isNaN(new Date(form.exitTime).getTime()))) {
      return 'Closed trade requires a valid exit time.'
    }
    if (form.status === 'closed' && form.exitTime && form.entryTime && new Date(form.exitTime) < new Date(form.entryTime)) {
      return 'Exit time cannot be before entry time.'
    }
    for (const [label, value] of [
      ['Stop loss', form.stopLoss],
      ['Take profit', form.takeProfit],
      ['Fees', form.fees],
      ['MAE', form.mae],
      ['MFE', form.mfe]
    ]) {
      const number = Number(value || 0)
      if (!Number.isFinite(number) || number < 0) return `${label} cannot be negative.`
    }
    return ''
  }

  async function loadAccounts() {
    const payload = await apiRequest('/api/journal/accounts', { headers: authHeaders.value })
    accounts.value = payload.accounts || []
    if (!form.accountId && accounts.value.length) form.accountId = accounts.value[0].id
  }

  function queryString() {
    const params = new URLSearchParams()
    if (filter.accountId) params.set('accountId', filter.accountId)
    if (filter.symbol.trim()) params.set('symbol', filter.symbol.trim())
    if (filter.dateFrom) params.set('dateFrom', filter.dateFrom)
    if (filter.dateTo) params.set('dateTo', filter.dateTo)
    if (filter.tag.trim()) params.set('tag', filter.tag.trim())
    return params.toString()
  }

  async function loadTrades() {
    const qs = queryString()
    const payload = await apiRequest(`/api/journal/trades${qs ? `?${qs}` : ''}`, { headers: authHeaders.value })
    trades.value = payload.trades || []
    summary.value = payload.summary || summary.value
  }

  async function refreshAll() {
    loading.value = true
    setMessage()
    try {
      await loadAccounts()
      await loadTrades()
    } catch (error) {
      setMessage({ error: error.message || 'Cannot load journal.' })
    } finally {
      loading.value = false
    }
  }

  async function createAccount() {
    const name = accountForm.name.trim()
    if (!name) return setMessage({ error: 'Account name is required.' })
    if (accountForm.currency && !/^[a-zA-Z]{3,8}$/.test(accountForm.currency.trim())) {
      return setMessage({ error: 'Currency must be 3-8 letters.' })
    }
    saving.value = true
    setMessage()
    try {
      const payload = await apiRequest('/api/journal/accounts', {
        method: 'POST',
        headers: authHeaders.value,
        body: JSON.stringify(accountForm)
      })
      accounts.value = [...accounts.value, payload.account]
      form.accountId = payload.account.id
      accountForm.name = ''
      accountForm.broker = ''
      accountForm.market = 'multi'
      accountForm.currency = 'USD'
      setMessage({ success: 'Account created.' })
    } catch (error) {
      setMessage({ error: error.message || 'Cannot create account.' })
    } finally {
      saving.value = false
    }
  }

  async function saveTrade() {
    const validation = validateForm()
    if (validation) return setMessage({ error: validation })
    saving.value = true
    setMessage()
    try {
      const endpoint = isEdit.value ? `/api/journal/trades/${form.id}` : '/api/journal/trades'
      await apiRequest(endpoint, {
        method: isEdit.value ? 'PATCH' : 'POST',
        headers: authHeaders.value,
        body: JSON.stringify(tradePayload())
      })
      await loadTrades()
      resetForm()
      setMessage({ success: isEdit.value ? 'Trade updated.' : 'Trade added.' })
    } catch (error) {
      setMessage({ error: error.message || 'Cannot save trade.' })
    } finally {
      saving.value = false
    }
  }

  function editTrade(trade) {
    Object.assign(form, {
      id: trade.id,
      accountId: trade.accountId,
      symbol: trade.symbol,
      assetClass: trade.assetClass || 'forex',
      side: trade.side,
      status: trade.status,
      entryTime: toInputDateTime(trade.entryTime),
      exitTime: toInputDateTime(trade.exitTime) || todayInput(),
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice || '',
      stopLoss: trade.stopLoss || '',
      takeProfit: trade.takeProfit || '',
      volume: trade.volume,
      fees: trade.fees || 0,
      session: trade.session || '',
      strategyTag: trade.strategyTag || '',
      emotionTag: trade.emotionTag || '',
      setupTag: trade.setupTag || '',
      customTagsText: (trade.customTags || []).join(', '),
      notes: trade.notes || '',
      source: trade.source || 'manual',
      importRef: trade.importRef || '',
      mae: trade.mae || 0,
      mfe: trade.mfe || 0
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteTrade(trade) {
    if (!confirm(`Delete trade #${trade.id} ${trade.symbol}?`)) return
    saving.value = true
    setMessage()
    try {
      await apiRequest(`/api/journal/trades/${trade.id}`, {
        method: 'DELETE',
        headers: authHeaders.value
      })
      await loadTrades()
      if (form.id === trade.id) resetForm()
      setMessage({ success: 'Trade deleted.' })
    } catch (error) {
      setMessage({ error: error.message || 'Cannot delete trade.' })
    } finally {
      saving.value = false
    }
  }

  function clearFilters() {
    filter.accountId = ''
    filter.symbol = ''
    filter.dateFrom = ''
    filter.dateTo = ''
    filter.tag = ''
    loadTrades()
  }

  onMounted(refreshAll)

  return {
    loading,
    saving,
    errorMessage,
    successMessage,
    accounts,
    trades,
    summary,
    filter,
    accountForm,
    form,
    isEdit,
    tradePreview,
    refreshAll,
    loadTrades,
    createAccount,
    saveTrade,
    editTrade,
    deleteTrade,
    resetForm,
    clearFilters
  }
}
