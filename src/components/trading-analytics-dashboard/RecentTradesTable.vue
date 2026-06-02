<template>
  <article class="ta-table-card">
    <header class="ta-table-card__head">
      <div>
        <span class="ta-kicker">{{ t('dashboard.journalFeed') }}</span>
        <h2>{{ t('dashboard.recentTrades') }}</h2>
        <p>{{ t('dashboard.recentTradesSub') }}</p>
      </div>
      <RouterLink to="/journal" class="ta-table-card__link">{{ t('dashboard.openJournal') }}</RouterLink>
    </header>

    <div class="ta-table-wrap">
      <table class="ta-trades-table">
        <thead>
          <tr>
            <th>{{ t('dashboard.trade') }}</th>
            <th>{{ t('dashboard.account') }}</th>
            <th>{{ t('dashboard.session') }}</th>
            <th>Setup</th>
            <th>{{ t('dashboard.entryExit') }}</th>
            <th>R</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in trades" :key="trade.id">
            <td>
              <div class="ta-trade-symbol">
                <strong>{{ trade.symbol }}</strong>
                <span :class="trade.side === 'long' ? 'positive' : 'negative'">{{ trade.side }}</span>
              </div>
              <small>{{ formatDate(trade.exitTime) }}</small>
            </td>
            <td>{{ accountName(trade.accountId) }}</td>
            <td>{{ trade.session }}</td>
            <td>
              <span class="ta-tag">{{ trade.strategyTag }}</span>
              <small>{{ trade.emotionTag }}</small>
            </td>
            <td>{{ trade.entryPrice }} / {{ trade.exitPrice }}</td>
            <td :class="trade.rMultiple >= 0 ? 'positive' : 'negative'">{{ trade.rMultiple.toFixed(2) }}R</td>
            <td :class="trade.pnl >= 0 ? 'positive' : 'negative'">{{ signedMoney(trade.pnl) }}</td>
          </tr>
          <tr v-if="!trades.length">
            <td colspan="7" class="ta-empty-state">{{ t('dashboard.noTrades') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useI18n } from '../../composables/useI18n.js'

const props = defineProps({
  trades: { type: Array, default: () => [] },
  accounts: { type: Array, default: () => [] }
})

const { t } = useI18n()

function signedMoney(value) {
  const numeric = Number(value || 0)
  return `${numeric >= 0 ? '+' : '-'}$${Math.abs(numeric).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function accountName(id) {
  return props.accounts.find((account) => account.id === id)?.name || id
}
</script>
