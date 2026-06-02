<template>
  <section class="nftx-page">
    <div class="nftx-wrap">
      <header class="nftx-header">
        <div class="header-left">
          <RouterLink class="back-btn" to="/dashboard">←</RouterLink>
          <div>
            <p class="header-kicker">NFT PROFILE</p>
            <h1>{{ locale === 'vi' ? 'Hồ sơ NFT Trader' : 'Trader NFT Profile' }}</h1>
            <p class="header-sub">
              {{
                locale === 'vi'
                  ? 'Hồ sơ hành vi giao dịch, điểm xếp hạng và xác thực blockchain cho từng trader.'
                  : 'Trading behavior profile, ranking score, and blockchain verification for each trader.'
              }}
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn ghost" type="button" @click="guideOpen = true">
            {{ locale === 'vi' ? 'Hướng dẫn sử dụng' : 'How to use' }}
          </button>
          <button class="btn ghost" type="button" :disabled="loading" @click="loadProfile">
            {{ loading ? (locale === 'vi' ? 'Đang tải...' : 'Loading...') : (locale === 'vi' ? 'Làm mới' : 'Refresh') }}
          </button>
          <button class="btn verify" type="button" @click="verifyOnChain">
            {{ locale === 'vi' ? 'Verify on Blockchain' : 'Verify on Blockchain' }}
          </button>
        </div>
      </header>

      <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>
      <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

      <article class="nftx-card">
        <div class="card-ribbon" :class="{ active: profile.nft.isActive }">
          {{ profile.nft.isActive ? 'VERIFIED' : 'PENDING' }}
        </div>

        <section class="hero-section">
          <div class="avatar-column">
            <div class="avatar-frame">
              <img :src="displayImage" alt="NFT avatar" />
            </div>
            <div class="avatar-actions">
              <input ref="avatarInputRef" class="hidden-input" type="file" accept="image/*" @change="onAvatarSelected" />
              <button class="btn ghost small" type="button" @click="pickAvatar">
                {{ locale === 'vi' ? 'Thêm ảnh đại diện' : 'Add profile image' }}
              </button>
              <button class="btn ghost small" type="button" :disabled="!localAvatarData" @click="clearLocalAvatar">
                {{ locale === 'vi' ? 'Xóa ảnh' : 'Remove image' }}
              </button>
            </div>
            <small>{{ avatarHint }}</small>
          </div>

          <div class="identity-column">
            <p class="brand-name">LUMINAFOX</p>
            <h2>
              {{ rankLabel }}
              <span class="diamond">◆</span>
            </h2>
            <p class="tier-line">
              {{ locale === 'vi' ? `Top ${percentile}% Trader` : `Top ${percentile}% Trader` }}
            </p>
            <p class="mint-line">
              {{ locale === 'vi' ? 'NFT Minted on' : 'NFT Minted on' }}
              <span>{{ mintedDateLabel }}</span>
            </p>

            <div class="score-row">
              <article class="score-box pink">
                <p>{{ locale === 'vi' ? 'Behavior Score' : 'Behavior Score' }}</p>
                <div class="score-value">{{ behaviorScore }}<span>/100</span></div>
                <small>{{ locale === 'vi' ? behaviorRemarkVi : behaviorRemarkEn }}</small>
              </article>
              <article class="score-box gold">
                <p>{{ locale === 'vi' ? 'Trust Score' : 'Trust Score' }}</p>
                <div class="score-value">{{ trustScore }}<span>/100</span></div>
                <small>{{ locale === 'vi' ? trustRemarkVi : trustRemarkEn }}</small>
              </article>
            </div>
          </div>
        </section>

        <section class="performance-section">
          <h3>Performance</h3>
          <div class="performance-grid">
            <article v-for="item in performanceCards" :key="item.key" class="perf-item">
              <div class="perf-ring" :style="ringStyle(item.value, item.color)">
                <div class="perf-ring-inner">
                  <strong>{{ item.display }}</strong>
                </div>
              </div>
              <p>{{ item.label }}</p>
              <small>{{ item.note }}</small>
            </article>

            <article class="equity-item">
              <div class="equity-head">
                <h4>Equity Curve</h4>
                <span>1Y</span>
              </div>
              <svg class="equity-svg" viewBox="0 0 320 160" preserveAspectRatio="none" aria-label="Equity curve">
                <path :d="equityAreaPath" class="equity-area"></path>
                <path :d="equityPath" class="equity-line"></path>
              </svg>
            </article>
          </div>
        </section>

        <section class="insight-section">
          <h3>Quick Insight</h3>
          <div class="insight-grid">
            <article v-for="insight in quickInsights" :key="insight.title" class="insight-item">
              <span class="insight-icon">{{ insight.icon }}</span>
              <div>
                <h4>{{ insight.title }}</h4>
                <p>{{ insight.body }}</p>
              </div>
            </article>
          </div>
        </section>

        <section class="chain-section">
          <div class="chain-left">
            <h3>Verified on Blockchain</h3>
            <p>
              Network:
              <span>{{ (profile.nft.chain || 'cardano').toUpperCase() }}</span>
              · Token Standard:
              <span>ERC-721</span>
            </p>
            <p class="chain-hash">
              {{ profile.blockchain.latestTxHash || profile.nft.mintedTxHash || '--' }}
            </p>
          </div>
          <div class="chain-right">
            <span class="confirm-chip">CONFIRMED</span>
            <button class="btn ghost small" type="button" @click="copyTxHash">
              {{ locale === 'vi' ? 'Copy TX' : 'Copy TX' }}
            </button>
          </div>
        </section>
      </article>

      <section class="settings-grid">
        <article class="settings-card">
          <h3>{{ locale === 'vi' ? 'Cài đặt hồ sơ NFT' : 'NFT Profile Settings' }}</h3>
          <label class="field">
            <span>{{ locale === 'vi' ? 'Tên NFT' : 'NFT Name' }}</span>
            <input v-model.trim="form.nftName" placeholder="LuminaFox Diamond Trader" />
          </label>
          <label class="field">
            <span>{{ locale === 'vi' ? 'Ví Cardano' : 'Cardano Wallet' }}</span>
            <input v-model.trim="form.walletAddress" placeholder="addr1..." />
          </label>
          <div class="wallet-help">
            <div class="wallet-help-head">
              <strong>{{ locale === 'vi' ? 'Ví Cardano là gì?' : 'What is a Cardano wallet?' }}</strong>
              <button type="button" @click="walletHelpOpen = !walletHelpOpen">
                {{ walletHelpOpen ? (locale === 'vi' ? 'Ẩn' : 'Hide') : (locale === 'vi' ? 'Hiện' : 'Show') }}
              </button>
            </div>
            <div v-if="walletHelpOpen" class="wallet-help-body">
              <p>
                {{
                  locale === 'vi'
                    ? 'Đây là địa chỉ ví blockchain để hệ thống gắn NFT profile của bạn. Địa chỉ thường bắt đầu bằng addr1...'
                    : 'This is your blockchain address where your NFT profile is linked. It usually starts with addr1...'
                }}
              </p>
              <ul>
                <li>
                  {{ locale === 'vi' ? 'Nếu chưa có ví, bấm "Mở hướng dẫn tạo ví".' : 'If you do not have a wallet yet, click "Open wallet guide".' }}
                </li>
                <li>
                  {{ locale === 'vi' ? 'Sau khi nhập ví, bấm "Kiểm tra ví" để tra cứu trên CardanoScan.' : 'After entering wallet address, click "Verify wallet" on CardanoScan.' }}
                </li>
              </ul>
            </div>
            <div class="wallet-status" :class="walletInputState.tone">
              {{ walletInputState.text }}
            </div>
            <div class="wallet-help-actions">
              <button class="btn ghost small" type="button" @click="openWalletGuide">
                {{ locale === 'vi' ? 'Mở hướng dẫn tạo ví' : 'Open wallet guide' }}
              </button>
              <button class="btn ghost small" type="button" :disabled="!isWalletLikelyValid" @click="openWalletExplorer">
                {{ locale === 'vi' ? 'Kiểm tra ví trên CardanoScan' : 'Verify wallet on CardanoScan' }}
              </button>
            </div>
          </div>
          <label class="field">
            <span>{{ locale === 'vi' ? 'Ảnh URL (tuỳ chọn)' : 'Image URL (optional)' }}</span>
            <input v-model.trim="form.nftImageUrl" placeholder="https://..." />
          </label>
          <div class="actions">
            <button class="btn ghost" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? (locale === 'vi' ? 'Đang lưu...' : 'Saving...') : (locale === 'vi' ? 'Lưu profile' : 'Save profile') }}
            </button>
            <button class="btn primary" type="button" :disabled="minting" @click="mintNft">
              {{ minting ? (locale === 'vi' ? 'Đang mint...' : 'Minting...') : (locale === 'vi' ? 'Mint NFT' : 'Mint NFT') }}
            </button>
          </div>
          <small class="field-note">
            {{
              locale === 'vi'
                ? 'Mẹo: Bạn có thể tải ảnh đại diện trực tiếp ở phần trên, không bắt buộc phải có URL.'
                : 'Tip: You can upload profile image above, URL is optional.'
            }}
          </small>
        </article>

        <article class="settings-card">
          <h3>{{ locale === 'vi' ? 'Quy chế tính điểm rank' : 'Rank Scoring Rules' }}</h3>
          <ul class="rules">
            <li>
              {{ locale === 'vi' ? 'Behavior Score và Discipline là trọng số chính để tính điểm rank.' : 'Behavior Score and Discipline are primary ranking weights.' }}
            </li>
            <li>
              {{ locale === 'vi' ? 'Nhat ky giao dich ro rang va RR tot se cong diem ben vung.' : 'Clear trading journal data and healthy RR add stable points.' }}
            </li>
            <li>
              {{ locale === 'vi' ? 'Vi pham hard-rule va hanh vi rui ro cao se tru diem manh.' : 'Hard-rule violations and high-risk behavior trigger strong penalties.' }}
            </li>
            <li>
              {{ locale === 'vi' ? 'NFT đã mint + xác thực blockchain giúp tăng độ tin cậy và bonus rank.' : 'Minted NFT + blockchain verification improves trust and ranking bonus.' }}
            </li>
          </ul>
          <div class="rule-stats">
            <div>
              <span>{{ locale === 'vi' ? 'Điểm rank' : 'Rank Points' }}</span>
              <strong>{{ profile.rank.totalPoints || 0 }}</strong>
            </div>
            <div>
              <span>{{ locale === 'vi' ? 'Tỷ lệ xác thực' : 'Verify Ratio' }}</span>
              <strong>{{ Number(profile.blockchain.verifyRatio || 0).toFixed(2) }}%</strong>
            </div>
          </div>
        </article>
      </section>

      <button class="share-btn" type="button" @click="shareProfile">
        {{ locale === 'vi' ? 'Chia sẻ hồ sơ' : 'Share Profile' }}
      </button>
    </div>

    <div class="guide-overlay" :class="{ open: guideOpen }" @click.self="guideOpen = false">
      <article class="guide-card">
        <header>
          <h3>{{ locale === 'vi' ? 'Hướng dẫn sử dụng NFT Profile' : 'NFT Profile Guide' }}</h3>
          <button type="button" @click="guideOpen = false">×</button>
        </header>
        <ol>
          <li>
            {{ locale === 'vi' ? 'Bước 1: Điền tên NFT và ví Cardano ở phần Cài đặt hồ sơ NFT.' : 'Step 1: Fill NFT name and Cardano wallet in profile settings.' }}
          </li>
          <li>
            {{ locale === 'vi' ? 'Bước 2: Thêm ảnh đại diện bằng nút "Thêm ảnh đại diện" hoặc nhập URL ảnh.' : 'Step 2: Add profile image via upload button or image URL.' }}
          </li>
          <li>
            {{ locale === 'vi' ? 'Bước 3: Bấm "Lưu profile" để cập nhật dữ liệu hồ sơ.' : 'Step 3: Click "Save profile" to update profile data.' }}
          </li>
          <li>
            {{ locale === 'vi' ? 'Bước 4: Bấm "Mint NFT" để kích hoạt NFT on-chain và cộng điểm rank.' : 'Step 4: Click "Mint NFT" to activate on-chain NFT and rank bonus.' }}
          </li>
          <li>
            {{ locale === 'vi' ? 'Bước 5: Dùng "Verify on Blockchain" để kiểm tra TX hash xác thực.' : 'Step 5: Use "Verify on Blockchain" to check verification TX hash.' }}
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { apiRequest } from '../../lib/api.js'
import { useUserStore } from '../../stores/useUserStore.js'
import { useI18n } from '../../composables/useI18n.js'

