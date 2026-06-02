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
        <div class="tz-header-welcome"><h2>Kết nối MT5</h2><p>Kết nối tài khoản MT5 để đồng bộ dữ liệu giao dịch thực tế</p></div>
        <div class="tz-header-controls">
          <button class="tz-btn-add" @click="useMockData" :disabled="isMockMode">
            {{ isMockMode ? '✓ Mock Data Active' : 'Dùng Mock Data' }}
          </button>
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div v-if="errorMessage" class="tz-alert danger">{{ errorMessage }}</div>
        <div v-if="successMessage" class="tz-alert success">{{ successMessage }}</div>
        <div v-if="isMockMode" class="tz-alert info">Đang sử dụng dữ liệu mô phỏng (Mock Data). Dữ liệu này phục vụ demo và phát triển.</div>

        <section class="tz-sc-grid">
          <article class="tz-sc-panel">
            <h3>Thông tin tài khoản MT5</h3>
            <label class="tz-sc-label">MT5 Login</label>
            <input v-model.trim="form.login" class="tz-input" placeholder="Ví dụ: 41512345" />

            <label class="tz-sc-label">MT5 Password</label>
            <input v-model.trim="form.password" type="password" class="tz-input" :placeholder="'Mật khẩu trader/investor'" />

            <label class="tz-sc-label">MT5 Server</label>
            <input v-model.trim="form.server" class="tz-input" placeholder="Ví dụ: Exness-MT5Trial14" />

            <label class="tz-sc-label">Số ngày đồng bộ</label>
            <input v-model.number="syncDays" type="number" min="1" max="365" class="tz-input" />

            <div class="tz-sc-actions">
              <button class="tz-btn-add" :disabled="connecting" @click="connectAndSync">
                {{ connecting ? 'Đang kết nối...' : 'Kết nối & Đồng bộ ngay' }}
              </button>
              <button class="tz-btn-filter" :disabled="syncing || !isConnected" @click="syncNow">
                {{ syncing ? 'Đang đồng bộ...' : 'Đồng bộ lại' }}
              </button>
              <button class="tz-btn-filter tz-btn-danger" :disabled="!isConnected" @click="disconnect">
                Hủy kết nối
              </button>
            </div>
          </article>

          <article class="tz-sc-panel">
            <h3>Trạng thái kết nối</h3>
            <div class="tz-sc-status" :class="{ on: isConnected }">
              <span>{{ isConnected ? `Login: ${status.login || form.login || '--'}` : 'Chưa kết nối MT5' }}</span>
              <span class="tz-pill" :class="{ on: isConnected }">{{ isConnected ? 'Online' : 'Offline' }}</span>
            </div>
            <div class="tz-sc-info">
              <div><dt>Server</dt><dd>{{ status.server || form.server || '--' }}</dd></div>
              <div><dt>Lần sync gần nhất</dt><dd>{{ lastSyncText }}</dd></div>
              <div><dt>Tổng lệnh đã đồng bộ</dt><dd>{{ syncSummary.totalDeals }}</dd></div>
              <div><dt>LONG / SHORT</dt><dd>{{ syncSummary.longCount }} / {{ syncSummary.shortCount }}</dd></div>
              <div><dt>Net PnL</dt><dd :class="syncSummary.netProfit >= 0 ? 'ok' : 'bad'">{{ formatMoney(syncSummary.netProfit) }}</dd></div>
            </div>
          </article>
        </section>

        <section class="tz-sc-guide">
          <h3>Hướng dẫn kết nối MT5 thật</h3>
          <div class="tz-sc-steps">
            <div class="tz-sc-step">
              <span class="tz-sc-step-num">1</span>
              <div>
                <strong>Mở MT5 trên máy tính</strong>
                <p>Đăng nhập tài khoản giao dịch thật của bạn trên MetaTrader 5.</p>
              </div>
            </div>
            <div class="tz-sc-step">
              <span class="tz-sc-step-num">2</span>
              <div>
                <strong>Cho phép kết nập API</strong>
                <p>Vào Tools → Options → Expert Advisors → tick "Allow WebRequest for the following URL" và thêm URL server.</p>
              </div>
            </div>
            <div class="tz-sc-step">
              <span class="tz-sc-step-num">3</span>
              <div>
                <strong>Nhập thông tin đăng nhập</strong>
                <p>Điền Login ID, Password (trader/investor) và Server name (VD: Exness-MT5Trial14).</p>
              </div>
            </div>
            <div class="tz-sc-step">
              <span class="tz-sc-step-num">4</span>
              <div>
                <strong>Nhấn "Kết nối & Đồng bộ"</strong>
                <p>Hệ thống sẽ kết nối đến server, tải dữ liệu giao dịch và phân tích ngay lập tức.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="tz-sc-mock-hint">
          <h3>⚠️ Chưa có backend?</h3>
          <p>Nếu bạn chưa có server backend, hãy nhấn nút <strong>"Dùng Mock Data"</strong> ở góc trên để xem dữ liệu mẫu. Trang Dashboard và Analytics sẽ hiển thị dữ liệu mô phỏng để bạn kiểm tra giao diện.</p>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n.js'
