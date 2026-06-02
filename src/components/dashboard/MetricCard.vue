<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  trend: { type: Number, default: null },
  icon: { type: String, default: '' },
  color: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  sparklineData: { type: Array, default: () => [] }
})

const sparklineRef = ref(null)

function formatValue(val) {
  const n = Number(val)
  if (Number.isFinite(n)) {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(2) + 'M'
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toFixed(2)
  }
  return val
}

function renderSparkline() {
  if (!sparklineRef.value || !props.sparklineData.length) return
  const el = sparklineRef.value
  const data = props.sparklineData
  const w = el.clientWidth || 160
  const h = 36
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padX = 2
  const padY = 2
  const chartW = w - padX * 2
  const chartH = h - padY * 2
  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1 || 1)) * chartW
    const y = padY + chartH - ((v - min) / range) * chartH
    return `${x},${y}`
  })
  const d = `M ${points.join(' L ')}`
  const color = props.color ? getComputedStyle(document.documentElement).getPropertyValue(props.color.replace('var(', '').replace(')', '')) || props.color : 'var(--lf-primary)'
  el.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="6" opacity="0.08" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

onMounted(() => {
  nextTick(renderSparkline)
})

watch(() => props.sparklineData, () => nextTick(renderSparkline), { deep: true })
</script>

<template>
  <div class="lf-metric-card" :style="color ? { '--card-accent': color } : {}">
    <div class="lf-metric-head">
      <span class="lf-metric-label">{{ label }}</span>
      <span v-if="trend !== null" class="lf-metric-trend" :class="trend >= 0 ? 'up' : 'down'">
        {{ trend >= 0 ? '↑' : '↓' }} {{ Math.abs(trend) }}%
      </span>
    </div>
    <div class="lf-metric-value">
      <span v-if="prefix" class="lf-metric-prefix">{{ prefix }}</span>
      <span class="lf-metric-num">{{ formatValue(value) }}</span>
      <span v-if="suffix" class="lf-metric-suffix">{{ suffix }}</span>
    </div>
    <div ref="sparklineRef" class="lf-metric-sparkline" v-if="sparklineData.length"></div>
    <div v-if="subtitle" class="lf-metric-subtitle">{{ subtitle }}</div>
  </div>
</template>

<style scoped>
.lf-metric-card {
  background: var(--lf-card);
  border: 1px solid var(--lf-border-soft);
  border-radius: 12px;
  padding: 12px 14px;
  position: relative;
  overflow: hidden;
  transition: all 0.25s ease;
}

.lf-metric-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--lf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.lf-metric-num {
  font-family: 'Orbitron', 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 800;
  color: var(--lf-text);
  line-height: 1.1;
}

.lf-metric-sparkline {
  margin-top: 6px;
  height: 30px;
  width: 100%;
  opacity: 0.6;
}

.lf-metric-card:hover {
  border-color: var(--lf-border);
  box-shadow: var(--lf-shadow-hover);
  transform: translateY(-2px);
}

.lf-metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--card-accent, var(--lf-primary)), transparent);
  opacity: 0.6;
}

.lf-metric-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.lf-metric-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--lf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lf-metric-trend {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.lf-metric-trend.up {
  color: var(--lf-success);
  background: rgba(0, 208, 132, 0.1);
}

.lf-metric-trend.down {
  color: var(--lf-danger);
  background: rgba(255, 59, 122, 0.1);
}

.lf-metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.lf-metric-prefix {
  font-size: 12px;
  color: var(--lf-text-muted);
  font-weight: 600;
}

.lf-metric-num {
  font-family: 'Orbitron', 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 800;
  color: var(--lf-text);
  line-height: 1.1;
}

.lf-metric-suffix {
  font-size: 11px;
  color: var(--lf-text-muted);
  font-weight: 600;
  margin-left: 2px;
}

.lf-metric-sparkline {
  margin-top: 8px;
  height: 36px;
  width: 100%;
  opacity: 0.7;
}

.lf-metric-subtitle {
  font-size: 11px;
  color: var(--lf-text-faint);
  margin-top: 6px;
}
</style>
