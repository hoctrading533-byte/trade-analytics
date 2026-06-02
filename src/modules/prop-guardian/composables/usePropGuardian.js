import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { apiRequest } from '../../../lib/api.js'
import { useUserStore } from '../../../stores/useUserStore.js'
import {
  closedTrades,
  dailySnapshots,
  openPositions,
  pendingOrders,
  propChallenges,
  propGuardianAccounts,
  symbolMeta
} from '../data/mockPropGuardianData.js'
import { analyzeBehavior } from '../engines/behavioralAiEngine.js'
import { generateTaskcareTasks, mergeTaskStatuses } from '../engines/taskcareEngine.js'
import { evaluatePropFirmRules } from '../engines/propFirmRuleEngine.js'
import { calculateSafeLot } from '../engines/safeLotCalculator.js'

const CHALLENGE_KEY = 'luminafox_prop_guardian_challenge'
const TASK_STATUS_KEY = 'luminafox_prop_guardian_task_status'

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in some embedded contexts.
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeId(value, fallback) {
  const raw = String(value || '').trim()
  return raw || fallback
}

function normalizeMt5Side(value) {
  const raw = String(value ?? '').toUpperCase()
  if (raw === '1' || raw.includes('SELL') || raw.includes('SHORT')) return 'SELL'
  return 'BUY'
}

function normalizeAccountFromApi(apiAccount = {}, statusPayload = {}, fallback = propGuardianAccounts[0]) {
  const connection = statusPayload?.connection || {}
  const login = normalizeId(apiAccount.login ?? apiAccount.login_id ?? connection.login, fallback.loginId)
  const server = normalizeId(apiAccount.server ?? apiAccount.broker_server ?? connection.server, fallback.brokerServer)
  const balance = number(apiAccount.balance ?? apiAccount.current_balance, fallback.currentBalance)
  const equity = number(apiAccount.equity ?? apiAccount.current_equity, balance + number(apiAccount.profit, fallback.floatingProfit))

  return {
    ...fallback,
    id: `acc-exness-${String(login).replace(/[^a-zA-Z0-9_-]/g, '') || 'live'}`,
    brokerName: apiAccount.brokerName || apiAccount.broker_name || 'Exness',
    brokerServer: server,
    loginId: String(login),
    accountName: `Exness MT5 ${String(login)}`,
    currency: apiAccount.currency || fallback.currency || 'USD',
    initialBalance: number(apiAccount.initialBalance ?? apiAccount.initial_balance, fallback.initialBalance),
    currentBalance: balance,
    currentEquity: equity,
    margin: number(apiAccount.margin, fallback.margin),
    freeMargin: number(apiAccount.free_margin ?? apiAccount.freeMargin, fallback.freeMargin),
    marginLevel: number(apiAccount.margin_level ?? apiAccount.marginLevel, fallback.marginLevel),
    leverage: number(apiAccount.leverage, fallback.leverage),
    floatingProfit: number(apiAccount.profit ?? apiAccount.floatingProfit, equity - balance),
    credit: number(apiAccount.credit, fallback.credit),
    accountType: 'prop',
    status: 'active'
  }
}

function normalizeOpenPositionsFromApi(rows = [], accountId, challengeId) {
  return rows.map((position, index) => ({
    ticket: String(position.ticket ?? position.position_id ?? position.identifier ?? `LIVE-${index}`),
    positionId: String(position.position_id ?? position.positionId ?? position.identifier ?? position.ticket ?? `LIVE-${index}`),
    accountId,
    challengeId,
    symbol: String(position.symbol || '--'),
    type: normalizeMt5Side(position.type ?? position.side),
    volume: number(position.volume),
    openPrice: number(position.open_price ?? position.openPrice ?? position.price_open ?? position.price),
    currentPrice: number(position.current_price ?? position.currentPrice ?? position.price_current ?? position.price),
    sl: number(position.sl),
    tp: number(position.tp),
    swap: number(position.swap),
    commission: number(position.commission),
    profit: number(position.profit),
    timeOpen: position.time_open || position.timeOpen || position.openTime || new Date().toISOString(),
    magic: position.magic ?? 0,
    comment: String(position.comment || '')
  }))
}

