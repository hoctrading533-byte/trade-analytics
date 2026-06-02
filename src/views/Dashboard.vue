<template>
  <div class="tz-page" :data-theme="theme">
    <aside class="tz-sidebar">
      <div class="tz-sidebar-logo">
        <div class="tz-logo-icon">LF</div>
        <div class="tz-logo-text">Lumina<span>Fox</span></div>
      </div>

      <nav class="tz-nav-section">
        <div v-for="section in navSections" :key="section.label" class="tz-nav-group">
          <div class="tz-nav-label">{{ section.label }}</div>
          <RouterLink
            v-for="item in section.items"
            :key="item.label"
            class="tz-nav-item"
            :class="{ active: isNavActive(item) }"
            :to="item.to"
          >
            <span class="tz-nav-icon" v-html="item.icon"></span>
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="tz-sidebar-user">
        <div class="tz-user-avatar">TA</div>
        <div class="tz-user-info">
          <div class="tz-user-name">Trader Alex</div>
          <div class="tz-user-plan">Premium Pro</div>
        </div>
        <span class="tz-user-arrow">›</span>
      </div>
    </aside>

    <div class="tz-main">
      <header class="tz-header">
        <div class="tz-header-welcome">
          <h2>Welcome back, Trader!</h2>
          <p>Here's your performance overview</p>
        </div>

        <div class="tz-header-controls">
          <button class="tz-btn-filter" type="button">
            <span>▣</span>
            This Week
            <span>⌄</span>
          </button>
          <RouterLink class="tz-btn-add" to="/journal">
            <span>+</span>
            Add Trade
          </RouterLink>
          <label class="tz-search-bar">
            <span>⌕</span>
            <input v-model="search" type="text" placeholder="Search anything..." />
          </label>
          <button class="tz-icon-btn" type="button" aria-label="Notifications">
            🔔
            <span class="tz-notif-badge">3</span>
          </button>
          <button class="tz-icon-btn" type="button" title="Toggle theme" @click="toggleTheme">
            <span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
          </button>
          <div class="tz-user-avatar tz-user-avatar--small">TA</div>
        </div>
      </header>

      <main class="tz-dashboard">
        <section v-if="loadError || !hasRealData" class="tz-real-status" :class="{ danger: loadError }">
          <div>
            <strong>{{ loadError ? 'Không tải được dữ liệu MT5 thật' : 'Chưa có dữ liệu MT5 thật' }}</strong>
            <p>
              {{ loadError || 'Dashboard chỉ hiển thị dữ liệu real từ MT5. Hãy kết nối máy chủ MT5 và đồng bộ để bắt đầu.' }}
            </p>
          </div>
          <RouterLink class="tz-btn-add" to="/ket-noi-may-chu">Kết nối MT5</RouterLink>
        </section>

        <section class="tz-metrics-grid">
          <article v-for="(metric, index) in metrics" :key="metric.label" class="tz-metric-card">
            <div class="tz-metric-label">{{ metric.label }} <span class="tz-metric-arrow">↗</span></div>
            <div class="tz-metric-value">{{ metric.value }}</div>
            <div class="tz-metric-change" :class="{ neg: metric.negative }">{{ metric.change }}</div>
            <div class="tz-metric-sparkline"><canvas :ref="(el) => setSparkRef(el, index)"></canvas></div>
          </article>
        </section>

        <section class="tz-row tz-row-1">
          <article class="tz-chart-card">
            <div class="tz-chart-header">
              <div class="tz-chart-title">Cumulative PnL</div>
              <select class="tz-select">
                <option>All Accounts</option>
              </select>
            </div>
            <div class="tz-chart-body tz-chart-body--pnl"><canvas ref="pnlRef"></canvas></div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header"><div class="tz-chart-title">PnL Distribution</div></div>
            <div class="tz-donut-wrap">
              <canvas ref="donutRef"></canvas>
              <div class="tz-donut-center"><div>{{ money(analysis.netProfit) }}</div><span>Total</span></div>
            </div>
            <div class="tz-mini-legend">
              <span class="success"><i></i>Win {{ num(analysis.winRate).toFixed(2) }}%</span>
              <span class="danger"><i></i>Loss {{ num(analysis.lossRate).toFixed(2) }}%</span>
            </div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header"><div class="tz-chart-title">Performance by Setup</div></div>
            <div class="tz-setup-list">
              <div v-for="setup in setups" :key="setup.name" class="tz-setup-item">
                <div class="tz-setup-name">{{ setup.name }} <span>{{ setup.pnl }}</span></div>
                <div class="tz-setup-bar-bg"><div class="tz-setup-bar" :style="{ width: setup.width }"></div></div>
              </div>
            </div>
          </article>

          <article class="tz-recent-card">
            <div class="tz-recent-header">
              <div class="tz-chart-title">Recent Trades</div>
              <span class="tz-view-all">View All</span>
            </div>
            <table class="tz-trades-table">
              <thead><tr><th>Symbol</th><th>Side</th><th>PnL</th><th>R</th></tr></thead>
              <tbody>
                <tr v-for="trade in filteredTrades" :key="trade.symbol + trade.pnl">
                  <td>{{ trade.symbol }}</td>
                  <td><span :class="trade.side === 'Long' ? 'tz-side-long' : 'tz-side-short'">{{ trade.side }}</span></td>
                  <td class="tz-pnl-pos">{{ trade.pnl }}</td>
                  <td class="tz-pnl-pos">{{ trade.r }}</td>
                </tr>
              </tbody>
            </table>
          </article>
        </section>

        <section class="tz-row tz-row-2">
          <article class="tz-chart-card">
            <div class="tz-analytics-tabs">
              <button
                v-for="tab in analyticsTabs"
                :key="tab"
                type="button"
                class="tz-atab"
                :class="{ active: activeTab === tab }"
                @click="activeTab = tab"
              >{{ tab }}</button>
            </div>
            <div class="tz-analytics-metrics">
              <div v-for="item in analyticsMetrics" :key="item.label">
                <div class="tz-ametric-label" :class="{ primary: item.primary }">{{ item.label }}</div>
                <div class="tz-ametric-val">{{ item.value }}</div>
                <div class="tz-ametric-chg" :class="item.tone">{{ item.change }}</div>
              </div>
            </div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header">
              <div class="tz-chart-title">PnL Heatmap <span>(Day of Week / Hour)</span></div>
            </div>
            <div class="tz-heatmap-wrap">
              <div class="tz-heatmap">
                <div></div>
                <div v-for="hour in 24" :key="`h-${hour}`" class="tz-heat-label">{{ hour - 1 }}</div>
                <template v-for="(day, dayIndex) in heatDays" :key="day">
                  <div class="tz-heat-day">{{ day }}</div>
                  <div
                    v-for="hour in 24"
                    :key="`${day}-${hour}`"
                    class="tz-heat-cell"
                    :style="{ opacity: heatOpacity(dayIndex, hour - 1) }"
                  ></div>
                </template>
              </div>
            </div>
          </article>

          <article class="tz-chart-card tz-compact-card">
            <div class="tz-chart-header">
              <div class="tz-chart-title small">Daily PnL</div>
              <div class="tz-daily-value">{{ money(dailyRows[0]?.netProfit) }}</div>
            </div>
            <div class="tz-chart-body tz-chart-body--daily"><canvas ref="dailyRef"></canvas></div>
          </article>

          <article class="tz-chart-card tz-outcome-card">
            <div class="tz-chart-title small">Trade Outcome</div>
            <div class="tz-outcome-wrap">
              <canvas ref="outcomeRef"></canvas>
              <div class="tz-outcome-center"><div>{{ num(analysis.totalDeals) }}</div><span>Trades</span></div>
            </div>
            <div class="tz-outcome-legend">
              <div><i class="primary"></i>Win {{ num(analysis.wins) }} ({{ num(analysis.winRate).toFixed(2) }}%)</div>
              <div><i class="danger"></i>Loss {{ num(analysis.losses) }} ({{ num(analysis.lossRate).toFixed(2) }}%)</div>
            </div>
          </article>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Chart from 'chart.js/auto'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'

