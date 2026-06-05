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
        <div class="tz-header-welcome"><h2>Backtesting</h2><p>Kiểm tra chiến lược trên dữ liệu lịch sử</p></div>
        <div class="tz-header-controls">
          <button class="tz-btn-add" @click="runBacktest">▶ Chạy Backtest</button>
          <LanguageToggle />
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <section class="tz-bt-config">
          <div class="tz-bt-grid">
            <div><label>Symbol</label><select v-model="config.symbol" class="tz-select"><option v-for="s in symbols" :key="s" :value="s">{{ s }}</option></select></div>
            <div><label>Timeframe</label><select v-model="config.timeframe" class="tz-select"><option>M1</option><option>M5</option><option>M15</option><option>M30</option><option>H1</option><option>H4</option><option>D1</option></select></div>
            <div><label>Days</label><select v-model="config.days" class="tz-select"><option :value="30">30 days</option><option :value="60">60 days</option><option :value="90">90 days</option><option :value="180">180 days</option></select></div>
            <div><label>Entry Rule</label><select v-model="config.rule" class="tz-select"><option value="breakout">Breakout</option><option value="pullback">Pullback</option><option value="trend">Trend Following</option><option value="reversal">Reversal</option></select></div>
            <div><label>SL (pips)</label><input v-model.number="config.slPips" type="number" class="tz-input-sm" /></div>
            <div><label>TP (pips)</label><input v-model.number="config.tpPips" type="number" class="tz-input-sm" /></div>
          </div>
        </section>
        <div v-if="btResult" class="tz-bt-result">
          <section class="tz-metrics-grid" style="grid-template-columns: repeat(4,1fr);">
            <article class="tz-metric-card"><div class="tz-metric-label">Total Trades</div><div class="tz-metric-value">{{ btResult.total }}</div></article>
            <article class="tz-metric-card"><div class="tz-metric-label">Win Rate</div><div class="tz-metric-value" :class="btResult.winRate >= 50 ? 'success' : 'danger'">{{ btResult.winRate.toFixed(1) }}%</div></article>
            <article class="tz-metric-card"><div class="tz-metric-label">Net PnL</div><div class="tz-metric-value" :class="btResult.netPnl >= 0 ? 'success' : 'danger'">{{ money(btResult.netPnl) }}</div></article>
            <article class="tz-metric-card"><div class="tz-metric-label">Profit Factor</div><div class="tz-metric-value" :class="btResult.profitFactor >= 1.5 ? 'success' : 'danger'">{{ btResult.profitFactor.toFixed(2) }}</div></article>
          </section>
          <article class="tz-chart-card" style="margin-top:10px;">
            <div class="tz-chart-header"><div class="tz-chart-title">Kết quả Backtest - Equity Curve</div></div>
            <div class="tz-bt-equity"><canvas ref="equityRef"></canvas></div>
          </article>
          <article class="tz-chart-card" style="margin-top:10px;">
            <div class="tz-chart-header"><div class="tz-chart-title">Danh sách lệnh Backtest</div></div>
            <table class="tz-atable">
              <thead><tr><th>#</th><th>Entry</th><th>Exit</th><th>Side</th><th>Entry Price</th><th>Exit Price</th><th>PnL</th></tr></thead>
              <tbody>
                <tr v-for="(t, i) in btResult.trades" :key="i">
                  <td>{{ i + 1 }}</td><td>{{ t.entryTime }}</td><td>{{ t.exitTime }}</td>
                  <td :class="t.side === 'LONG' ? 'success' : 'danger'">{{ t.side }}</td>
                  <td>{{ t.entryPrice.toFixed(2) }}</td><td>{{ t.exitPrice.toFixed(2) }}</td>
                  <td :class="t.pnl >= 0 ? 'success' : 'danger'">{{ money(t.pnl) }}</td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>
        <div v-else class="tz-bt-placeholder">
          <p>Cấu hình thông số và nhấn "Chạy Backtest" để bắt đầu.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Chart from 'chart.js/auto'
import LanguageToggle from '../components/LanguageToggle.vue'

const route = useRoute()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const symbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD']
const config = reactive({ symbol: 'XAUUSD', timeframe: 'H1', days: 90, rule: 'breakout', slPips: 20, tpPips: 40 })
const btResult = ref(null)
const equityRef = ref(null)
const chartInstances = []

