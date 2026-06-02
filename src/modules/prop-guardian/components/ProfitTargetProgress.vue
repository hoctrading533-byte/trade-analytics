<template>
  <article class="pg-card pg-progress-card">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('profit.kicker') }}</span>
        <h3>{{ pgT('profit.title') }}</h3>
      </div>
      <strong>{{ progress.percent.toFixed(1) }}%</strong>
    </div>
    <div class="pg-progress-track">
      <span :style="{ width: `${Math.min(100, progress.percent)}%` }"></span>
    </div>
    <div class="pg-progress-grid">
      <div>
        <span>{{ pgT('profit.profit') }}</span>
        <strong>{{ money(progress.profit) }}</strong>
      </div>
      <div>
        <span>{{ pgT('profit.target') }}</span>
        <strong>{{ money(progress.target) }}</strong>
      </div>
      <div>
        <span>{{ pgT('profit.remaining') }}</span>
        <strong>{{ money(progress.remaining) }}</strong>
      </div>
    </div>
  </article>
</template>

<script setup>
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

defineProps({
  progress: { type: Object, required: true }
})

const { pgT } = usePropGuardianI18n()

function money(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '' : '-'}$${Math.abs(number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