const route = useRoute()
const userStore = useUserStore()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const search = ref('')
const activeTab = ref('Overview')
const loading = ref(false)
const loadError = ref('')
const mt5Status = ref(null)
const account = ref({})
const analysis = ref({})
const tradeRows = ref([])
const dailyRows = ref([])
const sparkRefs = ref([])
const pnlRef = ref(null)
const donutRef = ref(null)
const dailyRef = ref(null)
const outcomeRef = ref(null)
const chartInstances = []

const icons = {
  grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>',
  gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>'
}

const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]

function isNavActive(item) {
  if (!item.to) return false
  if (item.to === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(item.to)
}

const hasRealData = computed(() => tradeRows.value.length > 0)

const metrics = computed(() => [
  { label: 'Total PnL', value: money(analysis.value.netProfit), change: syncLabel.value, negative: Number(analysis.value.netProfit || 0) < 0 },
  { label: 'Win Rate', value: `${num(analysis.value.winRate).toFixed(2)}%`, change: `${num(analysis.value.wins)}W / ${num(analysis.value.losses)}L` },
  { label: 'Profit Factor', value: num(analysis.value.profitFactor).toFixed(2), change: `RR ${num(analysis.value.rr).toFixed(2)}` },
  { label: 'Expectancy', value: money(analysis.value.expectancy), change: `${num(analysis.value.avgTradeRR).toFixed(2)}R`, negative: Number(analysis.value.expectancy || 0) < 0 },
  { label: 'Total Trades', value: String(num(analysis.value.totalDeals)), change: `${num(analysis.value.breakeven)} BE` },
  { label: 'Drawdown', value: `${num(analysis.value.drawdownPct).toFixed(2)}%`, change: money(analysis.value.drawdownAbs), negative: true }
])

const sparkData = [
  [10, 12, 8, 15, 13, 18, 22, 20, 25, 28, 24, 30],
  [55, 58, 60, 57, 62, 61, 63, 62, 64, 62, 63, 62],
  [1.5, 1.6, 1.7, 1.6, 1.8, 1.75, 1.8, 1.82, 1.85, 1.88, 1.87, 1.89],
  [40, 42, 45, 43, 50, 48, 52, 54, 55, 57, 56, 57],
  [280, 290, 295, 300, 305, 310, 315, 318, 325, 330, 335, 342],
  [1.8, 1.9, 2.0, 1.95, 2.1, 2.0, 2.15, 2.2, 2.25, 2.28, 2.3, 2.34]
]

const setups = computed(() => {
  const bySymbol = new Map()
  for (const trade of tradeRows.value) {
    const key = trade.symbol || '--'
    const row = bySymbol.get(key) || { name: key, pnlRaw: 0, count: 0 }
    row.pnlRaw += num(trade.profit)
    row.count += 1
    bySymbol.set(key, row)
  }
  const rows = [...bySymbol.values()].sort((a, b) => b.pnlRaw - a.pnlRaw).slice(0, 5)
  const max = Math.max(1, ...rows.map((x) => Math.abs(x.pnlRaw)))
  return rows.map((row) => ({ name: `${row.name} (${row.count})`, pnl: money(row.pnlRaw), width: `${Math.max(8, Math.round((Math.abs(row.pnlRaw) / max) * 100))}%` }))
})

const trades = computed(() => tradeRows.value.slice(0, 5).map((trade) => ({
  symbol: trade.symbol || '--',
  side: String(trade.side || '').toUpperCase() === 'SHORT' ? 'Short' : 'Long',
  pnl: money(trade.profit),
  r: trade.sl && trade.entryPrice ? `${(num(trade.profit) >= 0 ? '+' : '')}${rMultiple(trade).toFixed(2)}` : '--'
})))

const filteredTrades = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return trades.value
  return trades.value.filter((trade) => `${trade.symbol} ${trade.side}`.toLowerCase().includes(q))
})