const icons = { grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>', card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>', gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>' }
const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]
function isNavActive(item) { if (!item.to) return false; if (item.to === '/dashboard') return route.path === '/dashboard'; return route.path.startsWith(item.to) }
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; localStorage.setItem('tz-theme', theme.value); document.documentElement.setAttribute('data-theme', theme.value) }
function money(v) { const n = Number(v) || 0; return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}` }

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function runBacktest() {
  const trades = []
  let balance = 10000
  const equityCurve = [{ label: 'Start', value: balance }]
  const numTrades = Math.round(config.days * (0.3 + seededRandom(config.days) * 0.4))
  for (let i = 0; i < numTrades; i++) {
    const rand = seededRandom(i * 1000 + config.days)
    const side = rand > 0.5 ? 'LONG' : 'SHORT'
    const basePrice = config.symbol.includes('XAU') ? 2350 : config.symbol.includes('BTC') ? 67000 : 1.08
    const entry = basePrice + (rand * 100)
    const exit = side === 'LONG' ? entry + (rand > 0.42 ? config.tpPips * 0.1 : -config.slPips * 0.1) : entry - (rand > 0.42 ? config.tpPips * 0.1 : -config.slPips * 0.1)
    const pnl = Number(((exit - entry) * (side === 'LONG' ? 1 : -1) * (0.5 + rand * 1.5)).toFixed(2))
    balance += pnl
    const d = new Date(Date.now() - (numTrades - i) * 86400000 * 0.3)
    trades.push({
      entryTime: d.toISOString().slice(0, 16).replace('T', ' '),
      exitTime: new Date(d.getTime() + 3600000 * (1 + Math.round(rand * 8))).toISOString().slice(0, 16).replace('T', ' '),
      side, entryPrice: Number(entry.toFixed(2)), exitPrice: Number(exit.toFixed(2)), pnl
    })
    equityCurve.push({ label: `T${i + 1}`, value: Number(balance.toFixed(2)) })
  }
  const wins = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl < 0)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  btResult.value = {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    netPnl: balance - 10000,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0,
    trades,
    equityCurve
  }
  nextTick(buildEquityChart)
}

function buildEquityChart() {
  if (!equityRef.value || !btResult.value) return
  if (chartInstances.length) { chartInstances.pop().destroy(); chartInstances.length = 0 }
  const data = btResult.value.equityCurve
  const tickColor = theme.value === 'dark' ? '#B8A8B8' : '#6F6472'
  const chart = new Chart(equityRef.value.getContext('2d'), {
    type: 'line',
    data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), borderColor: '#FF2D9A', borderWidth: 2, fill: true, backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, 'rgba(255,45,154,0.3)'); g.addColorStop(1, 'rgba(255,45,154,0)'); return g }, tension: 0.3, pointRadius: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: theme.value === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(23,18,26,0.08)' }, ticks: { color: tickColor, font: { size: 9 } } } } }
  })
  chartInstances.push(chart)
}

onBeforeUnmount(() => { while (chartInstances.length) chartInstances.pop().destroy() })
onMounted(() => document.documentElement.setAttribute('data-theme', theme.value))
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
.tz-page[data-theme='light'] { --bg: #fff7fb; --card: #ffffff; --card2: #fff0f7; --border: #f2d6e6; --primary: #ff3b9d; --primary-glow: rgba(255,59,157,0.1); --primary-dim: rgba(255,59,157,0.05); --text: #17121a; --sub: #6f6472; --success: #00a86b; --danger: #ff3366; }
.tz-sidebar, .tz-main { /* same as other pages */ }
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
.tz-btn-add, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-btn-add { padding: 7px 14px; border-radius: 8px; background: var(--primary); color: #fff; font-weight: 600; cursor: pointer; font-size: 12px; border: none; }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-bt-config { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; }
.tz-bt-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.tz-bt-grid label { display: block; color: var(--sub); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.tz-select, .tz-input-sm { width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--card2); color: var(--text); font-size: 11px; }
.tz-metric-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.tz-metric-label { color: var(--sub); font-size: 9px; font-weight: 600; text-transform: uppercase; }
.tz-metric-value { margin: 6px 0 4px; font-family: var(--font-mono); font-size: 22px; font-weight: 800; }
.tz-metric-value.success { color: var(--success); }
.tz-metric-value.danger { color: var(--danger); }
.tz-chart-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.tz-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tz-chart-title { color: var(--text); font-size: 13px; font-weight: 700; }
.tz-bt-equity { height: 200px; }
.tz-atable { width: 100%; border-collapse: collapse; }
.tz-atable th { padding: 8px 10px; border-bottom: 1px solid var(--border); color: var(--sub); font-size: 10px; text-align: left; text-transform: uppercase; }
.tz-atable td { padding: 7px 10px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; }
.tz-atable td.success { color: var(--success); }
.tz-atable td.danger { color: var(--danger); }
.tz-bt-placeholder { text-align: center; padding: 80px 20px; color: var(--sub); font-size: 15px; }
@media (max-width: 1200px) { .tz-bt-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px) { .tz-page { --sidebar-w: 72px; } .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; } .tz-bt-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
