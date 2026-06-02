<template>
  <article class="pg-card pg-gauge-card">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ kicker }}</span>
        <h3>{{ title }}</h3>
      </div>
      <strong :class="statusClass">{{ percent.toFixed(0) }}%</strong>
    </div>
    <div class="pg-gauge" :style="{ '--pg-gauge-value': `${boundedPercent}%` }">
      <div class="pg-gauge__inner">
        <strong>{{ money(remaining) }}</strong>
        <span>{{ pgT('gauge.remaining') }}</span>
      </div>
    </div>
    <div class="pg-gauge-meta">
      <span>{{ pgT('gauge.used') }} {{ money(used) }}</span>
      <span>{{ pgT('gauge.floor') }} {{ money(floor) }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

const props = defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  used: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
  floor: { type: Number, default: 0 },
  percent: { type: Number, default: 0 }
})

const boundedPercent = computed(() => Math.max(0, Math.min(100, Number(props.percent || 0))))
const statusClass = computed(() => {
  if (props.percent >= 85) return 'pg-danger'
  if (props.percent >= 70) return 'pg-warn'
  return 'pg-ok'
})

const { pgT } = usePropGuardianI18n()

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
