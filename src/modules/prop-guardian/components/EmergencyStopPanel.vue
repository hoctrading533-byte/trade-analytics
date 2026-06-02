<template>
  <article class="pg-card pg-emergency" :class="{ active: riskMode === 'LOCKDOWN' || riskMode === 'DANGER' }">
    <span class="pg-kicker">{{ pgT('emergency.kicker') }}</span>
    <h3>{{ riskMode === 'LOCKDOWN' ? pgT('emergency.stopTradingPlan') : pgT('emergency.emergencyCard') }}</h3>
    <p>{{ pgT('emergency.body') }}</p>
    <div class="pg-emergency__actions">
      <button type="button">{{ pgT('emergency.createStopPlan') }}</button>
      <button type="button" class="ghost">{{ pgT('emergency.acknowledgeRisk') }}</button>
    </div>
    <small>{{ pgT('emergency.disclaimer') }}</small>
  </article>
</template>

<script setup>
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

defineProps({
  riskMode: { type: String, default: 'SAFE' }
})

const { pgT } = usePropGuardianI18n()
</script>
