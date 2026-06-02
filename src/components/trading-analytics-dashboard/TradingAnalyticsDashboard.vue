<template>
  <div class="ta-dashboard">
    <Sidebar />

    <main class="ta-main">
      <Header
        v-model:search="search"
        v-model:timeRange="timeRange"
        v-model:selectedAccount="selectedAccount"
        :accounts="activeAccounts"
      />

      <div class="ta-content">
        <section class="ta-hero-grid">
          <article class="ta-hero-panel">
            <span class="ta-kicker">{{ t('dashboard.phase') }}</span>
            <h2>{{ t('dashboard.heroTitle') }}</h2>
            <p>{{ t('dashboard.heroSubtitle') }}</p>
            <div class="ta-hero-actions">
              <RouterLink to="/journal" class="ta-add-trade ta-add-trade--hero">
                <span>+</span>
                {{ t('dashboard.addTrade') }}
              </RouterLink>
              <button class="ta-secondary-button" type="button">{{ t('dashboard.exportReport') }}</button>
            </div>
          </article>

          <article class="ta-score-panel">
            <div class="ta-score-panel__top">
              <span class="ta-kicker">{{ t('dashboard.disciplineScore') }}</span>
              <strong>{{ disciplineScore }}/100</strong>
            </div>
            <div class="ta-score-ring" :style="{ '--score': `${disciplineScore}%` }">
              <span>{{ disciplineScore }}</span>
            </div>
            <p>{{ scoreMessage }}</p>
          </article>
        </section>

        <section class="ta-metric-grid" aria-label="Dashboard metrics">
          <MetricCard
            v-for="card in metricCards"
            :key="card.label"
            :label="card.label"
            :value="card.value"
            :hint="card.hint"
            :trend="card.trend"
            :trend-tone="card.trendTone"
            :icon="card.icon"
            :tone="card.tone"
          />
        </section>

        <section class="ta-chart-grid ta-chart-grid--primary">
          <DashboardChart
            :title="t('dashboard.cumulativePnl')"
            :subtitle="t('dashboard.equityCurve')"
            :eyebrow="t('dashboard.performance')"
            :value-label="signedMoney(metrics.totalPnl)"
            variant="line"
            :points="metrics.equityCurve"
          />
          <DashboardChart
            :title="t('dashboard.pnlDistribution')"
            :subtitle="t('dashboard.pnlDistributionSub')"
            :eyebrow="t('dashboard.outcomes')"
            variant="donut"
            :center-label="t('dashboard.trades')"
            :series="pnlDistribution"
          />
        </section>

        <section class="ta-chart-grid ta-chart-grid--secondary">
          <DashboardChart
            :title="t('dashboard.setupPerformance')"
            :subtitle="t('dashboard.setupPerformanceSub')"
            :eyebrow="t('dashboard.pattern')"
            variant="horizontal"
            :items="setupPerformance"
          />
          <DashboardChart
            :title="t('dashboard.sessionHeatmap')"
            :subtitle="t('dashboard.sessionHeatmapSub')"
            :eyebrow="t('dashboard.timing')"
            variant="heatmap"
            :heatmap="heatmapRows"
            :heatmap-hours="heatmapHours"
          />
          <DashboardChart
            :title="t('dashboard.dailyPnl')"
            :subtitle="t('dashboard.dailyPnlSub')"
            :eyebrow="t('dashboard.calendar')"
            variant="bars"
            :bars="dailyBars"
          />
        </section>

        <section class="ta-chart-grid ta-chart-grid--tertiary">
          <DashboardChart
            :title="t('dashboard.tradeOutcome')"
            :subtitle="t('dashboard.tradeOutcomeSub')"
            :eyebrow="t('dashboard.execution')"
            variant="donut"
            :center-label="t('dashboard.closed')"
            :series="tradeOutcome"
          />
          <AnalyticsPanel :metrics="metrics" :highlights="highlights" :patterns="topPatterns" />
        </section>

        <RecentTradesTable :trades="recentTrades" :accounts="activeAccounts" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AnalyticsPanel from './AnalyticsPanel.vue'
import DashboardChart from './DashboardChart.vue'
import Header from './Header.vue'
import MetricCard from './MetricCard.vue'
import RecentTradesTable from './RecentTradesTable.vue'
import Sidebar from './Sidebar.vue'
import { apiRequest } from '../../lib/api.js'
import { useI18n } from '../../composables/useI18n.js'
import { useUserStore } from '../../stores/useUserStore.js'
import { dashboardAccounts as mockAccounts, mockTrades } from './mockData.js'
import './trading-analytics-dashboard.css'