const analyticsTabs = ['Overview', 'Performance', 'Time Analysis', 'Volume', 'MAE/MFE', 'More ▾']
const analyticsMetrics = computed(() => [
  { label: 'Net PnL', value: money(analysis.value.netProfit), change: `${num(analysis.value.netPnlPctBalance).toFixed(2)}%`, tone: num(analysis.value.netProfit) >= 0 ? 'success' : 'danger', primary: true },
  { label: 'Win Rate', value: `${num(analysis.value.winRate).toFixed(2)}%`, change: `${num(analysis.value.wins)} wins`, tone: 'success', primary: true },
  { label: 'Avg Win', value: money(analysis.value.avgWin), change: `Best ${money(analysis.value.bestWin)}`, tone: 'success', primary: true },
  { label: 'Avg Loss', value: money(-Math.abs(num(analysis.value.avgLoss))), change: `Worst ${money(analysis.value.worstLoss)}`, tone: 'danger' },
  { label: 'Profit Factor', value: num(analysis.value.profitFactor).toFixed(2), change: `DD ${num(analysis.value.drawdownPct).toFixed(2)}%`, tone: 'success' },
  { label: 'Balance', value: money(analysis.value.accountBalance || account.value.balance), change: `Equity ${money(analysis.value.accountEquity || account.value.equity)}`, tone: 'success' }
])

const heatDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const heatVals = computed(() => {
  const matrix = heatDays.map(() => Array.from({ length: 24 }, () => 0))
  const maxByAbs = { value: 1 }
  for (const trade of tradeRows.value) {
    const dt = new Date(trade.timeline || trade.closeTime || trade.openTime || 0)
    if (Number.isNaN(dt.getTime())) continue
    const day = (dt.getDay() + 6) % 7
    const hour = dt.getHours()
    matrix[day][hour] += num(trade.profit)
    maxByAbs.value = Math.max(maxByAbs.value, Math.abs(matrix[day][hour]))
  }
  return matrix.map((row) => row.map((value) => Math.abs(value) / maxByAbs.value))
})

const syncLabel = computed(() => mt5Status.value?.updatedAt ? new Date(mt5Status.value.updatedAt).toLocaleString('vi-VN') : 'Real MT5')

function setSparkRef(el, index) {
  if (el) sparkRefs.value[index] = el
}

function heatOpacity(day, hour) {
  return Math.max(0.08, heatVals.value[day][hour]).toFixed(2)
}

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function money(value) {
  const n = num(value)
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function rMultiple(trade) {
  const risk = Math.abs(num(trade.entryPrice) - num(trade.sl)) * Math.max(num(trade.volume), 1)
  return risk > 0 ? num(trade.profit) / risk : 0
}

async function loadRealMt5Data() {
  loading.value = true
  loadError.value = ''
  try {
    const [statusPayload, dataPayload] = await Promise.all([
      apiRequest('/api/trading/exness/status', { headers: authHeaders() }),
      apiRequest('/api/trading/statement/status', { headers: authHeaders() })
    ])
    mt5Status.value = statusPayload || null
    if (!dataPayload?.hasData) {
      account.value = {}
      analysis.value = {}
      tradeRows.value = []
      dailyRows.value = []
      return
    }
    account.value = dataPayload.snapshot?.account || {}
    analysis.value = dataPayload.analysis || {}
    tradeRows.value = Array.isArray(dataPayload.tradeBook?.trades) ? dataPayload.tradeBook.trades : []
    dailyRows.value = Array.isArray(dataPayload.tradeBook?.daily) ? dataPayload.tradeBook.daily : []
  } catch (error) {
    loadError.value = error.message || 'Không thể tải dữ liệu MT5 thật.'
  } finally {
    loading.value = false
  }
}

function authHeaders() {
  return userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

function makeGradient(ctx, height = 120) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, 'rgba(255,45,154,0.4)')
  gradient.addColorStop(1, 'rgba(255,45,154,0)')
  return gradient
}

function addChart(canvas, config) {
  if (!canvas) return
  const chart = new Chart(canvas.getContext('2d'), config)
  chartInstances.push(chart)
}

function destroyCharts() {
  while (chartInstances.length) chartInstances.pop().destroy()
}