function normalizeOrdersFromApi(rows = [], accountId) {
  return rows.map((order, index) => ({
    ticket: String(order.ticket ?? order.order ?? `ORDER-${index}`),
    accountId,
    symbol: String(order.symbol || '--'),
    type: String(order.type || order.order_type || '--'),
    price: number(order.price ?? order.price_open),
    sl: number(order.sl),
    tp: number(order.tp),
    volume: number(order.volume),
    expiration: order.expiration || order.time_expiration || null
  }))
}

function estimateRiskAmount(trade) {
  const meta = symbolMeta[trade.symbol] || { point: 0.0001, pipValuePerLot: 10 }
  const entry = number(trade.entryPrice)
  const sl = number(trade.sl)
  if (!entry || !sl) return 0
  return Math.abs(entry - sl) / Math.max(Number.EPSILON, number(meta.point, 0.0001)) * number(meta.pipValuePerLot, 10) * number(trade.volume)
}

function normalizeTradesFromApi(rows = [], accountId, challengeId) {
  return rows.map((trade, index) => {
    const netProfit = number(trade.netProfit ?? trade.net_profit, NaN)
    const gross = number(trade.profit ?? trade.grossProfit ?? trade.gross_profit)
    const commission = number(trade.commission)
    const swap = number(trade.swap)
    const fee = number(trade.fee)
    const normalized = {
      id: String(trade.id ?? trade.tradeKey ?? trade.positionId ?? trade.position_id ?? `LIVE-TR-${index}`),
      accountId,
      challengeId,
      brokerTradeId: String(trade.ticketClose ?? trade.ticketOpen ?? trade.orderClose ?? trade.orderOpen ?? trade.deal_id ?? ''),
      positionId: String(trade.positionId ?? trade.position_id ?? ''),
      symbol: String(trade.symbol || '--'),
      side: normalizeMt5Side(trade.side ?? trade.type),
      entryTime: trade.entryTime || trade.openTime || trade.open_time || trade.timeline || new Date().toISOString(),
      exitTime: trade.exitTime || trade.closeTime || trade.close_time || trade.timeline || new Date().toISOString(),
      entryPrice: number(trade.entryPrice ?? trade.entry_price),
      exitPrice: number(trade.exitPrice ?? trade.exit_price),
      volume: number(trade.volume),
      sl: number(trade.sl),
      tp: number(trade.tp),
      grossProfit: gross,
      commission,
      swap,
      fee,
      netProfit: Number.isFinite(netProfit) ? netProfit : gross + commission + swap + fee,
      mae: number(trade.mae),
      mfe: number(trade.mfe),
      durationSeconds: number(trade.durationSeconds ?? trade.duration_seconds),
      rMultiple: number(trade.rMultiple ?? trade.r_multiple),
      riskAmount: number(trade.riskAmount ?? trade.risk_amount),
      riskPercent: number(trade.riskPercent ?? trade.risk_percent),
      session: trade.session || inferSession(trade.openTime || trade.entryTime || trade.timeline),
      strategyTag: trade.strategyTag || '',
      emotionBefore: trade.emotionBefore || '',
      emotionAfter: trade.emotionAfter || '',
      mistakeTags: Array.isArray(trade.mistakeTags) ? trade.mistakeTags : [],
      qualityScore: number(trade.qualityScore, 70),
      disciplineScore: number(trade.disciplineScore, 70),
      notes: trade.notes || trade.closeReason || ''
    }
    normalized.riskAmount ||= estimateRiskAmount(normalized)
    normalized.riskPercent = normalized.riskPercent || (normalized.riskAmount > 0 ? (normalized.riskAmount / Math.max(1, propChallenges[0].accountSize)) * 100 : 0)
    normalized.rMultiple = normalized.rMultiple || (normalized.riskAmount > 0 ? normalized.netProfit / normalized.riskAmount : 0)
    return normalized
  })
}

