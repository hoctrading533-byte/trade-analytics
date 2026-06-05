<template>
  <div class="tz-page" :data-theme="theme">
    <aside class="tz-sidebar">
      <div class="tz-sidebar-logo"><div class="tz-logo-icon">LF</div><div class="tz-logo-text">Lumina<span>Fox</span></div></div>
      <nav class="tz-nav-section">
        <div v-for="section in navSections" :key="section.label" class="tz-nav-group">
          <div class="tz-nav-label">{{ section.label }}</div>
          <RouterLink v-for="item in section.items" :key="item.label" class="tz-nav-item" :class="{ active: isNavActive(item) }" :to="item.to">
            <span class="tz-nav-icon" v-html="item.icon"></span>{{ item.label }}
          </RouterLink>
        </div>
      </nav>
      <div class="tz-sidebar-user"><div class="tz-user-avatar">TA</div><div class="tz-user-info"><div class="tz-user-name">Trader Alex</div><div class="tz-user-plan">Premium Pro</div></div><span class="tz-user-arrow">›</span></div>
    </aside>
    <div class="tz-main">
      <header class="tz-header">
        <div class="tz-header-welcome">
          <h2>{{ locale === 'en' ? 'MT5 Account Connection' : 'Kết nối tài khoản MT5' }}</h2>
          <p>{{ locale === 'en' ? 'Connect and sync your real trading data across Live, Demo, and Prop Firm accounts' : 'Kết nối & đồng bộ dữ liệu giao dịch thực từ tài khoản Live, Demo, và Thi Quỹ' }}</p>
        </div>
        <div class="tz-header-controls">
          <LanguageToggle />
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div v-if="errorMessage" class="tz-alert danger">{{ errorMessage }}</div>
        <div v-if="successMessage" class="tz-alert success">{{ successMessage }}</div>

        <section class="tz-sc-grid">
          <!-- Connect Form -->
          <article class="tz-sc-panel">
            <h3>{{ locale === 'en' ? 'Connect MT5 Account' : 'Kết nối tài khoản MT5' }}</h3>
            
            <label class="tz-sc-label">{{ locale === 'en' ? 'Account Label (Note)' : 'Ghi chú / Nhãn tài khoản' }}</label>
            <input v-model.trim="form.accountName" class="tz-input" :placeholder="locale === 'en' ? 'e.g., Challenge 100K' : 'Ví dụ: Challenge 100K'" />

            <label class="tz-sc-label">{{ locale === 'en' ? 'Account Classification' : 'Phân loại tài khoản' }}</label>
            <select v-model="form.accountType" class="tz-input tz-select">
              <option value="demo">{{ locale === 'vi' ? 'Tài khoản Demo (Demo)' : 'Demo Account' }}</option>
              <option value="live">{{ locale === 'vi' ? 'Tài khoản Thực (Real/Live)' : 'Live Account (Real)' }}</option>
              <option value="prop">{{ locale === 'vi' ? 'Tài khoản Thi Quỹ (Prop Challenge)' : 'Prop Challenge Account' }}</option>
            </select>

            <label class="tz-sc-label">{{ t('server.login') }}</label>
            <input v-model.trim="form.login" class="tz-input" placeholder="Ví dụ: 91548201" />

            <label class="tz-sc-label">{{ t('server.password') }}</label>
            <input v-model.trim="form.password" type="password" class="tz-input" :placeholder="t('server.passwordHint')" />

            <label class="tz-sc-label">{{ t('server.serverLabel') }}</label>
            <input v-model.trim="form.server" class="tz-input" placeholder="Ví dụ: Exness-MT5Trial14" />

            <label class="tz-sc-label">{{ locale === 'en' ? 'Initial Balance' : 'Số dư ban đầu (Balance)' }}</label>
            <input v-model.number="form.initialBalance" type="number" class="tz-input" placeholder="Ví dụ: 100000" />

            <label class="tz-sc-label">{{ locale === 'en' ? 'History Days' : 'Số ngày lịch sử' }}</label>
            <select v-model.number="form.days" class="tz-input tz-select">
              <option :value="7">7 {{ locale === 'vi' ? 'ngày' : 'days' }}</option>
              <option :value="30">30 {{ locale === 'vi' ? 'ngày' : 'days' }}</option>
              <option :value="90">90 {{ locale === 'vi' ? 'ngày' : 'days' }}</option>
              <option :value="180">180 {{ locale === 'vi' ? 'ngày' : 'days' }}</option>
              <option :value="365">365 {{ locale === 'vi' ? 'ngày (mặc định)' : 'days (default)' }}</option>
            </select>

            <div class="tz-sc-actions" style="margin-top: 18px;">
              <button class="tz-btn-add" :disabled="connecting" @click="connectAndSync">
                <span v-if="connecting" class="tz-spinner"></span>
                {{ connecting ? (locale === 'vi' ? 'Đang kết nối & đồng bộ...' : 'Connecting & Syncing...') : (locale === 'vi' ? 'Kết nối & Đồng bộ' : 'Connect & Sync') }}
              </button>
            </div>
          </article>

          <!-- Accounts List -->
          <article class="tz-sc-panel" :style="currentRole === 'admin' ? {} : { gridColumn: 'span 2' }">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0;">{{ locale === 'en' ? 'Connected Accounts' : 'Danh sách tài khoản đã kết nối' }}</h3>
              <button v-if="serverAccounts.length > 0" class="tz-btn-filter" :disabled="syncingAll" @click="syncAll" style="font-size: 11px; padding: 4px 10px;">
                <span v-if="syncingAll" class="tz-spinner-sm"></span>
                {{ syncingAll ? (locale === 'vi' ? 'Đang sync...' : 'Syncing...') : (locale === 'vi' ? 'Sync tất cả' : 'Sync All') }}
              </button>
            </div>
            
            <div v-if="loadingAccounts" style="padding: 40px; text-align: center; color: var(--sub); font-size: 13px;">
              <span class="tz-spinner"></span>
              <div style="margin-top: 8px;">{{ locale === 'vi' ? 'Đang tải danh sách...' : 'Loading accounts...' }}</div>
            </div>

            <div v-else-if="!serverAccounts.length" class="tz-empty" style="padding: 40px; text-align: center; color: var(--sub); font-size: 13px;">
              {{ locale === 'en' ? 'No connected accounts yet. Connect your MT5 account using the form.' : 'Chưa có tài khoản nào. Nhập thông tin ở bên trái để kết nối.' }}
            </div>
            
            <div v-else class="tz-analytics-table" style="max-height: 420px; overflow-y: auto;">
              <table class="tz-atable">
                <thead>
                  <tr>
                    <th>{{ locale === 'en' ? 'Label' : 'Nhãn' }}</th>
                    <th>MT5 ID</th>
                    <th>Server</th>
                    <th>{{ locale === 'en' ? 'Type' : 'Loại' }}</th>
                    <th>{{ locale === 'en' ? 'Balance' : 'Số dư' }}</th>
                    <th>{{ locale === 'en' ? 'Equity' : 'Equity' }}</th>
                    <th>{{ locale === 'en' ? 'Profit' : 'Lợi nhuận' }}</th>
                    <th>{{ locale === 'en' ? 'Sync' : 'Sync' }}</th>
                    <th>{{ locale === 'en' ? 'Actions' : 'Thao tác' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="acc in serverAccounts" :key="acc.id">
                    <td><strong>{{ acc.accountName || 'MT5' }}</strong></td>
                    <td style="font-family: var(--font-mono); font-size: 11px;">{{ acc.loginId }}</td>
                    <td style="font-size: 11px;">{{ acc.server }}</td>
                    <td>
                      <span class="tz-pill" :class="acc.accountType">{{ typeLabel(acc.accountType) }}</span>
                    </td>
                    <td style="font-family: var(--font-mono); font-weight: 700; font-size: 11px;" :style="{ color: 'var(--success)' }">
                      {{ formatMoney(acc.currentBalance) }}
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 11px;">
                      {{ formatMoney(acc.currentEquity || acc.currentBalance) }}
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 11px;" :style="{ color: (acc.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }">
                      {{ (acc.profit || 0) >= 0 ? '+' : '' }}{{ formatMoney(acc.profit || 0) }}
                    </td>
                    <td>
                      <span v-if="acc.lastSyncStatus === 'ok'" class="tz-pill on" style="font-size: 10px;">✓ OK</span>
                      <span v-else-if="acc.lastSyncStatus === 'error'" class="tz-pill" style="background: rgba(255,59,122,0.15); color: var(--danger); font-size: 10px;" :title="acc.lastSyncError">✗ Error</span>
                      <span v-else class="tz-pill" style="font-size: 10px;">⏳ Pending</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button class="tz-btn-filter" style="padding: 4px 8px; font-size: 11px; height: 26px; border-radius: 6px;" :disabled="syncingId === acc.id" @click="syncAccount(acc)">
                          <span v-if="syncingId === acc.id" class="tz-spinner-sm"></span>
                          {{ syncingId === acc.id ? '...' : (locale === 'vi' ? 'Sync' : 'Sync') }}
                        </button>
                        <button class="tz-btn-filter tz-btn-danger" style="padding: 4px 8px; font-size: 11px; height: 26px; border-radius: 6px;" @click="deleteAccount(acc.id)">
                          {{ locale === 'vi' ? 'Xóa' : 'Delete' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Last sync summary -->
            <div v-if="serverAccounts.length" style="margin-top: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
              <div class="tz-mini-stat">
                <span class="tz-mini-label">{{ locale === 'vi' ? 'Tổng tài khoản' : 'Total Accounts' }}</span>
                <span class="tz-mini-value">{{ serverAccounts.length }}</span>
              </div>
              <div class="tz-mini-stat">
                <span class="tz-mini-label">{{ locale === 'vi' ? 'Tổng Balance' : 'Total Balance' }}</span>
                <span class="tz-mini-value" style="color: var(--success);">{{ formatMoney(totalBalance) }}</span>
              </div>
              <div class="tz-mini-stat">
                <span class="tz-mini-label">{{ locale === 'vi' ? 'Synced OK' : 'Synced OK' }}</span>
                <span class="tz-mini-value">{{ serverAccounts.filter(a => a.lastSyncStatus === 'ok').length }}/{{ serverAccounts.length }}</span>
              </div>
            </div>
          </article>
        </section>

        <!-- Admin Server Guide -->
        <section v-if="currentRole === 'admin'" class="tz-sc-guide" style="margin-top: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; color: var(--lf-primary);">{{ locale === 'en' ? 'Admin: VPS MT5 Setup Guide' : 'Admin: Hướng dẫn cài đặt VPS MT5' }}</h3>
            <span class="tz-pill" style="background: rgba(255, 45, 154, 0.15); color: var(--primary);">Admin Only</span>
          </div>
          <div class="tz-sc-steps">
            <div class="tz-sc-step">
              <span class="tz-sc-step-num">1</span>
              <div>
                <strong>{{ locale === 'en' ? 'VPS Download' : 'Tải trên Máy chủ' }}</strong>
                <p>{{ locale === 'en' ? 'Admin needs to install MT5 on the VPS server to sync live data.' : 'Admin cần tải và cài đặt MT5 trên máy chủ (VPS) để đồng bộ dữ liệu.' }}</p>
              </div>
            </div>
            <div class="tz-sc-step">
              <span class="tz-sc-step-num">2</span>
              <div>
                <strong>{{ locale === 'en' ? 'Enable WebRequests' : 'Bật WebRequests' }}</strong>
                <p>{{ locale === 'en' ? 'Options → Expert Advisors → Allow WebRequest.' : 'Options → Expert Advisors → Cho phép WebRequest.' }}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n.js'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'
import { usePropGuardian } from '../modules/prop-guardian/composables/usePropGuardian.js'
import LanguageToggle from '../components/LanguageToggle.vue'

const route = useRoute()
const userStore = useUserStore()
const { t, locale } = useI18n()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')

const { currentRole, reloadAccounts } = usePropGuardian()
const serverAccounts = ref([])
const loadingAccounts = ref(true)

const errorMessage = ref('')
const successMessage = ref('')
const connecting = ref(false)
const syncingId = ref(null)
const syncingAll = ref(false)

const form = reactive({
  login: '',
  password: '',
  server: '',
  accountName: '',
  accountType: 'prop',
  initialBalance: 100000,
  days: 365
})

const totalBalance = computed(() => serverAccounts.value.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0))

function authHeaders() {
  return userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
}

function typeLabel(type) {
  if (type === 'demo') return locale.value === 'vi' ? 'Demo' : 'Demo'
  if (type === 'live') return locale.value === 'vi' ? 'Thực (Live)' : 'Live'
  return locale.value === 'vi' ? 'Thi Quỹ (Prop)' : 'Prop Challenge'
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function isNavActive(item) {
  if (!item.to) return false
  if (item.to === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(item.to)
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('tz-theme', theme.value)
  document.documentElement.setAttribute('data-theme', theme.value)
}

const icons = {
  grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>',
  gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
  shield: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
}

const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Prop Guardian', icon: icons.shield, to: '/prop-guardian' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]

async function loadServerAccounts() {
  loadingAccounts.value = true
  errorMessage.value = ''
  try {
    const data = await apiRequest('/api/mt5/accounts', { headers: authHeaders() })
    serverAccounts.value = data?.accounts || []
  } catch (err) {
    console.error('Load MT5 accounts error:', err)
    errorMessage.value = 'Load accounts error: ' + err.message
    serverAccounts.value = []
  } finally {
    loadingAccounts.value = false
  }
}

async function connectAndSync() {
  connecting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (!form.login || !form.password || !form.server || !form.accountName) {
      throw new Error(locale.value === 'vi' ? 'Vui lòng điền đầy đủ nhãn tài khoản, Login ID, Password và Server.' : 'Please enter Account Label, Login ID, Password and Server.')
    }
    
    const data = await apiRequest('/api/mt5/accounts', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        login: form.login,
        password: form.password,
        server: form.server,
        accountName: form.accountName,
        accountType: form.accountType,
        initialBalance: form.initialBalance,
        days: form.days
      })
    })

    if (data.synced) {
      const dealCount = data.totalDeals || 0
      const posCount = data.totalPositions || 0
      successMessage.value = locale.value === 'vi'
        ? `✅ Kết nối & đồng bộ thành công! ${dealCount} deal lịch sử, ${posCount} vị thế mở.`
        : `✅ Connected & synced! ${dealCount} historical deals, ${posCount} open positions.`
    } else {
      successMessage.value = locale.value === 'vi'
        ? `✓ Tài khoản đã lưu. ${data.syncError || 'Sẽ tự động sync sau.'}`
        : `✓ Account saved. ${data.syncError || 'Will auto-sync later.'}`
    }

    // Reload accounts list
    await loadServerAccounts()
    reloadAccounts()

    // Clear form
    form.login = ''
    form.password = ''
    form.accountName = ''
    form.initialBalance = 100000
  } catch (error) {
    errorMessage.value = error.message || 'Error connecting account.'
    if (errorMessage.value.includes('already connected') || errorMessage.value.includes('đã được kết nối')) {
      await loadServerAccounts()
    }
  } finally {
    connecting.value = false
  }
}

async function syncAccount(acc) {
  syncingId.value = acc.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const data = await apiRequest(`/api/mt5/accounts/${acc.id}/sync`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ days: form.days })
    })
    const dealCount = data.totalDeals || 0
    successMessage.value = locale.value === 'vi'
      ? `✅ Đồng bộ ${acc.accountName} thành công! ${dealCount} deals.`
      : `✅ Synced ${acc.accountName}! ${dealCount} deals.`
    await loadServerAccounts()
    reloadAccounts()
  } catch (error) {
    errorMessage.value = `Sync ${acc.accountName}: ${error.message}`
  } finally {
    syncingId.value = null
  }
}

