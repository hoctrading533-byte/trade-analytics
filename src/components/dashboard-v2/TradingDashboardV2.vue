<template>
  <section class="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100 p-4 md:p-6">
    <div class="mx-auto max-w-7xl space-y-4">
      <header class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:p-5">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-xl md:text-2xl font-bold">MT5 Trading Dashboard</h1>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <select v-model="selectedAccountId" class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
              <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.label }}</option>
            </select>
            <div class="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
              <button
                v-for="f in filters"
                :key="f.key"
                class="rounded-md px-3 py-1.5 text-sm"
                :class="activeFilter === f.key ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-slate-800'"
                @click="activeFilter = f.key"
              >
                {{ f.label }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Balance" :value="money(balance)" tone="neutral" hint="Số dư tài khoản hiện tại" />
        <MetricCard title="Equity" :value="money(equity)" :tone="equity >= balance ? 'profit' : 'loss'" hint="Balance + PnL chưa chốt" />
        <MetricCard title="PnL" :value="signedMoney(metrics.netProfit)" :tone="metrics.netProfit >= 0 ? 'profit' : 'loss'" hint="Lãi/lỗ đã chốt trong kỳ lọc" />
        <MetricCard title="Drawdown" :value="`${metrics.drawdownPct.toFixed(2)}%`" tone="risk" hint="(Peak - Lowest) / Peak" />
      </section>

      <section class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Winrate" :value="`${metrics.winRate.toFixed(2)}%`" tone="neutral" hint="Wins / Total trades" />
        <MetricCard title="Profit Factor" :value="metrics.profitFactor.toFixed(2)" :tone="metrics.profitFactor >= 1.2 ? 'profit' : 'loss'" hint="Gross Profit / Gross Loss" />
        <MetricCard title="RR" :value="`1:${metrics.rr.toFixed(2)}`" :tone="metrics.rr >= 1.5 ? 'profit' : 'loss'" hint="Avg Win / Avg Loss" />
        <MetricCard title="Expectancy" :value="signedMoney(metrics.expectancy)" :tone="metrics.expectancy >= 0 ? 'profit' : 'loss'" hint="(WR × AvgWin) - (LR × AvgLoss)" />
      </section>

      <section class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 class="font-semibold mb-3">Behavior Analytics</h2>
          <BehaviorBar label="FOMO" :value="metrics.fomoRate" />
          <BehaviorBar label="Overtrade" :value="metrics.overtradeRate" />
          <BehaviorBar label="Revenge" :value="metrics.revengeRate" />
          <div class="mt-3 text-sm text-slate-300">
            Behavior Score:
            <span :class="metrics.behaviorScore >= 65 ? 'text-emerald-400' : 'text-rose-400'" class="font-semibold">
              {{ metrics.behaviorScore.toFixed(2) }}
            </span>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 class="font-semibold mb-3">Risk Analysis</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-slate-400">Max DD (abs)</dt><dd>{{ money(metrics.drawdownAbs) }}</dd></div>
            <div class="flex justify-between"><dt class="text-slate-400">Max DD (%)</dt><dd>{{ metrics.drawdownPct.toFixed(2) }}%</dd></div>
            <div class="flex justify-between"><dt class="text-slate-400">Risk/Trade</dt><dd>{{ metrics.avgRiskPct.toFixed(2) }}%</dd></div>
            <div class="flex justify-between"><dt class="text-slate-400">Total trades</dt><dd>{{ metrics.total }}</dd></div>
          </dl>
        </div>

        <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 class="font-semibold mb-3">Trade Journal</h2>
          <p class="text-sm text-slate-400">Chọn một lệnh bên dưới để ghi chú và upload ảnh minh hoạ setup.</p>
          <div v-if="activeJournalTrade" class="mt-3 text-sm">
            <div class="font-medium">{{ activeJournalTrade.symbol }} · {{ activeJournalTrade.side }}</div>
            <textarea v-model="journal.note" rows="4" class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm" placeholder="Nhập ghi chú..."></textarea>
            <input type="file" accept="image/*" class="mt-2 block w-full text-xs text-slate-300" @change="onUploadImage" />
            <img v-if="journal.imageUrl" :src="journal.imageUrl" alt="journal" class="mt-2 h-24 rounded-lg border border-slate-700 object-cover" />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h2 class="font-semibold mb-3">Equity Curve</h2>
        <div class="h-64"><canvas ref="equityCanvas"></canvas></div>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h2 class="font-semibold mb-3">Trade History</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="text-slate-400">
              <tr class="border-b border-slate-800">
                <th class="px-3 py-2 text-left">Time</th>
                <th class="px-3 py-2 text-left">Symbol</th>
                <th class="px-3 py-2 text-left">Side</th>
                <th class="px-3 py-2 text-left">Volume</th>
                <th class="px-3 py-2 text-left">RR</th>
                <th class="px-3 py-2 text-left">PnL</th>
                <th class="px-3 py-2 text-left">Journal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in viewTradesSorted"
                :key="t.id"
                class="border-b border-slate-900 hover:bg-slate-800/40"
              >
                <td class="px-3 py-2">{{ formatTime(t.closeAt) }}</td>
                <td class="px-3 py-2">{{ t.symbol }}</td>
                <td class="px-3 py-2" :class="t.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'">{{ t.side }}</td>
                <td class="px-3 py-2">{{ t.volume }}</td>
                <td class="px-3 py-2">1:{{ Number(t.rr || 0).toFixed(2) }}</td>
                <td class="px-3 py-2" :class="t.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ signedMoney(t.profit) }}</td>
                <td class="px-3 py-2">
                  <button class="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" @click="openJournal(t)">Ghi chú</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { fetchMt5MockPayload } from '../../mocks/mt5MockApi.js'
import { computeTradingMetrics, filterTradesByRange } from '../../lib/tradingMetrics.js'
import { getThemeToken, THEME_CHANGE_EVENT } from '../../composables/useTheme.js'

const filters = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' }
]

