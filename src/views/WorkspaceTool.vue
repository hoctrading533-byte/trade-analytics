<template>
  <div class="tool-shell">
    <LayoutSidebar />
    <div class="tool-main">
      <LayoutHeader />
      <main class="tool-content">
        <section class="tool-head">
          <div>
            <span class="tool-kicker">{{ copy.kicker }}</span>
            <h1>{{ copy.title }}</h1>
            <p>{{ copy.subtitle }}</p>
          </div>
          <button class="tool-btn" type="button" @click="loadMt5Data">
            {{ loading ? copy.loading : copy.refresh }}
          </button>
        </section>

        <div v-if="error" class="tool-alert">{{ error }}</div>

        <section class="tool-grid tool-grid--metrics">
          <article v-for="metric in metricCards" :key="metric.label" class="tool-card">
            <span>{{ metric.label }}</span>
            <strong :class="metric.tone">{{ metric.value }}</strong>
            <small>{{ metric.hint }}</small>
          </article>
        </section>

        <section v-if="mode === 'playbook'" class="tool-grid">
          <article class="tool-panel">
            <h2>{{ copy.addSetup }}</h2>
            <div class="tool-form">
              <input v-model="setupForm.name" placeholder="Setup name" />
              <input v-model="setupForm.market" placeholder="Market condition" />
              <textarea v-model="setupForm.rules" placeholder="Entry, invalidation, risk rules"></textarea>
              <button class="tool-btn primary" type="button" @click="addSetup">{{ copy.save }}</button>
            </div>
          </article>
          <article class="tool-panel">
            <h2>{{ copy.activeSetups }}</h2>
            <div class="tool-list">
              <div v-for="setup in setups" :key="setup.id" class="tool-row">
                <div>
                  <strong>{{ setup.name }}</strong>
                  <span>{{ setup.market }}</span>
                  <p>{{ setup.rules }}</p>
                </div>
                <button class="tool-mini danger" type="button" @click="deleteSetup(setup.id)">Delete</button>
              </div>
            </div>
          </article>
        </section>

        <section v-else-if="mode === 'backtesting'" class="tool-grid">
          <article class="tool-panel">
            <h2>{{ copy.simulator }}</h2>
            <div class="tool-form tool-form--split">
              <label>Win rate %<input v-model.number="backtest.winRate" type="number" min="0" max="100" /></label>
              <label>Avg win R<input v-model.number="backtest.avgWinR" type="number" step="0.1" /></label>
              <label>Avg loss R<input v-model.number="backtest.avgLossR" type="number" step="0.1" /></label>
              <label>Trades<input v-model.number="backtest.trades" type="number" min="1" /></label>
              <label>Risk / trade %<input v-model.number="backtest.riskPct" type="number" step="0.1" /></label>
            </div>
          </article>
          <article class="tool-panel">
            <h2>{{ copy.result }}</h2>
            <div class="tool-score">
              <strong :class="backtestResult.expectancyR >= 0 ? 'good' : 'bad'">
                {{ signed(backtestResult.expectancyR) }}R
              </strong>
              <span>Expectancy / trade</span>
            </div>
            <div class="tool-kv">
              <div><span>Projected R</span><strong>{{ signed(backtestResult.projectedR) }}R</strong></div>
              <div><span>Projected return</span><strong>{{ signed(backtestResult.projectedPct) }}%</strong></div>
              <div><span>Break-even winrate</span><strong>{{ backtestResult.breakEvenWinRate.toFixed(1) }}%</strong></div>
              <div><span>Risk note</span><strong>{{ backtestResult.riskNote }}</strong></div>
            </div>
          </article>
        </section>

        <section v-else-if="mode === 'replay'" class="tool-grid">
          <article class="tool-panel tool-panel--wide">
            <h2>{{ copy.tradeReplay }}</h2>
            <div class="tool-replay">
              <button class="tool-btn" type="button" @click="replayIndex = Math.max(0, replayIndex - 1)">Prev</button>
              <div class="tool-tape">
                <div
                  v-for="(trade, index) in replayTrades"
                  :key="trade.id"
                  class="tool-tick"
                  :class="{ active: index === replayIndex, win: trade.pnl > 0, loss: trade.pnl < 0 }"
                  @click="replayIndex = index"
                >
                  {{ trade.symbol }}
                </div>
              </div>
              <button class="tool-btn" type="button" @click="replayIndex = Math.min(replayTrades.length - 1, replayIndex + 1)">Next</button>
            </div>
            <div v-if="activeReplayTrade" class="tool-trade-detail">
              <h3>{{ activeReplayTrade.symbol }} / {{ activeReplayTrade.side }}</h3>
              <div class="tool-kv">
                <div><span>Entry</span><strong>{{ activeReplayTrade.entryPrice }}</strong></div>
                <div><span>Exit</span><strong>{{ activeReplayTrade.exitPrice }}</strong></div>
                <div><span>SL / TP</span><strong>{{ activeReplayTrade.stopLoss || '--' }} / {{ activeReplayTrade.takeProfit || '--' }}</strong></div>
                <div><span>PnL</span><strong :class="activeReplayTrade.pnl >= 0 ? 'good' : 'bad'">{{ money(activeReplayTrade.pnl) }}</strong></div>
              </div>
            </div>
          </article>
        </section>

        <section v-else-if="mode === 'mentor'" class="tool-grid">
          <article class="tool-panel">
            <h2>{{ copy.mentorPlan }}</h2>
            <div class="tool-score">
              <strong>{{ mentorScore }}/100</strong>
              <span>{{ copy.discipline }}</span>
            </div>
            <ul class="tool-bullets">
              <li v-for="item in mentorMessages" :key="item">{{ item }}</li>
            </ul>
          </article>
          <article class="tool-panel">
            <h2>{{ copy.todayTasks }}</h2>
            <label v-for="task in mentorTasks" :key="task" class="tool-check">
              <input type="checkbox" />
              <span>{{ task }}</span>
            </label>
          </article>
        </section>

        <section v-else class="tool-grid">
          <article v-for="lesson in lessons" :key="lesson.title" class="tool-panel">
            <span class="tool-kicker">{{ lesson.level }}</span>
            <h2>{{ lesson.title }}</h2>
            <p>{{ lesson.body }}</p>
            <button class="tool-btn primary" type="button" @click="markLesson(lesson.title)">
              {{ completedLessons.includes(lesson.title) ? copy.completed : copy.markDone }}
            </button>
          </article>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { apiRequest } from '../lib/api.js'