const userStore = useUserStore()
const { locale } = useI18n()

const loading = ref(false)
const saving = ref(false)
const minting = ref(false)
const guideOpen = ref(false)
const walletHelpOpen = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const avatarInputRef = ref(null)
const localAvatarData = ref('')

const profile = reactive({
  rank: {
    totalPoints: 0,
    basePoints: 0,
    bonusPoints: 0,
    tier: 'bronze',
    tierLabelVi: 'Đồng',
    tierLabelEn: 'Bronze',
    nextTier: null,
    nextTierLabelVi: null,
    nextTierLabelEn: null,
    progressPct: 0,
    pointsToNext: 0
  },
  nft: {
    isActive: false,
    nftName: '',
    nftImageUrl: '',
    walletAddress: '',
    walletMasked: '--',
    chain: 'cardano',
    contractAddress: 'addr1q9...5k2m7v',
    tokenId: '',
    rarity: 'standard',
    mintedTxHash: '',
    mintedAt: null
  },
  checklist: {
    count: 0,
    avgBehaviorScore: 0,
    avgEmotionScore: 0,
    avgPlanScore: 0,
    avgRR: 0,
    canTradeRate: 0,
    blockedCount: 0,
    lastChecklistAt: null
  },
  blockchain: {
    total: 0,
    verified: 0,
    unverified: 0,
    verifyRatio: 0,
    latestChecklistAt: null,
    latestProofHash: '',
    latestTxHash: '',
    latestBlock: '',
    latestTime: ''
  },
  analysis: {
    behaviorScore: 0,
    behaviorRiskScore: 0,
    behaviorLabel: '',
    disciplineRate: 0,
    winRate: 0,
    profitFactor: 0,
    rr: 0
  }
})