function buildCharts() {
  destroyCharts()
  if (!pnlRef.value || !donutRef.value || !dailyRef.value || !outcomeRef.value) return

  sparkRefs.value.forEach((canvas, index) => {
    if (!canvas || !sparkData[index]) return
    const ctx = canvas.getContext('2d')
    addChart(canvas, {
      type: 'line',
      data: { labels: sparkData[index].map((_, i) => i), datasets: [{ data: sparkData[index], borderColor: '#FF2D9A', borderWidth: 1.5, fill: true, backgroundColor: makeGradient(ctx, 32), tension: 0.4, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    })
  })

  const gridColor = theme.value === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(23,18,26,0.08)'
  const tickColor = theme.value === 'dark' ? '#B8A8B8' : '#6F6472'
  const equity = []
  let cumulative = 0
  for (const trade of [...tradeRows.value].reverse()) {
    cumulative += num(trade.profit)
    equity.push({ label: new Date(trade.timeline || trade.closeTime || trade.openTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Number(cumulative.toFixed(2)) })
  }
  const pnlCtx = pnlRef.value.getContext('2d')
  addChart(pnlRef.value, {
    type: 'line',
    data: { labels: equity.map((x) => x.label), datasets: [{ data: equity.map((x) => x.value), borderColor: '#FF2D9A', borderWidth: 2, fill: true, backgroundColor: makeGradient(pnlCtx, 120), tension: 0.4, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 9, family: 'JetBrains Mono' } } }, y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 9, family: 'JetBrains Mono' }, callback: (v) => `$${(v / 1000).toFixed(0)}k` } } } }
  })

  addChart(donutRef.value, doughnutConfig([num(analysis.value.wins), num(analysis.value.losses)], '72%'))
  addChart(outcomeRef.value, doughnutConfig([num(analysis.value.wins), num(analysis.value.losses)], '68%'))

  const daily = dailyRows.value.slice(0, 7).reverse()
  const dailyVals = daily.map((row) => num(row.netProfit))
  addChart(dailyRef.value, {
    type: 'bar',
    data: { labels: daily.map((row) => String(row.date || '').slice(5) || '--'), datasets: [{ data: dailyVals, backgroundColor: dailyVals.map((v) => (v > 0 ? 'rgba(0,208,132,0.7)' : 'rgba(255,59,122,0.7)')), borderRadius: 3, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 8 } } }, y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 8, family: 'JetBrains Mono' }, callback: (v) => `$${v}` } } } }
  })
}

function doughnutConfig(data, cutout) {
  return { type: 'doughnut', data: { datasets: [{ data, backgroundColor: ['#FF2D9A', '#FF3B7A'], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: true, cutout, plugins: { legend: { display: false }, tooltip: { enabled: false } } } }
}

watch(theme, async (value) => {
  localStorage.setItem('tz-theme', value)
  document.documentElement.setAttribute('data-theme', value)
  await nextTick()
  buildCharts()
})

watch([tradeRows, analysis, dailyRows], async () => {
  await nextTick()
  buildCharts()
}, { deep: true })

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', theme.value)
  await loadRealMt5Data()
  await nextTick()
  buildCharts()
})

onBeforeUnmount(destroyCharts)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

.tz-page,
.tz-page * { box-sizing: border-box; }

.tz-page {
  --bg: #07070a;
  --card: #141018;
  --card2: #1a1320;
  --border: #2a142a;
  --primary: #ff2d9a;
  --primary-glow: rgba(255, 45, 154, 0.18);
  --primary-dim: rgba(255, 45, 154, 0.08);
  --hot: #ff4da6;
  --text: #ffffff;
  --sub: #b8a8b8;
  --success: #00d084;
  --danger: #ff3b7a;
  --sidebar-w: 220px;
  --header-h: 64px;
  --radius: 16px;
  --font-ui: 'Syne', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
}

.tz-page[data-theme='light'] {
  --bg: #fff7fb;
  --card: #ffffff;
  --card2: #fff0f7;
  --border: #f2d6e6;
  --primary: #ff3b9d;
  --primary-glow: rgba(255, 59, 157, 0.1);
  --primary-dim: rgba(255, 59, 157, 0.05);
  --hot: #ff3b9d;
  --text: #17121a;
  --sub: #6f6472;
  --success: #00a86b;
  --danger: #ff3366;
}

.tz-sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--card);
  border-right: 1px solid var(--border);
  z-index: 10;
}

