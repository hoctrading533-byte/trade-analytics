<script setup>
import { computed } from 'vue'

const props = defineProps({
  trades: { type: Array, default: () => [] },
  limit: { type: Number, default: 12 }
})

const displayTrades = computed(() => props.trades.slice(0, props.limit))

function formatTime(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function symbolColor(symbol) {
  const colors = {
    'XAUUSD': '#ffd700', 'EURUSD': '#42d7ff', 'GBPUSD': '#9a4dff',
    'BTCUSDT': '#f7931a', 'ETHUSDT': '#8b5cf6', 'SOLUSDT': '#00ffbd',
    'NAS100': '#ff4da6', 'GBPJPY': '#ff6b6b', 'USDJPY': '#ffd700',
    'NVDA': '#76b900', 'AAPL': '#a2aaad', 'MSFT': '#00a4ef', 'TSLA': '#e82127'
  }
  return colors[symbol] || 'var(--lf-text-muted)'
}
</script>

<template>
  <div class="lf-trades-table-wrap">
    <div class="lf-trades-table-header">
      <span class="lf-trades-table-title">Recent Trades</span>
      <span class="lf-trades-table-count">{{ trades.length }} total</span>
    </div>
    <div class="lf-trades-table-scroll">
      <table class="lf-trades-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Volume</th>
            <th>PnL</th>
            <th>R</th>
            <th>Strategy</th>
            <th>Session</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in displayTrades" :key="t.id">
            <td class="lf-tcell-time">{{ formatTime(t.exitTime || t.closeAt) }}</td>
            <td>
              <span class="lf-tcell-symbol" :style="{ color: symbolColor(t.symbol) }">{{ t.symbol }}</span>
            </td>
            <td>
              <span class="lf-tcell-side" :class="t.side">{{ t.side === 'long' ? 'LONG' : 'SHORT' }}</span>
            </td>
            <td class="lf-tcell-num">{{ Number(t.entryPrice).toFixed(t.symbol?.includes('JPY') ? 2 : t.symbol?.includes('BTC') ? 0 : t.assetType === 'stocks' ? 1 : 2) }}</td>
            <td class="lf-tcell-num">{{ Number(t.exitPrice).toFixed(t.symbol?.includes('JPY') ? 2 : t.symbol?.includes('BTC') ? 0 : t.assetType === 'stocks' ? 1 : 2) }}</td>
            <td class="lf-tcell-num">{{ Number(t.volume).toFixed(t.assetType === 'crypto' ? 2 : t.assetType === 'stocks' ? 0 : 0) }}</td>
            <td>
              <span class="lf-tcell-pnl" :class="(t.pnl || 0) >= 0 ? 'pos' : 'neg'">
                {{ (t.pnl || 0) >= 0 ? '+' : '' }}{{ Number(t.pnl).toFixed(2) }}
              </span>
            </td>
            <td class="lf-tcell-num">
              <span :style="{ color: (t.rMultiple || 0) >= 0 ? 'var(--lf-success)' : 'var(--lf-danger)' }">
                {{ (t.rMultiple || 0).toFixed(2) }}
              </span>
            </td>
            <td>
              <span class="lf-tcell-tag">{{ t.strategyTag }}</span>
            </td>
            <td>
              <span class="lf-tcell-session">{{ t.session }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.lf-trades-table-wrap {
  background: var(--lf-card);
  border: 1px solid var(--lf-border-soft);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.25s;
}

.lf-trades-table-wrap:hover {
  border-color: var(--lf-border);
  box-shadow: var(--lf-glow-card);
}

.lf-trades-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--lf-border-soft);
}

.lf-trades-table-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--lf-text);
}

.lf-trades-table-count {
  font-size: 12px;
  color: var(--lf-text-muted);
}

.lf-trades-table-scroll {
  overflow-x: auto;
}

.lf-trades-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.lf-trades-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: var(--lf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--lf-table-head);
  border-bottom: 1px solid var(--lf-border-soft);
  white-space: nowrap;
}

.lf-trades-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--lf-border-soft);
  vertical-align: middle;
}

.lf-trades-table tbody tr {
  transition: background 0.15s;
}

.lf-trades-table tbody tr:hover {
  background: var(--lf-table-row-hover);
}

.lf-tcell-time {
  font-size: 12px;
  color: var(--lf-text-muted);
  white-space: nowrap;
}

.lf-tcell-symbol {
  font-weight: 700;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
}

.lf-tcell-side {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.lf-tcell-side.long {
  background: rgba(0, 208, 132, 0.12);
  color: var(--lf-success);
}

.lf-tcell-side.short {
  background: rgba(255, 59, 122, 0.12);
  color: var(--lf-danger);
}

.lf-tcell-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--lf-text);
}

.lf-tcell-pnl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}

.lf-tcell-pnl.pos {
  color: var(--lf-success);
}

.lf-tcell-pnl.neg {
  color: var(--lf-danger);
}

.lf-tcell-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--lf-primary-soft);
  color: var(--lf-primary);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.lf-tcell-session {
  font-size: 11px;
  color: var(--lf-text-muted);
  font-weight: 600;
}
</style>
