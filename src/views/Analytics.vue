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
          <RouterLink v-for="item in section.items" :key="item.label" class="tz-nav-item" :class="{ active: isNavActive(item) }" :to="item.to">
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
          <h2>Phân tích giao dịch chuyên sâu</h2>
          <p>Phân tích tổng hợp & chi tiết từng lệnh</p>
        </div>
        <div class="tz-header-controls">
          <button class="tz-btn-filter" type="button" @click="switchMode">
            {{ deepMode ? 'Tổng quan' : 'Chi tiết từng lệnh' }}
          </button>
          <RouterLink class="tz-btn-add" to="/journal">+ Add Trade</RouterLink>
          <label class="tz-search-bar">
            <span>⌕</span>
            <input v-model="search" type="text" placeholder="Search trades..." />
          </label>
          <button class="tz-icon-btn" type="button" title="Toggle theme" @click="toggleTheme">
            <span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
          </button>
        </div>
      </header>

      <main class="tz-dashboard">
        <div class="tz-metrics-grid">
          <article v-for="m in summaryMetrics" :key="m.label" class="tz-metric-card" :class="{ highlight: m.highlight }">
            <div class="tz-metric-label">{{ m.label }}</div>
            <div class="tz-metric-value" :class="m.tone">{{ m.value }}</div>
            <div class="tz-metric-change" :class="m.tone">{{ m.sub }}</div>
          </article>
        </div>

        <section v-if="!deepMode" class="tz-row tz-row-1">
          <article class="tz-chart-card" style="grid-column: 1 / 3;">
            <div class="tz-chart-header">
              <div class="tz-chart-title">Phân tích PnL theo Setup</div>
              <select class="tz-select" v-model="setupFilter">
                <option value="all">All Setups</option>
                <option v-for="s in setupNames" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="tz-analytics-panel">
              <div class="tz-setup-list">
                <div v-for="s in filteredSetups" :key="s.name" class="tz-setup-item">
                  <div class="tz-setup-name">{{ s.name }} <span>{{ s.count }} trades</span></div>
                  <div class="tz-setup-bar-bg"><div class="tz-setup-bar" :style="{ width: s.width, background: s.color }"></div></div>
                  <div class="tz-setup-stats">
                    <span>Win: {{ s.winRate.toFixed(1) }}%</span>
                    <span>PnL: <b :class="s.pnl >= 0 ? 'success' : 'danger'">{{ money(s.pnl) }}</b></span>
                    <span>Avg R: {{ s.avgR.toFixed(2) }}R</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header"><div class="tz-chart-title">Phân phối R Multiple</div></div>
            <div class="tz-distribution-wrap">
              <canvas ref="distRef"></canvas>
            </div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header"><div class="tz-chart-title">Phân tích hành vi</div></div>
            <div class="tz-behavior-summary">
              <div class="tz-behavior-score">
                <div class="tz-bs-ring">
                  <svg viewBox="0 0 36 36">
                    <path class="tz-bs-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    <path class="tz-bs-fill" :stroke-dasharray="`${behaviorScore}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  </svg>
                  <div class="tz-bs-center">{{ behaviorScore.toFixed(0) }}</div>
                </div>
              </div>
              <ul class="tz-bs-list">
                <li v-for="msg in behaviorMessages" :key="msg">{{ msg }}</li>
              </ul>
            </div>
          </article>
        </section>

        <section v-if="!deepMode" class="tz-row tz-row-2">
          <article class="tz-chart-card">
            <div class="tz-chart-header"><div class="tz-chart-title">Performance Metrics chi tiết</div></div>
            <div class="tz-analytics-table">
              <table class="tz-atable">
                <thead>
                  <tr><th>Metric</th><th>Value</th><th>Metric</th><th>Value</th></tr>
                </thead>
                <tbody>
                  <tr v-for="pair in metricPairs" :key="pair[0].label">
                    <td class="tz-alabel">{{ pair[0].label }}</td>
                    <td :class="pair[0].cls">{{ pair[0].value }}</td>
                    <td class="tz-alabel">{{ pair[1].label }}</td>
                    <td :class="pair[1].cls">{{ pair[1].value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header">
              <div class="tz-chart-title">Phân tích Symbol & Strategy</div>
              <select class="tz-select" v-model="analysisTab">
                <option value="symbol">By Symbol</option>
                <option value="strategy">By Strategy</option>
                <option value="session">By Session</option>
                <option value="emotion">By Emotion</option>
              </select>
            </div>
            <div class="tz-grouped-list">
              <div v-for="g in groupedAnalysis" :key="g.key" class="tz-group-row">
                <div class="tz-group-info">
                  <strong>{{ g.key }}</strong>
                  <span>{{ g.trades }} trades · {{ g.winRate.toFixed(1) }}% WR</span>
                </div>
                <div class="tz-group-bar-bg"><div class="tz-group-bar" :style="{ width: g.barWidth, background: g.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }"></div></div>
                <div class="tz-group-pnl" :class="g.pnl >= 0 ? 'success' : 'danger'">{{ money(g.pnl) }}</div>
              </div>
            </div>
          </article>

          <article class="tz-chart-card">
            <div class="tz-chart-header"><div class="tz-chart-title">Chuỗi Lệnh & Hiệu suất nắm giữ</div></div>
            <div class="tz-streaks-wrap">
              <div class="tz-streaks-grid">
                <div class="tz-streak-item success">
                  <label>Chuỗi Thắng Max</label>
                  <strong>{{ analysis.maxConsecutiveWins || 0 }} lệnh</strong>
                </div>
                <div class="tz-streak-item danger">
                  <label>Chuỗi Thua Max</label>
                  <strong>{{ analysis.maxConsecutiveLosses || 0 }} lệnh</strong>
                </div>
              </div>
              
              <div class="tz-holding-table-title">Hiệu suất theo thời gian nắm giữ</div>
              <div class="tz-holding-list">
                <div class="tz-holding-row">
                  <span>Ngắn (&le;15m)</span>
                  <span>{{ analysis.holdingTimePerformance?.short?.trades || 0 }} lệnh</span>
                  <span>WR: {{ analysis.holdingTimePerformance?.short?.winRate || 0 }}%</span>
                  <span :class="(analysis.holdingTimePerformance?.short?.pnl || 0) >= 0 ? 'success' : 'danger'">
                    {{ money(analysis.holdingTimePerformance?.short?.pnl) }}
                  </span>
                </div>
                <div class="tz-holding-row">
                  <span>Trung (15m-2h)</span>
                  <span>{{ analysis.holdingTimePerformance?.medium?.trades || 0 }} lệnh</span>
                  <span>WR: {{ analysis.holdingTimePerformance?.medium?.winRate || 0 }}%</span>
                  <span :class="(analysis.holdingTimePerformance?.medium?.pnl || 0) >= 0 ? 'success' : 'danger'">
                    {{ money(analysis.holdingTimePerformance?.medium?.pnl) }}
                  </span>
                </div>
                <div class="tz-holding-row">
                  <span>Dài (&gt;2h)</span>
                  <span>{{ analysis.holdingTimePerformance?.long?.trades || 0 }} lệnh</span>
                  <span>WR: {{ analysis.holdingTimePerformance?.long?.winRate || 0 }}%</span>
                  <span :class="(analysis.holdingTimePerformance?.long?.pnl || 0) >= 0 ? 'success' : 'danger'">
                    {{ money(analysis.holdingTimePerformance?.long?.pnl) }}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section v-if="deepMode" class="tz-deep-panel">
          <div class="tz-deep-controls">
            <div class="tz-chart-title">Phân tích chi tiết từng lệnh giao dịch</div>
            <label class="tz-search-bar">
              <span>⌕</span>
              <input v-model="search" type="text" placeholder="Filter by symbol, strategy..." />
            </label>
          </div>
          <div class="tz-deep-trades">
            <article v-for="trade in filteredDeepTrades" :key="trade.id || trade.symbol + trade.exitTime" class="tz-deep-card" :class="{ expanded: selectedTrade === trade }" @click="selectedTrade = selectedTrade === trade ? null : trade">
              <div class="tz-deep-head">
                <div class="tz-deep-symbol">{{ trade.symbol || '--' }}</div>
                <span class="tz-side-label" :class="String(trade.side || '').toLowerCase() === 'short' ? 'danger' : 'success'">{{ trade.side || '--' }}</span>
                <div class="tz-deep-pnl" :class="num(trade.profit || trade.pnl) >= 0 ? 'success' : 'danger'">{{ money(trade.profit || trade.pnl) }}</div>
                <div class="tz-deep-r">R: {{ trade.rMultiple ? trade.rMultiple.toFixed(2) : trade.r ? trade.r : '--' }}</div>
                <span class="tz-deep-expand">{{ selectedTrade === trade ? '▲' : '▼' }}</span>
              </div>
              <div v-if="selectedTrade === trade" class="tz-deep-body">
                <div class="tz-deep-grid">
                  <div><label>Entry</label><span>{{ trade.entryPrice || trade.entry || '--' }}</span></div>
                  <div><label>Exit</label><span>{{ trade.exitPrice || trade.exit || '--' }}</span></div>
                  <div><label>Volume</label><span>{{ trade.volume || '--' }}</span></div>
                  <div><label>SL</label><span>{{ trade.stopLoss || trade.sl || '--' }}</span></div>
                  <div><label>TP</label><span>{{ trade.takeProfit || trade.tp || '--' }}</span></div>
                  <div><label>Risk</label><span>{{ money(trade.riskAmount || trade.risk) }}</span></div>
                  <div><label>RR Plan</label><span>{{ trade.rr ? trade.rr.toFixed(2) : '--' }}</span></div>
                  <div><label>Hold Time</label><span>{{ trade.holdingMinutes ? `${trade.holdingMinutes}m` : '--' }}</span></div>
                  <div><label>Session</label><span>{{ trade.session || '--' }}</span></div>
                  <div><label>Strategy</label><span>{{ trade.strategyTag || '--' }}</span></div>
                  <div><label>Emotion</label><span>{{ trade.emotionTag || '--' }}</span></div>
                  <div><label>Condition</label><span>{{ trade.marketCondition || '--' }}</span></div>
                </div>
                <div class="tz-deep-metrics">
                  <div class="tz-dm-item" :class="trade.executionScore >= 70 ? 'success' : trade.executionScore >= 40 ? 'warn' : 'danger'">
                    Execution: {{ trade.executionScore }}/100
                  </div>
                  <div v-if="!(trade.stopLoss || trade.sl)" class="tz-dm-item danger">
                    Thiếu SL ⚠️
                  </div>
                  <div v-if="trade.slRemoved" class="tz-dm-item danger">
                    Hủy/Dời SL ⚠️
                  </div>
                  <div v-if="trade.emotionTag === 'FOMO' || trade.emotionTag === 'Revenge'" class="tz-dm-item warn">
                    Cảm xúc ({{ trade.emotionTag }}) 🧠
                  </div>
                  <div class="tz-dm-item" :class="num(trade.profit || trade.pnl) >= 0 ? 'success' : 'danger'">
                    MAE: {{ money(trade.mae) }}
                  </div>
                  <div class="tz-dm-item" :class="num(trade.profit || trade.pnl) >= 0 ? 'success' : 'danger'">
                    MFE: {{ money(trade.mfe) }}
                  </div>
                </div>
                <div v-if="trade.notes" class="tz-deep-notes">{{ trade.notes }}</div>
              </div>
            </article>
            <p v-if="!filteredDeepTrades.length" class="tz-empty">Không có lệnh nào khớp bộ lọc.</p>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'
import { computeTradingMetrics, computeBehaviorScore, computePatterns, computeDistribution, computePerformanceBySetup, computeAnalyticsTable, enrichTrade, num } from '../lib/tradingMetrics.js'
import { fetchMt5MockPayload } from '../mocks/mt5MockApi.js'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const search = ref('')
const deepMode = ref(false)
const selectedTrade = ref(null)
const setupFilter = ref('all')
const analysisTab = ref('symbol')
const loading = ref(false)
const tradeRows = ref([])
const distRef = ref(null)
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

const enrichedTrades = computed(() => tradeRows.value.map(t => enrichTrade(t)))

const analysis = computed(() => computeTradingMetrics(enrichedTrades.value))
const behavior = computed(() => computeBehaviorScore(enrichedTrades.value, analysis.value))
const behaviorScore = computed(() => behavior.value.behaviorScore)
const behaviorMessages = computed(() => behavior.value.messages || [])

const patterns = computed(() => computePatterns(analysis.value))
const distributions = computed(() => computeDistribution(enrichedTrades.value))
const setupPerformance = computed(() => computePerformanceBySetup(enrichedTrades.value))
const setupNames = computed(() => setupPerformance.value.map(s => s.key))

const summaryMetrics = computed(() => [
  { label: 'Net PnL', value: money(analysis.value.netProfit), tone: analysis.value.netProfit >= 0 ? 'success' : 'danger', sub: `${analysis.value.total} trades` },
  { label: 'Win Rate', value: `${analysis.value.winRate.toFixed(1)}%`, tone: analysis.value.winRate >= 50 ? 'success' : 'danger', sub: `${analysis.value.wins}W / ${analysis.value.losses}L` },
  { label: 'Profit Factor', value: analysis.value.profitFactor.toFixed(2), tone: analysis.value.profitFactor >= 1.5 ? 'success' : 'warn', sub: `RR ${analysis.value.rr.toFixed(2)}` },
  { label: 'Expectancy', value: money(analysis.value.expectancy), tone: analysis.value.expectancy >= 0 ? 'success' : 'danger', sub: `${analysis.value.avgR.toFixed(2)}R avg` },
  { label: 'Kelly %', value: `${analysis.value.kelly || 0}%`, tone: analysis.value.kelly > 20 ? 'success' : 'warn', sub: 'Tỷ lệ Kelly tối ưu' },
  { label: 'Sizing Rec', value: analysis.value.sizingRecommendation || 'Standard (1.0x)', tone: 'info', sub: 'Khuyến nghị lot' },
  { label: 'Behavior Score', value: `${behaviorScore.value.toFixed(0)}/100`, tone: behaviorScore.value >= 70 ? 'success' : behaviorScore.value >= 40 ? 'warn' : 'danger', sub: `${behavior.value.disciplineScore.toFixed(0)} discipline` },
  { label: 'Drawdown', value: `${analysis.value.drawdownPct.toFixed(1)}%`, tone: analysis.value.drawdownPct > 15 ? 'danger' : 'success', sub: money(analysis.value.drawdownAbs) }
])

const filteredSetups = computed(() => {
  let list = setupPerformance.value
  if (setupFilter.value !== 'all') list = list.filter(s => s.key === setupFilter.value)
  const maxPnl = Math.max(1, ...list.map(s => Math.abs(s.pnl)))
  return list.map(s => ({
    name: s.key,
    count: s.trades,
    pnl: s.pnl,
    winRate: s.winRate,
    avgR: s.trades ? s.pnl / (s.trades * Math.max(Math.abs(s.pnl / s.trades), 1)) * (s.winRate / 100) : 0,
    width: `${Math.max(8, (Math.abs(s.pnl) / maxPnl) * 100)}%`,
    color: s.pnl >= 0 ? 'var(--success)' : 'var(--danger)'
  }))
})

const metricPairs = computed(() => {
  const table = computeAnalyticsTable(enrichedTrades.value)
  const pairs = []
  for (let i = 0; i < table.length; i += 2) {
    const left = table[i]
    const right = table[i + 1] || { label: '', value: '', cls: '' }
    pairs.push([{ label: left.label, value: left.value, cls: '' }, { label: right.label, value: right.value, cls: '' }])
  }
  return pairs
})

const groupedAnalysis = computed(() => {
  const map = analysisTab.value === 'symbol' ? analysis.value.symbolMap
    : analysisTab.value === 'strategy' ? analysis.value.strategyMap
    : analysisTab.value === 'session' ? analysis.value.sessionMap
    : analysis.value.emotionMap
  if (!map || !Object.keys(map).length) return []
  const entries = Object.entries(map).map(([key, val]) => ({ key, ...val, winRate: val.trades ? (val.wins / val.trades) * 100 : 0 }))
  const maxPnl = Math.max(1, ...entries.map(e => Math.abs(e.pnl)))
  return entries.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 12).map(e => ({
    ...e,
    barWidth: `${Math.max(4, (Math.abs(e.pnl) / maxPnl) * 100)}%`
  }))
})

const filteredDeepTrades = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = enrichedTrades.value
  if (q) list = list.filter(t => `${t.symbol || ''} ${t.strategyTag || ''} ${t.session || ''}`.toLowerCase().includes(q))
  return list.slice(-50).reverse()
})

function switchMode() {
  deepMode.value = !deepMode.value
  selectedTrade.value = null
}

function money(value) {
  const n = num(value)
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
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
  if (!distRef.value) return
  const labels = distributions.value.map(d => d.key)
  const counts = distributions.value.map(d => d.count)
  const colors = labels.map(l => {
    if (l.startsWith('>') || l.startsWith('+')) return 'rgba(0,208,132,0.7)'
    if (l.startsWith('<') || l.startsWith('-')) return 'rgba(255,59,122,0.7)'
    return 'rgba(255,45,154,0.5)'
  })
  const tickColor = theme.value === 'dark' ? '#B8A8B8' : '#6F6472'
  addChart(distRef.value, {
    type: 'bar',
    data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderRadius: 4, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 9 } } },
        y: { grid: { color: theme.value === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(23,18,26,0.08)' }, ticks: { color: tickColor, font: { size: 9 } } }
      }
    }
  })
}

watch(theme, async (value) => {
  localStorage.setItem('tz-theme', value)
  document.documentElement.setAttribute('data-theme', value)
  await nextTick()
  buildCharts()
})

watch([analysis, distributions], async () => {
  await nextTick()
  buildCharts()
}, { deep: true })

function authHeaders() {
  return userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
}

async function loadData() {
  loading.value = true
  try {
    const data = await apiRequest('/api/trading/exness/analysis', { headers: authHeaders() })
    if (data && data.hasData && data.tradeBook && Array.isArray(data.tradeBook.trades) && data.tradeBook.trades.length > 0) {
      tradeRows.value = data.tradeBook.trades
    } else {
      const mockData = await fetchMt5MockPayload()
      tradeRows.value = mockData.trades || []
    }
  } catch (e) {
    console.error('Không thể tải dữ liệu phân tích MT5 thật, đang dùng dữ liệu mô phỏng (mock):', e)
    try {
      const mockData = await fetchMt5MockPayload()
      tradeRows.value = mockData.trades || []
    } catch (err) {
      tradeRows.value = []
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', theme.value)
  await loadData()
  await nextTick()
  buildCharts()
})

onBeforeUnmount(destroyCharts)
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --warn: #ffc861; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Syne', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
.tz-page[data-theme='light'] { --bg: #fff7fb; --card: #ffffff; --card2: #fff0f7; --border: #f2d6e6; --primary: #ff3b9d; --primary-glow: rgba(255,59,157,0.1); --primary-dim: rgba(255,59,157,0.05); --hot: #ff3b9d; --text: #17121a; --sub: #6f6472; --success: #00a86b; --danger: #ff3366; --warn: #d58a00; }
.tz-sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); height: 100vh; display: flex; flex-direction: column; overflow-y: auto; background: var(--card); border-right: 1px solid var(--border); z-index: 10; }
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
.tz-sidebar-user { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
.tz-user-avatar { width: 34px; height: 34px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #a020f0); box-shadow: 0 0 10px var(--primary-glow); color: #fff; font-size: 12px; font-weight: 700; }
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
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--sub); cursor: pointer; border: 1px solid var(--border); background: var(--card2); }
.tz-theme-toggle-knob { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); font-size: 11px; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-metrics-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; margin-bottom: 14px; }
.tz-metric-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; transition: all 0.2s; }
.tz-metric-card:hover, .tz-chart-card:hover { border-color: var(--primary); box-shadow: 0 0 20px var(--primary-dim); }
.tz-metric-label { color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; }
.tz-metric-value { margin: 6px 0 4px; color: var(--text); font-family: var(--font-mono); font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
.tz-metric-value.success { color: var(--success); }
.tz-metric-value.danger { color: var(--danger); }
.tz-metric-value.warn { color: var(--warn); }
.tz-metric-change { font-family: var(--font-mono); font-size: 10px; font-weight: 600; }
.tz-metric-change.success { color: var(--success); }
.tz-metric-change.danger { color: var(--danger); }
.tz-metric-change.warn { color: var(--warn); }
.tz-row { display: grid; gap: 10px; margin-bottom: 14px; }
.tz-row-1 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.tz-row-2 { display: grid; grid-template-columns: 1.5fr 1fr 1fr; }
.tz-chart-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; transition: all 0.2s; }
.tz-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tz-chart-title { color: var(--text); font-size: 13px; font-weight: 700; }
.tz-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--card2); color: var(--sub); font-family: var(--font-ui); font-size: 11px; }
.tz-analytics-panel { max-height: 360px; overflow-y: auto; }
.tz-setup-list { display: flex; flex-direction: column; gap: 10px; }
.tz-setup-item { padding: 4px 0; }
.tz-setup-name { display: flex; justify-content: space-between; color: var(--text); font-size: 12px; margin-bottom: 2px; }
.tz-setup-name span { color: var(--sub); font-size: 10px; }
.tz-setup-bar-bg { height: 6px; overflow: hidden; border-radius: 3px; background: var(--primary-dim); }
.tz-setup-bar { height: 100%; border-radius: 3px; transition: width 0.4s; }
.tz-setup-stats { display: flex; gap: 12px; margin-top: 4px; font-size: 10px; color: var(--sub); }
.tz-setup-stats b.success { color: var(--success); }
.tz-setup-stats b.danger { color: var(--danger); }
.tz-distribution-wrap { height: 220px; }
.tz-distribution-wrap canvas { width: 100% !important; height: 220px !important; }
.tz-behavior-summary { display: flex; gap: 16px; align-items: flex-start; }
.tz-behavior-score { flex-shrink: 0; }
.tz-bs-ring { position: relative; width: 90px; height: 90px; }
.tz-bs-ring svg { width: 90px; height: 90px; transform: rotate(-90deg); }
.tz-bs-bg { fill: none; stroke: var(--primary-dim); stroke-width: 3; }
.tz-bs-fill { fill: none; stroke: var(--primary); stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.6s; }
.tz-bs-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 22px; font-weight: 800; color: var(--text); }
.tz-bs-list { flex: 1; list-style: none; padding: 0; margin: 0; font-size: 11px; color: var(--sub); line-height: 1.6; }
.tz-bs-list li::before { content: '•'; color: var(--primary); margin-right: 6px; }
.tz-analytics-table { max-height: 400px; overflow-y: auto; }
.tz-atable { width: 100%; border-collapse: collapse; }
.tz-atable th { padding: 6px 10px; border-bottom: 1px solid var(--border); color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 0.6px; text-align: left; text-transform: uppercase; }
.tz-atable td { padding: 7px 10px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; }
.tz-alabel { color: var(--sub); font-weight: 500; }
.tz-grouped-list { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.tz-group-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); }
.tz-group-info { min-width: 0; }
.tz-group-info strong { font-size: 12px; display: block; }
.tz-group-info span { font-size: 10px; color: var(--sub); }
.tz-group-bar-bg { height: 6px; border-radius: 3px; background: var(--primary-dim); overflow: hidden; }
.tz-group-bar { height: 100%; border-radius: 3px; }
.tz-group-pnl { font-family: var(--font-mono); font-size: 12px; font-weight: 700; white-space: nowrap; }
.tz-group-pnl.success { color: var(--success); }
.tz-group-pnl.danger { color: var(--danger); }
.tz-deep-panel { display: flex; flex-direction: column; gap: 12px; }
.tz-deep-controls { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.tz-deep-trades { display: flex; flex-direction: column; gap: 6px; }
.tz-deep-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
.tz-deep-card:hover { border-color: var(--primary); }
.tz-deep-card.expanded { border-color: var(--primary); box-shadow: 0 0 16px var(--primary-glow); }
.tz-deep-head { display: flex; align-items: center; gap: 12px; padding: 10px 14px; }
.tz-deep-symbol { font-weight: 700; font-size: 13px; width: 80px; }
.tz-side-label { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
.tz-side-label.success { background: rgba(0,208,132,0.15); color: var(--success); }
.tz-side-label.danger { background: rgba(255,59,122,0.15); color: var(--danger); }
.tz-deep-pnl { font-family: var(--font-mono); font-size: 14px; font-weight: 700; flex: 1; }
.tz-deep-pnl.success { color: var(--success); }
.tz-deep-pnl.danger { color: var(--danger); }
.tz-deep-r { font-family: var(--font-mono); font-size: 11px; color: var(--sub); }
.tz-deep-expand { color: var(--sub); font-size: 10px; }
.tz-deep-body { border-top: 1px solid var(--border); padding: 14px; }
.tz-deep-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.tz-deep-grid div { }
.tz-deep-grid label { display: block; font-size: 9px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; }
.tz-deep-grid span { font-family: var(--font-mono); font-size: 12px; color: var(--text); }
.tz-deep-metrics { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.tz-dm-item { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
.tz-dm-item.success { background: rgba(0,208,132,0.1); color: var(--success); }
.tz-dm-item.danger { background: rgba(255,59,122,0.1); color: var(--danger); }
.tz-dm-item.warn { background: rgba(255,200,97,0.1); color: var(--warn); }
.tz-deep-notes { font-size: 12px; color: var(--sub); font-style: italic; padding: 8px; background: var(--primary-dim); border-radius: 8px; }
.tz-empty { text-align: center; color: var(--sub); padding: 40px; font-size: 13px; }

.tz-streaks-wrap { display: flex; flex-direction: column; gap: 12px; }
.tz-streaks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tz-streak-item { padding: 10px; border-radius: 8px; background: var(--card2); border: 1px solid var(--border); text-align: center; }
.tz-streak-item.success { border-color: rgba(0,208,132,0.2); }
.tz-streak-item.danger { border-color: rgba(255,59,122,0.2); }
.tz-streak-item label { display: block; font-size: 9px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.tz-streak-item strong { font-family: var(--font-mono); font-size: 14px; font-weight: 700; }
.tz-streak-item.success strong { color: var(--success); }
.tz-streak-item.danger strong { color: var(--danger); }
.tz-holding-table-title { font-size: 11px; font-weight: 600; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 4px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.tz-holding-list { display: flex; flex-direction: column; gap: 6px; }
.tz-holding-row { display: grid; grid-template-columns: 1.2fr 0.8fr 1fr 1fr; gap: 8px; font-size: 11px; padding: 6px 0; border-bottom: 1px solid var(--border); }
.tz-holding-row span:last-child { font-family: var(--font-mono); font-weight: 700; text-align: right; }
.tz-holding-row span:last-child.success { color: var(--success); }
.tz-holding-row span:last-child.danger { color: var(--danger); }
@media (max-width: 1400px) {
  .tz-metrics-grid { grid-template-columns: repeat(3, 1fr); }
  .tz-row-1 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .tz-page { --sidebar-w: 72px; }
  .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; }
  .tz-nav-item { justify-content: center; padding: 12px; }
  .tz-header { height: auto; flex-direction: column; padding: 12px; }
  .tz-header-controls { width: 100%; flex-wrap: wrap; }
  .tz-metrics-grid { grid-template-columns: 1fr; }
  .tz-row-1, .tz-row-2 { grid-template-columns: 1fr; }
  .tz-deep-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