const form = reactive({
  nftName: '',
  walletAddress: '',
  nftImageUrl: ''
})

const authHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))

const fallbackImage = computed(() => {
  const tier = String(profile.rank.tier || 'bronze').toLowerCase()
  return `https://images.luminafox.app/nft/${tier}.png`
})

const displayImage = computed(() => localAvatarData.value || form.nftImageUrl || profile.nft.nftImageUrl || fallbackImage.value)

const rankLabel = computed(() => {
  const label = locale.value === 'vi' ? profile.rank.tierLabelVi : profile.rank.tierLabelEn
  return String(label || profile.rank.tier || 'BRONZE').toUpperCase()
})

const percentile = computed(() => {
  const points = Number(profile.rank.totalPoints || 0)
  const seed = Math.max(1, Math.min(40, Math.round(points / 150)))
  return Math.max(1, Math.min(99, seed))
})

const mintedDateLabel = computed(() => {
  if (!profile.nft.mintedAt) return '--/--/----'
  const dt = new Date(profile.nft.mintedAt)
  if (Number.isNaN(dt.getTime())) return '--/--/----'
  return dt.toLocaleDateString(locale.value === 'vi' ? 'vi-VN' : 'en-US')
})

const behaviorScore = computed(() => Math.max(0, Math.min(100, Math.round(Number(profile.analysis.behaviorScore || 0)))))

