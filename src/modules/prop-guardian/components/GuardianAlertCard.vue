<template>
  <article class="pg-card pg-alert-card" :class="`pg-alert-card--${alert.severity}`">
    <div class="pg-alert-card__top">
      <span>{{ alertTypeLabel(alert.type) }}</span>
      <strong>{{ severityLabel(alert.severity) }}</strong>
    </div>

    <div class="pg-alert-section">
      <span>{{ pgT('alert.problem') }}</span>
      <h3>{{ alertProblem(alert) }}</h3>
      <p>{{ alertMessage(alert) }}</p>
    </div>

    <div class="pg-alert-section">
      <span>{{ pgT('alert.evidence') }}</span>
      <div class="pg-alert-evidence">
        <small v-for="item in evidenceRows" :key="item.key">
          <b>{{ item.key }}</b>
          {{ item.value }}
        </small>
      </div>
    </div>

    <div class="pg-alert-grid">
      <div>
        <span>{{ pgT('alert.severity') }}</span>
        <strong>{{ severityLabel(alert.severity) }}</strong>
      </div>
      <div>
        <span>{{ pgT('alert.action') }}</span>
        <strong>{{ alertAction(alert) }}</strong>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

const props = defineProps({
  alert: { type: Object, required: true }
})

const {
  pgT,
  pgText,
  alertTypeLabel,
  alertProblem,
  alertMessage,
  alertAction,
  alertEvidenceLabel,
  severityLabel,
  setupValueLabel
} = usePropGuardianI18n()

const evidenceRows = computed(() => {
  const evidence = props.alert.evidence || {}
  const rows = Object.entries(evidence).map(([key, value]) => ({
    key: alertEvidenceLabel(key),
    value: formatValue(value)
  }))
  return rows.length ? rows : [{ key: pgT('alert.statusFallback'), value: pgT('alert.detectedFallback') }]
})

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '--'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${alertEvidenceLabel(key)}: ${formatValue(item)}`)
      .join(', ')
  }
  if (typeof value === 'number') return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
  const raw = String(value)
  return setupValueLabel(raw) === raw.replace(/_/g, ' ') ? pgText(raw) : setupValueLabel(raw)
}
</script>