import { useI18n } from '../composables/useI18n.js'
import { useUserStore } from '../stores/useUserStore.js'
import LayoutHeader from '../components/layout/Header.vue'
import LayoutSidebar from '../components/layout/Sidebar.vue'

const route = useRoute()
const userStore = useUserStore()
const { locale } = useI18n()

const mode = computed(() => String(route.meta.tool || 'playbook'))
const loading = ref(false)
const error = ref('')
const trades = ref([])
const account = ref({})
const analysis = ref({})
const replayIndex = ref(0)
const completedLessons = ref(JSON.parse(localStorage.getItem('lf_completed_lessons') || '[]'))

const setupForm = reactive({ name: '', market: '', rules: '' })
const setups = ref(JSON.parse(localStorage.getItem('lf_playbook_setups') || '[]'))
const backtest = reactive({ winRate: 45, avgWinR: 2.1, avgLossR: 1, trades: 100, riskPct: 1 })

const dictionary = {
  vi: {
    loading: 'Dang tai...',
    refresh: 'Lam moi',
    save: 'Luu setup',
    addSetup: 'Them setup',
    activeSetups: 'Playbook dang dung',
    simulator: 'Mo phong chien luoc',
    result: 'Ket qua backtest',
    tradeReplay: 'Replay tung lenh',
    mentorPlan: 'Ke hoach Mentor',
    todayTasks: 'Task hom nay',
    discipline: 'Diem ky luat',
    completed: 'Da hoc',
    markDone: 'Danh dau da hoc'
  },
  en: {
    loading: 'Loading...',
    refresh: 'Refresh',
    save: 'Save setup',
    addSetup: 'Add setup',
    activeSetups: 'Active Playbook',
    simulator: 'Strategy simulator',
    result: 'Backtest result',
    tradeReplay: 'Trade replay',
    mentorPlan: 'Mentor plan',
    todayTasks: 'Today tasks',
    discipline: 'Discipline score',
    completed: 'Completed',
    markDone: 'Mark done'
  }
}

const pageCopy = {
  playbook: {
    vi: ['Playbook', 'Thu vien setup giao dich', 'Quan ly dieu kien vao lenh, invalidation va rule risk.'],
    en: ['Playbook', 'Trading setup library', 'Manage entry conditions, invalidation and risk rules.']
  },
  backtesting: {
    vi: ['Backtesting', 'Kiem thu edge', 'Mo phong expectancy, break-even winrate va risk theo R-multiple.'],
    en: ['Backtesting', 'Edge testing', 'Simulate expectancy, break-even winrate and R-multiple risk.']
  },
  replay: {
    vi: ['Replay', 'Doc lai tung lenh', 'Replay cac lenh MT5 de nhin lai entry, exit, SL/TP va PnL.'],
    en: ['Replay', 'Review each trade', 'Replay MT5 trades to inspect entry, exit, SL/TP and PnL.']
  },
  mentor: {
    vi: ['Mentor Mode', 'Coach dua tren du lieu MT5', 'Nhan tin hieu hanh vi va checklist de trade tot hon.'],
    en: ['Mentor Mode', 'MT5 data coach', 'Get behavior signals and a checklist for cleaner execution.']
  },
  education: {
    vi: ['Education', 'Lop hoc trading', 'Hoc cac module ve expectancy, drawdown, risk va discipline.'],
    en: ['Education', 'Trading lessons', 'Study expectancy, drawdown, risk and discipline modules.']
  }
}

