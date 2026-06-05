<template>
  <div class="tz-page" :data-theme="theme">
    <aside class="tz-sidebar">
      <div class="tz-sidebar-logo"><div class="tz-logo-icon">LF</div><div class="tz-logo-text">Lumina<span>Fox</span></div></div>
      <nav class="tz-nav-section">
        <div v-for="section in navSections" :key="section.label" class="tz-nav-group">
          <div class="tz-nav-label">{{ section.label }}</div>
          <RouterLink v-for="item in section.items" :key="item.label" class="tz-nav-item" :class="{ active: isNavActive(item) }" :to="item.to"><span class="tz-nav-icon" v-html="item.icon"></span>{{ item.label }}</RouterLink>
        </div>
      </nav>
      <div class="tz-sidebar-user"><div class="tz-user-avatar">TA</div><div class="tz-user-info"><div class="tz-user-name">Trader Alex</div><div class="tz-user-plan">Premium Pro</div></div><span class="tz-user-arrow">›</span></div>
    </aside>
    <div class="tz-main">
      <header class="tz-header">
        <div class="tz-header-welcome"><h2>Trade Replay</h2><p>Xem lại lệnh giao dịch với chart mô phỏng</p></div>
        <div class="tz-header-controls">
          <label class="tz-search-bar"><span>⌕</span><input v-model="search" type="text" placeholder="Search trades..." /></label>
          <LanguageToggle />
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div class="tz-replay-layout">
          <div class="tz-replay-chart">
            <div class="tz-chart-card" style="height:100%;display:flex;flex-direction:column;">
              <div class="tz-chart-header">
                <div class="tz-chart-title">{{ selectedTrade ? `${selectedTrade.symbol} · ${selectedTrade.side}` : 'Chọn lệnh để xem replay' }}</div>
                <div class="tz-replay-controls">
                  <button class="tz-btn-filter" :disabled="!selectedTrade || isPlaying" @click="playReplay">{{ isPlaying ? '⏸' : '▶' }} Play</button>
                  <button class="tz-btn-filter" :disabled="!selectedTrade" @click="resetReplay">↺ Reset</button>
                  <input v-model.number="replaySpeed" type="range" min="1" max="10" class="tz-speed-slider" />
                  <span class="tz-speed-label">{{ replaySpeed }}x</span>
                </div>
              </div>
              <div class="tz-replay-chart-area" ref="chartContainer">
                <canvas ref="replayChartRef"></canvas>
                <div class="tz-replay-overlay" v-if="replayProgress > 0">
                  <div class="tz-replay-price">${{ currentPrice.toFixed(2) }}</div>
                  <div class="tz-replay-progress">{{ replayProgress.toFixed(0) }}%</div>
                </div>
              </div>
            </div>
          </div>
          <div class="tz-replay-list">
            <div class="tz-chart-card" style="height:100%;display:flex;flex-direction:column;">
              <div class="tz-chart-title" style="padding:0 0 10px 0;">Trade History</div>
              <div class="tz-replay-trades" style="flex:1;overflow-y:auto;">
                <div v-for="trade in filteredTrades" :key="trade.id" class="tz-rp-trade" :class="{ active: selectedTrade === trade, win: trade.pnl > 0, loss: trade.pnl < 0 }" @click="selectTrade(trade)">
                  <div class="tz-rp-symbol">{{ trade.symbol }}</div>
                  <div class="tz-rp-side" :class="trade.side === 'SHORT' ? 'danger' : 'success'">{{ trade.side }}</div>
                  <div class="tz-rp-pnl" :class="trade.pnl >= 0 ? 'success' : 'danger'">{{ money(trade.pnl) }}</div>
                  <div class="tz-rp-time">{{ trade.closeTime ? new Date(trade.closeTime).toLocaleDateString() : '--' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Chart from 'chart.js/auto'
import { fetchMt5MockPayload } from '../mocks/mt5MockApi.js'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'
import LanguageToggle from '../components/LanguageToggle.vue'

const userStore = useUserStore()

const route = useRoute()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const search = ref('')
const trades = ref([])
const selectedTrade = ref(null)
const isPlaying = ref(false)
const replayProgress = ref(0)
const replaySpeed = ref(3)
const currentPrice = ref(0)
const replayChartRef = ref(null)
const chartContainer = ref(null)
let chartInstance = null
let replayTimer = null

const icons = { grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>', card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>', gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>' }
const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]
function isNavActive(item) { if (!item.to) return false; if (item.to === '/dashboard') return route.path === '/dashboard'; return route.path.startsWith(item.to) }
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; localStorage.setItem('tz-theme', theme.value); document.documentElement.setAttribute('data-theme', theme.value) }
function money(v) { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}` }

const filteredTrades = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = trades.value.slice(-30).reverse()
  if (q) list = list.filter(t => (t.symbol || '').toLowerCase().includes(q))
  return list
})

function selectTrade(trade) {
  resetReplay()
  selectedTrade.value = trade
  currentPrice.value = trade.entryPrice || 0
  buildReplayChart()
}

function buildReplayChart() {
  if (!replayChartRef.value || !selectedTrade.value) return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  const trade = selectedTrade.value
  const points = 30
  const data = []
  const entry = Number(trade.entryPrice) || 2350
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * (trade.entryPrice ? trade.entryPrice * 0.02 : 10)
    data.push(entry + noise)
  }
  const tickColor = theme.value === 'dark' ? '#B8A8B8' : '#6F6472'
  chartInstance = new Chart(replayChartRef.value.getContext('2d'), {
    type: 'line',
    data: { labels: Array.from({ length: points }, (_, i) => `${i}`), datasets: [{ data, borderColor: '#FF2D9A', borderWidth: 2, fill: true, backgroundColor: 'rgba(255,45,154,0.1)', tension: 0.4, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: theme.value === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(23,18,26,0.08)' }, ticks: { color: tickColor, font: { size: 9 } } } } }
  })
}

function playReplay() {
  if (isPlaying.value) { isPlaying.value = false; clearInterval(replayTimer); return }
  if (!selectedTrade.value) return
  isPlaying.value = true
  const entry = Number(selectedTrade.value.entryPrice) || 2350
  const exit = Number(selectedTrade.value.exitPrice) || entry
  const totalSteps = 50
  let step = Math.round((replayProgress.value / 100) * totalSteps)
  replayTimer = setInterval(() => {
    step++
    if (step > totalSteps) { clearInterval(replayTimer); isPlaying.value = false; replayProgress.value = 100; currentPrice.value = exit; return }
    replayProgress.value = (step / totalSteps) * 100
    currentPrice.value = entry + (exit - entry) * (step / totalSteps)
  }, 1000 / replaySpeed.value)
}

function resetReplay() {
  if (replayTimer) { clearInterval(replayTimer); replayTimer = null }
  isPlaying.value = false
  replayProgress.value = 0
  currentPrice.value = selectedTrade.value?.entryPrice || 0
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', theme.value)
  try {
    const headers = userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
    const data = await apiRequest('/api/trading/exness/analysis', { headers }).catch(() => null)
    if (data && data.hasData && data.tradeBook && Array.isArray(data.tradeBook.trades)) {
      trades.value = data.tradeBook.trades
    } else {
      const mockData = await fetchMt5MockPayload()
      trades.value = mockData.trades || []
    }
  } catch (e) { 
    trades.value = [] 
  }
})

onBeforeUnmount(() => { if (replayTimer) clearInterval(replayTimer); if (chartInstance) chartInstance.destroy() })
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
.tz-page[data-theme='light'] { --bg: #fff7fb; --card: #ffffff; --card2: #fff0f7; --border: #f2d6e6; --primary: #ff3b9d; --text: #17121a; --sub: #6f6472; --success: #00a86b; --danger: #ff3366; }
.tz-sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); height: 100vh; display: flex; flex-direction: column; background: var(--card); border-right: 1px solid var(--border); }
.tz-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
.tz-logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--hot)); color: #fff; font-size: 16px; font-weight: 800; }
.tz-logo-text { color: var(--text); font-size: 16px; font-weight: 700; }
.tz-logo-text span { color: var(--primary); }
.tz-nav-section { flex: 1; padding: 10px 0; }
.tz-nav-label { padding: 8px 18px 4px; color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; }
.tz-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; color: var(--sub); text-decoration: none; font-size: 13px; transition: all 0.18s; }
.tz-nav-item:hover, .tz-nav-item.active { color: var(--primary); background: var(--primary-dim); font-weight: 600; }
.tz-nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary); border-radius: 0 3px 3px 0; }
.tz-nav-icon { width: 16px; height: 16px; display: inline-flex; opacity: 0.8; }
.tz-sidebar-user { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
.tz-user-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #a020f0); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
.tz-user-info { flex: 1; }
.tz-user-name { font-size: 12px; font-weight: 600; color: var(--text); }
.tz-user-plan { font-size: 10px; color: var(--primary); }
.tz-main { flex: 1; min-width: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.tz-header { height: var(--header-h); display: flex; align-items: center; gap: 12px; padding: 0 20px; background: var(--card); border-bottom: 1px solid var(--border); }
.tz-header-welcome { flex: 1; }
.tz-header-welcome h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text); }
.tz-header-welcome p { margin: 2px 0 0; font-size: 11px; color: var(--sub); }
.tz-header-controls { display: flex; align-items: center; gap: 8px; }
.tz-search-bar, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-search-bar { width: 180px; display: flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 8px; font-size: 12px; }
.tz-search-bar input { width: 100%; border: none; outline: none; background: transparent; color: var(--text); font-size: 12px; }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-replay-layout { display: grid; grid-template-columns: 1fr 300px; gap: 12px; height: calc(100vh - 120px); }
.tz-replay-chart, .tz-replay-list { display: flex; flex-direction: column; }
.tz-chart-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.tz-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tz-chart-title { color: var(--text); font-size: 13px; font-weight: 700; }
.tz-btn-filter { padding: 5px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--card2); color: var(--text); font-size: 11px; cursor: pointer; }
.tz-replay-controls { display: flex; align-items: center; gap: 8px; }
.tz-speed-slider { width: 60px; }
.tz-speed-label { font-size: 10px; color: var(--sub); font-weight: 600; }
.tz-replay-chart-area { flex: 1; position: relative; min-height: 300px; }
.tz-replay-chart-area canvas { width: 100% !important; height: 100% !important; }
.tz-replay-overlay { position: absolute; top: 10px; right: 10px; text-align: right; }
.tz-replay-price { font-family: var(--font-mono); font-size: 24px; font-weight: 800; color: var(--primary); }
.tz-replay-progress { font-size: 12px; color: var(--sub); }
.tz-replay-trades { display: flex; flex-direction: column; gap: 4px; }
.tz-rp-trade { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.tz-rp-trade:hover, .tz-rp-trade.active { border-color: var(--border); background: var(--primary-dim); }
.tz-rp-trade.win { border-left: 3px solid var(--success); }
.tz-rp-trade.loss { border-left: 3px solid var(--danger); }
.tz-rp-symbol { font-weight: 700; font-size: 12px; width: 60px; }
.tz-rp-side { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.tz-rp-side.success { background: rgba(0,208,132,0.15); color: var(--success); }
.tz-rp-side.danger { background: rgba(255,59,122,0.15); color: var(--danger); }
.tz-rp-pnl { font-family: var(--font-mono); font-size: 12px; font-weight: 700; flex: 1; }
.tz-rp-pnl.success { color: var(--success); }
.tz-rp-pnl.danger { color: var(--danger); }
.tz-rp-time { font-size: 10px; color: var(--sub); }
@media (max-width: 1100px) { .tz-replay-layout { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .tz-page { --sidebar-w: 72px; } .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; } }
</style>