const trustScore = computed(() => {
  const verify = Number(profile.blockchain.verifyRatio || 0)
  const discipline = Number(profile.analysis.disciplineRate || profile.analysis.behaviorScore || 0)
  const risk = Number(profile.analysis.behaviorRiskScore || 0)
  const trust = verify * 0.55 + discipline * 0.25 + Math.max(0, 100 - risk) * 0.2
  return Math.max(0, Math.min(100, Math.round(trust)))
})

const behaviorRemarkVi = computed(() => (behaviorScore.value >= 80 ? 'Kỷ luật cao' : behaviorScore.value >= 60 ? 'Ổn định' : 'Cần cải thiện'))
const behaviorRemarkEn = computed(() => (behaviorScore.value >= 80 ? 'High discipline' : behaviorScore.value >= 60 ? 'Stable' : 'Needs improvement'))
const trustRemarkVi = computed(() => (trustScore.value >= 80 ? 'Độ tin cậy cao' : trustScore.value >= 60 ? 'Tin cậy trung bình' : 'Tin cậy thấp'))
const trustRemarkEn = computed(() => (trustScore.value >= 80 ? 'High trust' : trustScore.value >= 60 ? 'Moderate trust' : 'Low trust'))

const drawdownEstimate = computed(() => {
  const risk = Number(profile.analysis.behaviorRiskScore || 0)
  return Math.max(1, Math.min(40, Number((risk / 4).toFixed(1))))
})

const totalReturn = computed(() => {
  const points = Number(profile.rank.totalPoints || 0)
  return Math.max(0, Number(((points / 1200) * 100).toFixed(1)))
})

const performanceCards = computed(() => [
  {
    key: 'winrate',
    label: 'Winrate',
    display: `${Number(profile.analysis.winRate || 0).toFixed(0)}%`,
    value: Math.max(0, Math.min(100, Number(profile.analysis.winRate || 0))),
    note:
      locale.value === 'vi'
        ? `${Math.round((Number(profile.analysis.winRate || 0) / 100) * 120)}W / ${Math.round((1 - Number(profile.analysis.winRate || 0) / 100) * 80)}L`
        : `${Math.round((Number(profile.analysis.winRate || 0) / 100) * 120)}W / ${Math.round((1 - Number(profile.analysis.winRate || 0) / 100) * 80)}L`,
    color: '#ff56bd'
  },
  {
    key: 'drawdown',
    label: 'Max Drawdown',
    display: `${drawdownEstimate.value}%`,
    value: Math.max(0, Math.min(100, drawdownEstimate.value * 3)),
    note: locale.value === 'vi' ? 'Rủi ro theo hành vi' : 'Behavior risk based',
    color: '#9e74ff'
  },
  {
    key: 'return',
    label: 'Total Return',
    display: `+${totalReturn.value}%`,
    value: Math.max(0, Math.min(100, totalReturn.value)),
    note: locale.value === 'vi' ? 'Từ đầu năm' : 'Year-to-date',
    color: '#45f6ad'
  }
])

function generateEquitySeries() {
  const base = 100
  const moodBoost = behaviorScore.value / 20
  const riskDrag = Number(profile.analysis.behaviorRiskScore || 0) / 18
  const step = Math.max(0.6, 2.1 + moodBoost - riskDrag)
  const series = [base]
  for (let i = 1; i < 12; i += 1) {
    const jitter = ((i % 2 === 0 ? 1 : -1) * (2 + (i % 3))) / 2.8
    series.push(Number((series[i - 1] + step + jitter).toFixed(2)))
  }
  return series
}

const equitySeries = computed(generateEquitySeries)

function buildSvgPath(values, width = 320, height = 160, padding = 12) {
  if (!Array.isArray(values) || values.length < 2) return `M ${padding} ${height - padding}`
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2)
      const y = height - padding - ((value - min) / span) * (height - padding * 2)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

const equityPath = computed(() => buildSvgPath(equitySeries.value))
const equityAreaPath = computed(() => {
  const line = buildSvgPath(equitySeries.value)
  const width = 320
  const height = 160
  return `${line} L ${width - 12} ${height - 10} L 12 ${height - 10} Z`
})

