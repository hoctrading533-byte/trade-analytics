<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'
import { useUiStore } from '../stores/useUiStore.js'
import { useI18n } from '../composables/useI18n.js'
import LanguageToggle from '../components/LanguageToggle.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const uiStore = useUiStore()
const { t } = useI18n()

const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const loading = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const profileForm = reactive({
  name: '',
  phone: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const authHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))
const isLocalAccount = computed(() => String(userStore.user?.provider || 'local') === 'local')
const localeLabel = computed(() => (uiStore.locale === 'vi' ? 'Tiếng Việt' : 'English'))

function setMessage({ error = '', success = '' }) {
  errorMessage.value = error
  successMessage.value = success
}

function resetPasswordForm() {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
}

function fillProfileForm() {
  profileForm.name = String(userStore.user?.name || '')
  profileForm.phone = String(userStore.user?.phone || '')
}

async function loadProfile() {
  if (!userStore.token) return
  loading.value = true
  setMessage({})
  try {
    await userStore.fetchMe()
    fillProfileForm()
  } catch (error) {
    setMessage({ error: error.message || 'Không tải được hồ sơ người dùng.' })
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  const name = String(profileForm.name || '').trim()
  const phone = String(profileForm.phone || '').trim()
  if (!name) {
    setMessage({ error: 'Tên hiển thị không được để trống.' })
    return
  }
  savingProfile.value = true
  setMessage({})
  try {
    const payload = await apiRequest('/api/auth/profile', {
      method: 'PATCH',
      headers: authHeaders.value,
      body: JSON.stringify({ name, phone })
    })
    userStore.user = payload?.user || userStore.user
    fillProfileForm()
    setMessage({ success: 'Đã lưu hồ sơ cá nhân thành công.' })
  } catch (error) {
    setMessage({ error: error.message || 'Không thể cập nhật hồ sơ.' })
  } finally {
    savingProfile.value = false
  }
}

async function updatePassword() {
  if (!isLocalAccount.value) {
    setMessage({ error: 'Tài khoản Google không hỗ trợ đổi mật khẩu tại đây.' })
    return
  }
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    setMessage({ error: 'Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới.' })
    return
  }
  if (passwordForm.newPassword.length < 6) {
    setMessage({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' })
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    setMessage({ error: 'Mật khẩu xác nhận chưa khớp.' })
    return
  }
  savingPassword.value = true
  setMessage({})
  try {
    await apiRequest('/api/auth/password', {
      method: 'PATCH',
      headers: authHeaders.value,
      body: JSON.stringify({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
    })
    resetPasswordForm()
    setMessage({ success: 'Đã đổi mật khẩu thành công.' })
  } catch (error) {
    setMessage({ error: error.message || 'Không thể đổi mật khẩu.' })
  } finally {
    savingPassword.value = false
  }
}

function toggleLocale() {
  uiStore.toggleLocale()
}

function logout() {
  userStore.logout()
  router.push('/login')
}

const icons = {
  grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>',
  gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>'
}

const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]

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

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  loadProfile()
})
</script>

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
          <h2>Thiết lập tài khoản</h2>
          <p>Quản lý thông tin cá nhân, mật khẩu và cấu hình hiển thị</p>
        </div>
        <div class="tz-header-controls">
          <button class="tz-btn-filter" :disabled="loading" @click="loadProfile">
            {{ loading ? 'Đang tải...' : 'Làm mới' }}
          </button>
          <LanguageToggle />
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div class="settings-wrap">
          <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>
          <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

          <div class="grid">
            <article class="card">
              <h3>Hồ sơ cá nhân</h3>
              <label class="field">
                <span>Tên hiển thị</span>
                <input v-model="profileForm.name" placeholder="Nhập tên hiển thị" class="tz-input" />
              </label>
              <label class="field">
                <span>Số điện thoại</span>
                <input v-model="profileForm.phone" placeholder="VD: 09xxxxxxxx" class="tz-input" />
              </label>
              <div class="meta">
                <span>Email</span>
                <strong>{{ userStore.user?.email || '-' }}</strong>
              </div>
              <div class="meta">
                <span>Nhà cung cấp</span>
                <strong>{{ String(userStore.user?.provider || 'local').toUpperCase() }}</strong>
              </div>
              <button class="btn primary" :disabled="savingProfile" @click="saveProfile">
                {{ savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ' }}
              </button>
            </article>

            <article class="card">
              <h3>Bảo mật tài khoản</h3>
              <p class="card-sub">
                {{ isLocalAccount ? 'Đổi mật khẩu đăng nhập cho tài khoản.' : 'Tài khoản liên kết Google: vui lòng đổi mật khẩu tại Google.' }}
              </p>
              <label class="field">
                <span>Mật khẩu cũ</span>
                <input v-model="passwordForm.oldPassword" type="password" :disabled="!isLocalAccount" class="tz-input" />
              </label>
              <label class="field">
                <span>Mật khẩu mới</span>
                <input v-model="passwordForm.newPassword" type="password" :disabled="!isLocalAccount" class="tz-input" />
              </label>
              <label class="field">
                <span>Xác nhận mật khẩu mới</span>
                <input v-model="passwordForm.confirmPassword" type="password" :disabled="!isLocalAccount" class="tz-input" />
              </label>
              <button class="btn primary" :disabled="savingPassword || !isLocalAccount" @click="updatePassword">
                {{ savingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu' }}
              </button>
            </article>

            <article class="card full">
              <h3>Tuỳ chọn hệ thống</h3>
              <div class="meta">
                <span>Ngôn ngữ hiện tại</span>
                <strong>{{ localeLabel }}</strong>
              </div>
              <div class="meta">
                <span>Gói sử dụng</span>
                <strong>{{ userStore.isPro ? 'PREMIUM PRO' : 'FREE MEMBER' }}</strong>
              </div>
              <div class="actions">
                <button class="btn ghost" @click="toggleLocale">Chuyển ngôn ngữ</button>
              </div>
            </article>

            <article class="card full" style="border-color: rgba(255, 59, 122, 0.3);">
              <h3 style="color: var(--danger);">Quản lý phiên đăng nhập</h3>
              <p class="card-sub">Đăng xuất khỏi ứng dụng LuminaFox trên thiết bị này.</p>
              <div class="actions" style="margin-top: 10px;">
                <button class="btn primary" style="background: var(--danger); box-shadow: 0 0 16px rgba(255, 59, 122, 0.3);" @click="logout">
                  Đăng xuất tài khoản
                </button>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Plus Jakarta Sans', 'Be Vietnam Pro', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
.tz-page[data-theme='light'] { --bg: #fff7fb; --card: #ffffff; --card2: #fff0f7; --border: #f2d6e6; --primary: #ff3b9d; --primary-glow: rgba(255,59,157,0.1); --primary-dim: rgba(255,59,157,0.05); --hot: #ff3b9d; --text: #17121a; --sub: #6f6472; --success: #00a86b; --danger: #ff3366; }
.tz-sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); height: 100vh; display: flex; flex-direction: column; background: var(--card); border-right: 1px solid var(--border); }
.tz-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
.tz-logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--hot)); color: #fff; font-size: 16px; font-weight: 800; }
.tz-logo-text { color: var(--text); font-size: 16px; font-weight: 700; }
.tz-logo-text span { color: var(--primary); }
.tz-nav-section { flex: 1; padding: 10px 0; }
.tz-nav-label { padding: 8px 18px 4px; color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; }
.tz-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; color: var(--sub); text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.18s; }
.tz-nav-item:hover, .tz-nav-item.active { color: var(--primary); background: var(--primary-dim); font-weight: 600; }
.tz-nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary); border-radius: 0 3px 3px 0; }
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
.tz-btn-filter, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-btn-filter { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-theme-toggle-knob { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); font-size: 11px; }

