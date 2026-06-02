<template>
  <div class="tz-page" :data-theme="theme" :style="spotlightStyle" @pointermove="onPointerMove" @pointerleave="onPointerLeave">
    <aside class="tz-sidebar">
      <div class="tz-sidebar-logo"><div class="tz-logo-icon">TZ</div><div class="tz-logo-text">Trade<span>Zella</span></div></div>
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
          <h2>{{ locale === 'vi' ? 'Bảng xếp hạng hành vi' : 'Behavior leaderboard' }}</h2>
          <p>{{ locale === 'vi' ? 'Xếp hạng hiệu suất và độ kỷ luật của cộng đồng trader' : 'Trader discipline and performance ranking' }}</p>
        </div>
        <div class="tz-header-controls">
          <select v-model.number="days" @change="loadBoard" class="tz-select-sm">
            <option :value="7">7D</option>
            <option :value="30">30D</option>
            <option :value="90">90D</option>
          </select>
          <button class="tz-btn-filter" :disabled="loading" @click="loadBoard">
            {{ loading ? (locale === 'vi' ? 'Đang tải...' : 'Loading...') : locale === 'vi' ? 'Làm mới' : 'Refresh' }}
          </button>
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>

      <main class="tz-dashboard">
        <div class="lb-particles" aria-hidden="true">
          <span
            v-for="p in particles"
            :key="p.id"
            class="particle"
            :style="{
              '--x': `${p.x}%`,
              '--size': `${p.size}px`,
              '--dur': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--alpha': `${p.alpha}`
            }"
          />
        </div>

        <div class="lb-wrap">
          <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>

          <article class="card top3" v-if="rows.length">
            <div v-for="item in rows.slice(0, 3)" :key="item.userId" class="podium" :class="`p${item.position}`">
              <div class="badge">#{{ item.position }}</div>
              <img :src="item.nftImageUrl || defaultImage(item.rankTier)" alt="nft" @error="onImageError" />
              <strong>{{ item.name }}</strong>
              <span>{{
                locale === 'vi'
                  ? rankLabelVi(item.rankTierLabelVi, item.rankTier)
                  : rankLabelEn(item.rankTierLabelEn, item.rankTier)
              }}</span>
              <div class="points">{{ item.rankPoints }} pts</div>
            </div>
          </article>

          <article class="card table-card">
            <div class="table-head">
              <h3>{{ locale === 'vi' ? 'Xếp hạng chi tiết' : 'Detailed ranking' }}</h3>
              <span>{{ locale === 'vi' ? `Tổng ${totalUsers} user` : `${totalUsers} users` }}</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{{ locale === 'vi' ? 'Trader' : 'Trader' }}</th>
                    <th>{{ locale === 'vi' ? 'Hạng' : 'Tier' }}</th>
                    <th>{{ locale === 'vi' ? 'Điểm hiệu suất' : 'Points' }}</th>
                    <th>Behavior</th>
                    <th>Winrate</th>
                    <th>{{ locale === 'vi' ? 'NFT' : 'NFT' }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in rows" :key="item.userId" :class="{ me: item.userId === myUserId }">
                    <td>{{ item.position }}</td>
                    <td class="name-cell">
                      <img :src="item.nftImageUrl || defaultImage(item.rankTier)" alt="avatar" @error="onImageError" />
                      <div>
                        <strong>{{ item.name }}</strong>
                        <small>{{ locale === 'vi' ? 'Bảo mật thông tin người dùng' : 'User privacy protected' }}</small>
                      </div>
                    </td>
                    <td>
                      <span class="tier-pill">{{
                        locale === 'vi'
                          ? rankLabelVi(item.rankTierLabelVi, item.rankTier)
                          : rankLabelEn(item.rankTierLabelEn, item.rankTier)
                      }}</span>
                    </td>
                    <td>{{ item.rankPoints }}</td>
                    <td>{{ Number(item.behaviorScore || 0).toFixed(1) }}</td>
                    <td>{{ Number(item.winRate || 0).toFixed(1) }}%</td>
                    <td>
                      <span class="nft-pill" :class="{ on: item.nftActive }">{{ item.nftActive ? 'ON' : 'OFF' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { apiRequest } from '../../lib/api.js'
import { useUserStore } from '../../stores/useUserStore.js'
import { useI18n } from '../../composables/useI18n.js'

const route = useRoute()
const userStore = useUserStore()
const { locale } = useI18n()

const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const loading = ref(false)
const days = ref(30)
const totalUsers = ref(0)
const rows = ref([])
const errorMessage = ref('')

const pointer = ref({ x: 50, y: 50, active: false })

const myUserId = computed(() => String(userStore.user?.id || ''))
const authHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))

const spotlightStyle = computed(() => ({
  '--mx': `${pointer.value.x}%`,
  '--my': `${pointer.value.y}%`,
  '--spot-opacity': pointer.value.active ? 1 : 0
}))

const particles = Array.from({ length: 26 }, (_, i) => {
  const seed = (Math.sin((i + 1) * 947.17) + 1) * 0.5
  const seed2 = (Math.cos((i + 1) * 613.41) + 1) * 0.5
  return {
    id: i,
    x: Math.round(seed * 100),
    size: 1.6 + seed2 * 2.4,
    duration: 6 + seed * 14,
    delay: seed2 * -16,
    dx: Math.round((seed - 0.5) * 36),
    dy: -120 - Math.round(seed2 * 210),
    alpha: 0.22 + seed2 * 0.48
  }
})

function defaultImage(tier = 'bronze') {
  return `https://images.luminafox.app/nft/${tier || 'bronze'}.png`
}

function rankLabelVi(label, fallback) {
  return label || fallback || 'Đồng'
}

function rankLabelEn(label, fallback) {
  return label || fallback || 'Bronze'
}

function onPointerMove(event) {
  const rect = event.currentTarget?.getBoundingClientRect?.()
  if (!rect) return
  pointer.value = {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
    active: true
  }
}

function onPointerLeave() {
  pointer.value.active = false
}

function onImageError(event) {
  const target = event?.target
  if (!target || target.dataset.fallbackApplied === '1') return
  target.dataset.fallbackApplied = '1'
  target.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="%23f72585"/><stop offset="1" stop-color="%237a2cff"/></linearGradient></defs><rect width="100%" height="100%" rx="20" fill="%230c1022"/><rect x="3" y="3" width="154" height="154" rx="17" fill="none" stroke="url(%23g)" stroke-opacity=".6"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="48" font-weight="700" fill="%23f7f3ff">LF</text></svg>'
}

async function loadBoard() {
  if (!userStore.token) return
  loading.value = true
  errorMessage.value = ''
  try {
    const payload = await apiRequest(`/api/trading/leaderboard?days=${Number(days.value || 30)}&limit=100`, {
      headers: authHeaders.value
    })
    rows.value = Array.isArray(payload?.rows) ? payload.rows : []
    totalUsers.value = Number(payload?.totalUsers || rows.value.length)
  } catch (error) {
    errorMessage.value = error.message || 'Không tải được leaderboard.'
  } finally {
    loading.value = false
  }
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
  loadBoard()
})
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Syne', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); position: relative; isolation: isolate; }
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
.tz-btn-filter, .tz-icon-btn, .tz-select-sm { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-btn-filter { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
.tz-select-sm { padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-theme-toggle-knob { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); font-size: 11px; }

.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); position: relative; }