const quickInsights = computed(() => [
  {
    icon: '◎',
    title: locale.value === 'vi' ? 'Kỷ luật cao' : 'Strong discipline',
    body:
      locale.value === 'vi'
        ? `Ky luat giao dich ${Number(profile.analysis.disciplineRate || behaviorScore.value || 0).toFixed(1)}%, ke hoach giao dich on dinh.`
        : `Trading discipline ${Number(profile.analysis.disciplineRate || behaviorScore.value || 0).toFixed(1)}%, stable trading plan.`
  },
  {
    icon: '◈',
    title: locale.value === 'vi' ? 'Rủi ro kiểm soát tốt' : 'Risk under control',
    body:
      locale.value === 'vi'
        ? `Drawdown hành vi ~${drawdownEstimate.value}% và Profit Factor ${Number(profile.analysis.profitFactor || 0).toFixed(2)}.`
        : `Behavior drawdown ~${drawdownEstimate.value}% and Profit Factor ${Number(profile.analysis.profitFactor || 0).toFixed(2)}.`
  },
  {
    icon: '◉',
    title: locale.value === 'vi' ? 'Theo dõi cảm xúc' : 'Emotion tracking',
    body:
      locale.value === 'vi'
        ? `Behavior score ${behaviorScore.value}/100. Duy trì RR trung bình 1:${Number(profile.analysis.rr || 0).toFixed(2)} để giữ form.`
        : `Behavior score ${behaviorScore.value}/100. Keep average RR at 1:${Number(profile.analysis.rr || 0).toFixed(2)}.`
  }
])

const avatarHint = computed(() =>
  locale.value === 'vi'
    ? 'Ảnh đại diện bạn tải lên sẽ ưu tiên hiển thị trên NFT Profile.'
    : 'Uploaded profile image will be prioritized on NFT Profile.'
)

const walletInput = computed(() => String(form.walletAddress || '').trim())

const isWalletLikelyValid = computed(() => {
  if (!walletInput.value) return false
  return /^(addr1|stake1)[0-9a-z]{20,}$/i.test(walletInput.value)
})

const walletInputState = computed(() => {
  if (!walletInput.value) {
    return {
      tone: 'neutral',
      text:
        locale.value === 'vi'
          ? 'Bạn chưa nhập ví Cardano. Có thể lưu profile trước, nhưng cần ví hợp lệ để Mint NFT.'
          : 'No Cardano wallet entered yet. You can save profile first, but valid wallet is required for Mint.'
    }
  }
  if (!isWalletLikelyValid.value) {
    return {
      tone: 'bad',
      text:
        locale.value === 'vi'
          ? 'Địa chỉ ví chưa đúng định dạng. Ví Cardano thường bắt đầu bằng addr1...'
          : 'Wallet format looks invalid. A Cardano wallet usually starts with addr1...'
    }
  }
  return {
    tone: 'good',
    text:
      locale.value === 'vi'
        ? 'Định dạng ví hợp lệ. Bạn có thể mint NFT và xác minh blockchain.'
        : 'Wallet format looks valid. You can mint NFT and verify on blockchain.'
  }
})

function avatarStorageKey() {
  const uid = userStore.user?.id || userStore.userName || 'guest'
  return `luminafox_nft_avatar_${String(uid)}`
}

function loadLocalAvatar() {
  try {
    const cached = localStorage.getItem(avatarStorageKey())
    if (cached && cached.startsWith('data:image/')) {
      localAvatarData.value = cached
    }
  } catch {
    localAvatarData.value = ''
  }
}

function persistLocalAvatar(dataUrl) {
  try {
    localStorage.setItem(avatarStorageKey(), dataUrl)
  } catch {
    // no-op
  }
}

function removeLocalAvatarCache() {
  try {
    localStorage.removeItem(avatarStorageKey())
  } catch {
    // no-op
  }
}

function setMessages({ error = '', success = '' }) {
  errorMessage.value = error
  successMessage.value = success
}

function applyPayload(payload) {
  profile.rank = { ...profile.rank, ...(payload?.rank || {}) }
  profile.nft = { ...profile.nft, ...(payload?.nft || {}) }
  profile.checklist = { ...profile.checklist, ...(payload?.checklist || {}) }
  profile.blockchain = { ...profile.blockchain, ...(payload?.blockchain || {}) }
  profile.analysis = { ...profile.analysis, ...(payload?.analysis || {}) }
  form.nftName = profile.nft.nftName || ''
  form.walletAddress = profile.nft.walletAddress || ''
  form.nftImageUrl = profile.nft.nftImageUrl || ''
}

async function loadProfile() {
  if (!userStore.token) return
  loading.value = true
  setMessages({})
  try {
    const payload = await apiRequest('/api/trading/profile/nft', { headers: authHeaders.value })
    applyPayload(payload)
  } catch (error) {
    setMessages({ error: error.message || 'Không tải được NFT profile.' })
  } finally {
    loading.value = false
  }
}

function normalizeImageForApi(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text.slice(0, 500)
  return profile.nft.nftImageUrl || ''
}