const { t } = useI18n()
const userStore = useUserStore()
const search = ref('')
const timeRange = ref('30d')
const selectedAccount = ref('all')
const liveTrades = ref([])
const liveAccount = ref(null)
const liveHasData = ref(false)
const liveLoadError = ref('')
let livePollTimer = null

const rangeDays = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: Infinity
}

const activeAccounts = computed(() => {
  if (!liveHasData.value) return mockAccounts
  const account = liveAccount.value || {}
  const balance = Number(account.balance || 0)
  const equity = Number(account.equity || balance || 0)
  const netPnl = liveTrades.value.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0)
  return [
    {
      id: 'mt5-live',
      name: account.login ? `MT5 ${account.login}` : 'MT5 Live',
      broker: account.server || account.company || 'MetaTrader 5',
      currency: account.currency || 'USD',
      startingBalance: balance ? Number((balance - netPnl).toFixed(2)) : 0,
      equity
    }
  ]
})

const sourceTrades = computed(() => (liveHasData.value ? liveTrades.value : mockTrades))

const filteredTrades = computed(() => {
  const query = search.value.trim().toLowerCase()
  const maxAge = rangeDays[timeRange.value] ?? 30
  const startMs = Number.isFinite(maxAge) ? Date.now() - maxAge * 24 * 60 * 60 * 1000 : 0

  return sourceTrades.value
    .filter((trade) => selectedAccount.value === 'all' || trade.accountId === selectedAccount.value)
    .filter((trade) => new Date(trade.exitTime).getTime() >= startMs)
    .filter((trade) => {
      if (!query) return true
      return [
        trade.symbol,
        trade.assetType,
        trade.side,
        trade.session,
        trade.strategyTag,
        trade.emotionTag,
        trade.marketCondition,
        trade.notes
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
})

const startingBalance = computed(() => {
  if (selectedAccount.value === 'all') {
    return activeAccounts.value.reduce((sum, account) => sum + account.startingBalance, 0)
  }
  return activeAccounts.value.find((account) => account.id === selectedAccount.value)?.startingBalance || 0
})

const metrics = computed(() => computeMetrics(filteredTrades.value, startingBalance.value))
const groupBySession = computed(() => summarizeGroups(filteredTrades.value, (trade) => trade.session))
const groupByStrategy = computed(() => summarizeGroups(filteredTrades.value, (trade) => trade.strategyTag))
const groupBySymbol = computed(() => summarizeGroups(filteredTrades.value, (trade) => trade.symbol))

const highlights = computed(() => ({
  bestSession: bestGroup(groupBySession.value),
  bestStrategy: bestGroup(groupByStrategy.value),
  bestSymbol: bestGroup(groupBySymbol.value)
}))

const topPatterns = computed(() => groupByStrategy.value.slice(0, 5))

const metricCards = computed(() => [
  {
    label: t('dashboard.metricTotalPnl'),
    value: signedMoney(metrics.value.totalPnl),
    hint: t('dashboard.netAfterFees'),
    trend: metrics.value.totalPnl >= 0 ? t('dashboard.edge') : t('dashboard.review'),
    trendTone: metrics.value.totalPnl >= 0 ? 'positive' : 'negative',
    icon: 'PL',
    tone: metrics.value.totalPnl >= 0 ? 'success' : 'danger'
  },
  {
    label: t('dashboard.metricWinRate'),
    value: `${metrics.value.winRate.toFixed(1)}%`,
    hint: t('dashboard.winsLosses', { wins: metrics.value.wins, losses: metrics.value.losses }),
    trend: metrics.value.winRate >= 55 ? t('dashboard.strong') : t('dashboard.tune'),
    trendTone: metrics.value.winRate >= 55 ? 'positive' : 'neutral',
    icon: 'WR',
    tone: 'primary'
  },
  {
    label: t('dashboard.metricProfitFactor'),
    value: metrics.value.profitFactor.toFixed(2),
    hint: t('dashboard.grossFormula'),
    trend: metrics.value.profitFactor >= 1.5 ? t('dashboard.healthy') : t('dashboard.watch'),
    trendTone: metrics.value.profitFactor >= 1.5 ? 'positive' : 'neutral',
    icon: 'PF',
    tone: 'purple'
  },
  {
    label: t('dashboard.metricExpectancy'),
    value: signedMoney(metrics.value.expectancy),
    hint: t('dashboard.avgExpected'),
    trend: metrics.value.expectancy >= 0 ? t('dashboard.positive') : t('dashboard.negative'),
    trendTone: metrics.value.expectancy >= 0 ? 'positive' : 'negative',
    icon: 'EX',
    tone: metrics.value.expectancy >= 0 ? 'success' : 'danger'
  },
  {
    label: t('dashboard.metricTotalTrades'),
    value: String(metrics.value.totalTrades),
    hint: t('dashboard.filteredRange', { range: timeRange.value.toUpperCase() }),
    trend: `${metrics.value.breakeven} BE`,
    trendTone: 'neutral',
    icon: 'TR',
    tone: 'cyan'
  },
  {
    label: t('dashboard.metricRMultiple'),
    value: `${metrics.value.avgR.toFixed(2)}R`,
    hint: t('dashboard.rrHint', { rr: metrics.value.rr.toFixed(2) }),
    trend: metrics.value.avgR >= 0.35 ? t('dashboard.efficient') : t('dashboard.low'),
    trendTone: metrics.value.avgR >= 0.35 ? 'positive' : 'neutral',
    icon: 'RM',
    tone: 'primary'
  }
])

const pnlDistribution = computed(() => [
  { label: t('dashboard.wins'), value: metrics.value.wins, tone: 'success' },
  { label: t('dashboard.losses'), value: metrics.value.losses, tone: 'danger' },
  { label: t('dashboard.breakeven'), value: metrics.value.breakeven, tone: 'warning' }
])

const setupPerformance = computed(() =>
  groupByStrategy.value.map((group) => ({
    label: group.label,
    value: group.pnl,
    meta: `${group.winRate.toFixed(0)}% WR - ${group.count} trades`
  }))
)

const tradeOutcome = computed(() => {
  const longWinners = filteredTrades.value.filter((trade) => trade.side === 'long' && trade.pnl > 0).length
  const shortWinners = filteredTrades.value.filter((trade) => trade.side === 'short' && trade.pnl > 0).length
  const losses = filteredTrades.value.filter((trade) => trade.pnl < 0).length
  return [
    { label: t('dashboard.longWins'), value: longWinners, tone: 'success' },
    { label: t('dashboard.shortWins'), value: shortWinners, tone: 'cyan' },
    { label: t('dashboard.losses'), value: losses, tone: 'danger' }
  ]
})

const dailyBars = computed(() => {
  const totals = new Map()
  for (const trade of filteredTrades.value) {
    const key = new Date(trade.exitTime).toISOString().slice(0, 10)
    totals.set(key, (totals.get(key) || 0) + trade.pnl)
  }

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.now() - (13 - index) * 24 * 60 * 60 * 1000)
    const key = date.toISOString().slice(0, 10)
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      value: Number((totals.get(key) || 0).toFixed(2))
    }
  })
})

