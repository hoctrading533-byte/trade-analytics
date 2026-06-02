<template>
  <section class="tj-page">
    <div class="tj-shell">
      <header class="tj-hero">
        <div class="tj-hero-copy">
          <p class="tj-kicker">{{ t('journal.kicker') }}</p>
          <h1>{{ t('journal.title') }}</h1>
          <p>{{ t('journal.subtitle') }}</p>
          <div class="tj-hero-actions">
            <button class="tj-btn tj-btn-primary" type="button" :disabled="loading" @click="refreshAll">
              {{ loading ? t('common.loading') : t('common.refresh') }}
            </button>
            <span class="tj-sync-pill">{{ t('journal.visibleTrades', { count: trades.length }) }}</span>
          </div>
        </div>

        <aside class="tj-formula-card">
          <span>{{ t('journal.formulaEngine') }}</span>
          <strong>Winrate / RR / Profit Factor</strong>
          <div class="tj-formula-list">
            <p>Winrate = winning closed trades / closed trades</p>
            <p>RR = realized PnL / planned risk</p>
            <p>PF = gross profit / gross loss</p>
          </div>
        </aside>
      </header>

      <div v-if="errorMessage" class="tj-alert tj-alert-danger">{{ errorMessage }}</div>
      <div v-if="successMessage" class="tj-alert tj-alert-success">{{ successMessage }}</div>

      <section class="tj-metric-grid">
        <article class="tj-metric-card">
          <span>{{ t('journal.totalTrades') }}</span>
          <strong>{{ summary.totalTrades || 0 }}</strong>
          <small>{{ summary.closedTrades || 0 }} {{ t('journal.closed') }}</small>
        </article>
        <article class="tj-metric-card">
          <span>{{ t('journal.winrate') }}</span>
          <strong>{{ percent(summary.winRate) }}</strong>
          <small>{{ summary.winners || 0 }} {{ t('journal.winners') }}</small>
        </article>
        <article class="tj-metric-card">
          <span>{{ t('journal.netPnl') }}</span>
          <strong :class="toneClass(summary.netPnl)">{{ signedMoney(summary.netPnl) }}</strong>
          <small>{{ t('journal.afterFees') }}</small>
        </article>
        <article class="tj-metric-card">
          <span>{{ t('journal.profitFactor') }}</span>
          <strong>{{ profitFactor(summary.profitFactor) }}</strong>
          <small>{{ t('journal.grossProfitLoss') }}</small>
        </article>
        <article class="tj-metric-card">
          <span>{{ t('journal.averageRr') }}</span>
          <strong>{{ ratio(summary.avgRr) }}</strong>
          <small>{{ t('journal.realizedRiskMultiple') }}</small>
        </article>
        <article class="tj-metric-card">
          <span>{{ t('journal.expectancy') }}</span>
          <strong :class="toneClass(summary.expectancy)">{{ signedMoney(summary.expectancy) }}</strong>
          <small>{{ t('journal.averageClosedTrade') }}</small>
        </article>
      </section>

      <section class="tj-workspace">
        <article class="tj-panel tj-form-panel">
          <div class="tj-panel-head">
            <div>
              <p class="tj-panel-kicker">{{ t('journal.manualImport') }}</p>
              <h2>{{ isEdit ? t('journal.editTrade') : t('journal.addTrade') }}</h2>
            </div>
            <button v-if="isEdit" class="tj-btn tj-btn-ghost tj-btn-small" type="button" @click="resetForm">
              {{ t('journal.cancelEdit') }}
            </button>
          </div>

          <form class="tj-form-layout" @submit.prevent="saveTrade">
            <div class="tj-form-grid">
              <label>
                <span>{{ t('journal.account') }}</span>
                <select v-model="form.accountId">
                  <option value="" disabled>{{ t('journal.selectAccount') }}</option>
                  <option v-for="account in accounts" :key="account.id" :value="account.id">
                    {{ account.name }} - {{ account.broker || 'Manual' }}
                  </option>
                </select>
              </label>
              <label>
                <span>{{ t('journal.symbol') }}</span>
                <input v-model="form.symbol" placeholder="XAUUSD" />
              </label>
              <label>
                <span>{{ t('journal.assetClass') }}</span>
                <select v-model="form.assetClass">
                  <option value="forex">Forex</option>
                  <option value="crypto">Crypto</option>
                  <option value="stocks">Stocks</option>
                  <option value="futures">Futures</option>
                  <option value="indices">Indices</option>
                </select>
              </label>
              <label>
                <span>{{ t('journal.side') }}</span>
                <select v-model="form.side">
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </label>
              <label>
                <span>{{ t('journal.status') }}</span>
                <select v-model="form.status">
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </label>
              <label>
                <span>{{ t('journal.source') }}</span>
                <select v-model="form.source">
                  <option value="manual">Manual</option>
                  <option value="csv">CSV import</option>
                  <option value="broker">Broker sync</option>
                  <option value="mt5">MT5</option>
                </select>
              </label>
              <label>
                <span>{{ t('journal.entryTime') }}</span>
                <input v-model="form.entryTime" type="datetime-local" />
              </label>
              <label>
                <span>{{ t('journal.exitTime') }}</span>
                <input v-model="form.exitTime" type="datetime-local" :disabled="form.status === 'open'" />
              </label>
              <label>
                <span>{{ t('journal.entryPrice') }}</span>
                <input v-model="form.entryPrice" type="number" step="0.0001" min="0" />
              </label>
              <label>
                <span>{{ t('journal.exitPrice') }}</span>
                <input v-model="form.exitPrice" type="number" step="0.0001" min="0" :disabled="form.status === 'open'" />
              </label>
              <label>
                <span>{{ t('journal.stopLoss') }}</span>
                <input v-model="form.stopLoss" type="number" step="0.0001" min="0" />
              </label>
              <label>
                <span>{{ t('journal.takeProfit') }}</span>
                <input v-model="form.takeProfit" type="number" step="0.0001" min="0" />
              </label>
              <label>
                <span>{{ t('journal.volume') }}</span>
                <input v-model="form.volume" type="number" step="0.01" min="0" />
              </label>
              <label>
                <span>{{ t('journal.fees') }}</span>
                <input v-model="form.fees" type="number" step="0.01" min="0" />
              </label>
              <label>
                <span>{{ t('journal.session') }}</span>
                <select v-model="form.session">
                  <option>Asia</option>
                  <option>London</option>
                  <option>New York</option>
                  <option>Overlap</option>
                </select>
              </label>
              <label>
                <span>{{ t('journal.importRef') }}</span>
                <input v-model="form.importRef" placeholder="ticket, csv row, broker order id" />
              </label>
              <label>
                <span>{{ t('journal.strategyTag') }}</span>
                <input v-model="form.strategyTag" placeholder="Breakout, SMC, Trend" />
              </label>
              <label>
                <span>{{ t('journal.emotionTag') }}</span>
                <input v-model="form.emotionTag" placeholder="Calm, FOMO, Revenge" />
              </label>
              <label>
                <span>{{ t('journal.setupTag') }}</span>
                <input v-model="form.setupTag" placeholder="A+, Pullback" />
              </label>
              <label>
                <span>{{ t('journal.customTags') }}</span>
                <input v-model="form.customTagsText" placeholder="news, gold, scalp" />
              </label>
              <label>
                <span>MAE</span>
                <input v-model="form.mae" type="number" step="0.01" min="0" />
              </label>
              <label>
                <span>MFE</span>
                <input v-model="form.mfe" type="number" step="0.01" min="0" />
              </label>
              <label class="tj-wide">
                <span>{{ t('journal.notes') }}</span>
                <textarea v-model="form.notes" rows="3" placeholder="Context, mistake, execution notes"></textarea>
              </label>
            </div>

            <aside class="tj-preview-card">
              <div>
                <span>{{ t('journal.calculatedPreview') }}</span>
                <strong :class="toneClass(tradePreview.pnl)">{{ signedMoney(tradePreview.pnl) }}</strong>
                <small>{{ tradePreview.isClosed ? tradePreview.outcome : t('journal.openTradePreview') }}</small>
              </div>
              <div class="tj-preview-grid">
                <div>
                  <span>RR</span>
                  <strong>{{ ratio(tradePreview.rr) }}</strong>
                </div>
                <div>
                  <span>{{ t('journal.planRr') }}</span>
                  <strong>{{ ratio(tradePreview.plannedRr) }}</strong>
                </div>
                <div>
                  <span>{{ t('journal.risk') }}</span>
                  <strong>{{ money(tradePreview.riskAmount) }}</strong>
                </div>
                <div>
                  <span>{{ t('journal.reward') }}</span>
                  <strong>{{ money(tradePreview.rewardAmount) }}</strong>
                </div>
              </div>
              <button class="tj-btn tj-btn-primary tj-btn-full" type="submit" :disabled="saving">
                {{ saving ? t('journal.saving') : isEdit ? t('journal.updateTrade') : t('journal.addTrade') }}
              </button>
            </aside>
          </form>
        </article>

        <article class="tj-panel tj-account-panel">
          <div class="tj-panel-head">
            <div>
              <p class="tj-panel-kicker">Accounts</p>
              <h2>Trading accounts</h2>
            </div>
          </div>
          <div class="tj-account-list">
            <div v-for="account in accounts" :key="account.id" class="tj-account-row">
              <div>
                <strong>{{ account.name }}</strong>
                <span>{{ account.broker || 'Manual' }} / {{ account.market || 'multi' }}</span>
              </div>
              <em>{{ account.currency }}</em>
            </div>
          </div>
          <div class="tj-account-form">
            <input v-model="accountForm.name" placeholder="Account name" />
            <input v-model="accountForm.broker" placeholder="Broker" />
            <div class="tj-split">
              <input v-model="accountForm.market" placeholder="Market" />
              <input v-model="accountForm.currency" placeholder="USD" />
            </div>
            <button class="tj-btn tj-btn-ghost tj-btn-full" type="button" :disabled="saving" @click="createAccount">
              Add account
            </button>
          </div>
        </article>
      </section>

      <section class="tj-panel tj-table-panel">
        <div class="tj-panel-head">
          <div>
            <p class="tj-panel-kicker">Global filters</p>
            <h2>Trade list</h2>
          </div>
          <div class="tj-table-actions">
            <button class="tj-btn tj-btn-ghost tj-btn-small" type="button" @click="clearFilters">Clear</button>
            <button class="tj-btn tj-btn-small" type="button" @click="loadTrades">Apply filters</button>
          </div>
        </div>

        <div class="tj-filters">
          <select v-model="filter.accountId">
            <option value="">All accounts</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
          <input v-model="filter.symbol" placeholder="Symbol" />
          <input v-model="filter.dateFrom" type="date" />
          <input v-model="filter.dateTo" type="date" />
          <input v-model="filter.tag" placeholder="Strategy / emotion / tag" />
        </div>

        <div class="tj-trade-table">
          <div class="tj-trade-head">
            <span>Time</span>
            <span>Account</span>
            <span>Symbol</span>
            <span>Side</span>
            <span>Entry / Exit</span>
            <span>RR</span>
            <span>Plan</span>
            <span>PnL</span>
            <span>Tags</span>
            <span></span>
          </div>
          <div v-if="trades.length">
            <div v-for="trade in trades" :key="trade.id" class="tj-trade-row">
              <span>{{ dt(trade.entryTime) }}</span>
              <span>{{ trade.accountName }}</span>
              <strong>{{ trade.symbol }}</strong>
              <span :class="trade.side === 'LONG' ? 'tj-good' : 'tj-bad'">{{ trade.side }}</span>
              <span>{{ num(trade.entryPrice) }} / {{ trade.status === 'closed' ? num(trade.exitPrice) : 'OPEN' }}</span>
              <span>{{ ratio(trade.rr) }}</span>
              <span>{{ ratio(trade.plannedRr) }}</span>
              <span :class="toneClass(trade.pnl)">{{ signedMoney(trade.pnl) }}</span>
              <span class="tj-tag-cell">
                <em v-if="trade.strategyTag">{{ trade.strategyTag }}</em>
                <em v-if="trade.emotionTag">{{ trade.emotionTag }}</em>
                <em v-if="trade.setupTag">{{ trade.setupTag }}</em>
                <em v-for="tag in trade.customTags" :key="`${trade.id}-${tag}`">{{ tag }}</em>
              </span>
              <span class="tj-row-actions">
                <button type="button" class="tj-mini-link" @click="editTrade(trade)">Edit</button>
                <button type="button" class="tj-mini-link danger" @click="deleteTrade(trade)">Delete</button>
              </span>
            </div>
          </div>
          <p v-else class="tj-empty">No trades match the current filters.</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import './trading-journal.css'
import { useI18n } from '../../composables/useI18n.js'
import { useTradingJournal } from './useTradingJournal.js'

const { t } = useI18n()

const {
  loading,
  saving,
  errorMessage,
  successMessage,
  accounts,
  trades,
  summary,
  filter,
  accountForm,
  form,
  isEdit,
  tradePreview,
  refreshAll,
  loadTrades,
  createAccount,
  saveTrade,
  editTrade,
  deleteTrade,
  resetForm,
  clearFilters
} = useTradingJournal()

function money(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function signedMoney(value) {
  const number = Number(value || 0)
  const sign = number > 0 ? '+' : ''
  return `${sign}${money(number)}`
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`
}

function ratio(value) {
  return Number(value || 0).toFixed(2)
}

function profitFactor(value) {
  const number = Number(value || 0)
  return number >= 999 ? 'INF' : number.toFixed(2)
}

function toneClass(value) {
  const number = Number(value || 0)
  if (number > 0) return 'tj-good'
  if (number < 0) return 'tj-bad'
  return ''
}

function num(value) {
  return Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 5
  })
}

function dt(value) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>