async function saveProfile() {
  if (!userStore.token) return
  if (walletInput.value && !isWalletLikelyValid.value) {
    setMessages({
      error: locale.value === 'vi' ? 'Ví Cardano không đúng định dạng. Vui lòng kiểm tra lại.' : 'Invalid Cardano wallet format.'
    })
    return
  }
  saving.value = true
  setMessages({})
  try {
    const payload = await apiRequest('/api/trading/profile/nft', {
      method: 'PATCH',
      headers: authHeaders.value,
      body: JSON.stringify({
        nftName: form.nftName,
        walletAddress: form.walletAddress,
        nftImageUrl: normalizeImageForApi(form.nftImageUrl)
      })
    })
    applyPayload(payload)
    setMessages({
      success: locale.value === 'vi' ? 'Đã lưu NFT profile thành công.' : 'NFT profile saved successfully.'
    })
  } catch (error) {
    setMessages({ error: error.message || 'Cannot save NFT profile.' })
  } finally {
    saving.value = false
  }
}

async function mintNft() {
  if (!userStore.token) return
  if (!walletInput.value) {
    setMessages({
      error: locale.value === 'vi' ? 'Bạn cần nhập ví Cardano trước khi Mint NFT.' : 'Please enter Cardano wallet before minting.'
    })
    return
  }
  if (!isWalletLikelyValid.value) {
    setMessages({
      error: locale.value === 'vi' ? 'Ví Cardano không đúng định dạng. Vui lòng kiểm tra lại.' : 'Invalid Cardano wallet format.'
    })
    return
  }
  minting.value = true
  setMessages({})
  try {
    const payload = await apiRequest('/api/trading/profile/nft/mint', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({
        nftName: form.nftName,
        walletAddress: form.walletAddress,
        nftImageUrl: normalizeImageForApi(form.nftImageUrl)
      })
    })
    applyPayload(payload)
    setMessages({
      success:
        locale.value === 'vi'
          ? 'Mint NFT thành công. Hồ sơ đã được cộng điểm rank.'
          : 'NFT minted successfully. Rank points were added.'
    })
  } catch (error) {
    setMessages({ error: error.message || 'Cannot mint NFT now.' })
  } finally {
    minting.value = false
  }
}

function ringStyle(value, color) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)))
  return {
    background: `conic-gradient(${color} ${safe}%, rgba(255,255,255,0.08) ${safe}% 100%)`
  }
}

function pickAvatar() {
  avatarInputRef.value?.click()
}

function onAvatarSelected(event) {
  const file = event?.target?.files?.[0]
  if (!file) return
  if (!String(file.type || '').startsWith('image/')) {
    setMessages({
      error: locale.value === 'vi' ? 'Vui lòng chọn file ảnh hợp lệ.' : 'Please choose a valid image file.'
    })
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    setMessages({
      error: locale.value === 'vi' ? 'Ảnh quá lớn. Vui lòng dùng ảnh dưới 2MB.' : 'Image too large. Please use image under 2MB.'
    })
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const data = String(reader.result || '')
    if (!data.startsWith('data:image/')) return
    localAvatarData.value = data
    persistLocalAvatar(data)
    setMessages({
      success:
        locale.value === 'vi'
          ? 'Đã cập nhật ảnh đại diện cục bộ. Nhấn Lưu profile để cập nhật thông tin text.'
          : 'Profile image updated locally. Click Save profile to update text fields.'
    })
  }
  reader.readAsDataURL(file)
}

function clearLocalAvatar() {
  localAvatarData.value = ''
  removeLocalAvatarCache()
  setMessages({
    success: locale.value === 'vi' ? 'Đã xóa ảnh đại diện cục bộ.' : 'Local profile image removed.'
  })
}

function copyTxHash() {
  const tx = String(profile.blockchain.latestTxHash || profile.nft.mintedTxHash || '')
  if (!tx) return
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(tx)
      .then(() => {
        setMessages({
          success: locale.value === 'vi' ? 'Đã copy TX hash.' : 'TX hash copied.'
        })
      })
      .catch(() => {
        setMessages({ error: locale.value === 'vi' ? 'Không thể copy TX hash.' : 'Cannot copy TX hash.' })
      })
    return
  }
  setMessages({ success: tx })
}

