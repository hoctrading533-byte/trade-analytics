<template>
  <section class="pg-page">
    <PropGuardianHeader
      :accounts="accounts"
      :account-id="accountId"
      :risk-mode="evaluation.riskMode"
      :evaluation="evaluation"
      @update:account-id="setAccount"
    />

    <main class="pg-content pg-command-content">
      <!-- Area 2: Survival Dashboard (Bảng chỉ số Sinh tử) -->
      <section class="pg-survival-dashboard" style="margin-top: 8px;">
        <h2 style="margin: 0 0 12px; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 8px;">
          <span style="display:inline-block; width: 6px; height: 16px; background: var(--gradient-primary); border-radius: 3px;"></span>
          {{ locale === 'vi' ? 'Chỉ Số Sinh Tử Cốt Lõi (Survival Dashboard)' : 'Core Survival Indicators' }}
        </h2>
        <div class="pg-grid-3">
          <!-- Sức khỏe tài khoản / Max DD Distance -->
          <article class="pg-card pg-stat-card" :class="evaluation.maxDrawdown.usedPercent >= 80 ? 'pg-card--critical' : evaluation.maxDrawdown.usedPercent >= 50 ? 'pg-card--warning' : 'pg-card--success'">
            <div class="pg-stat-card__top">
              <span>{{ locale === 'vi' ? 'KHOẢNG CÁCH ĐẾN MAX DD' : 'DISTANCE TO MAX DD' }}</span>
              <small class="pg-warn" style="font-weight: 900;">{{ evaluation.maxDrawdown.usedPercent.toFixed(0) }}% {{ pgT('gauge.used') }}</small>
            </div>
            <strong :style="{ color: evaluation.maxDrawdown.usedPercent >= 80 ? 'var(--lf-danger)' : 'var(--lf-success)' }">
              {{ money(evaluation.maxDrawdown.remaining) }}
            </strong>
            <p style="font-size: 11px; margin-top: 6px; color: var(--lf-text-muted);">
              {{ locale === 'vi' ? `Ngưỡng tối thiểu: ${money(evaluation.maxDrawdown.floor)}` : `Hard Drawdown floor: ${money(evaluation.maxDrawdown.floor)}` }}
            </p>
          </article>

          <!-- Giới hạn lỗ ngày còn lại -->
          <article class="pg-card pg-stat-card" :class="evaluation.dailyLoss.usedPercent >= 80 ? 'pg-card--critical' : evaluation.dailyLoss.usedPercent >= 50 ? 'pg-card--warning' : 'pg-card--success'">
            <div class="pg-stat-card__top">
              <span>{{ locale === 'vi' ? 'HẠN MỨC LỖ NGÀY CÒN LẠI' : 'REMAINING DAILY LOSS' }}</span>
              <small class="pg-warn" style="font-weight: 900;">{{ evaluation.dailyLoss.usedPercent.toFixed(0) }}% {{ pgT('gauge.used') }}</small>
            </div>
            <strong :style="{ color: evaluation.dailyLoss.usedPercent >= 80 ? 'var(--lf-danger)' : 'var(--lf-success)' }">
              {{ money(evaluation.dailyLoss.remaining) }}
            </strong>
            <p style="font-size: 11px; margin-top: 6px; color: var(--lf-text-muted);">
              {{ locale === 'vi' ? `Hôm nay đã lỗ: ${money(evaluation.dailyLoss.used)} (Giới hạn: ${money(evaluation.dailyLoss.limit)})` : `Today lost: ${money(evaluation.dailyLoss.used)} (Limit: ${money(evaluation.dailyLoss.limit)})` }}
            </p>
          </article>

          <!-- Số ngày giao dịch tối thiểu -->
          <article class="pg-card pg-stat-card" :class="completedTradingDays >= selectedChallenge.minTradingDays ? 'pg-card--success' : 'pg-card--warning'">
            <div class="pg-stat-card__top">
              <span>{{ locale === 'vi' ? 'SỐ NGÀY GIAO DỊCH TỐI THIỂU' : 'MINIMUM TRADING DAYS' }}</span>
              <small :class="completedTradingDays >= selectedChallenge.minTradingDays ? 'pg-ok' : 'pg-warn'" style="font-weight: 900;">
                {{ completedTradingDays >= selectedChallenge.minTradingDays ? 'COMPLETED' : 'IN PROGRESS' }}
              </small>
            </div>
            <strong>
              {{ completedTradingDays }} / {{ selectedChallenge.minTradingDays || 5 }} {{ locale === 'vi' ? 'ngày' : 'days' }}
            </strong>
            <div class="pg-progress-track" style="margin-top: 8px; height: 6px;">
              <span :style="{ width: `${Math.min(100, (completedTradingDays / (selectedChallenge.minTradingDays || 5)) * 100)}%` }"></span>
            </div>
          </article>
        </div>
      </section>

      <section class="pg-command-hero">
        <article class="pg-card pg-command-title">
          <div>
            <span class="pg-kicker">{{ pgT('dashboard.kicker') }}</span>
            <h1>{{ pgT('dashboard.title') }}</h1>
            <p>{{ pgT('dashboard.subtitle') }}</p>
          </div>
          <div class="pg-live-meta">
            <span :class="dataSource === 'exness-mt5' ? 'pg-ok' : 'pg-warn'">
              {{ dataSource === 'exness-mt5' ? pgT('common.liveExnessMt5') : pgT('common.mockRealtime') }}
            </span>
            <small>{{ mt5Status.login }} - {{ lastSyncAt ? dateTime(lastSyncAt) : pgT('common.waitingSync') }}</small>
            <label class="pg-live-switch">
              <input v-model="isLivePolling" type="checkbox" />
              {{ pgT('common.polling') }}
            </label>
            <button type="button" :disabled="isLoadingLive" @click="loadLiveData({ silent: false })">
              {{ isLoadingLive ? pgT('common.syncing') : pgT('common.syncNow') }}
            </button>
          </div>
        </article>
      </section>

      <p v-if="liveError" class="pg-live-error">{{ pgText(liveError) }}</p>

      <section class="pg-command-top">
        <article class="pg-card pg-command-stat" :class="`pg-card--${commandCenter.accountHealth.tone}`">
          <span>{{ pgT('dashboard.accountHealth') }}</span>
          <strong>{{ commandCenter.accountHealth.score }}/100</strong>
          <p>{{ healthLabel(commandCenter.accountHealth.label) }} - {{ pgText(commandCenter.accountHealth.summary) }}</p>
        </article>

        <article class="pg-card pg-command-stat" :class="riskToneClass(evaluation.riskMode)">
          <span>{{ pgT('dashboard.riskMode') }}</span>
          <strong>{{ riskModeLabel(evaluation.riskMode) }}</strong>
          <p>{{ statusLabel(evaluation.ruleStatus) }} - {{ pgT('dashboard.lossStreak') }} {{ evaluation.lossStreak }}</p>
        </article>

        <article class="pg-card pg-command-stat">
          <span>{{ pgT('dashboard.survivalScore') }}</span>
          <strong>{{ evaluation.survivalScore }}/100</strong>
          <p>{{ pgT('dashboard.passProbability') }}: {{ bandLabel(evaluation.passProbability.band) }} - MC {{ evaluation.passProbability.monteCarloScore }}%</p>
        </article>

        <article class="pg-card pg-command-stat pg-command-stat--action">
          <span>{{ pgT('dashboard.todayAction') }}</span>
          <strong>{{ pgText(commandCenter.oneBestAction.title) }}</strong>
          <p>{{ pgText(commandCenter.todayAction) }}</p>
        </article>
      </section>

      <section class="pg-command-layout">
        <aside class="pg-command-column pg-command-column--left">
          <article class="pg-card pg-rule-panel">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.ruleStatus') }}</span>
                <h3>{{ pgT('dashboard.challengeRules') }}</h3>
              </div>
              <RiskModeBadge :mode="evaluation.riskMode" />
            </div>
            <div class="pg-rule-list">
              <div>
                <span>{{ pgT('dashboard.dailyLossMode') }}</span>
                <strong>{{ dailyLossModeLabel(evaluation.dailyLoss.mode) }}</strong>
                <small>{{ pgT('dashboard.floor') }} {{ money(evaluation.dailyLoss.floor) }}</small>
              </div>
              <div>
                <span>{{ pgT('dashboard.maxDdMode') }}</span>
                <strong>{{ drawdownTypeLabel(evaluation.maxDrawdown.type) }}</strong>
                <small>{{ pgT('dashboard.floor') }} {{ money(evaluation.maxDrawdown.floor) }}</small>
              </div>
              <div>
                <span>{{ pgT('dashboard.tradingHours') }}</span>
                <strong :class="evaluation.tradingWindow.allowed ? 'pg-ok' : 'pg-danger'">
                  {{ evaluation.tradingWindow.allowed ? pgT('common.openStatus') : pgT('common.closedStatus') }}
                </strong>
                <small>{{ pgText(evaluation.tradingWindow.label) }}</small>
              </div>
              <div>
                <span>{{ pgT('dashboard.consistencyRule') }}</span>
                <strong :class="evaluation.consistencyRule.status === 'OK' ? 'pg-ok' : 'pg-warn'">
                  {{ statusLabel(evaluation.consistencyRule.status) }}
                </strong>
                <small>{{ evaluation.consistencyRule.contributionPercent }}% / {{ evaluation.consistencyRule.limitPercent }}%</small>
              </div>
            </div>
          </article>

          <ProfitTargetProgress :progress="evaluation.targetProgress" />

          <DrawdownGauge
            :kicker="pgT('dashboard.dailyRule')"
            :title="pgT('dashboard.dailyDdRemaining')"
            :used="evaluation.dailyLoss.used"
            :remaining="evaluation.dailyLoss.remaining"
            :floor="evaluation.dailyLoss.floor"
            :percent="evaluation.dailyLoss.usedPercent"
          />

          <DrawdownGauge
            :kicker="pgT('dashboard.maxRule')"
            :title="pgT('dashboard.maxDdRemaining')"
            :used="evaluation.maxDrawdown.used"
            :remaining="evaluation.maxDrawdown.remaining"
            :floor="evaluation.maxDrawdown.floor"
            :percent="evaluation.maxDrawdown.usedPercent"
          />
        </aside>

        <section class="pg-command-column pg-command-column--center">
          <article class="pg-card pg-chart-card pg-equity-panel">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.realtimeEquity') }}</span>
                <h3>{{ pgT('dashboard.equityCurve') }}</h3>
              </div>
              <strong :class="liveAccount.floatingProfit >= 0 ? 'pg-ok' : 'pg-danger'">
                {{ signedMoney(liveAccount.floatingProfit) }}
              </strong>
            </div>
            <svg class="pg-svg-chart" viewBox="0 0 720 240" role="img" :aria-label="pgT('dashboard.equityCurve')">
              <line v-for="line in chartGrid" :key="line" x1="0" :y1="line" x2="720" :y2="line" class="pg-svg-grid" />
              <polygon :points="equityAreaPoints" class="pg-svg-area" />
              <polyline :points="equityLinePoints" class="pg-svg-line" />
            </svg>
            <div class="pg-equity-meta">
              <span>{{ pgT('common.balance') }} <strong>{{ money(liveAccount.currentBalance) }}</strong></span>
              <span>{{ pgT('common.equity') }} <strong>{{ money(liveAccount.currentEquity) }}</strong></span>
              <span>{{ pgT('common.closedToday') }} <strong>{{ signedMoney(todayStats.closedPnl) }}</strong></span>
            </div>
          </article>

          <!-- Area 3: Personalized Asset Watchlist & Lot Sizing Tool -->
          <article class="pg-card" style="padding: 20px;">
            <div class="pg-card-head" style="margin-bottom: 12px; align-items: center;">
              <div>
                <span class="pg-kicker">{{ locale === 'vi' ? 'QUẢN LÝ VỐN TỪNG TÀI SẢN' : 'ASSET CAPITAL RISK' }}</span>
                <h3>{{ locale === 'vi' ? 'Danh Sách Theo Dõi & Sizing' : 'User Watchlist & Sizing Tool' }}</h3>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--lf-text-muted); cursor: pointer; user-select: none;">
                  <input type="checkbox" v-model="hideDangerousAssets" style="cursor: pointer;" />
                  {{ locale === 'vi' ? 'Ẩn tài sản thua lỗ nhiều' : 'Hide high-loss assets' }}
                </label>
                <strong style="color: var(--lf-primary-hot);">{{ filteredWatchlist.length }} Assets</strong>
              </div>
            </div>

            <p style="font-size: 12px; margin-top: 0; color: var(--lf-text-muted); line-height: 1.5;">
              {{ locale === 'vi' ? 'Hệ thống tự động tính toán khối lượng lệnh (Lot Size) an toàn dựa trên hạn mức thua lỗ ngày còn lại. Tự kiểm soát tâm lý trước khi click chuột.' : 'The system automatically calculates the safe Lot size based on your remaining daily loss limit. Keep emotions controlled before trading.' }}
            </p>

            <div class="pg-watchlist-grid">
              <div v-for="item in filteredWatchlist" :key="item.symbol" class="pg-watchlist-item" :style="item.isDangerous ? { border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.02)' } : {}">
                <div class="pg-watchlist-item-head">
                  <div>
                    <span class="pg-watchlist-symbol">{{ item.symbol }}</span>
                    <span class="pg-watchlist-name">{{ item.name }}</span>
                  </div>
                  <span class="pg-watchlist-price">{{ item.price }}</span>
                </div>

                <!-- Symbol Performance Metrics -->
                <div style="font-size: 11px; display: flex; gap: 10px; color: var(--lf-text-muted); margin-bottom: 2px;">
                  <span>Win Rate: <b :style="{ color: item.winRate >= 50 ? 'var(--lf-success)' : 'var(--lf-text-soft)' }">{{ item.winRate.toFixed(0) }}%</b></span>
                  <span>Avg R: <b :style="{ color: item.avgR >= 0 ? 'var(--lf-success)' : 'var(--lf-danger)' }">{{ item.avgR.toFixed(2) }}R</b></span>
                  <span>Trades: <b>{{ item.totalTrades }}</b></span>
                </div>

                <!-- Dangerous tag warning -->
                <div v-if="item.isDangerous" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
                  <span>⚠️</span> {{ locale === 'vi' ? 'CẢNH BÁO TÂM LÝ (THUA ĐẬM)' : 'EMOTION ALERT (HEAVY LOSS)' }}
                </div>

                <div class="pg-watchlist-calc-row">
                  <label>
                    <span>Risk per trade %</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0.1" 
                      max="10" 
                      :value="item.riskPercent"
                      @input="setWatchlistRisk(item.symbol, $event.target.value)"
                    />
                  </label>
                  <label>
                    <span>Stop Loss (pips)</span>
                    <input 
                      type="number" 
                      min="1" 
                      :value="item.baseSl"
                      @input="setWatchlistSl(item.symbol, $event.target.value)"
                    />
                  </label>
                </div>

                <div class="pg-watchlist-lot-result">
                  <span>{{ locale === 'vi' ? 'Khối lượng gợi ý:' : 'Suggested Lot:' }}</span>
                  <strong :style="{ color: item.isDangerous ? 'var(--lf-danger)' : 'var(--lf-success)' }">{{ calcSuggestedLot(item) }} Lot</strong>
                </div>

                <!-- Tiltmeter / Emotion Tag -->
                <div class="pg-tiltmeter">
                  <button 
                    class="pg-tilt-btn pg-tilt-btn--calm" 
                    :class="{ active: item.currentEmotion === 'Calm' }"
                    @click="setEmotion(item.symbol, 'Calm')"
                  >
                    😊 {{ locale === 'vi' ? 'Bình Tĩnh' : 'Calm' }}
                  </button>
                  <button 
                    class="pg-tilt-btn pg-tilt-btn--fomo" 
                    :class="{ active: item.currentEmotion === 'FOMO' }"
                    @click="setEmotion(item.symbol, 'FOMO')"
                  >
                    ⚡ FOMO
                  </button>
                  <button 
                    class="pg-tilt-btn pg-tilt-btn--revenge" 
                    :class="{ active: item.currentEmotion === 'Revenge' }"
                    @click="setEmotion(item.symbol, 'Revenge')"
                  >
                    🔥 {{ locale === 'vi' ? 'Trả Thù' : 'Revenge' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Warning if FOMO/Revenge active -->
            <div v-if="watchlistHasTilt" class="pg-alert-card pg-card--critical" style="margin-top: 14px; padding: 14px 18px; border-radius: 16px;">
              <h4 style="margin: 0 0 6px; color: var(--lf-danger); font-size: 14px; font-weight: 900; text-transform: uppercase; display: flex; align-items: center; gap: 8px;">
                <span>⚠️</span>
                {{ locale === 'vi' ? 'CẢNH BÁO TÂM LÝ KHẨN CẤP (AI SHIELD)' : 'AI PSYCHOLOGY SHIELD WARNING' }}
              </h4>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: var(--lf-text-soft);">
                {{ locale === 'vi' ? 'Phát hiện trạng thái tâm lý không ổn định (FOMO hoặc Muốn trả thù thị trường)! Bạn đang giao dịch dưới tác động của cảm xúc cực đoan. Hãy RỜI KHỎI MÀN HÌNH MÁY TÍNH ngay lập tức, hệ thống khuyên bạn tạm nghỉ ít nhất 30 phút để bình tĩnh lại.' : 'AI detected unstable emotional state (FOMO or Revenge Trading active)! You are trading under high emotional stress. Switch off your charts and STEP AWAY from your desk immediately. Take a 30-minute break.' }}
              </p>
            </div>
          </article>

          <OpenPositionRiskTable :positions="evaluation.openPositionRisks" />

          <section class="pg-grid-2 pg-tight-grid">
            <SafeLotCalculator :result="safeLot" />
            <article class="pg-card pg-decision-card" :class="`pg-card--${commandCenter.shouldTradeNow.tone}`">
              <div class="pg-card-head">
                <div>
                  <span class="pg-kicker">{{ pgT('dashboard.decisionEngine') }}</span>
                  <h3>{{ pgText(commandCenter.shouldTradeNow.title) }}</h3>
                </div>
                <strong>{{ decisionLabel(commandCenter.shouldTradeNow.answer) }}</strong>
              </div>
              <p>{{ pgText(commandCenter.shouldTradeNow.summary) }}</p>
              <ul class="pg-compact-list">
                <li v-for="reason in commandCenter.shouldTradeNow.reasons" :key="reason">{{ pgText(reason) }}</li>
              </ul>
              <div class="pg-alert-card__action">
                <span>{{ pgT('common.action') }}</span>
                <strong>{{ pgText(commandCenter.shouldTradeNow.action) }}</strong>
              </div>
            </article>
          </section>

          <article class="pg-card pg-pass-card">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.mockMonteCarlo') }}</span>
                <h3>{{ pgT('dashboard.passProbability') }}</h3>
              </div>
              <strong>{{ evaluation.passProbability.score }}%</strong>
            </div>
            <div class="pg-progress-track">
              <span :style="{ width: `${Math.min(100, evaluation.passProbability.score)}%` }"></span>
            </div>
            <div class="pg-pass-grid">
              <div>
                <span>{{ pgT('dashboard.band') }}</span>
                <strong>{{ bandLabel(evaluation.passProbability.band) }}</strong>
              </div>
              <div>
                <span>{{ pgT('dashboard.paths') }}</span>
                <strong>{{ evaluation.passProbability.paths }}</strong>
              </div>
              <div>
                <span>{{ pgT('dashboard.failRate') }}</span>
                <strong>{{ evaluation.passProbability.failRate }}%</strong>
              </div>
            </div>
            <p>{{ pgText(evaluation.passProbability.disclaimer) }}</p>
          </article>
        </section>

        <aside class="pg-command-column pg-command-column--right">
          <article class="pg-card pg-alert-list">
            <div class="pg-card-head">
              <div>
                <span class="pg-kicker">{{ pgT('dashboard.aiGuardian') }}</span>
                <h3>{{ pgT('dashboard.protectionFeed') }}</h3>
              </div>
              <strong>{{ alerts.length }}</strong>
            </div>
            <GuardianAlertCard v-for="alert in alerts.slice(0, 4)" :key="alert.id" :alert="alert" />
            <p v-if="!alerts.length" class="pg-empty">{{ pgT('common.noActiveAlerts') }}</p>
          </article>

          <article class="pg-card pg-best-action" :class="`pg-card--${commandCenter.oneBestAction.tone}`">
            <span class="pg-kicker">{{ pgT('dashboard.oneBestAction') }}</span>
            <h3>{{ pgText(commandCenter.oneBestAction.title) }}</h3>
            <p>{{ pgText(commandCenter.oneBestAction.action) }}</p>
            <small>{{ pgText(commandCenter.oneBestAction.why) }}</small>
          </article>

          <TaskcareChecklist
            :title="pgT('dashboard.taskcareCommandList')"
            :tasks="taskcareTasks.slice(0, 7)"
            @update-status="updateTaskStatus"
          />

          <EmergencyStopPanel :risk-mode="evaluation.riskMode" />

          <article class="pg-card pg-killer-card">
            <span class="pg-kicker">{{ pgT('dashboard.challengeKillersKicker') }}</span>
            <h3>{{ pgT('dashboard.challengeKillers') }}</h3>
            <div class="pg-killer-list">
              <div v-for="killer in commandCenter.challengeKillers" :key="killer.title" :class="`pg-killer--${killer.severity}`">
                <strong>{{ pgText(killer.title) }}</strong>
                <span>{{ pgText(killer.evidence) }}</span>
                <small>{{ pgText(killer.action) }}</small>
              </div>
            </div>
          </article>

          <article class="pg-card pg-preserve-card" :class="`pg-card--${commandCenter.capitalPreservation.tone}`">
            <span class="pg-kicker">{{ pgT('dashboard.fundedProtection') }}</span>
            <h3>{{ pgText(commandCenter.capitalPreservation.title) }}</h3>
            <p>{{ pgText(commandCenter.capitalPreservation.reason) }}</p>
            <ul class="pg-compact-list">
              <li v-for="item in commandCenter.capitalPreservation.plan" :key="item">{{ pgText(item) }}</li>
            </ul>
          </article>
        </aside>
      </section>

      <!-- Hướng dẫn sử dụng cho người dùng (User Guidelines) -->
      <section class="pg-guide-section">
        <h3 style="margin: 0 0 10px; font-weight: 900; color: var(--lf-text); display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">📘</span>
          {{ locale === 'vi' ? 'Hướng Dẫn Quản Lý Quỹ & Giữ Kỷ Luật Trong Lúc Thi Quỹ' : 'Prop Firm Challenge Discipline & Operation Guide' }}
        </h3>
        <p style="margin: 0 0 16px; font-size: 13px; color: var(--lf-text-muted); line-height: 1.5;">
          {{ locale === 'vi' ? 'Khi thi tuyển quỹ prop firm, việc kiểm soát tâm lý và tuân thủ các mốc sụt giảm là yếu tố sống còn quyết định đỗ hay trượt. Dưới đây là cách sử dụng hệ thống này để bảo vệ tài khoản của bạn:' : 'During a prop firm evaluation, managing emotions and strictly respecting drawdown thresholds determines your success. Here is how to operate this guardian system to secure your funded account:' }}
        </p>
        
        <div class="pg-guide-grid">
          <div class="pg-guide-card">
            <h4 style="font-size: 13px; text-transform: uppercase;">{{ locale === 'vi' ? '1. Thanh Trạng Trạng Thái Khẩn Cấp' : '1. Emergency Status Bar' }}</h4>
            <p>{{ locale === 'vi' ? 'Màn hình khẩn cấp luôn đập vào mắt trên cùng. Màu xanh là tài khoản an toàn, màu vàng là tiệm cận nguy cơ vi phạm (cần giảm volume lập tức), màu đỏ là vi phạm hoặc khóa lệnh (Lockdown).' : 'Always visible at the top. Green means account is safe, yellow warns of approaching violations (decrease size now), and red alerts to lockdowns or violations.' }}</p>
          </div>
          <div class="pg-guide-card">
            <h4 style="font-size: 13px; text-transform: uppercase;">{{ locale === 'vi' ? '2. Bảng Chỉ Số Sinh Tử' : '2. Survival Dashboard' }}</h4>
            <p>{{ locale === 'vi' ? 'Xem nhanh khoảng cách đến mức Drawdown tối đa (Max Drawdown Distance) bằng tiền mặt và hạn mức lỗ ngày còn lại. Giúp trader kiểm soát rủi ro tức thì trước khi quá muộn.' : 'Displays your remaining cash buffer to Max Drawdown floor and remaining daily loss. Keeps you instantly aware of critical capital thresholds.' }}</p>
          </div>
          <div class="pg-guide-card">
            <h4 style="font-size: 13px; text-transform: uppercase;">{{ locale === 'vi' ? '3. Watchlist & Tự Tính Lot Size' : '3. Watchlist & Lot Calculator' }}</h4>
            <p>{{ locale === 'vi' ? 'Nhập Risk% mong muốn và Stop Loss mong muốn (theo Pips). Hệ thống AI tự quét hạn mức Daily Loss còn lại để xuất Lot size an toàn cho lệnh tiếp theo của bạn.' : 'Input your planned Risk% and Stop Loss in pips. The AI scans your daily remaining buffer to calculate the exact safe Lot size for your next order.' }}</p>
          </div>
          <div class="pg-guide-card">
            <h4 style="font-size: 13px; text-transform: uppercase;">{{ locale === 'vi' ? '4. Nút Ghi Chú Tâm Lý (Tiltmeter)' : '4. Tiltmeter Psychological Check' }}</h4>
            <p>{{ locale === 'vi' ? 'Click ghi chú cảm xúc trước khi vào lệnh. Nếu click "FOMO" hoặc "Trả Thù" (Revenge), hệ thống AI Shield sẽ kích hoạt cảnh báo đỏ nguy hiểm yêu cầu bạn tắt máy tính và rời màn hình.' : 'Tag your emotion before taking a trade. Selecting "FOMO" or "Revenge" triggers the AI Shield with a critical danger alert advising you to step away.' }}</p>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import DrawdownGauge from '../components/DrawdownGauge.vue'
import EmergencyStopPanel from '../components/EmergencyStopPanel.vue'
import GuardianAlertCard from '../components/GuardianAlertCard.vue'
import OpenPositionRiskTable from '../components/OpenPositionRiskTable.vue'
import ProfitTargetProgress from '../components/ProfitTargetProgress.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import RiskModeBadge from '../components/RiskModeBadge.vue'
import SafeLotCalculator from '../components/SafeLotCalculator.vue'
import TaskcareChecklist from '../components/TaskcareChecklist.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const {
  accounts,
  accountId,
  setAccount,
  liveAccount,
  evaluation,
  alerts,
  commandCenter,
  safeLot,
  todayStats,
  taskcareTasks,
  updateTaskStatus,
  snapshots,
  dataSource,
  liveError,
  lastSyncAt,
  mt5Status,
  isLivePolling,
  isLoadingLive,
  loadLiveData,
  watchlist,
  sortedWatchlist,
  hideDangerousAssets,
  currentRole,
  setEmotion,
  setWatchlistSl,
  setWatchlistRisk,
  selectedChallenge
} = usePropGuardian()

const {
  locale,
  pgT,
  pgText,
  riskModeLabel,
  statusLabel,
  dailyLossModeLabel,
  drawdownTypeLabel,
  decisionLabel,
  bandLabel,
  healthLabel
} = usePropGuardianI18n()

const chartGrid = [42, 92, 142, 192]

const completedTradingDays = computed(() => {
  const historic = snapshots.value.filter((s) => Number(s.totalTrades || 0) > 0).length
  const tradedToday = todayStats.value.tradesToday > 0 ? 1 : 0
  return historic + tradedToday
})

const filteredWatchlist = computed(() => {
  if (hideDangerousAssets.value) {
    return sortedWatchlist.value.filter(item => !item.isDangerous)
  }
  return sortedWatchlist.value
})

const watchlistHasTilt = computed(() => {
  return sortedWatchlist.value.some((item) => item.currentEmotion === 'FOMO' || item.currentEmotion === 'Revenge')
})

function calcSuggestedLot(item) {
  const dailyRemaining = evaluation.value.dailyLoss.remaining || 0
  if (dailyRemaining <= 0) return '0.00'
  const cashRisk = dailyRemaining * (Number(item.riskPercent || 1.0) / 100)
  const pipVal = item.symbol === 'XAUUSD' ? 10 : (item.symbol === 'EURUSD' || item.symbol === 'GBPUSD' ? 10 : 1)
  const totalRiskPerLot = Number(item.baseSl || 50) * pipVal
  if (totalRiskPerLot <= 0) return '0.00'
  return Math.max(0.01, cashRisk / totalRiskPerLot).toFixed(2)
}

const equityValues = computed(() => {
  const rows = snapshots.value.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const values = rows.map((row) => Number(row.endEquity || row.endBalance || 0)).filter(Boolean)
  return values.length ? values : [Number(liveAccount.value.currentEquity || 0)]
})

const equityLinePoints = computed(() => buildChartPoints(equityValues.value))
const equityAreaPoints = computed(() => {
  const points = buildChartPoints(equityValues.value)
  return points ? `0,226 ${points} 720,226` : ''
})

function buildChartPoints(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(1, max - min)
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 720 : (index / (values.length - 1)) * 720
      const y = 226 - ((value - min) / spread) * 190
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function signedMoney(value) {
  const number = Number(value || 0)
  return `${number >= 0 ? '+' : '-'}$${Math.abs(number).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function dateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString(locale.value === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' })
}

function riskToneClass(mode) {
  if (mode === 'LOCKDOWN') return 'pg-card--critical'
  if (mode === 'DANGER') return 'pg-card--danger'
  if (mode === 'CAUTION') return 'pg-card--warning'
  return 'pg-card--success'
}
</script>