.tz-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
.tz-logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--hot)); box-shadow: 0 0 16px var(--primary-glow); color: #fff; font-size: 16px; font-weight: 800; }
.tz-logo-text { color: var(--text); font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
.tz-logo-text span { color: var(--primary); }
.tz-nav-section { flex: 1; padding: 10px 0; }
.tz-nav-label { padding: 8px 18px 4px; color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; }
.tz-nav-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 9px 18px; color: var(--sub); text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.18s; }
.tz-nav-item:hover, .tz-nav-item.active { color: var(--primary); background: var(--primary-dim); font-weight: 600; }
.tz-nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary); border-radius: 0 3px 3px 0; box-shadow: 0 0 8px var(--primary); }
.tz-nav-icon { width: 16px; height: 16px; display: inline-flex; opacity: 0.8; }
.tz-nav-icon :deep(svg) { width: 16px; height: 16px; }
.tz-sidebar-user { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
.tz-user-avatar { width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #a020f0); box-shadow: 0 0 10px var(--primary-glow); color: #fff; font-size: 12px; font-weight: 700; }
.tz-user-avatar--small { width: 32px; height: 32px; font-size: 11px; }
.tz-user-info { flex: 1; min-width: 0; }
.tz-user-name { overflow: hidden; color: var(--text); font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.tz-user-plan { color: var(--primary); font-size: 10px; font-weight: 500; }
.tz-user-arrow { color: var(--sub); font-size: 24px; line-height: 1; }

.tz-main { flex: 1; min-width: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.tz-header { height: var(--header-h); flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 0 20px; background: var(--card); border-bottom: 1px solid var(--border); }
.tz-header-welcome { flex: 1; }
.tz-header-welcome h2 { margin: 0; color: var(--text); font-size: 15px; font-weight: 700; line-height: 1; }
.tz-header-welcome p { margin: 2px 0 0; color: var(--sub); font-size: 11px; }
.tz-header-controls { display: flex; align-items: center; gap: 8px; }
.tz-btn-filter, .tz-btn-add, .tz-search-bar, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-btn-filter, .tz-btn-add { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: none; }
.tz-btn-add { padding: 7px 14px; border: none; background: var(--primary); box-shadow: 0 0 16px var(--primary-glow); color: #fff; font-weight: 600; }
.tz-search-bar { width: 180px; display: flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 8px; color: var(--sub); font-size: 12px; }
.tz-search-bar input { width: 100%; border: none; outline: none; background: transparent; color: var(--text); font: inherit; font-size: 12px; }
.tz-icon-btn { position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--sub); cursor: pointer; }
.tz-notif-badge { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--primary); color: #fff; font-size: 9px; font-weight: 700; }
.tz-theme-toggle-knob { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); font-size: 11px; }

.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-metrics-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 14px; }
.tz-metric-card, .tz-chart-card, .tz-recent-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); }
.tz-metric-card { position: relative; overflow: hidden; padding: 14px; transition: all 0.2s; }
.tz-metric-card:hover, .tz-chart-card:hover { border-color: var(--primary); box-shadow: 0 0 20px var(--primary-dim); }
.tz-page[data-theme='dark'] .tz-metric-card::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at top left, rgba(255, 45, 154, 0.04) 0%, transparent 60%); pointer-events: none; }
.tz-metric-label { display: flex; align-items: center; justify-content: space-between; color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; }
.tz-metric-arrow { color: var(--primary); font-size: 12px; }
.tz-metric-value { margin: 6px 0 4px; color: var(--text); font-family: var(--font-mono); font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
.tz-metric-change { color: var(--success); font-family: var(--font-mono); font-size: 10px; font-weight: 600; }
.tz-metric-change.neg { color: var(--danger); }
.tz-metric-sparkline { height: 32px; margin-top: 8px; }
.tz-metric-sparkline canvas { width: 100% !important; height: 32px !important; }

.tz-row { display: grid; gap: 10px; margin-bottom: 14px; }
.tz-row-1 { grid-template-columns: 1fr 230px 230px 310px; }
.tz-row-2 { grid-template-columns: 380px 1fr 200px 200px; }
.tz-chart-card { padding: 16px; transition: all 0.2s; }
.tz-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tz-chart-title { color: var(--text); font-size: 13px; font-weight: 700; }
.tz-chart-title span { color: var(--sub); font-size: 10px; font-weight: 400; }
.tz-chart-title.small { font-size: 11px; }
.tz-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--card2); color: var(--sub); font-family: var(--font-ui); font-size: 11px; }
.tz-chart-body--pnl { height: 120px; }
.tz-donut-wrap { position: relative; height: 110px; display: flex; align-items: center; justify-content: center; }
.tz-donut-wrap canvas { max-width: 110px; max-height: 110px; }
.tz-donut-center, .tz-outcome-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; }
.tz-donut-center div, .tz-outcome-center div { color: var(--text); font-family: var(--font-mono); font-size: 16px; font-weight: 800; }
.tz-donut-center span, .tz-outcome-center span { color: var(--sub); font-size: 9px; }
.tz-mini-legend { display: flex; justify-content: center; gap: 12px; margin-top: 8px; }
.tz-mini-legend span { display: flex; align-items: center; gap: 4px; font-size: 9px; }
.tz-mini-legend i, .tz-outcome-legend i { width: 6px; height: 6px; display: inline-block; border-radius: 50%; }
.success { color: var(--success); }
.danger { color: var(--danger); }
.tz-mini-legend .success i { background: var(--success); }
.tz-mini-legend .danger i { background: var(--danger); }
.tz-setup-list { display: flex; flex-direction: column; gap: 8px; }
.tz-setup-name { display: flex; justify-content: space-between; color: var(--text); font-size: 11px; }
.tz-setup-name span { color: var(--success); font-family: var(--font-mono); }
.tz-setup-bar-bg { height: 4px; overflow: hidden; border-radius: 2px; background: var(--primary-dim); }
.tz-setup-bar { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--primary), var(--hot)); }