const accounts = ref([])
const allTrades = ref([])
const activeFilter = ref('7d')
const selectedAccountId = ref('')
const equityCanvas = ref(null)
const chartRef = ref(null)
const journals = ref(JSON.parse(localStorage.getItem('lumina_journals') || '{}'))
const activeJournalTrade = ref(null)
const journal = reactive({ note: '', imageUrl: '' })

function chartTheme() {
  return {
    line: getThemeToken('--lf-chart-line', '#ff2d9a'),
    fill: getThemeToken('--lf-chart-fill', 'rgba(255,45,154,0.14)'),
    grid: getThemeToken('--lf-chart-grid', 'rgba(255,255,255,.075)'),
    text: getThemeToken('--lf-chart-text', 'rgba(233,221,235,.74)')
  }
}

const accountTrades = computed(() => allTrades.value.filter((t) => t.accountId === selectedAccountId.value))
const viewTrades = computed(() => filterTradesByRange(accountTrades.value, activeFilter.value))
const viewTradesSorted = computed(() => viewTrades.value.slice().sort((a, b) => new Date(b.closeAt) - new Date(a.closeAt)))
const selectedAccount = computed(() => accounts.value.find((a) => a.id === selectedAccountId.value) || null)
const metrics = computed(() => computeTradingMetrics(viewTrades.value, selectedAccount.value?.startingBalance || 0))
const balance = computed(() => Number((selectedAccount.value?.startingBalance || 0) + metrics.value.netProfit))
const equity = computed(() => Number(balance.value + metrics.value.netProfit * 0.03))

function saveJournals() {
  localStorage.setItem('lumina_journals', JSON.stringify(journals.value))
}

function openJournal(trade) {
  activeJournalTrade.value = trade
  const saved = journals.value[trade.id] || {}
  journal.note = saved.note || ''
  journal.imageUrl = saved.imageUrl || ''
}

function persistCurrentJournal() {
  if (!activeJournalTrade.value) return
  journals.value[activeJournalTrade.value.id] = {
    note: journal.note,
    imageUrl: journal.imageUrl
  }
  saveJournals()
}

function onUploadImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  journal.imageUrl = URL.createObjectURL(file)
  persistCurrentJournal()
}

watch(() => journal.note, persistCurrentJournal)

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function signedMoney(value) {
  const n = Number(value || 0)
  return `${n >= 0 ? '+' : ''}${money(n)}`
}

function formatTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN')
}

function drawChart() {
  if (!equityCanvas.value || !window.Chart) return
  const ctx = equityCanvas.value.getContext('2d')
  if (chartRef.value) {
    chartRef.value.destroy()
    chartRef.value = null
  }
  const points = metrics.value.equityCurve || []
  const colors = chartTheme()
  chartRef.value = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map((p) => new Date(p.time).toLocaleDateString('vi-VN')),
      datasets: [
        {
          data: points.map((p) => p.equity),
          borderColor: colors.line,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
          backgroundColor: colors.fill
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
      }
    }
  })
}

watch([metrics, activeFilter, selectedAccountId], drawChart, { deep: true })

onMounted(async () => {
  window.addEventListener(THEME_CHANGE_EVENT, drawChart)
  const payload = await fetchMt5MockPayload()
  accounts.value = payload.accounts || []
  allTrades.value = payload.trades || []
  selectedAccountId.value = accounts.value[0]?.id || ''
  drawChart()
})

onBeforeUnmount(() => {
  window.removeEventListener(THEME_CHANGE_EVENT, drawChart)
  if (chartRef.value) chartRef.value.destroy()
})
</script>

<script>
export default {
  components: {
    MetricCard: {
      props: ['title', 'value', 'hint', 'tone'],
      template: `
        <article class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div class="flex items-center gap-2 text-sm text-slate-400">
            <span>{{ title }}</span>
            <span class="cursor-help text-slate-500" :title="hint">ⓘ</span>
          </div>
          <div class="mt-2 text-2xl font-semibold" :class="toneClass">{{ value }}</div>
        </article>
      `,
      computed: {
        toneClass() {
          if (this.tone === 'profit') return 'text-emerald-400'
          if (this.tone === 'loss') return 'text-rose-400'
          if (this.tone === 'risk') return 'text-amber-400'
          return 'text-slate-100'
        }
      }
    },
    BehaviorBar: {
      props: ['label', 'value'],
      template: `
        <div class="mb-3">
          <div class="mb-1 flex justify-between text-sm"><span>{{ label }}</span><span>{{ Number(value || 0).toFixed(2) }}%</span></div>
          <div class="h-2 rounded-full bg-slate-800">
            <div class="h-2 rounded-full bg-gradient-to-r from-rose-400 to-amber-300" :style="{ width: Number(value || 0) + '%' }"></div>
          </div>
        </div>
      `
    }
  }
}
</script>