function verifyOnChain() {
  const tx = String(profile.blockchain.latestTxHash || profile.nft.mintedTxHash || '').trim()
  if (!tx) {
    setMessages({
      error: locale.value === 'vi' ? 'Chưa có TX hash để xác minh.' : 'No TX hash available for verification.'
    })
    return
  }
  const url = `https://cardanoscan.io/transaction/${encodeURIComponent(tx)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function shareProfile() {
  const url = `${window.location.origin}/nft-profile`
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setMessages({
          success: locale.value === 'vi' ? 'Đã copy link hồ sơ NFT.' : 'NFT profile link copied.'
        })
      })
      .catch(() => {
        setMessages({ error: locale.value === 'vi' ? 'Không thể copy link.' : 'Cannot copy profile link.' })
      })
    return
  }
  setMessages({ success: url })
}

function openWalletGuide() {
  const url = 'https://www.lace.io/'
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openWalletExplorer() {
  if (!isWalletLikelyValid.value) return
  const url = `https://cardanoscan.io/address/${encodeURIComponent(walletInput.value)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

watch(
  () => userStore.user?.id,
  () => {
    loadLocalAvatar()
  }
)

onMounted(async () => {
  loadLocalAvatar()
  await loadProfile()
})
</script>

<style scoped>
.nftx-page {
  min-height: calc(100vh - 64px);
  padding: 14px;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 46, 166, 0.16), transparent 42%),
    radial-gradient(circle at 80% 10%, rgba(155, 39, 175, 0.18), transparent 44%),
    linear-gradient(180deg, rgba(8, 0, 14, 0.96), rgba(4, 0, 10, 0.96));
}

.nftx-wrap {
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  gap: 12px;
}

.nftx-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
}

.header-left {
  display: flex;
  gap: 10px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.03);
  display: grid;
  place-items: center;
  text-decoration: none;
  color: #fff;
  margin-top: 4px;
}

.header-kicker {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #ff75cf;
  font-weight: 700;
}

h1 {
  margin: 4px 0 0;
  font-size: clamp(25px, 2.4vw, 34px);
  line-height: 1.1;
  font-family: 'Orbitron', sans-serif;
}

.header-sub {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.67);
  max-width: 760px;
}

.header-actions,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.primary {
  border-color: transparent;
  background: linear-gradient(135deg, #ff2ea6, #9b27af);
  box-shadow: 0 0 20px rgba(255, 46, 166, 0.34);
}

.btn.verify {
  border-color: rgba(255, 88, 193, 0.42);
  background: rgba(255, 88, 193, 0.13);
  color: #ffc7ed;
}

.btn.ghost {
  border-color: rgba(255, 255, 255, 0.22);
}

.btn.small {
  padding: 8px 10px;
  font-size: 12px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.alert {
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.alert.danger {
  border: 1px solid rgba(255, 23, 68, 0.45);
  background: rgba(255, 23, 68, 0.12);
  color: #ffc4d3;
}

.alert.success {
  border: 1px solid rgba(0, 230, 118, 0.45);
  background: rgba(0, 230, 118, 0.12);
  color: #a8ffd0;
}

.nftx-card,
.settings-card {
  position: relative;
  border: 1px solid rgba(255, 80, 191, 0.36);
  border-radius: 18px;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 53, 178, 0.09), transparent 38%),
    radial-gradient(circle at 80% 0%, rgba(144, 69, 255, 0.1), transparent 44%),
    rgba(8, 5, 18, 0.9);
  box-shadow:
    0 0 24px rgba(255, 53, 178, 0.2),
    inset 0 0 30px rgba(148, 71, 255, 0.08);
}

.nftx-card {
  padding: 16px;
}

.card-ribbon {
  position: absolute;
  right: 12px;
  top: 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.6);
}

.card-ribbon.active {
  border-color: rgba(0, 230, 118, 0.5);
  background: rgba(0, 230, 118, 0.16);
  color: #9fffd2;
}

.hero-section {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
  align-items: start;
}

.avatar-frame {
  border-radius: 16px;
  border: 1px solid rgba(255, 94, 195, 0.58);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
  box-shadow: 0 0 22px rgba(255, 46, 166, 0.24);
}

.avatar-frame img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}

.avatar-actions {
  margin-top: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.hidden-input {
  display: none;
}

.avatar-column small {
  margin-top: 6px;
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.brand-name {
  margin: 0;
  font-size: 13px;
  color: #ff62c3;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.identity-column h2 {
  margin: 2px 0 0;
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(38px, 4vw, 62px);
  line-height: 1;
  color: #ffd570;
  text-shadow: 0 0 18px rgba(255, 189, 74, 0.3);
}

.diamond {
  font-size: 0.7em;
  color: #ffc74f;
  margin-left: 5px;
}

.tier-line {
  margin: 8px 0 0;
  font-size: 30px;
  color: rgba(255, 235, 194, 0.9);
}

.mint-line {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.66);
  font-size: 13px;
}

.mint-line span {
  color: #ffcadf;
  margin-left: 4px;
}

.score-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.score-box {
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
}

.score-box.pink {
  border-color: rgba(255, 77, 184, 0.42);
}

.score-box.gold {
  border-color: rgba(255, 190, 67, 0.42);
}

.score-box p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.score-value {
  margin-top: 4px;
  font-size: 52px;
  line-height: 1;
  font-weight: 900;
  color: #ff5ab9;
}

.score-box.gold .score-value {
  color: #ffd36a;
}

.score-value span {
  font-size: 0.42em;
  color: rgba(255, 255, 255, 0.62);
  margin-left: 4px;
}

.score-box small {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.7);
}

.performance-section,
.insight-section,
.chain-section {
  margin-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding-top: 12px;
}

