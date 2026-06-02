<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageToggle from '../components/LanguageToggle.vue'
import { useUserStore } from '../stores/useUserStore.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const billing = ref(null)
const order = ref(null)
const payment = ref(null)
const error = ref('')
const notice = ref('')
const loading = ref(false)
const creating = ref(false)
const submitting = ref(false)
const payerName = ref('')
const payerPhone = ref('')
const transferContent = ref('')
const proofImageUrl = ref('')
let pollTimer = null

const subscription = computed(() => userStore.subscription)
const paymentMeta = computed(() => billing.value?.paymentMeta || {})
const latestOrder = computed(() => order.value || billing.value?.latestOrder || null)
const priceVnd = computed(() => Number(paymentMeta.value.priceVnd || subscription.value.priceVnd || 149000))
const formattedPrice = computed(() => `${priceVnd.value.toLocaleString('vi-VN')}d`)
const checkoutUrl = computed(() => payment.value?.payosCheckoutUrl || latestOrder.value?.checkoutUrl || '')
const transferHint = computed(
  () => payment.value?.transferContentHint || latestOrder.value?.transferContent || latestOrder.value?.qrRef || ''
)
const pendingText = computed(() => {
  const status = latestOrder.value?.status || 'none'
  if (status === 'paid') return 'Da thanh toan'
  if (status === 'waiting_admin') return 'Dang cho admin duyet'
  if (status === 'pending') return 'Dang cho thanh toan'
  return 'Chua co don'
})

function goDashboard() {
  router.push('/dashboard')
}

function goAdmin() {
  router.push('/admin')
}

function logout() {
  userStore.logout()
  router.push('/login')
}

async function loadBilling({ quiet = false } = {}) {
  try {
    if (!quiet) loading.value = true
    const payload = await userStore.fetchBillingMe()
    billing.value = payload
    if (payload?.latestOrder) order.value = payload.latestOrder
    if (payload?.subscription?.isPro) {
      const redirect = String(route.query.redirect || '/dashboard')
      router.replace(redirect.startsWith('/') ? redirect : '/dashboard')
    }
  } catch (e) {
    if (!quiet) error.value = e.message || 'Khong tai duoc thong tin thanh toan.'
  } finally {
    loading.value = false
  }
}

async function createPayment() {
  try {
    creating.value = true
    error.value = ''
    notice.value = ''
    const payload = await userStore.createUpgradeIntent('pro', 'LuminaFox Premium 149K')
    if (payload?.alreadyActive) {
      await userStore.fetchMe()
      goDashboard()
      return
    }
    order.value = payload.order || null
    payment.value = payload.payment || null
    transferContent.value = payload.payment?.transferContentHint || payload.order?.qrRef || ''
    notice.value = payload.payment?.payosError
      ? `PayOS chua tao duoc link: ${payload.payment.payosError}. Ban co the chuyen khoan QR fallback.`
      : 'Da tao don thanh toan. He thong se tu cap nhat khi thanh toan thanh cong.'
    if (payload.payment?.payosCheckoutUrl) {
      window.open(payload.payment.payosCheckoutUrl, '_blank', 'noopener,noreferrer')
    }
  } catch (e) {
    error.value = e.message || 'Khong tao duoc don thanh toan.'
  } finally {
    creating.value = false
  }
}