const heatmapHours = ['06', '09', '12', '15', '18', '21']
const heatmapRows = computed(() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const rows = days.map((day) => ({
    day,
    cells: heatmapHours.map((hour) => ({ label: hour, value: 0, intensity: 0 }))
  }))
  const dayIndex = new Map(days.map((day, index) => [day, index]))

  for (const trade of filteredTrades.value) {
    const date = new Date(trade.exitTime)
    const day = days[(date.getDay() + 6) % 7]
    const nearestHour = heatmapHours.reduce((best, hour) => {
      return Math.abs(Number(hour) - date.getHours()) < Math.abs(Number(best) - date.getHours()) ? hour : best
    }, heatmapHours[0])
    const row = rows[dayIndex.get(day)]
    const cell = row.cells.find((item) => item.label === nearestHour)
    cell.value = Number((cell.value + trade.pnl).toFixed(2))
  }

  const maxAbs = Math.max(1, ...rows.flatMap((row) => row.cells.map((cell) => Math.abs(cell.value))))
  for (const row of rows) {
    for (const cell of row.cells) {
      cell.intensity = Math.min(1, Math.abs(cell.value) / maxAbs)
    }
  }
  return rows
})

const recentTrades = computed(() =>
  filteredTrades.value
    .slice()
    .sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime())
    .slice(0, 10)
)

const disciplineScore = computed(() => {
  const fomoCount = filteredTrades.value.filter((trade) => trade.emotionTag === 'FOMO').length
  const revengeCount = filteredTrades.value.filter((trade) => trade.emotionTag === 'Revenge').length
  const penalty = metrics.value.drawdownPct * 1.8 + metrics.value.maxConsecutiveLosses * 8 + fomoCount * 5 + revengeCount * 10
  return Math.round(clamp(100 - penalty, 0, 100))
})