.tz-page::before {
  content: '';
  position: absolute;
  inset: -22% -10%;
  background:
    radial-gradient(circle at 12% 24%, rgba(255, 55, 167, 0.16), transparent 48%),
    radial-gradient(circle at 88% 8%, rgba(145, 70, 255, 0.15), transparent 42%),
    radial-gradient(circle at 50% 100%, rgba(12, 225, 195, 0.12), transparent 46%);
  z-index: -2;
  pointer-events: none;
}

.tz-page::after {
  content: '';
  position: absolute;
  inset: -14%;
  z-index: -1;
  pointer-events: none;
  opacity: var(--spot-opacity, 0);
  transition: opacity 0.24s ease;
  background: radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 80, 184, 0.18), transparent 68%);
}

.lb-particles {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  left: var(--x);
  bottom: -10%;
  width: var(--size);
  height: var(--size);
  border-radius: 999px;
  opacity: var(--alpha);
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.9), rgba(255, 57, 170, 0.45));
  box-shadow: 0 0 14px rgba(255, 53, 161, 0.55);
  animation: fly var(--dur) linear var(--delay) infinite;
}

@keyframes fly {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: calc(var(--alpha) * 0.3);
  }
  12% {
    opacity: var(--alpha);
  }
  100% {
    transform: translate3d(var(--dx), var(--dy), 0) scale(0.75);
    opacity: 0;
  }
}

.lb-wrap {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.alert.danger {
  border: 1px solid rgba(255, 23, 68, 0.4);
  background: rgba(255, 23, 68, 0.1);
  color: #ffb7ca;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 13px;
}

.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 14px;
  box-shadow: 0 14px 40px rgba(8, 7, 20, 0.26);
  transition: border-color 0.24s ease, box-shadow 0.24s ease;
}

.card:hover {
  border-color: var(--primary);
  box-shadow: 0 0 20px var(--primary-dim);
}

.top3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.podium {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px;
  text-align: center;
  background: var(--card2);
  transition: border-color 0.24s ease, box-shadow 0.24s ease;
}

.podium:hover {
  border-color: var(--primary);
  box-shadow: 0 0 16px var(--primary-dim);
}

.podium.p1 {
  border-color: rgba(255, 214, 10, 0.45);
}

.podium img {
  width: 86px;
  height: 86px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--border);
  background: rgba(13, 15, 30, 0.9);
}

.badge {
  font-family: var(--font-mono);
  color: #ffd86f;
  font-weight: 800;
}

.podium strong {
  display: block;
  margin-top: 8px;
}

.podium span {
  color: var(--sub);
  font-size: 12px;
}

.points {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 20px;
  color: #fff;
}

.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.table-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.table-head span {
  color: var(--sub);
  font-size: 12px;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--border);
  padding: 9px 8px;
  text-align: left;
  font-size: 13px;
}

th {
  color: var(--sub);
  font-weight: 600;
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background: var(--primary-dim);
}

tr.me {
  background: var(--primary-dim);
  border-left: 3px solid var(--primary);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-cell img {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(11, 13, 30, 0.9);
}

.name-cell small {
  display: block;
  color: var(--sub);
  font-size: 11px;
}

.tier-pill,
.nft-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 3px 8px;
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  background: var(--card2);
}

.nft-pill.on {
  border-color: rgba(0, 208, 132, 0.4);
  color: #9dffcb;
  background: rgba(0, 208, 132, 0.1);
}

@media (max-width: 900px) {
  .tz-page { --sidebar-w: 72px; }
  .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; }
  .top3 { grid-template-columns: 1fr; }
  .tz-header { height: auto; flex-direction: column; }
}
</style>