function handleProofFile(event) {
  const file = event.target.files?.[0]
  proofImageUrl.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Vui long tai len anh chung tu thanh toan.'
    return
  }
  if (file.size > 900000) {
    error.value = 'Anh chung tu toi da 900KB.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    proofImageUrl.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

async function submitProof() {
  const currentOrder = latestOrder.value
  if (!currentOrder?.id) {
    error.value = 'Hay tao don thanh toan truoc.'
    return
  }
  if (!proofImageUrl.value) {
    error.value = 'Can tai anh chung tu truoc khi gui.'
    return
  }
  try {
    submitting.value = true
    error.value = ''
    const payload = await userStore.markBillingOrderPaid(currentOrder.id, {
      payerName: payerName.value,
      payerPhone: payerPhone.value,
      transferContent: transferContent.value || transferHint.value,
      proofImageUrl: proofImageUrl.value
    })
    notice.value =
      payload.status === 'paid'
        ? 'Thanh toan da duoc kich hoat tu dong.'
        : 'Da gui chung tu. Admin se kiem tra va kich hoat neu hop le.'
    await loadBilling({ quiet: true })
    if (payload.status === 'paid') await userStore.fetchMe()
  } catch (e) {
    error.value = e.message || 'Khong gui duoc chung tu.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadBilling()
  pollTimer = window.setInterval(() => loadBilling({ quiet: true }), 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<template>
  <section class="pricing-page">
    <header class="pricing-topbar">
      <button class="brand" @click="goDashboard" aria-label="LuminaFox home">
        <span>LF</span>
        LuminaFox
      </button>
      <div class="topbar-actions">
        <ThemeToggle />
        <LanguageToggle />
        <button class="small-btn" @click="logout">Dang xuat</button>
      </div>
    </header>

    <main class="pricing-shell">
      <section v-if="userStore.isAdmin" class="pricing-card admin-pass">
        <span class="eyebrow">ADMIN BYPASS</span>
        <h1>Admin khong can thanh toan.</h1>
        <p>Ban co quyen vao app va quan ly user, doanh thu, don thanh toan trong Admin Control Center.</p>
        <div class="pricing-actions">
          <button class="primary-btn" @click="goDashboard">Vao Dashboard</button>
          <button class="secondary-btn" @click="goAdmin">Quan ly tien bac & web</button>
        </div>
      </section>

      <template v-else>
        <section class="hero-card">
          <div>
            <span class="eyebrow">LUMINAFOX PREMIUM</span>
            <h1>Kich hoat app voi goi 149K.</h1>
            <p>
              Tat ca tai khoan thuong can thanh toan de vao dashboard, Prop Guardian, MT5 sync va AI analytics.
            </p>
          </div>
          <div class="price-block">
            <span>Gia mo khoa</span>
            <strong>{{ formattedPrice }}</strong>
            <small>Admin duyet tien va web rieng.</small>
          </div>
        </section>

        <div v-if="error" class="pay-alert danger">{{ error }}</div>
        <div v-if="notice" class="pay-alert">{{ notice }}</div>

        <section class="payment-grid">
          <article class="pricing-card primary-plan">
            <div class="card-head">
              <div>
                <span class="eyebrow">ONE ACTION</span>
                <h2>Thanh toan de vao app</h2>
              </div>
              <span class="status-pill">{{ pendingText }}</span>
            </div>

            <ul class="feature-list">
              <li>AI Prop Guardian va Risk Mode realtime</li>
              <li>Trading journal, analytics, reports, replay</li>
              <li>MT5/Exness connector voi mock/fallback mode</li>
              <li>Theme dark neon pink + light soft pink</li>
            </ul>

            <button class="primary-btn pay-now" @click="createPayment" :disabled="creating || loading">
              {{ creating ? 'Dang tao don...' : 'Mua ngay ' + formattedPrice }}
            </button>

            <a v-if="checkoutUrl" class="secondary-btn checkout-link" :href="checkoutUrl" target="_blank" rel="noopener noreferrer">
              Mo link PayOS
            </a>

            <p class="fine-print">
              PayOS webhook se tu kich hoat khi thanh toan thanh cong. Neu PayOS chua cau hinh, dung QR/chuyen khoan va gui chung tu.
            </p>
          </article>

          <article class="pricing-card qr-card">
            <div class="card-head">
              <div>
                <span class="eyebrow">QR FALLBACK</span>
                <h2>Quet QR / chuyen khoan</h2>
              </div>
            </div>

            <div class="qr-frame">
              <img :src="paymentMeta.qrImageUrl || '/images/pro-upgrade-qr.svg'" alt="QR thanh toan LuminaFox Premium" />
            </div>

            <div class="bank-lines">
              <div><span>Chu TK</span><strong>{{ paymentMeta.accountName || 'DINH VAN TAM' }}</strong></div>
              <div><span>So dien thoai</span><strong>{{ paymentMeta.accountPhone || '0905833042' }}</strong></div>
              <div><span>Kenh</span><strong>{{ paymentMeta.provider || 'VietQR / NAPAS247' }}</strong></div>
              <div><span>Noi dung CK</span><strong>{{ transferHint || 'Tao don de lay ma' }}</strong></div>
            </div>
          </article>

          <article class="pricing-card proof-card">
            <div class="card-head">
              <div>
                <span class="eyebrow">MANUAL REVIEW</span>
                <h2>Gui chung tu cho Admin</h2>
              </div>
            </div>

            <label>Ten nguoi chuyen</label>
            <input v-model="payerName" class="pay-input" placeholder="Nguyen Van A" />

            <label>So dien thoai</label>
            <input v-model="payerPhone" class="pay-input" placeholder="090..." />

            <label>Noi dung da chuyen</label>
            <input v-model="transferContent" class="pay-input" :placeholder="transferHint || 'Ma don thanh toan'" />

            <label>Anh chung tu</label>
            <input class="pay-input file-input" type="file" accept="image/*" @change="handleProofFile" />

            <button class="secondary-btn" @click="submitProof" :disabled="submitting || !latestOrder?.id">
              {{ submitting ? 'Dang gui...' : 'Gui chung tu' }}
            </button>
          </article>
        </section>
      </template>
    </main>
  </section>
</template>

<style scoped>
.pricing-page {
  min-height: 100vh;
  background: var(--lf-dashboard-bg);
  color: var(--lf-text);
  position: relative;
  z-index: 1;
}

.pricing-topbar {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px clamp(18px, 4vw, 44px);
  border-bottom: 1px solid var(--lf-border);
  background: var(--lf-header-bg);
  backdrop-filter: blur(18px);
}

.brand {
  border: 0;
  background: transparent;
  color: var(--lf-text);
  font-weight: 900;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.brand span {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--gradient-primary);
  box-shadow: 0 0 24px var(--lf-primary-glow);
}

.topbar-actions,
.pricing-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pricing-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 34px 0 54px;
}

.hero-card,
.pricing-card {
  border: 1px solid var(--lf-border);
  background: var(--lf-panel-bg);
  border-radius: 22px;
  box-shadow: var(--lf-shadow);
  backdrop-filter: blur(16px);
}

.hero-card {
  padding: clamp(22px, 4vw, 34px);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 22px;
}

.hero-card h1,
.pricing-card h1,
.pricing-card h2 {
  margin: 0;
  color: var(--lf-text);
}

.hero-card h1 {
  font-size: clamp(30px, 5vw, 54px);
  line-height: 1.02;
  letter-spacing: 0;
}

.hero-card p,
.pricing-card p,
.fine-print {
  color: var(--lf-text-muted);
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: var(--lf-primary-hot);
  font-size: 12px;
  letter-spacing: 0.1em;
  font-weight: 900;
}

.price-block {
  min-width: 220px;
  border: 1px solid var(--lf-border-strong);
  border-radius: 18px;
  padding: 18px;
  background: var(--lf-primary-soft);
  box-shadow: var(--lf-glow-card);
}

.price-block span,
.price-block small {
  display: block;
  color: var(--lf-text-muted);
}

.price-block strong {
  display: block;
  margin: 4px 0;
  font-size: 38px;
  color: var(--lf-text);
}

.payment-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.9fr 0.95fr;
  gap: 18px;
  margin-top: 18px;
}

.pricing-card {
  padding: 22px;
}

.admin-pass {
  max-width: 760px;
  margin: 80px auto 0;
  padding: 34px;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.status-pill {
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--lf-warning) 46%, transparent);
  color: var(--lf-warning);
  background: color-mix(in srgb, var(--lf-warning) 12%, transparent);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 800;
}

.feature-list {
  display: grid;
  gap: 10px;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
}

.feature-list li {
  color: var(--lf-text-soft);
  padding-left: 18px;
  position: relative;
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--lf-primary);
  box-shadow: 0 0 12px var(--lf-primary-glow);
}

