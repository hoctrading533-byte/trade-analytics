import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '../../lib/api.js'
import { useUserStore } from '../../stores/useUserStore.js'
import { useI18n } from '../../composables/useI18n.js'

function dateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function parseDateKey(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(key, delta) {
  const d = parseDateKey(key)
  if (!d) return key
  d.setUTCDate(d.getUTCDate() + Number(delta || 0))
  return dateKey(d)
}

export function useTradingHistory() {
  const userStore = useUserStore()
  const { t } = useI18n()
  const authHeaders = computed(() => (userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}))

  const loading = ref(false)
  const sendingReport = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  const activeView = ref('daily')
  const anchorDate = ref(dateKey(new Date()))
  const historyPayload = ref({
    view: 'daily',
    anchorDate: anchorDate.value,
    range: { startDate: anchorDate.value, endDate: anchorDate.value, label: '--' },
    summary: { netIncome: 0, totalTrades: 0, wins: 0, losses: 0, breakeven: 0, winRate: 0 },
    bars: [],
    entries: [],
    behavior: {
      checklistCount: 0,
      avgTotalScore: 0,
      avgEmotionScore: 0,
      avgPlanScore: 0,
      canTradeRate: 0,
      blockedCount: 0
    }
  })
  const reportStatus = ref({
    latestMonth: null,
    latestStatus: null,
    latestSentAt: null
  })
  const monthlyLogs = ref([])

  const summary = computed(() => historyPayload.value.summary || {})
  const bars = computed(() => historyPayload.value.bars || [])
  const entries = computed(() => historyPayload.value.entries || [])
  const behavior = computed(() => historyPayload.value.behavior || {})
  const rangeLabel = computed(() => historyPayload.value.range?.label || '--')

  const maxBarAbs = computed(() => {
    const max = Math.max(...bars.value.map((item) => Math.abs(Number(item.amount || 0))), 1)
    return max > 0 ? max : 1
  })

  function barHeight(amount) {
    const n = Number(amount || 0)
    return `${Math.max(6, Math.round((Math.abs(n) / maxBarAbs.value) * 180))}px`
  }

  function barClass(amount) {
    const n = Number(amount || 0)
    if (n > 0) return 'up'
    if (n < 0) return 'down'
    return 'flat'
  }

  async function loadHistory() {
    loading.value = true
    errorMessage.value = ''
    try {
      const payload = await apiRequest(
        `/api/trading/performance/history?view=${encodeURIComponent(activeView.value)}&anchorDate=${encodeURIComponent(anchorDate.value)}`,
        { headers: authHeaders.value }
      )
      historyPayload.value = payload.history || historyPayload.value
      reportStatus.value = payload.reports || reportStatus.value
    } catch (error) {
      errorMessage.value = error.message || t('history.loadError')
    } finally {
      loading.value = false
    }
  }

  async function loadMonthlyLogs() {
    try {
      const payload = await apiRequest('/api/trading/reports/monthly/logs?limit=6', {
        headers: authHeaders.value
      })
      monthlyLogs.value = payload.logs || []
    } catch {
      monthlyLogs.value = []
    }
  }

  async function refreshAll() {
    await Promise.all([loadHistory(), loadMonthlyLogs()])
  }

  function setView(view) {
    if (!['daily', 'weekly', 'monthly'].includes(view)) return
    activeView.value = view
    refreshAll()
  }

  function moveRange(direction) {
    const dir = Number(direction || 0)
    if (!dir) return
    if (activeView.value === 'daily') {
      anchorDate.value = addDays(anchorDate.value, dir)
    } else if (activeView.value === 'weekly') {
      anchorDate.value = addDays(anchorDate.value, dir * 7)
    } else {
      const d = parseDateKey(anchorDate.value) || new Date()
      d.setUTCMonth(d.getUTCMonth() + dir)
      anchorDate.value = dateKey(d)
    }
    refreshAll()
  }

  async function sendMonthlyReportNow() {
    sendingReport.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const month = String(historyPayload.value.range?.startDate || '').slice(0, 7)
      await apiRequest('/api/trading/reports/monthly/send', {
        method: 'POST',
        headers: authHeaders.value,
        body: JSON.stringify({
          month: activeView.value === 'monthly' && month ? month : '',
          force: true
        })
      })
      successMessage.value = t('history.sendSuccess')
      await loadMonthlyLogs()
    } catch (error) {
      errorMessage.value = error.message || t('history.sendError')
    } finally {
      sendingReport.value = false
    }
  }

  onMounted(refreshAll)

  return {
    loading,
    sendingReport,
    errorMessage,
    successMessage,
    activeView,
    anchorDate,
    summary,
    bars,
    entries,
    behavior,
    rangeLabel,
    reportStatus,
    monthlyLogs,
    barHeight,
    barClass,
    setView,
    moveRange,
    sendMonthlyReportNow,
    refreshAll
  }
}