const scoreMessage = computed(() => {
  if (disciplineScore.value >= 80) return t('dashboard.scoreHigh')
  if (disciplineScore.value >= 60) return t('dashboard.scoreMid')
  return t('dashboard.scoreLow')
})

function computeMetrics(trades, balance) {
  const ordered = trades.slice().sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
  const totalTrades = ordered.length
  const wins = ordered.filter((trade) => trade.pnl > 0).length
  const losses = ordered.filter((trade) => trade.pnl < 0).length
  const breakeven = totalTrades - wins - losses
  const grossProfit = ordered.reduce((sum, trade) => sum + Math.max(0, trade.pnl), 0)
  const grossLoss = Math.abs(ordered.reduce((sum, trade) => sum + Math.min(0, trade.pnl), 0))
  const totalPnl = grossProfit - grossLoss
  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0
  const avgWin = wins ? grossProfit / wins : 0
  const avgLoss = losses ? grossLoss / losses : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0
  const rr = avgLoss > 0 ? avgWin / avgLoss : 0
  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss
  const avgR = totalTrades ? ordered.reduce((sum, trade) => sum + trade.rMultiple, 0) / totalTrades : 0

  let equity = balance
  let peakEquity = Math.max(1, balance)
  let maxDrawdown = 0
  let lossStreak = 0
  let maxConsecutiveLosses = 0
  const equityCurve = ordered.map((trade) => {
    equity += trade.pnl
    peakEquity = Math.max(peakEquity, equity)
    maxDrawdown = Math.max(maxDrawdown, peakEquity - equity)
    if (trade.pnl < 0) {
      lossStreak += 1
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, lossStreak)
    } else {
      lossStreak = 0
    }
    return {
      label: new Date(trade.exitTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Number(equity.toFixed(2))
    }
  })

  const avgMinutes = totalTrades
    ? ordered.reduce((sum, trade) => sum + trade.holdingMinutes, 0) / totalTrades
    : 0

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    rr: Number(rr.toFixed(2)),
    avgR: Number(avgR.toFixed(2)),
    peakEquity: Number(peakEquity.toFixed(2)),
    drawdownPct: peakEquity > 0 ? Number(((maxDrawdown / peakEquity) * 100).toFixed(2)) : 0,
    maxConsecutiveLosses,
    avgHoldingTime: formatHolding(avgMinutes),
    equityCurve
  }
}

function summarizeGroups(trades, keyGetter) {
  const groups = new Map()
  for (const trade of trades) {
    const key = keyGetter(trade)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(trade)
  }
  return Array.from(groups.entries())
    .map(([label, rows]) => {
      const wins = rows.filter((trade) => trade.pnl > 0).length
      const grossProfit = rows.reduce((sum, trade) => sum + Math.max(0, trade.pnl), 0)
      const grossLoss = Math.abs(rows.reduce((sum, trade) => sum + Math.min(0, trade.pnl), 0))
      const pnl = grossProfit - grossLoss
      return {
        label,
        count: rows.length,
        wins,
        pnl: Number(pnl.toFixed(2)),
        winRate: rows.length ? (wins / rows.length) * 100 : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0,
        avgR: rows.length ? rows.reduce((sum, trade) => sum + trade.rMultiple, 0) / rows.length : 0
      }
    })
    .sort((a, b) => b.pnl - a.pnl)
}

function bestGroup(groups) {
  return groups[0] || { label: 'No data', pnl: 0, count: 0, winRate: 0, profitFactor: 0, avgR: 0 }
}

function signedMoney(value) {
  const numeric = Number(value || 0)
  return `${numeric >= 0 ? '+' : '-'}$${Math.abs(numeric).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`
}

function formatHolding(minutes) {
  const safe = Math.max(0, Number(minutes || 0))
  if (safe < 60) return `${Math.round(safe)}m`
  const hours = Math.floor(safe / 60)
  const mins = Math.round(safe % 60)
  return `${hours}h ${mins}m`
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)))
}

