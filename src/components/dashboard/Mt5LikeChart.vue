<template>
  <div class="mt5-chart-root">
    <div ref="chartEl" class="mt5-chart-canvas" @click="onChartClick"></div>
    <div v-if="chartNote" class="mt5-chart-note">{{ chartNote }}</div>
    <div class="mt5-overlay">
      <div
        v-if="showTpLine && tpTop !== null"
        class="price-line tp"
        :style="{ top: `${tpTop}px` }"
      >
        <span>TP {{ Number(tpPrice || 0).toFixed(2) }}</span>
        <button class="line-handle" @mousedown.prevent="startDrag('tp')">↕</button>
      </div>
      <div
        v-if="showSlLine && slTop !== null"
        class="price-line sl"
        :style="{ top: `${slTop}px` }"
      >
        <span>SL {{ Number(slPrice || 0).toFixed(2) }}</span>
        <button class="line-handle" @mousedown.prevent="startDrag('sl')">↕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { createChart, CrosshairMode, CandlestickSeries } from 'lightweight-charts'
import { getThemeToken, THEME_CHANGE_EVENT } from '../../composables/useTheme.js'

const props = defineProps({
  symbol: { type: String, required: true },
  tpPrice: { type: Number, default: 0 },
  slPrice: { type: Number, default: 0 },
  showTpLine: { type: Boolean, default: false },
  showSlLine: { type: Boolean, default: false },
  armedLine: { type: String, default: null }
})

const emit = defineEmits(['update:tpPrice', 'update:slPrice', 'market-price', 'line-placed'])

const chartEl = ref(null)
const chart = ref(null)
const candleSeries = ref(null)
const dragging = ref(null)
const chartNote = ref('')
const coordVersion = ref(0)
let resizeObserver = null
let marketTimer = null

function chartTheme() {
  return {
    bg: getThemeToken('--lf-card', '#141018'),
    text: getThemeToken('--lf-chart-text', 'rgba(233,221,235,.74)'),
    grid: getThemeToken('--lf-chart-grid', 'rgba(255,255,255,.075)'),
    border: getThemeToken('--lf-border', '#2a142a'),
    up: getThemeToken('--lf-success', '#00d084'),
    down: getThemeToken('--lf-danger', '#ff3b7a')
  }
}

function applyChartTheme() {
  if (!chart.value) return
  const colors = chartTheme()
  chart.value.applyOptions({
    layout: {
      background: { color: colors.bg },
      textColor: colors.text,
      fontFamily: 'Be Vietnam Pro'
    },
    grid: {
      vertLines: { color: colors.grid },
      horzLines: { color: colors.grid }
    },
    rightPriceScale: {
      borderColor: colors.border
    },
    timeScale: {
      borderColor: colors.border,
      timeVisible: true
    }
  })
  if (candleSeries.value) {
    candleSeries.value.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false
    })
  }
}

function bumpCoordVersion() {
  coordVersion.value += 1
}

function normalizedSymbol(raw) {
  const next = String(raw || '').toUpperCase().trim()
  if (!next) return 'BTCUSDT'
  return next
}

async function fetchKlines() {
  if (!candleSeries.value) return
  const symbol = normalizedSymbol(props.symbol)
  try {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=240`)
    const rows = await r.json()
    if (!Array.isArray(rows) || !rows.length) {
      candleSeries.value.setData([])
      chartNote.value = `Không tải được nến cho ${symbol}. Kiểm tra lại symbol.`
      return
    }
    const data = rows.map((k) => ({
      time: Math.floor(Number(k[0]) / 1000),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4])
    }))
    candleSeries.value.setData(data)
    bumpCoordVersion()
    chartNote.value = ''
    const last = data[data.length - 1]
    emit('market-price', Number(last?.close || 0))
  } catch {
    candleSeries.value.setData([])
    chartNote.value = `Không tải được dữ liệu chart cho ${symbol}.`
  }
}

async function refreshMarketPrice() {
  const symbol = normalizedSymbol(props.symbol)
  if (!symbol.endsWith('USDT')) {
    emit('market-price', 0)
    return
  }
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`)
    const d = await r.json()
    emit('market-price', Number(d?.price || 0))
  } catch {
    emit('market-price', 0)
  }
}