function normalizeDailySnapshotsFromApi(rows = [], account, challengeId) {
  if (!rows.length) return []
  const sorted = rows.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
  let runningBalance = number(account.currentBalance) - sorted.reduce((sum, row) => sum + number(row.netProfit ?? row.closedPnl), 0)

  return sorted.map((row, index) => {
    const closedPnl = number(row.netProfit ?? row.closedPnl)
    const startBalance = runningBalance
    const endBalance = runningBalance + closedPnl
    runningBalance = endBalance
    return {
      id: `LIVE-DAY-${index}`,
      accountId: account.id,
      challengeId,
      date: row.date,
      startBalance,
      startEquity: startBalance,
      highEquity: Math.max(startBalance, endBalance),
      lowEquity: Math.min(startBalance, endBalance),
      endBalance,
      endEquity: endBalance,
      closedPnl,
      floatingPnl: 0,
      totalTrades: number(row.totalTrades),
      wins: number(row.wins),
      losses: number(row.losses),
      dailyDdUsed: Math.max(0, startBalance - endBalance),
      maxDdUsed: Math.max(0, number(account.initialBalance, startBalance) - endBalance),
      ruleStatus: 'live'
    }
  })
}

function inferSession(value) {
  const hour = new Date(value || Date.now()).getHours()
  if (hour < 7) return 'Asia'
  if (hour < 13) return 'London'
  return 'NewYork'
}

const accountId = ref(propGuardianAccounts[0].id)
const challenge = ref(readJson(CHALLENGE_KEY, clone(propChallenges[0])))
const savedTaskStatuses = ref(readJson(TASK_STATUS_KEY, {}))

