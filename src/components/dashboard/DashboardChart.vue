<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  type: { type: String, default: 'line' },
  data: { type: Array, default: () => [] },
  height: { type: Number, default: 280 },
  color: { type: String, default: '' },
  label: { type: String, default: '' },
  fillColor: { type: String, default: '' }
})

const chartContainer = ref(null)
let chart = null
let series = null

async function renderChart() {
  if (!chartContainer.value || !props.data.length) return
  const container = chartContainer.value
  container.innerHTML = ''

  const chartEl = document.createElement('div')
  chartEl.style.width = '100%'
  chartEl.style.height = props.height + 'px'
  chartEl.style.borderRadius = '12px'
  container.appendChild(chartEl)

  try {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light'
    const computedStyle = getComputedStyle(document.documentElement)
    const resolvedPrimary = computedStyle.getPropertyValue('--lf-primary').trim() || '#ff2d9a'
    const resolvedText = computedStyle.getPropertyValue('--lf-chart-text').trim() || 'rgba(255,255,255,0.6)'
    const resolvedGrid = computedStyle.getPropertyValue('--lf-chart-grid').trim() || 'rgba(255,255,255,0.06)'

    if (props.type === 'donut' || props.type === 'outcome') {
      renderStaticChart(chartEl, props.data, isLight, resolvedPrimary)
      return
    }

    const { createChart: CC, AreaSeries, HistogramSeries } = await import('lightweight-charts')
    chart = CC(chartEl, {
      width: chartEl.clientWidth,
      height: props.height,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: resolvedText },
      grid: { vertLines: { color: resolvedGrid }, horzLines: { color: resolvedGrid } },
      crosshair: {
        vertLine: { color: resolvedPrimary, style: 2, width: 1, labelBackgroundColor: resolvedPrimary },
        horzLine: { color: resolvedPrimary, style: 2, width: 1, labelBackgroundColor: resolvedPrimary }
      },
      rightPriceScale: { borderColor: resolvedGrid, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: resolvedGrid, timeVisible: true, secondsVisible: false }
    })

    if (props.type === 'line') {
      series = chart.addSeries(AreaSeries, {
        lineColor: resolvedPrimary,
        topColor: props.fillColor || resolvedPrimary + '33',
        bottomColor: resolvedPrimary + '08',
        lineWidth: 2,
        crosshairMarkerBackgroundColor: resolvedPrimary,
        crosshairMarkerBorderColor: 'transparent'
      })
      series.setData(props.data.map(d => ({
        time: typeof d.time === 'string' ? d.time.slice(0, 10) : d.time,
        value: Number(d.equity || d.value || d.pnl || 0)
      })))
    } else if (props.type === 'histogram') {
      series = chart.addSeries(HistogramSeries, {
        color: resolvedPrimary,
        priceFormat: { type: 'volume' }
      })
      series.setData(props.data.map(d => ({
        time: typeof d.time === 'string' ? d.time.slice(0, 10) : d.time,
        value: Number(d.pnl || d.value || 0),
        color: Number(d.pnl || 0) >= 0
          ? computedStyle.getPropertyValue('--lf-success').trim() || '#00d084'
          : computedStyle.getPropertyValue('--lf-danger').trim() || '#ff3b7a'
      })))
    }

    chart.timeScale().fitContent()
  } catch (e) {
    console.warn('Chart render:', e.message)
    chartEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:${props.height}px;color:var(--lf-text-muted);font-size:13px">Chart unavailable</div>`
  }
}

function renderStaticChart(el, data, isLight, primary) {
  if (props.type === 'donut' || props.type === 'outcome') {
    const total = data.reduce((s, d) => s + Math.max(0, d.count), 0) || 1
    const size = Math.min(el.clientWidth || 300, props.height)
    const cx = size / 2
    const cy = size / 2
    const r = Math.min(cx, cy) - 20
    const colors = [primary, '#00d084', '#ffc861', '#9a4dff', '#42d7ff', '#ff3b7a', '#b8a8b8']
    let angle = -Math.PI / 2
    let svgInner = ''

    data.forEach((d, i) => {
      const pct = d.count / total
      const a = pct * Math.PI * 2
      const x1 = cx + r * Math.cos(angle)
      const y1 = cy + r * Math.sin(angle)
      const x2 = cx + r * Math.cos(angle + a)
      const y2 = cy + r * Math.sin(angle + a)
      const large = a > Math.PI ? 1 : 0
      svgInner += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${colors[i % colors.length]}" opacity="0.8"/>`
      if (pct > 0.05) {
        const la = angle + a / 2
        svgInner += `<text x="${cx + r * 0.6 * Math.cos(la)}" y="${cy + r * 0.6 * Math.sin(la)}" text-anchor="middle" fill="#fff" font-size="11" font-weight="600">${(pct * 100).toFixed(0)}%</text>`
      }
      angle += a
    })

    let legendHtml = data.map((d, i) =>
      `<div style="display:flex;align-items:center;gap:6px;font-size:10px;color:${isLight ? '#333' : '#ccc'};margin:1px 0">
        <span style="width:8px;height:8px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0"></span>
        <span>${d.key}</span>
        <span style="margin-left:auto;font-weight:600;color:${isLight ? '#000' : '#fff'}">${d.count}</span>
      </div>`
    ).join('')

    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g>${svgInner}</g></svg>
      <div style="width:100%;max-width:180px">${legendHtml}</div>
    </div>`
  }
}

let resizeObserver = null

onMounted(async () => {
  await nextTick()
  setTimeout(renderChart, 100)
  resizeObserver = new ResizeObserver(() => {
    if (chart) {
      try { chart.resize(chartContainer.value?.clientWidth || 400, props.height) } catch {}
    }
  })
  if (chartContainer.value) resizeObserver.observe(chartContainer.value)
})

function cleanup() {
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
  if (chart) { try { chart.remove() } catch {}; chart = null; series = null }
}

watch(() => props.data, () => { cleanup(); setTimeout(renderChart, 50) }, { deep: true })
watch(() => props.type, () => { cleanup(); setTimeout(renderChart, 50) })
onUnmounted(cleanup)
</script>

<template>
  <div class="lf-chart-wrap">
    <div v-if="label" class="lf-chart-label">{{ label }}</div>
    <div ref="chartContainer" class="lf-chart-container"></div>
  </div>
</template>

<style scoped>
.lf-chart-wrap {
  background: var(--lf-card);
  border: 1px solid var(--lf-border-soft);
  border-radius: 14px;
  padding: 16px;
  transition: border-color 0.2s;
}
.lf-chart-wrap:hover {
  border-color: var(--lf-border);
}
.lf-chart-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--lf-text);
  margin-bottom: 10px;
  letter-spacing: 0.01em;
}
.lf-chart-container {
  width: 100%;
  min-height: 40px;
}
</style>
