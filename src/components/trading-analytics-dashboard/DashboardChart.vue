<template>
  <article class="ta-chart-card" :class="`ta-chart-card--${variant}`">
    <header class="ta-chart-card__head">
      <div>
        <span v-if="eyebrow" class="ta-kicker">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <strong v-if="valueLabel">{{ valueLabel }}</strong>
    </header>

    <div v-if="variant === 'line'" class="ta-line-chart">
      <svg viewBox="0 0 720 260" preserveAspectRatio="none" role="img" :aria-label="title">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--lf-primary)" stop-opacity="0.34" />
            <stop offset="100%" stop-color="var(--lf-primary)" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <line
          v-for="line in gridLines"
          :key="line"
          x1="18"
          x2="702"
          :y1="line"
          :y2="line"
          class="ta-chart-grid-line"
        />
        <path class="ta-line-chart__area" :fill="`url(#${gradientId})`" :d="areaPath" />
        <path class="ta-line-chart__line" :d="linePath" />
        <circle
          v-for="point in pointDots"
          :key="`${point.x}-${point.y}`"
          :cx="point.x"
          :cy="point.y"
          r="4"
          class="ta-line-chart__dot"
        />
      </svg>
      <div class="ta-chart-axis">
        <span>{{ firstPointLabel }}</span>
        <span>{{ lastPointLabel }}</span>
      </div>
    </div>

    <div v-else-if="variant === 'donut'" class="ta-donut-wrap">
      <div class="ta-donut" :style="{ background: donutGradient }">
        <div>
          <strong>{{ donutTotal }}</strong>
          <span>{{ centerLabel }}</span>
        </div>
      </div>
      <div class="ta-donut-legend">
        <div v-for="item in series" :key="item.label" class="ta-legend-row">
          <span class="ta-legend-dot" :class="`ta-tone-${item.tone || 'primary'}`"></span>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </div>

    <div v-else-if="variant === 'bars'" class="ta-bars">
      <div v-for="bar in normalizedBars" :key="bar.label" class="ta-bar-column">
        <div class="ta-bar-track">
          <span
            class="ta-bar"
            :class="bar.value >= 0 ? 'positive' : 'negative'"
            :style="{ height: `${bar.height}%` }"
          ></span>
        </div>
        <small>{{ bar.label }}</small>
      </div>
    </div>

    <div v-else-if="variant === 'heatmap'" class="ta-heatmap">
      <div class="ta-heatmap__hours">
        <span></span>
        <span v-for="hour in heatmapHours" :key="hour">{{ hour }}</span>
      </div>
      <div v-for="row in heatmap" :key="row.day" class="ta-heatmap__row">
        <span class="ta-heatmap__day">{{ row.day }}</span>
        <span
          v-for="cell in row.cells"
          :key="cell.label"
          class="ta-heat-cell"
          :class="cell.value > 0 ? 'positive' : cell.value < 0 ? 'negative' : 'neutral'"
          :style="{ '--cell-strength': `${Math.round(cell.intensity * 62)}%` }"
          :title="`${row.day} ${cell.label}: ${signedMoney(cell.value)}`"
        >
          {{ compact(cell.value) }}
        </span>
      </div>
    </div>

    <div v-else class="ta-horizontal-bars">
      <div v-for="item in normalizedItems" :key="item.label" class="ta-horizontal-row">
        <div class="ta-horizontal-row__meta">
          <span>{{ item.label }}</span>
          <small>{{ item.meta }}</small>
        </div>
        <div class="ta-horizontal-row__track">
          <span
            :class="item.value >= 0 ? 'positive' : 'negative'"
            :style="{ width: `${item.width}%` }"
          ></span>
        </div>
        <strong :class="item.value >= 0 ? 'positive' : 'negative'">{{ signedMoney(item.value) }}</strong>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  valueLabel: { type: String, default: '' },
  variant: { type: String, default: 'line' },
  points: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  bars: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  heatmap: { type: Array, default: () => [] },
  heatmapHours: { type: Array, default: () => [] },
  centerLabel: { type: String, default: 'Trades' }
})

const gradientId = `taLineGradient${Math.random().toString(36).slice(2)}`
const chartWidth = 720
const chartHeight = 260
const pad = 18

const scaledPoints = computed(() => {
  const values = props.points.map((point) => Number(point.value || 0))
  if (!values.length) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  return props.points.map((point, index) => {
    const x = pad + (index / Math.max(1, props.points.length - 1)) * (chartWidth - pad * 2)
    const y = chartHeight - pad - ((Number(point.value || 0) - min) / span) * (chartHeight - pad * 2)
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      label: point.label,
      value: Number(point.value || 0)
    }
  })
})

const linePath = computed(() => {
  if (!scaledPoints.value.length) return ''
  return scaledPoints.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
})

const areaPath = computed(() => {
  if (!scaledPoints.value.length) return ''
  const first = scaledPoints.value[0]
  const last = scaledPoints.value[scaledPoints.value.length - 1]
  return `${linePath.value} L ${last.x} ${chartHeight - pad} L ${first.x} ${chartHeight - pad} Z`
})

const pointDots = computed(() => {
  if (scaledPoints.value.length <= 8) return scaledPoints.value
  return scaledPoints.value.filter((_, index) => index % 3 === 0 || index === scaledPoints.value.length - 1)
})

const firstPointLabel = computed(() => props.points[0]?.label || '')
const lastPointLabel = computed(() => props.points[props.points.length - 1]?.label || '')
const gridLines = [48, 96, 144, 192, 240]

const donutTotal = computed(() => props.series.reduce((sum, item) => sum + Number(item.value || 0), 0))

function toneColor(tone) {
  if (tone === 'success') return 'var(--lf-success)'
  if (tone === 'danger') return 'var(--lf-danger)'
  if (tone === 'warning') return 'var(--lf-warning)'
  if (tone === 'cyan') return 'var(--lf-cyan)'
  if (tone === 'purple') return 'var(--lf-purple)'
  return 'var(--lf-primary)'
}

const donutGradient = computed(() => {
  const total = Math.max(1, donutTotal.value)
  let cursor = 0
  const parts = props.series.map((item) => {
    const start = cursor
    cursor += (Number(item.value || 0) / total) * 100
    return `${toneColor(item.tone)} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`
  })
  return `conic-gradient(${parts.join(', ')})`
})

const normalizedBars = computed(() => {
  const max = Math.max(1, ...props.bars.map((bar) => Math.abs(Number(bar.value || 0))))
  return props.bars.map((bar) => ({
    ...bar,
    value: Number(bar.value || 0),
    height: Math.max(8, (Math.abs(Number(bar.value || 0)) / max) * 100)
  }))
})

const normalizedItems = computed(() => {
  const max = Math.max(1, ...props.items.map((item) => Math.abs(Number(item.value || 0))))
  return props.items.map((item) => ({
    ...item,
    value: Number(item.value || 0),
    width: Math.max(7, (Math.abs(Number(item.value || 0)) / max) * 100)
  }))
})

function signedMoney(value) {
  const numeric = Number(value || 0)
  return `${numeric >= 0 ? '+' : '-'}$${Math.abs(numeric).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`
}

function compact(value) {
  const numeric = Number(value || 0)
  if (Math.abs(numeric) < 1) return '-'
  if (Math.abs(numeric) >= 1000) return `${numeric > 0 ? '+' : '-'}${Math.round(Math.abs(numeric) / 100) / 10}k`
  return `${numeric > 0 ? '+' : ''}${Math.round(numeric)}`
}
</script>