.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }

.settings-wrap { max-width: 1180px; margin: 0 auto; display: grid; gap: 14px; }

.alert { border-radius: 12px; padding: 10px 12px; font-size: 13px; font-weight: 600; }
.alert.danger { border: 1px solid rgba(255, 59, 122, 0.3); background: rgba(255, 59, 122, 0.1); color: var(--danger); }
.alert.success { border: 1px solid rgba(0, 208, 132, 0.3); background: rgba(0, 208, 132, 0.1); color: var(--success); }

.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.card { border-radius: var(--radius); border: 1px solid var(--border); background: var(--card); padding: 16px; display: grid; gap: 10px; }
.card.full { grid-column: 1 / -1; }
.card h3 { margin: 0; font-size: 15px; font-weight: 700; }
.card-sub { margin: 0; color: var(--sub); font-size: 12px; }

.field { display: grid; gap: 6px; }
.field span { font-size: 11px; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; }
.tz-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--card2); color: var(--text); font-size: 13px; }

.meta { border-radius: 10px; border: 1px dashed var(--border); padding: 9px 11px; display: flex; justify-content: space-between; gap: 10px; color: var(--text); font-size: 13px; }
.meta span { color: var(--sub); }

.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { border-radius: 8px; border: 1px solid var(--border); color: var(--text); background: var(--card2); padding: 10px 14px; font-weight: 600; cursor: pointer; font-size: 12px; }
.btn.primary { border: none; background: var(--primary); color: #fff; box-shadow: 0 0 16px var(--primary-glow); }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: 0.65; cursor: default; transform: none !important; }

@media (max-width: 900px) {
  .tz-page { --sidebar-w: 72px; }
  .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; }
  .grid { grid-template-columns: 1fr; }
}
</style>