function priceToTop(price) {
  coordVersion.value
  if (!candleSeries.value || !price) return null
  const y = candleSeries.value.priceToCoordinate(Number(price))
  if (typeof y !== 'number') return null
  return Math.round(y)
}

const tpTop = computed(() => priceToTop(props.tpPrice))
const slTop = computed(() => priceToTop(props.slPrice))

function updateByClientY(kind, clientY) {
  if (!chartEl.value || !candleSeries.value) return
  const rect = chartEl.value.getBoundingClientRect()
  const y = clientY - rect.top
  const price = candleSeries.value.coordinateToPrice(y)
  if (!price) return
  const rounded = Number(price.toFixed(2))
  if (kind === 'tp') emit('update:tpPrice', rounded)
  if (kind === 'sl') emit('update:slPrice', rounded)
}

function onMouseMove(event) {
  if (!dragging.value) return
  updateByClientY(dragging.value, event.clientY)
}

function onMouseUp() {
  dragging.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function startDrag(kind) {
  dragging.value = kind
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onChartClick(event) {
  if (!props.armedLine) return
  updateByClientY(props.armedLine, event.clientY)
  emit('line-placed')
}

function initChart() {
  const colors = chartTheme()
  chart.value = createChart(chartEl.value, {
    width: chartEl.value.clientWidth,
    height: chartEl.value.clientHeight,
    layout: {
      background: { color: colors.bg },
      textColor: colors.text,
      fontFamily: 'Be Vietnam Pro'
    },
    grid: {
      vertLines: { color: colors.grid },
      horzLines: { color: colors.grid }
    },
    rightPriceScale: {
      borderColor: colors.border
    },
    timeScale: {
      borderColor: colors.border,
      timeVisible: true
    },
    crosshair: {
      mode: CrosshairMode.Normal
    }
  })
  candleSeries.value = chart.value.addSeries(CandlestickSeries, {
    upColor: colors.up,
    downColor: colors.down,
    wickUpColor: colors.up,
    wickDownColor: colors.down,
    borderVisible: false
  })

  resizeObserver = new ResizeObserver(() => {
    if (chart.value && chartEl.value) {
      chart.value.applyOptions({
        width: chartEl.value.clientWidth,
        height: chartEl.value.clientHeight
      })
      bumpCoordVersion()
    }
  })
  resizeObserver.observe(chartEl.value)
  chart.value.timeScale().subscribeVisibleLogicalRangeChange(() => {
    bumpCoordVersion()
  })
  chart.value.timeScale().subscribeVisibleTimeRangeChange(() => {
    bumpCoordVersion()
  })
  requestAnimationFrame(() => {
    if (chart.value && chartEl.value) {
      chart.value.applyOptions({
        width: chartEl.value.clientWidth,
        height: chartEl.value.clientHeight
      })
      bumpCoordVersion()
    }
  })
}

watch(
  () => props.symbol,
  async () => {
    fetchKlines()
    refreshMarketPrice()
  },
  { immediate: true }
)

onMounted(async () => {
  initChart()
  window.addEventListener(THEME_CHANGE_EVENT, applyChartTheme)
  await fetchKlines()
  await refreshMarketPrice()
  marketTimer = setInterval(refreshMarketPrice, 5000)
})

onUnmounted(() => {
  window.removeEventListener(THEME_CHANGE_EVENT, applyChartTheme)
  onMouseUp()
  if (marketTimer) clearInterval(marketTimer)
  if (resizeObserver) resizeObserver.disconnect()
  if (chart.value) chart.value.remove()
})
</script>
