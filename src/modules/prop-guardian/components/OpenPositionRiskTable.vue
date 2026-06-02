<template>
  <article class="pg-card pg-table-card">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('positions.kicker') }}</span>
        <h3>{{ pgT('positions.title') }}</h3>
      </div>
      <strong>{{ positions.length }} {{ pgT('common.open') }}</strong>
    </div>
    <div class="pg-table-wrap">
      <table class="pg-table">
        <thead>
          <tr>
            <th>{{ pgT('positions.symbol') }}</th>
            <th>{{ pgT('positions.side') }}</th>
            <th>{{ pgT('positions.lot') }}</th>
            <th>{{ pgT('positions.entry') }}</th>
            <th>{{ pgT('positions.current') }}</th>
            <th>{{ pgT('positions.sl') }}</th>
            <th>{{ pgT('positions.floating') }}</th>
            <th>{{ pgT('positions.riskToSl') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in positions" :key="position.ticket">
            <td><strong>{{ position.symbol }}</strong><small>{{ position.ticket }}</small></td>
            <td :class="position.side === 'BUY' ? 'pg-ok' : 'pg-danger'">{{ setupValueLabel(position.side) }}</td>
            <td>{{ Number(position.volume).toFixed(2) }}</td>
            <td>{{ position.openPrice }}</td>
            <td>{{ position.currentPrice }}</td>
            <td :class="{ 'pg-danger': !position.hasStopLoss }">{{ position.hasStopLoss ? position.sl : pgT('common.noSl') }}</td>
            <td :class="position.floatingProfit >= 0 ? 'pg-ok' : 'pg-danger'">{{ signedMoney(position.floatingProfit) }}</td>
            <td>
              <strong>{{ money(position.riskToSlAmount) }}</strong>
              <small>{{ Number(position.riskToSlPercent || 0).toFixed(2) }}%</small>
            </td>
          </tr>
          <tr v-if="!positions.length">
            <td colspan="8" class="pg-empty">{{ pgT('positions.noPositions') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<script setup>
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

defineProps({
  positions: { type: Array, default: () => [] }
})

const { pgT, setupValueLabel } = usePropGuardianI18n()

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function signedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : '-'}$${Math.abs(number).toLocaleString('en-US', {
    maximumFractionDigits: 0
  })}`
}
</script>