.tz-recent-card { overflow: hidden; }
.tz-recent-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; }
.tz-view-all { color: var(--primary); cursor: pointer; font-size: 11px; font-weight: 600; }
.tz-trades-table { width: 100%; border-collapse: collapse; }
.tz-trades-table th { padding: 6px 10px; border-bottom: 1px solid var(--border); color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 0.6px; text-align: left; text-transform: uppercase; }
.tz-trades-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--text); font-family: var(--font-mono); font-size: 11px; white-space: nowrap; }
.tz-trades-table tr:last-child td { border-bottom: none; }
.tz-trades-table tr:hover td { background: var(--primary-dim); }
.tz-side-long, .tz-pnl-pos { color: var(--success); font-weight: 600; }
.tz-side-short { color: var(--danger); font-weight: 600; }

.tz-analytics-tabs { display: flex; gap: 0; margin: -16px -16px 12px; padding: 0 16px; border-bottom: 1px solid var(--border); }
.tz-atab { margin-bottom: -1px; padding: 10px; border: none; border-bottom: 2px solid transparent; background: transparent; color: var(--sub); cursor: pointer; font-family: var(--font-ui); font-size: 11px; font-weight: 500; white-space: nowrap; }
.tz-atab.active { border-bottom-color: var(--primary); color: var(--primary); font-weight: 600; }
.tz-analytics-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tz-ametric-label { color: var(--sub); font-size: 9px; letter-spacing: 0.6px; text-transform: uppercase; }
.tz-ametric-label.primary { color: var(--primary); }
.tz-ametric-val { margin-top: 3px; color: var(--text); font-family: var(--font-mono); font-size: 15px; font-weight: 700; }
.tz-ametric-chg { margin-top: 1px; font-family: var(--font-mono); font-size: 10px; }
.tz-heatmap-wrap { overflow-x: auto; }
.tz-heatmap { display: grid; grid-template-columns: 28px repeat(24, 1fr); gap: 2px; font-family: var(--font-mono); }
.tz-heat-label { color: var(--sub); font-size: 7px; text-align: center; }
.tz-heat-day { display: flex; align-items: center; color: var(--sub); font-size: 8px; }
.tz-heat-cell { height: 10px; border-radius: 2px; background: var(--primary); }
.tz-compact-card { padding: 12px; }
.tz-daily-value { color: var(--success); font-family: var(--font-mono); font-size: 16px; font-weight: 700; }
.tz-chart-body--daily { height: 100px; }
.tz-outcome-card { padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.tz-outcome-card .tz-chart-title { align-self: flex-start; }
.tz-outcome-wrap { position: relative; width: 110px; height: 110px; }
.tz-outcome-center div { font-size: 18px; }
.tz-outcome-legend { display: flex; flex-direction: column; gap: 4px; }
.tz-outcome-legend div { display: flex; align-items: center; gap: 6px; color: var(--sub); font-size: 10px; }
.tz-outcome-legend .primary { background: var(--primary); }
.tz-outcome-legend .danger { background: var(--danger); }

@media (max-width: 1400px) {
  .tz-metrics-grid { grid-template-columns: repeat(3, 1fr); }
  .tz-row-1, .tz-row-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .tz-page { --sidebar-w: 72px; }
  .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; }
  .tz-nav-item { justify-content: center; padding: 12px; }
  .tz-header { height: auto; min-height: var(--header-h); align-items: flex-start; flex-direction: column; padding: 12px; }
  .tz-header-controls { width: 100%; flex-wrap: wrap; }
  .tz-search-bar { flex: 1; min-width: 180px; }
  .tz-metrics-grid, .tz-row-1, .tz-row-2 { grid-template-columns: 1fr; }
}
</style>
