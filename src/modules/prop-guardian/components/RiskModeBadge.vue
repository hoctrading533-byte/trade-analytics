<template>
  <span class="pg-risk-badge" :class="`pg-risk-badge--${String(mode).toLowerCase()}`">
    {{ riskModeLabel(mode) }}
  </span>
</template>

<script setup>
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

defineProps({
  mode: { type: String, default: 'SAFE' }
})

const { riskModeLabel } = usePropGuardianI18n()
</script>