import { fetchMt5MockPayload } from '../mocks/mt5MockApi.js'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'

const route = useRoute()
const userStore = useUserStore()
const { t, locale } = useI18n()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')

function authHeaders() {
  return userStore.token ? { Authorization: `Bearer ${userStore.token}` } : {}
}

const activeTab = ref('standard')
const errorMessage = ref('')
const successMessage = ref('')
const connecting = ref(false)
const syncing = ref(false)
const syncDays = ref(30)
const isMockMode = ref(false)

const status = reactive({
  connected: false,
  login: '',
  server: '',
  lastSyncAt: null
})

const syncSummary = reactive({
  totalDeals: 0,
  longCount: 0,
  shortCount: 0,
  netProfit: 0
})

const form = reactive({
  login: '',
  password: '',
  server: ''
})

const isConnected = computed(() => status.connected || isMockMode.value)

const lastSyncText = computed(() =>
  status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('vi-VN') : 'Chưa đồng bộ'
)

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

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadStatus() {
  if (isMockMode.value) return
  errorMessage.value = ''
  try {
    const data = await apiRequest('/api/trading/exness/status', { headers: authHeaders() })
    if (data && data.connected) {
      status.connected = true
      status.login = data.connection?.mt5Login || ''
      status.server = data.connection?.mt5Server || ''
      status.lastSyncAt = data.lastSyncAt
      form.login = data.connection?.mt5Login || ''
      form.server = data.connection?.mt5Server || ''
      if (data.snapshot) {
        const deals = data.snapshot.historyDeals || data.snapshot.deals || []
        const analysis = computeSummary(deals)
        syncSummary.totalDeals = analysis.total
        syncSummary.longCount = analysis.longs
        syncSummary.shortCount = analysis.shorts
        syncSummary.netProfit = analysis.netPnl
      }
    }
  } catch (error) {
    console.error('Không thể lấy trạng thái MT5:', error)
  }
}

async function connectAndSync() {
  connecting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (!form.login || !form.password || !form.server) {
      throw new Error('Vui lòng nhập đầy đủ Login, Password và Server.')
    }
    
    if (isMockMode.value) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const mock = await fetchMt5MockPayload()
      status.connected = true
      status.login = form.login
      status.server = form.server
      status.lastSyncAt = new Date().toISOString()
      const analysis = computeSummary(mock.trades)
      syncSummary.totalDeals = analysis.total
      syncSummary.longCount = analysis.longs
      syncSummary.shortCount = analysis.shorts
      syncSummary.netProfit = analysis.netPnl
      successMessage.value = 'Kết nối MT5 thành công! Dữ liệu đã được đồng bộ (môi trường phát triển - mock).'
      return
    }

    const payload = await apiRequest('/api/trading/exness/connect-and-sync', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        login: form.login,
        password: form.password,
        server: form.server,
        days: syncDays.value
      })
    })

    if (payload.ok) {
      status.connected = true
      status.login = form.login
      status.server = form.server
      status.lastSyncAt = new Date().toISOString()
      
      const deals = payload.snapshot?.historyDeals || payload.snapshot?.deals || []
      const analysis = computeSummary(deals)
      syncSummary.totalDeals = analysis.total
      syncSummary.longCount = analysis.longs
      syncSummary.shortCount = analysis.shorts
      syncSummary.netProfit = analysis.netPnl

      if (payload.syncOk === false) {
        successMessage.value = `Kết nối thành công nhưng đồng bộ thất bại: ${payload.syncError || 'Lỗi đồng bộ'}`
      } else {
        successMessage.value = 'Kết nối và Đồng bộ tài khoản MT5 thành công!'
      }
    } else {
      throw new Error(payload.message || 'Không thể kết nối MT5.')
    }
  } catch (error) {
    errorMessage.value = error.message || 'Không thể kết nối MT5.'
  } finally {
    connecting.value = false
  }
}

async function syncNow() {
  syncing.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (isMockMode.value) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      status.lastSyncAt = new Date().toISOString()
      successMessage.value = 'Đồng bộ MT5 thành công (môi trường phát triển - mock).'
      return
    }

    const payload = await apiRequest('/api/trading/exness/sync', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        days: syncDays.value
      })
    })

    if (payload.ok) {
      status.lastSyncAt = new Date().toISOString()
      const deals = payload.snapshot?.historyDeals || payload.snapshot?.deals || []
      const analysis = computeSummary(deals)
      syncSummary.totalDeals = analysis.total
      syncSummary.longCount = analysis.longs
      syncSummary.shortCount = analysis.shorts
      syncSummary.netProfit = analysis.netPnl
      successMessage.value = 'Đồng bộ dữ liệu MT5 thành công!'
    } else {
      throw new Error(payload.message || 'Không thể đồng bộ MT5.')
    }
  } catch (error) {
    errorMessage.value = error.message || 'Không thể đồng bộ MT5.'
  } finally {
    syncing.value = false
  }
}