const copy = computed(() => {
  const lang = locale.value === 'en' ? 'en' : 'vi'
  const [kicker, title, subtitle] = pageCopy[mode.value]?.[lang] || pageCopy.playbook[lang]
  return { ...dictionary[lang], kicker, title, subtitle }
})

const normalizedTrades = computed(() => trades.value.map(mapTrade))
const replayTrades = computed(() => normalizedTrades.value.slice(0, 40))
const activeReplayTrade = computed(() => replayTrades.value[replayIndex.value] || null)

const metricCards = computed(() => [
  { label: 'Net PnL', value: money(analysis.value?.netProfit), hint: 'MT5 cache', tone: Number(analysis.value?.netProfit || 0) >= 0 ? 'good' : 'bad' },
  { label: 'Win Rate', value: `${num(analysis.value?.winRate).toFixed(1)}%`, hint: `${num(analysis.value?.wins)}W / ${num(analysis.value?.losses)}L` },
  { label: 'Profit Factor', value: num(analysis.value?.profitFactor).toFixed(2), hint: 'Gross profit / gross loss' },
  { label: 'Trades', value: String(num(analysis.value?.totalDeals || normalizedTrades.value.length)), hint: account.value?.server || 'MetaTrader 5' }
])

const backtestResult = computed(() => {
  const wr = clamp(num(backtest.winRate), 0, 100) / 100
  const avgWin = Math.max(0, num(backtest.avgWinR))
  const avgLoss = Math.max(0.01, num(backtest.avgLossR))
  const expectancyR = wr * avgWin - (1 - wr) * avgLoss
  const projectedR = expectancyR * Math.max(1, num(backtest.trades))
  const breakEvenWinRate = (avgLoss / (avgWin + avgLoss)) * 100
  const projectedPct = projectedR * Math.max(0, num(backtest.riskPct))
  return {
    expectancyR,
    projectedR,
    projectedPct,
    breakEvenWinRate,
    riskNote: projectedPct < -10 ? 'High risk' : projectedPct > 10 ? 'Positive edge' : 'Neutral'
  }
})

const mentorScore = computed(() => {
  const wr = num(analysis.value?.winRate)
  const pf = Math.min(2, num(analysis.value?.profitFactor)) * 20
  const behavior = num(analysis.value?.behaviorScore, 60)
  return Math.round(clamp(behavior * 0.55 + wr * 0.25 + pf, 0, 100))
})

const mentorMessages = computed(() => {
  const rows = []
  if (num(analysis.value?.profitFactor) < 1.2) rows.push('Reduce weak setups until profit factor is above 1.2.')
  if (num(analysis.value?.maxConsecutiveLosses) >= 3) rows.push('After two losses, stop and review before taking the next trade.')
  if (num(analysis.value?.behaviorRiskScore) > 55) rows.push('Behavior risk is elevated. Use smaller risk and checklist confirmation.')
  if (!rows.length) rows.push('Execution profile is stable. Keep the same risk and document every entry reason.')
  return rows
})

const mentorTasks = computed(() => [
  'Write entry reason before placing order',
  'Risk no more than planned % per trade',
  'Stop after two consecutive losses',
  'Screenshot entry and exit for replay'
])

const lessons = computed(() => [
  { level: 'Core', title: 'Expectancy', body: 'Expectancy = win rate x average win - loss rate x average loss.' },
  { level: 'Risk', title: 'Drawdown recovery', body: 'A 20% drawdown requires 25% gain to recover; protect capital first.' },
  { level: 'Behavior', title: 'Revenge trading detector', body: 'Lot increase after losses is a common behavior risk signal.' },
  { level: 'Execution', title: 'Replay loop', body: 'Replay each trade and tag the exact rule that was followed or broken.' }
])

async function loadMt5Data() {
  if (!userStore.token) return
  loading.value = true
  error.value = ''
  try {
    const payload = await apiRequest('/api/trading/exness/analysis', {
      headers: { Authorization: `Bearer ${userStore.token}` }
    })
    analysis.value = payload?.analysis || {}
    account.value = payload?.tradeBook?.account || payload?.analysis?.account || {}
    trades.value = Array.isArray(payload?.tradeBook?.trades) ? payload.tradeBook.trades : []
  } catch (e) {
    error.value = e.message || 'Cannot load MT5 analysis.'
  } finally {
    loading.value = false
  }
}