async function syncAll() {
  syncingAll.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const data = await apiRequest('/api/mt5/accounts/sync-all', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ days: form.days })
    })
    const okCount = data.results?.filter(r => r.ok).length || 0
    const errCount = data.results?.filter(r => !r.ok).length || 0
    successMessage.value = locale.value === 'vi'
      ? `✅ Đồng bộ xong: ${okCount} thành công, ${errCount} lỗi.`
      : `✅ Sync complete: ${okCount} ok, ${errCount} errors.`
    await loadServerAccounts()
    reloadAccounts()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    syncingAll.value = false
  }
}

async function deleteAccount(id) {
  if (!confirm(locale.value === 'vi' ? 'Bạn chắc chắn muốn xóa tài khoản này?' : 'Are you sure you want to delete this account?')) return
  errorMessage.value = ''
  try {
    await apiRequest(`/api/mt5/accounts/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    successMessage.value = locale.value === 'vi' ? 'Đã xóa tài khoản.' : 'Account deleted.'
    await loadServerAccounts()
    reloadAccounts()
  } catch (error) {
    errorMessage.value = error.message
  }
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', theme.value)
  await loadServerAccounts()
})
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
.tz-page[data-theme='light'] { --bg: #fff7fb; --card: #ffffff; --card2: #fff0f7; --border: #f2d6e6; --primary: #ff3b9d; --text: #17121a; --sub: #6f6472; --success: #00a86b; --danger: #ff3366; }
.tz-sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); height: 100vh; display: flex; flex-direction: column; background: var(--card); border-right: 1px solid var(--border); }
.tz-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
.tz-logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--hot)); color: #fff; font-size: 16px; font-weight: 800; }
.tz-logo-text { color: var(--text); font-size: 16px; font-weight: 700; }
.tz-logo-text span { color: var(--primary); }
.tz-nav-section { flex: 1; padding: 10px 0; }
.tz-nav-label { padding: 8px 18px 4px; color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; }
.tz-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; color: var(--sub); text-decoration: none; font-size: 13px; transition: all 0.18s; position: relative; }
.tz-nav-item:hover, .tz-nav-item.active { color: var(--primary); background: var(--primary-dim); font-weight: 600; }
.tz-nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary); border-radius: 0 3px 3px 0; box-shadow: 0 0 8px var(--primary); }
.tz-nav-icon { width: 16px; height: 16px; display: inline-flex; opacity: 0.8; }
.tz-sidebar-user { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
.tz-user-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #a020f0); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
.tz-user-info { flex: 1; }
.tz-user-name { font-size: 12px; font-weight: 600; color: var(--text); }
.tz-user-plan { font-size: 10px; color: var(--primary); }
.tz-main { flex: 1; min-width: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.tz-header { height: var(--header-h); display: flex; align-items: center; gap: 12px; padding: 0 20px; background: var(--card); border-bottom: 1px solid var(--border); }
.tz-header-welcome { flex: 1; }
.tz-header-welcome h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text); }
.tz-header-welcome p { margin: 2px 0 0; font-size: 11px; color: var(--sub); }
.tz-header-controls { display: flex; align-items: center; gap: 8px; }
.tz-btn-add, .tz-btn-filter, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-btn-add, .tz-btn-filter { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; }
.tz-btn-add { border: none; background: var(--primary); color: #fff; font-weight: 600; transition: all 0.2s; }
.tz-btn-add:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,45,154,0.3); }
.tz-btn-add:disabled { opacity: 0.6; cursor: not-allowed; }
.tz-btn-filter { background: var(--card2); }
.tz-btn-danger { color: var(--danger); border-color: rgba(255,59,122,0.3); }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-alert { border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; animation: fadeIn 0.3s ease; }
.tz-alert.danger { background: rgba(255,59,122,0.1); border: 1px solid rgba(255,59,122,0.3); color: var(--danger); }
.tz-alert.success { background: rgba(0,208,132,0.1); border: 1px solid rgba(0,208,132,0.3); color: var(--success); }
.tz-sc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.tz-sc-panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.tz-sc-panel h3 { font-size: 15px; margin-bottom: 12px; }
.tz-sc-label { display: block; color: var(--sub); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 4px; }
.tz-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--card2); color: var(--text); font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
.tz-input:focus { border-color: var(--primary); }
.tz-select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23b8a8b8' viewBox='0 0 24 24'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 10px center; background-size: 14px; padding-right: 32px; }
.tz-sc-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.tz-pill { font-size: 11px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.08); }
.tz-pill.on { background: rgba(0,208,132,0.15); color: var(--success); }
.tz-pill.demo { background: rgba(0, 168, 255, 0.15); color: #00a8ff; border: 1px solid rgba(0, 168, 255, 0.3); }
.tz-pill.live { background: rgba(0, 208, 132, 0.15); color: var(--success); border: 1px solid rgba(0, 208, 132, 0.3); }
.tz-pill.prop { background: rgba(255, 45, 154, 0.15); color: var(--primary); border: 1px solid rgba(255, 45, 154, 0.3); }

.tz-mini-stat { display: flex; flex-direction: column; gap: 2px; padding: 8px 14px; background: var(--card2); border: 1px solid var(--border); border-radius: 10px; }
.tz-mini-label { font-size: 10px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; }
.tz-mini-value { font-size: 14px; font-weight: 700; font-family: var(--font-mono); }

.tz-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
.tz-spinner-sm { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.tz-atable { width: 100%; border-collapse: collapse; }
.tz-atable th, .tz-atable td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 12px; }
.tz-atable th { color: var(--sub); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.tz-atable tr { transition: background 0.15s; }
.tz-atable tr:hover { background: var(--primary-dim); }

.tz-sc-guide { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; }
.tz-sc-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tz-sc-step { display: flex; gap: 10px; align-items: flex-start; }
.tz-sc-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.tz-sc-step strong { display: block; font-size: 13px; margin-bottom: 4px; }
.tz-sc-step p { font-size: 11px; color: var(--sub); line-height: 1.5; }

@media (max-width: 1200px) { .tz-sc-steps { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 960px) { .tz-sc-grid { grid-template-columns: 1fr; } .tz-sc-steps { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .tz-page { --sidebar-w: 72px; } .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; } }
</style>