async function disconnect() {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (!isMockMode.value) {
      await apiRequest('/api/trading/exness/connect', {
        method: 'DELETE',
        headers: authHeaders()
      })
    }
    status.connected = false
    status.login = ''
    status.server = ''
    status.lastSyncAt = null
    syncSummary.totalDeals = 0
    syncSummary.longCount = 0
    syncSummary.shortCount = 0
    syncSummary.netProfit = 0
    successMessage.value = 'Đã hủy kết nối MT5.'
  } catch (error) {
    errorMessage.value = error.message || 'Không thể hủy kết nối.'
  }
}

function useMockData() {
  isMockMode.value = !isMockMode.value
  if (isMockMode.value) {
    status.connected = true
    status.login = '91548201'
    status.server = 'Exness-MT5Trial14'
    status.lastSyncAt = new Date().toISOString()
    syncSummary.totalDeals = 67
    syncSummary.longCount = 35
    syncSummary.shortCount = 32
    syncSummary.netProfit = 3420.50
    successMessage.value = 'Đã kích hoạt Mock Data. Dữ liệu mẫu đã sẵn sàng.'
  } else {
    status.connected = false
    status.login = ''
    status.lastSyncAt = null
    syncSummary.totalDeals = 0
    syncSummary.longCount = 0
    syncSummary.shortCount = 0
    syncSummary.netProfit = 0
  }
}

function computeSummary(trades) {
  const list = Array.isArray(trades) ? trades : []
  return {
    total: list.length,
    longs: list.filter(t => {
      const type = Number(t.type);
      // In MT5: 0 is DEAL_TYPE_BUY, 1 is DEAL_TYPE_SELL
      const side = String(t.side || '').toUpperCase();
      return side ? side !== 'SHORT' : type === 0;
    }).length,
    shorts: list.filter(t => {
      const type = Number(t.type);
      const side = String(t.side || '').toUpperCase();
      return side ? side === 'SHORT' : type === 1;
    }).length,
    netPnl: list.reduce((s, t) => s + Number(t.profit || 0), 0)
  }
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', theme.value)
  await loadStatus()
})
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Syne', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
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
.tz-btn-add { border: none; background: var(--primary); color: #fff; font-weight: 600; }
.tz-btn-filter { background: var(--card2); }
.tz-btn-danger { color: var(--danger); border-color: rgba(255,59,122,0.3); }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-alert { border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; }
.tz-alert.danger { background: rgba(255,59,122,0.1); border: 1px solid rgba(255,59,122,0.3); color: var(--danger); }
.tz-alert.success { background: rgba(0,208,132,0.1); border: 1px solid rgba(0,208,132,0.3); color: var(--success); }
.tz-alert.info { background: rgba(66,215,255,0.1); border: 1px solid rgba(66,215,255,0.3); color: var(--sub); }
.tz-sc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.tz-sc-panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.tz-sc-panel h3 { font-size: 15px; margin-bottom: 12px; }
.tz-sc-label { display: block; color: var(--sub); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 4px; }
.tz-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--card2); color: var(--text); font-size: 13px; }
.tz-sc-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.tz-sc-status { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 12px; }
.tz-sc-status.on { border-color: rgba(0,208,132,0.4); background: rgba(0,208,132,0.07); }
.tz-pill { font-size: 11px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.08); }
.tz-pill.on { background: rgba(0,208,132,0.15); color: var(--success); }
.tz-sc-info { display: grid; gap: 10px; font-size: 13px; }
.tz-sc-info dt { color: var(--sub); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.tz-sc-info dd { font-weight: 600; margin-top: 2px; }
.tz-sc-info dd.ok { color: var(--success); }
.tz-sc-info dd.bad { color: var(--danger); }
.tz-sc-guide { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; }
.tz-sc-guide h3 { font-size: 15px; margin-bottom: 12px; }
.tz-sc-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tz-sc-step { display: flex; gap: 10px; align-items: flex-start; }
.tz-sc-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.tz-sc-step strong { display: block; font-size: 13px; margin-bottom: 4px; }
.tz-sc-step p { font-size: 11px; color: var(--sub); line-height: 1.5; }
.tz-sc-mock-hint { background: var(--card); border: 2px dashed var(--border); border-radius: var(--radius); padding: 16px; text-align: center; }
.tz-sc-mock-hint h3 { font-size: 14px; margin-bottom: 6px; color: var(--primary); }
.tz-sc-mock-hint p { font-size: 12px; color: var(--sub); line-height: 1.6; }
@media (max-width: 1200px) { .tz-sc-steps { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 960px) { .tz-sc-grid { grid-template-columns: 1fr; } .tz-sc-steps { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .tz-page { --sidebar-w: 72px; } .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; } }
</style>