async function loadMt5DashboardData() {
  if (!userStore.token) {
    liveHasData.value = false
    return
  }
  try {
    const payload = await apiRequest('/api/trading/exness/analysis', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    })
    liveLoadError.value = ''
    liveHasData.value = Boolean(payload?.hasData)
    liveAccount.value = payload?.tradeBook?.account || payload?.analysis?.account || {
      balance: payload?.analysis?.accountBalance || 0,
      equity: payload?.analysis?.accountEquity || 0
    }
    liveTrades.value = Array.isArray(payload?.tradeBook?.trades)
      ? payload.tradeBook.trades.map(mapMt5TradeToDashboardTrade).filter(Boolean)
      : []
    if (selectedAccount.value !== 'all' && !activeAccounts.value.some((account) => account.id === selectedAccount.value)) {
      selectedAccount.value = 'all'
    }
  } catch (error) {
    liveLoadError.value = error.message || 'Cannot load MT5 dashboard data.'
  }
}

function mapMt5TradeToDashboardTrade(trade, index) {
  if (!trade || typeof trade !== 'object') return null
  const entryTime = trade.openTime || trade.timeline || trade.closeTime || new Date().toISOString()
  const exitTime = trade.closeTime || trade.timeline || entryTime
  const entryPrice = Number(trade.entryPrice || 0)
  const exitPrice = Number(trade.exitPrice || entryPrice || 0)
  const volume = Number(trade.volume || 0)
  const pnl = Number(trade.profit || 0)
  const side = String(trade.side || '').toLowerCase().includes('short') ? 'short' : 'long'
  const stopLoss = Number(trade.sl || trade.finalSl || trade.initialSl || 0)
  const takeProfit = Number(trade.tp || trade.finalTp || trade.initialTp || 0)
  const commission = Math.abs(Number(trade.commission || 0))
  const fee = Math.abs(Number(trade.fee || 0)) + Math.abs(Number(trade.swap || 0))
  const entryMs = new Date(entryTime).getTime()
  const exitMs = new Date(exitTime).getTime()
  const risk = stopLoss > 0 ? Math.abs(entryPrice - stopLoss) * Math.max(volume, 1) : Math.abs(pnl)
  const reward = takeProfit > 0 ? Math.abs(takeProfit - entryPrice) * Math.max(volume, 1) : Math.abs(pnl)

  return {
    id: String(trade.tradeKey || trade.ticketClose || trade.ticketOpen || trade.positionId || `MT5-${index + 1}`),
    accountId: 'mt5-live',
    symbol: String(trade.symbol || '--'),
    assetType: inferAssetType(trade.symbol),
    side,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    volume,
    commission,
    fee,
    session: inferSession(exitTime),
    strategyTag: trade.closeReason ? `MT5 ${trade.closeReason}` : 'MT5 Live',
    emotionTag: trade.slRemoved || trade.tpRemoved ? 'Impatient' : 'Focused',
    marketCondition: trade.status === 'open' ? 'Open Position' : 'Closed',
    entryTime,
    exitTime,
    screenshot: '',
    notes: trade.status === 'open' ? 'Open MT5 position' : `MT5 deal count: ${trade.dealCount || 1}`,
    pnl: Number(pnl.toFixed(2)),
    grossPnl: Number((pnl + commission + fee).toFixed(2)),
    risk: Number(risk.toFixed(2)),
    reward: Number(reward.toFixed(2)),
    rMultiple: risk > 0 ? Number((pnl / risk).toFixed(2)) : 0,
    rr: risk > 0 ? Number((reward / risk).toFixed(2)) : 0,
    holdingMinutes: Math.max(1, Math.round((exitMs - entryMs) / 60000) || 1)
  }
}

function inferAssetType(symbol) {
  const value = String(symbol || '').toUpperCase()
  if (value.includes('BTC') || value.includes('ETH') || value.includes('USDT')) return 'crypto'
  if (value.includes('XAU') || value.includes('XAG')) return 'metals'
  if (/^[A-Z]{6}/.test(value)) return 'forex'
  if (value.includes('NAS') || value.includes('US30') || value.includes('SPX')) return 'index'
  return 'mt5'
}

function inferSession(timeValue) {
  const hour = new Date(timeValue).getHours()
  if (hour >= 6 && hour < 12) return 'London'
  if (hour >= 12 && hour < 21) return 'NewYork'
  return 'Asia'
}

function startLivePolling() {
  stopLivePolling()
  livePollTimer = setInterval(() => {
    loadMt5DashboardData()
  }, 5000)
}

function stopLivePolling() {
  if (livePollTimer) {
    clearInterval(livePollTimer)
    livePollTimer = null
  }
}

onMounted(async () => {
  await loadMt5DashboardData()
  startLivePolling()
})

onUnmounted(() => {
  stopLivePolling()
})
</script>
