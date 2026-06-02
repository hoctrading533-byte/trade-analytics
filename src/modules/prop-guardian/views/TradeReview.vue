<template>
  <section class="pg-page">
    <PropGuardianHeader
      :accounts="accounts"
      :account-id="accountId"
      :risk-mode="evaluation.riskMode"
      @update:account-id="setAccount"
    />
    <main class="pg-content">
      <section class="pg-grid-4">
        <AccountStatusCard :label="pgT('tradeReview.totalTrades')" :value="String(trades.length)" :hint="pgT('tradeReview.last30Days')" :meta="pgT('tradeReview.history')" />
        <AccountStatusCard :label="pgT('tradeReview.avgQuality')" :value="String(avgQuality)" :hint="pgT('tradeReview.qualityScore')" :meta="pgT('tradeReview.score')" />
        <AccountStatusCard :label="pgT('tradeReview.avgDiscipline')" :value="String(avgDiscipline)" :hint="pgT('tradeReview.disciplineScore')" :meta="pgT('tradeReview.score')" />
        <AccountStatusCard :label="pgT('tradeReview.expectancy')" :value="signedMoney(evaluation.expectancy)" :hint="pgT('tradeReview.averageTradeResult')" meta="PnL" />
      </section>
      <TradeReviewTable :trades="trades" />
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import AccountStatusCard from '../components/AccountStatusCard.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import TradeReviewTable from '../components/TradeReviewTable.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const { accounts, accountId, setAccount, trades, evaluation } = usePropGuardian()
const { pgT } = usePropGuardianI18n()
const avgQuality = computed(() => Math.round(trades.value.reduce((sum, trade) => sum + Number(trade.qualityScore || 0), 0) / Math.max(1, trades.value.length)))
const avgDiscipline = computed(() => Math.round(trades.value.reduce((sum, trade) => sum + Number(trade.disciplineScore || 0), 0) / Math.max(1, trades.value.length)))

function signedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : '-'}$${Math.abs(number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
