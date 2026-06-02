<template>
  <article class="pg-card pg-table-card">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('tradeReview.kicker') }}</span>
        <h3>{{ pgT('tradeReview.title') }}</h3>
      </div>
      <input v-model="query" class="pg-mini-input" :placeholder="pgT('tradeReview.filterPlaceholder')" />
    </div>
    <div class="pg-table-wrap">
      <table class="pg-table">
        <thead>
          <tr>
            <th>{{ pgT('tradeReview.symbol') }}</th>
            <th>{{ pgT('tradeReview.side') }}</th>
            <th>{{ pgT('tradeReview.session') }}</th>
            <th>{{ pgT('tradeReview.strategy') }}</th>
            <th>{{ pgT('tradeReview.emotion') }}</th>
            <th>R</th>
            <th>PnL</th>
            <th>{{ pgT('tradeReview.quality') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in filtered" :key="trade.id">
            <td><strong>{{ trade.symbol }}</strong><small>{{ formatDate(trade.exitTime) }}</small></td>
            <td :class="trade.side === 'BUY' ? 'pg-ok' : 'pg-danger'">{{ setupValueLabel(trade.side) }}</td>
            <td>{{ trade.session }}</td>
            <td>{{ trade.strategyTag || pgT('common.noSetup') }}</td>
            <td>{{ trade.emotionBefore }} -> {{ trade.emotionAfter }}</td>
            <td :class="trade.rMultiple >= 0 ? 'pg-ok' : 'pg-danger'">{{ Number(trade.rMultiple).toFixed(2) }}R</td>
            <td :class="trade.netProfit >= 0 ? 'pg-ok' : 'pg-danger'">{{ signedMoney(trade.netProfit) }}</td>
            <td><span class="pg-quality">{{ trade.qualityScore }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

const props = defineProps({
  trades: { type: Array, default: () => [] }
})

const query = ref('')
const { pgT, setupValueLabel, locale } = usePropGuardianI18n()
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.trades
  return props.trades.filter((trade) =>
    [trade.symbol, trade.strategyTag, trade.emotionBefore, trade.emotionAfter, trade.session].join(' ').toLowerCase().includes(needle)
  )
})

function signedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : '-'}$${Math.abs(number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' })
}
</script>