function mapTrade(row, index) {
  const entryPrice = num(row.entryPrice)
  const exitPrice = num(row.exitPrice || row.entryPrice)
  const volume = Math.max(0, num(row.volume))
  const pnl = num(row.profit)
  return {
    id: row.tradeKey || row.ticketClose || row.ticketOpen || `trade-${index}`,
    symbol: row.symbol || '--',
    side: String(row.side || '').toLowerCase().includes('short') ? 'SHORT' : 'LONG',
    entryPrice,
    exitPrice,
    stopLoss: row.sl || row.finalSl || row.initialSl || 0,
    takeProfit: row.tp || row.finalTp || row.initialTp || 0,
    volume,
    pnl,
    time: row.closeTime || row.timeline || row.openTime || ''
  }
}

function addSetup() {
  if (!setupForm.name.trim()) return
  setups.value.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: setupForm.name.trim(),
    market: setupForm.market.trim() || 'Any market',
    rules: setupForm.rules.trim() || 'No rules yet.'
  })
  setupForm.name = ''
  setupForm.market = ''
  setupForm.rules = ''
  persistSetups()
}

function deleteSetup(id) {
  setups.value = setups.value.filter((setup) => setup.id !== id)
  persistSetups()
}

function persistSetups() {
  localStorage.setItem('lf_playbook_setups', JSON.stringify(setups.value))
}

function markLesson(title) {
  if (!completedLessons.value.includes(title)) completedLessons.value.push(title)
  else completedLessons.value = completedLessons.value.filter((item) => item !== title)
  localStorage.setItem('lf_completed_lessons', JSON.stringify(completedLessons.value))
}

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function money(value) {
  const n = num(value)
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function signed(value) {
  const n = num(value)
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}`
}

onMounted(loadMt5Data)
</script>

<style scoped>
.tool-shell { display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); }
.tool-main { flex: 1; min-width: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.tool-content { flex: 1; overflow-y: auto; padding: 20px; }
.tool-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.tool-kicker { color: var(--primary); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.tool-head h1 { margin: 4px 0; font-size: 28px; }
.tool-head p { color: var(--sub); }
.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
.tool-grid--metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.tool-card, .tool-panel { border: 1px solid var(--border); background: var(--card); border-radius: 16px; padding: 16px; }
.tool-card span, .tool-card small, .tool-row span, .tool-kv span { color: var(--sub); }
.tool-card strong { display: block; margin: 5px 0; font-size: 24px; }
.tool-panel--wide { grid-column: 1 / -1; }
.tool-form { display: grid; gap: 10px; }
.tool-form--split { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.tool-form input, .tool-form textarea, .tool-form label input { width: 100%; border: 1px solid var(--border); background: var(--card2); color: var(--text); border-radius: 10px; padding: 10px; margin-top: 6px; }
.tool-form textarea { min-height: 110px; resize: vertical; }
.tool-btn, .tool-mini { border: 1px solid var(--border); background: var(--card2); color: var(--text); border-radius: 10px; padding: 9px 12px; cursor: pointer; }
.tool-btn.primary { border-color: transparent; background: var(--primary); color: #fff; }
.tool-mini.danger, .bad { color: #ff6b8f; }
.good { color: #6dffad; }
.tool-list { display: grid; gap: 10px; }
.tool-row { display: flex; justify-content: space-between; gap: 12px; border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: var(--card2); }
.tool-row p { margin-top: 4px; color: var(--text); }
.tool-score strong { display: block; font-size: 44px; }
.tool-kv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
.tool-kv div { border: 1px solid var(--border); border-radius: 12px; padding: 10px; background: var(--card2); }
.tool-kv strong { display: block; margin-top: 4px; }
.tool-alert { border: 1px solid rgba(255, 99, 132, 0.35); background: rgba(255, 99, 132, 0.12); color: #ff8fa8; border-radius: 12px; padding: 10px 12px; margin-bottom: 14px; }
.tool-replay { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; }
.tool-tape { display: flex; gap: 8px; overflow-x: auto; padding: 8px; border: 1px solid var(--border); border-radius: 12px; background: var(--card2); }
.tool-tick { min-width: 90px; text-align: center; border-radius: 10px; padding: 12px; background: rgba(255,255,255,0.04); cursor: pointer; }
.tool-tick.active { outline: 2px solid var(--primary); }
.tool-tick.win { color: #6dffad; }
.tool-tick.loss { color: #ff6b8f; }
.tool-trade-detail { margin-top: 16px; }
.tool-bullets { margin: 12px 0 0 18px; color: var(--text); }
.tool-check { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 10px; background: var(--card2); }

@media (max-width: 1100px) {
  .tool-grid, .tool-grid--metrics { grid-template-columns: 1fr; }
}
</style>
