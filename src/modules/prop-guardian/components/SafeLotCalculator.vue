<template>
  <article class="pg-card pg-safe-lot">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('safeLot.kicker') }}</span>
        <h3>{{ pgT('safeLot.title') }}</h3>
      </div>
      <strong :class="result.shouldTakeTrade ? 'pg-ok' : 'pg-danger'">
        {{ result.shouldTakeTrade ? pgT('common.yes') : pgT('common.no') }}
      </strong>
    </div>
    <div class="pg-safe-lot__grid">
      <div>
        <span>{{ pgT('safeLot.suggestedLot') }}</span>
        <strong>{{ result.suggestedLot.toFixed(2) }}</strong>
      </div>
      <div>
        <span>{{ pgT('safeLot.maxSafeLot') }}</span>
        <strong>{{ result.maxSafeLot.toFixed(2) }}</strong>
      </div>
      <div>
        <span>{{ pgT('safeLot.lossIfSlHit') }}</span>
        <strong>{{ money(result.lossIfSlHit) }}</strong>
      </div>
      <div>
        <span>{{ pgT('safeLot.remainingDdAfterSl') }}</span>
        <strong>{{ money(result.remainingDailyDdAfterSl) }}</strong>
      </div>
    </div>
    <p v-if="result.warning" class="pg-risk-note">{{ pgText(result.warning) }}</p>
  </article>
</template>

<script setup>
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

defineProps({
  result: { type: Object, required: true }
})

const { pgT, pgText } = usePropGuardianI18n()

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
