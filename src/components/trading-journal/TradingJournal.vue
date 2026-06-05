<template>
  <section class="tj-page">
    <div class="tj-shell">
      <header class="tj-hero">
        <div class="tj-hero-copy">
          <p class="tj-kicker">JOURNAL</p>
          <h1>Trading Journal</h1>
          <p>Phân tích hiệu suất giao dịch và theo dõi nhật ký hàng ngày của bạn</p>
          <div class="tj-tabs">
            <button class="tj-tab-btn" :class="{ active: activeTab === 'calendar' }" @click="activeTab = 'calendar'">Daily Journal</button>
            <button class="tj-tab-btn" :class="{ active: activeTab === 'log' }" @click="activeTab = 'log'">Trade Log</button>
          </div>
        </div>
      </header>

      <div v-if="loading" class="tj-alert">Đang đồng bộ dữ liệu MT5...</div>
      <div v-else-if="error" class="tj-alert tj-alert-danger">{{ error }}</div>

      <template v-else>
        <!-- CALENDAR VIEW -->
        <section v-if="activeTab === 'calendar'" class="tj-calendar-view">
          <div class="tj-calendar-toolbar">
            <button class="tj-btn tj-btn-ghost" @click="prevMonth">‹ Trước</button>
            <h2 class="tj-month-title">{{ currentMonthLabel }}</h2>
            <button class="tj-btn tj-btn-ghost" @click="nextMonth">Sau ›</button>
          </div>
          
          <div class="tj-calendar-summary">
            <div class="tj-summary-item">
              <span>Net P&L</span>
              <strong :class="toneClass(monthlySummary.netProfit)">{{ signedMoney(monthlySummary.netProfit) }}</strong>
            </div>
            <div class="tj-summary-item">
              <span>Win Rate</span>
              <strong class="tj-good">{{ num(monthlySummary.winRate).toFixed(2) }}%</strong>
            </div>
            <div class="tj-summary-item">
              <span>Trades</span>
              <strong>{{ monthlySummary.total }}</strong>
            </div>
            <div class="tj-summary-item">
              <span>Profit Factor</span>
              <strong>{{ num(monthlySummary.profitFactor).toFixed(2) }}</strong>
            </div>
            <div class="tj-summary-item">
              <span>Avg Win</span>
              <strong class="tj-good">{{ money(monthlySummary.avgWin) }}</strong>
            </div>
            <div class="tj-summary-item">
              <span>Avg Loss</span>
              <strong class="tj-bad">{{ money(monthlySummary.avgLoss) }}</strong>
            </div>
          </div>

          <div class="tj-calendar-grid">
            <div class="tj-day-name" v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day">{{ day }}</div>
            <div v-for="(cell, index) in calendarCells" :key="index" class="tj-calendar-cell" :class="cellClass(cell)">
              <template v-if="!cell.empty">
                <span class="tj-date-num">{{ cell.day }}</span>
                <div v-if="cell.count > 0" class="tj-cell-data">
                  <span class="tj-cell-pnl">{{ signedMoney(cell.pnl) }}</span>
                  <span class="tj-cell-count">{{ cell.count }} Trades</span>
                </div>
              </template>
            </div>
          </div>
        </section>

        <!-- TRADE LOG VIEW -->
        <section v-if="activeTab === 'log'" class="tj-log-view">
          <div class="tj-panel">
            <div class="tj-panel-head">
              <h2>Trade Log</h2>
              <div class="tj-filters">
                <input type="text" v-model="filter.symbol" placeholder="Search Symbol..." />
                <select v-model="filter.side">
                  <option value="">All Sides</option>
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
                </select>
              </div>
            </div>
            
            <div class="tj-trade-table">
              <div class="tj-trade-head">
                <span>Open Date</span>
                <span>Close Date</span>
                <span>Symbol</span>
                <span>Side</span>
                <span>Entry</span>
                <span>Exit</span>
                <span>Volume</span>
                <span>Net PnL</span>
                <span>RR</span>
              </div>
              <div v-if="paginatedTrades.length">
                <div v-for="trade in paginatedTrades" :key="trade.id" class="tj-trade-row clickable" @click="openTrade(trade)">
                  <span>{{ dt(trade.openTime || trade.entryTime) }}</span>
                  <span>{{ dt(trade.closeAt || trade.exitTime) }}</span>
                  <strong>{{ trade.symbol }}</strong>
                  <span :class="trade.side === 'LONG' ? 'tj-good' : 'tj-bad'">{{ trade.side }}</span>
                  <span>{{ num(trade.entryPrice) }}</span>
                  <span>{{ num(trade.exitPrice) }}</span>
                  <span>{{ num(trade.volume) }}</span>
                  <strong :class="toneClass(trade.pnl)">{{ signedMoney(trade.pnl) }}</strong>
                  <span>{{ trade.rMultiple ? `${num(trade.rMultiple).toFixed(2)}R` : '--' }}</span>
                </div>
              </div>
              <p v-else class="tj-empty">Không có lệnh nào khớp với bộ lọc.</p>
            </div>
          </div>
        </section>
        <!-- TRADE DETAILS MODAL -->
        <div v-if="selectedTrade" class="tj-modal-overlay" @click.self="closeTrade">
          <div class="tj-modal">
            <header class="tj-modal-header">
              <h2>Chi tiết Lệnh #{{ selectedTrade.ticket || selectedTrade.id }}</h2>
              <button class="tj-close-btn" @click="closeTrade">✕</button>
            </header>
            <div class="tj-modal-body">
              <div class="tj-modal-grid">
                <!-- Meta data -->
                <div class="tj-trade-meta">
                  <div class="tj-meta-item"><span>Symbol</span><strong>{{ selectedTrade.symbol }}</strong></div>
                  <div class="tj-meta-item"><span>Side</span><strong :class="selectedTrade.side === 'LONG' ? 'tj-good' : 'tj-bad'">{{ selectedTrade.side }}</strong></div>
                  <div class="tj-meta-item"><span>Net PnL</span><strong :class="toneClass(selectedTrade.pnl)">{{ signedMoney(selectedTrade.pnl) }}</strong></div>
                  <div class="tj-meta-item"><span>Entry</span><strong>{{ selectedTrade.entryPrice }}</strong></div>
                  <div class="tj-meta-item"><span>Exit</span><strong>{{ selectedTrade.exitPrice }}</strong></div>
                  <div class="tj-meta-item"><span>RR</span><strong>{{ selectedTrade.rMultiple ? `${num(selectedTrade.rMultiple).toFixed(2)}R` : '--' }}</strong></div>
                </div>

                <!-- Tagging & Notes -->
                <div class="tj-trade-edit">
                  <label>
                    <span>Chiến lược (Strategy)</span>
                    <select v-model="selectedTrade.strategyTag">
                      <option value="">-- Chọn chiến lược --</option>
                      <option value="Breakout">Breakout</option>
                      <option value="Pullback">Pullback</option>
                      <option value="SMC">SMC / Smart Money Concepts</option>
                      <option value="Supply Demand">Supply Demand</option>
                      <option value="Trend Following">Trend Following</option>
                    </select>
                  </label>
                  <label>
                    <span>Mẫu hình (Setup)</span>
                    <input type="text" v-model="selectedTrade.setupTag" placeholder="Ví dụ: A+, Pinbar, Engulfing..." />
                  </label>
                  <label class="tj-wide">
                    <span>Ghi chú giao dịch (Notes)</span>
                    <textarea v-model="selectedTrade.notes" rows="6" placeholder="Phân tích ngữ cảnh, cảm xúc khi vào lệnh, rút kinh nghiệm..."></textarea>
                  </label>
                </div>
              </div>
            </div>
            <footer class="tj-modal-footer">
              <button class="tj-btn tj-btn-ghost" @click="closeTrade">Hủy</button>
              <button class="tj-btn tj-btn-primary" @click="saveTradeDetails">Lưu thay đổi</button>
            </footer>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import './trading-journal.css'
import { useTradingJournal } from './useTradingJournal.js'

const {
  loading,
  error,
  activeTab,
  filter,
  paginatedTrades,
  currentDate,
  prevMonth,
  nextMonth,
  currentMonthLabel,
  monthlySummary,
  calendarCells,
  selectedTrade,
  openTrade,
  closeTrade,
  saveTradeDetails
} = useTradingJournal()

function money(value) {
  return Number(value || 0).toLocaleString('en-US', {
    style: 'currency', currency: 'USD'
  })
}

function signedMoney(value) {
  const number = Number(value || 0)
  const sign = number > 0 ? '+' : ''
  return `${sign}${money(number)}`
}

function toneClass(value) {
  const number = Number(value || 0)
  if (number > 0) return 'tj-good'
  if (number < 0) return 'tj-bad'
  return ''
}

function cellClass(cell) {
  if (cell.empty) return 'is-empty'
  if (cell.count === 0) return 'is-idle'
  return cell.pnl >= 0 ? 'is-win' : 'is-loss'
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