.performance-section h3,
.insight-section h3 {
  margin: 0;
  font-size: 19px;
}

.performance-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}

.perf-item,
.equity-item {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
}

.perf-ring {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  margin: 0 auto;
  padding: 7px;
}

.perf-ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(9, 6, 18, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.perf-ring-inner strong {
  font-size: 20px;
  line-height: 1;
}

.perf-item p {
  margin: 8px 0 0;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}

.perf-item small {
  margin-top: 3px;
  display: block;
  text-align: center;
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
}

.equity-item {
  grid-column: span 1;
}

.equity-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equity-head h4 {
  margin: 0;
  font-size: 14px;
}

.equity-head span {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 2px 7px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.66);
}

.equity-svg {
  width: 100%;
  height: 120px;
  margin-top: 8px;
}

.equity-area {
  fill: rgba(46, 248, 166, 0.2);
}

.equity-line {
  fill: none;
  stroke: #47ffb3;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 8px rgba(71, 255, 179, 0.35));
}

.insight-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.insight-item {
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.02);
  padding: 10px;
  display: flex;
  gap: 9px;
}

.insight-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 122, 210, 0.45);
  display: grid;
  place-items: center;
  color: #ff8dd6;
  flex-shrink: 0;
}

.insight-item h4 {
  margin: 0;
  font-size: 13px;
  color: #ffd2ee;
}

.insight-item p {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.45;
}

.chain-section {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.chain-left h3 {
  margin: 0;
  font-size: 18px;
}

.chain-left p {
  margin: 5px 0 0;
  color: rgba(255, 255, 255, 0.7);
}

.chain-left span {
  color: #ff8dd8;
}

.chain-hash {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.chain-right {
  display: grid;
  gap: 6px;
  justify-items: end;
}

.confirm-chip {
  border-radius: 999px;
  border: 1px solid rgba(0, 230, 118, 0.45);
  background: rgba(0, 230, 118, 0.14);
  color: #a6ffd3;
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.settings-card {
  padding: 14px;
}

.settings-card h3 {
  margin: 0;
  font-size: 19px;
}

.field {
  display: grid;
  gap: 5px;
  margin-top: 10px;
}

.field span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.field input {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  padding: 10px 11px;
}

.wallet-help {
  margin-top: 10px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.wallet-help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wallet-help-head strong {
  font-size: 13px;
  color: #ffd9ef;
}

.wallet-help-head button {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.74);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  cursor: pointer;
}

.wallet-help-body p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.45;
}

.wallet-help-body ul {
  margin: 7px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
}

.wallet-status {
  border-radius: 9px;
  padding: 8px 9px;
  font-size: 12px;
  line-height: 1.4;
}

.wallet-status.neutral {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.72);
}

.wallet-status.bad {
  border: 1px solid rgba(255, 93, 129, 0.44);
  background: rgba(255, 93, 129, 0.13);
  color: #ffc0d0;
}

.wallet-status.good {
  border: 1px solid rgba(0, 230, 118, 0.42);
  background: rgba(0, 230, 118, 0.12);
  color: #a1ffd3;
}

.wallet-help-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.field-note {
  margin-top: 8px;
  display: block;
  color: rgba(255, 255, 255, 0.53);
  font-size: 11px;
}

.rules {
  margin: 10px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: rgba(255, 255, 255, 0.72);
}

.rule-stats {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.rule-stats div {
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.02);
  padding: 9px;
}

.rule-stats span {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.rule-stats strong {
  margin-top: 4px;
  display: block;
  font-size: 22px;
  color: #ffd270;
}

.share-btn {
  border-radius: 14px;
  border: 1px solid rgba(255, 100, 199, 0.46);
  background: linear-gradient(135deg, rgba(255, 46, 166, 0.34), rgba(142, 53, 255, 0.28));
  color: #ffe9f9;
  padding: 12px 14px;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(255, 46, 166, 0.25);
}

.guide-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 0, 10, 0.75);
  backdrop-filter: blur(7px);
  display: grid;
  place-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 100;
}

.guide-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.guide-card {
  width: min(92vw, 560px);
  border-radius: 14px;
  border: 1px solid rgba(255, 107, 209, 0.42);
  background: rgba(15, 7, 27, 0.95);
  padding: 14px;
}

.guide-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.guide-card h3 {
  margin: 0;
  font-size: 21px;
}

.guide-card button {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  font-size: 26px;
  cursor: pointer;
}

.guide-card ol {
  margin: 10px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 9px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.5;
}

@media (max-width: 1080px) {
  .hero-section {
    grid-template-columns: 1fr;
  }

  .performance-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .nftx-page {
    padding: 10px;
  }

  .nftx-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    width: 100%;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
    text-align: center;
  }

  .score-row,
  .insight-grid,
  .rule-stats {
    grid-template-columns: 1fr;
  }

  .chain-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .chain-right {
    width: 100%;
    grid-template-columns: 1fr 1fr;
    display: grid;
    justify-items: stretch;
  }

  .chain-right .btn {
    width: 100%;
    text-align: center;
  }
}
</style>