.primary-btn,
.secondary-btn,
.small-btn {
  border-radius: 14px;
  border: 1px solid transparent;
  min-height: 44px;
  padding: 0 16px;
  font-weight: 900;
  cursor: pointer;
}

.primary-btn {
  color: #fff;
  background: var(--gradient-primary);
  box-shadow: 0 12px 28px var(--lf-primary-glow);
}

.secondary-btn,
.small-btn {
  color: var(--lf-text);
  background: var(--lf-input-bg);
  border-color: var(--lf-border);
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pay-now,
.checkout-link {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  text-decoration: none;
}

.qr-frame {
  border-radius: 18px;
  border: 1px solid var(--lf-border);
  overflow: hidden;
  background: #fff;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.qr-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bank-lines {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.bank-lines div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--lf-border-soft);
  padding-bottom: 8px;
}

.bank-lines span,
.proof-card label {
  color: var(--lf-text-muted);
  font-size: 13px;
}

.bank-lines strong {
  color: var(--lf-text);
  text-align: right;
}

.proof-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pay-input {
  width: 100%;
  border: 1px solid var(--lf-border);
  border-radius: 14px;
  background: var(--lf-input-bg);
  color: var(--lf-text);
  min-height: 44px;
  padding: 10px 12px;
  outline: none;
}

.pay-input:focus {
  border-color: var(--lf-primary);
  box-shadow: var(--lf-focus);
}

.file-input {
  padding-top: 9px;
}

.pay-alert {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--lf-success) 36%, transparent);
  background: color-mix(in srgb, var(--lf-success) 12%, transparent);
  color: var(--lf-text);
}

.pay-alert.danger {
  border-color: color-mix(in srgb, var(--lf-danger) 42%, transparent);
  background: color-mix(in srgb, var(--lf-danger) 12%, transparent);
}

@media (max-width: 980px) {
  .hero-card,
  .payment-grid {
    grid-template-columns: 1fr;
  }

  .price-block {
    min-width: 0;
  }
}

@media (max-width: 620px) {
  .pricing-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .bank-lines div,
  .card-head {
    flex-direction: column;
  }

  .bank-lines strong {
    text-align: left;
  }
}
</style>
