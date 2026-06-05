<template>
  <div class="tj-trade-list">
    <table class="tj-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Side</th>
          <th>Open Time</th>
          <th>Close Time</th>
          <th>Entry Price</th>
          <th>Exit Price</th>
          <th>Volume</th>
          <th>Commission</th>
          <th>Net PnL</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in trades" :key="trade.ticket">
          <td><strong>{{ trade.symbol || '--' }}</strong></td>
          <td>
            <span class="tj-tag" :class="trade.type === 'BUY' || trade.type === 0 ? 'buy' : 'sell'">
              {{ trade.type === 'BUY' || trade.type === 0 ? 'BUY' : 'SELL' }}
            </span>
          </td>
          <td>{{ formatTime(trade.entryTime || trade.openTime || trade.open_time || (trade.time ? trade.time * 1000 : null)) }}</td>
          <td>{{ formatTime(trade.exitTime || trade.closeTime || trade.close_time || (trade.time ? trade.time * 1000 : null)) }}</td>
          <td>{{ formatPrice(trade.entryPrice || trade.openPrice || trade.open_price || trade.price) }}</td>
          <td>{{ formatPrice(trade.exitPrice || trade.closePrice || trade.close_price || trade.price) }}</td>
          <td>{{ formatVol(trade.volume) }}</td>
          <td>{{ formatMoney(trade.commission) }}</td>
          <td :class="Number(trade.profit || trade.netProfit) >= 0 ? 'text-success' : 'text-danger'">
            <strong>{{ formatMoneySigned(trade.profit || trade.netProfit) }}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  trades: {
    type: Array,
    required: true
  }
})

function formatTime(val) {
  if (!val) return '--'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '--'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatPrice(val) {
  return Number(val || 0).toLocaleString('en-US', { maximumFractionDigits: 5 })
}

function formatVol(val) {
  return Number(val || 0).toFixed(2)
}

function formatMoney(val) {
  return Number(val || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatMoneySigned(val) {
  const num = Number(val || 0)
  const sign = num > 0 ? '+' : ''
  return `${sign}${formatMoney(num)}`
}
</script>