export function usePropGuardian() {
  const userStore = useUserStore()
  const accounts = ref(clone(propGuardianAccounts))
  const positions = ref(clone(openPositions))
  const orders = ref(clone(pendingOrders))
  const trades = ref(clone(closedTrades))
  const snapshots = ref(clone(dailySnapshots))
  const refreshTick = ref(Date.now())
  const isLivePolling = ref(true)
  const isLoadingLive = ref(false)
  const initialLoading = ref(true)
  const dataSource = ref('mock')
  const liveError = ref('')
  const lastSyncAt = ref(null)
  const mt5Status = ref({
    connected: false,
    source: 'mock-exness-mt5',
    login: '--',
    cacheAgeMs: null
  })
  let timer = null
  let pollingBusy = false

  const selectedAccount = computed(() => accounts.value.find((item) => item.id === accountId.value) || accounts.value[0])
  const selectedChallenge = computed(() => ({
    ...challenge.value,
    tradingAccountId: selectedAccount.value?.id || challenge.value.tradingAccountId
  }))
  const accountPositions = computed(() => positions.value.filter((item) => item.accountId === selectedAccount.value.id))
  const accountTrades = computed(() => trades.value.filter((item) => item.accountId === selectedAccount.value.id))
  const accountSnapshots = computed(() => snapshots.value.filter((item) => item.accountId === selectedAccount.value.id))

  const liveAccount = computed(() => {
    const base = selectedAccount.value
    const pulse = dataSource.value === 'mock' ? Math.sin(refreshTick.value / 8000) * 42 : 0
    const openFloating = accountPositions.value.reduce((sum, item) => sum + number(item.profit), 0)
    const floating = number(base.floatingProfit, openFloating) + pulse
    const currentEquity =
      dataSource.value === 'mock'
        ? number(base.currentBalance) + floating
        : number(base.currentEquity ?? base.equity, number(base.currentBalance) + openFloating)
    return {
      ...base,
      floatingProfit: Number(floating.toFixed(2)),
      currentEquity: Number(currentEquity.toFixed(2))
    }
  })

  const evaluation = computed(() =>
    evaluatePropFirmRules({
      challenge: selectedChallenge.value,
      account: liveAccount.value,
      dailySnapshots: accountSnapshots.value,
      openPositions: accountPositions.value,
      symbolMeta,
      closedTrades: accountTrades.value
    })
  )

  const behavior = computed(() =>
    analyzeBehavior({
      closedTrades: accountTrades.value.slice().sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime)),
      openPositions: accountPositions.value,
      challenge: selectedChallenge.value,
      evaluation: evaluation.value
    })
  )

  const alerts = computed(() => {
    const behaviorAlerts = behavior.value.issues
      .filter((issue) => issue.score >= 55)
      .map((issue, index) => ({
        id: `behavior-${index}-${issue.issueType}`,
        type: issue.issueType,
        severity: issue.severity,
        title: issue.title,
        problem: issue.title,
        message: issue.recommendation,
        risk: issue.recommendation,
        evidence: issue.evidence,
        recommendedAction: issue.suggestedTask,
        action: issue.suggestedTask,
        timestamp: new Date().toISOString(),
        isAcknowledged: false
      }))
    return [...evaluation.value.ruleAlerts, ...behaviorAlerts].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
  })

  const commandCenter = computed(() => evaluation.value.commandCenter)

  const taskcareTasks = computed(() =>
    mergeTaskStatuses(
      generateTaskcareTasks({
        challenge: selectedChallenge.value,
        evaluation: evaluation.value,
        behavior: behavior.value
      }),
      savedTaskStatuses.value
    )
  )

  const safeLot = computed(() => {
    const meta = symbolMeta.XAUUSD
    return calculateSafeLot({
      equity: liveAccount.value.currentEquity,
      dailyLossRemaining: evaluation.value.dailyLoss.remaining,
      maxLossRemaining: evaluation.value.maxDrawdown.remaining,
      personalRiskPercent: selectedChallenge.value.personalRiskPercent,
      stopLossPoints: 250,
      pipValuePerLot: meta.pipValuePerLot,
      spreadPoints: meta.spreadPoints,
      commissionPerLot: 7
    })
  })

  const todayStats = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    const rows = accountTrades.value.filter((trade) => String(trade.exitTime || '').slice(0, 10) === today)
    const closedPnl = rows.reduce((sum, trade) => sum + number(trade.netProfit), 0)
    return {
      tradesToday: rows.length,
      closedPnl,
      wins: rows.filter((trade) => number(trade.netProfit) > 0).length,
      losses: rows.filter((trade) => number(trade.netProfit) < 0).length
    }
  })

  function severityRank(severity) {
    return { info: 1, warning: 2, danger: 3, critical: 4 }[severity] || 0
  }

  function updateChallenge(patch) {
    challenge.value = {
      ...challenge.value,
      ...patch,
      updatedAt: new Date().toISOString()
    }
  }

  function resetChallenge() {
    challenge.value = clone(propChallenges[0])
  }

  function setAccount(nextAccountId) {
    accountId.value = nextAccountId
  }

  function updateTaskStatus(id, status) {
    savedTaskStatuses.value = {
      ...savedTaskStatuses.value,
      [id]: status
    }
  }

  function hydrateLiveData(statusPayload = {}, analysisPayload = {}) {
    const snapshot = statusPayload?.snapshot || analysisPayload?.snapshot || {}
    const tradeBook = analysisPayload?.tradeBook || {}
    const live = normalizeAccountFromApi(snapshot.account || analysisPayload?.analysis?.account || {}, statusPayload, accounts.value[0])
    const challengeId = selectedChallenge.value.id || challenge.value.id
    const livePositions = normalizeOpenPositionsFromApi(snapshot.openPositions || tradeBook.openPositions || [], live.id, challengeId)
    const liveOrders = normalizeOrdersFromApi(snapshot.pendingOrders || snapshot.orders || tradeBook.orders || [], live.id)
    const liveTrades = normalizeTradesFromApi(tradeBook.trades || snapshot.historyDeals || [], live.id, challengeId)
    const liveSnapshots = normalizeDailySnapshotsFromApi(tradeBook.daily || [], live, challengeId)

    accounts.value = [live, ...clone(propGuardianAccounts).filter((item) => item.id !== live.id)]
    positions.value = livePositions
    orders.value = liveOrders
    trades.value = liveTrades
    snapshots.value = liveSnapshots
    accountId.value = live.id
    mt5Status.value = {
      connected: Boolean(statusPayload?.connected || analysisPayload?.hasData),
      source: String(snapshot.source || statusPayload?.snapshot?.source || 'exness-mt5'),
      login: String(statusPayload?.connection?.login || live.loginId || '--'),
      cacheAgeMs: statusPayload?.cacheAgeMs ?? analysisPayload?.cacheAgeMs ?? null
    }
    dataSource.value = 'exness-mt5'
    lastSyncAt.value = analysisPayload?.updatedAt || statusPayload?.lastSyncAt || snapshot.fetchedAt || new Date().toISOString()
    liveError.value = ''
  }

  async function loadLiveData({ silent = true } = {}) {
    if (!userStore.token) {
      dataSource.value = 'mock'
      liveError.value = ''
      initialLoading.value = false
      return
    }
    if (pollingBusy) return
    pollingBusy = true
    if (!silent) initialLoading.value = true
    else isLoadingLive.value = true
    try {
      const headers = { Authorization: `Bearer ${userStore.token}` }
      const [statusPayload, analysisPayload] = await Promise.all([
        apiRequest('/api/trading/exness/status', { headers }),
        apiRequest('/api/trading/exness/analysis', { headers })
      ])
      if (analysisPayload?.hasData || statusPayload?.snapshot) {
        hydrateLiveData(statusPayload, analysisPayload)
      } else {
        dataSource.value = 'mock'
        mt5Status.value = {
          connected: Boolean(statusPayload?.connected),
          source: 'mock-exness-mt5',
          login: String(statusPayload?.connection?.login || '--'),
          cacheAgeMs: statusPayload?.cacheAgeMs ?? null
        }
        liveError.value = 'No MT5 cache yet. Connect Exness/MT5 to switch from mock to live mode.'
      }
    } catch (error) {
      dataSource.value = 'mock'
      liveError.value = error.message || 'Cannot load Exness/MT5 data right now. Mock realtime mode is active.'
    } finally {
      isLoadingLive.value = false
      initialLoading.value = false
      pollingBusy = false
    }
  }

  function startPolling() {
    if (timer) return
    loadLiveData({ silent: false })
    timer = setInterval(() => {
      refreshTick.value = Date.now()
      if (isLivePolling.value) loadLiveData({ silent: true })
    }, Math.max(1000, number(selectedChallenge.value.alertRefreshSeconds, 5) * 1000))
  }

  function stopPolling() {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  watch(challenge, (value) => writeJson(CHALLENGE_KEY, value), { deep: true })
  watch(savedTaskStatuses, (value) => writeJson(TASK_STATUS_KEY, value), { deep: true })
  watch(
    () => userStore.token,
    () => loadLiveData({ silent: true })
  )

  onMounted(startPolling)
  onBeforeUnmount(stopPolling)

  return {
    accounts,
    selectedAccount,
    accountId,
    setAccount,
    selectedChallenge,
    updateChallenge,
    resetChallenge,
    positions: accountPositions,
    orders,
    trades: accountTrades,
    snapshots: accountSnapshots,
    liveAccount,
    evaluation,
    behavior,
    alerts,
    commandCenter,
    taskcareTasks,
    updateTaskStatus,
    safeLot,
    todayStats,
    symbolMeta,
    refreshTick,
    isLivePolling,
    isLoadingLive,
    initialLoading,
    dataSource,
    liveError,
    lastSyncAt,
    mt5Status,
    loadLiveData
  }
}
