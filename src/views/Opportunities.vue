<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from '../composables/useI18n.js'

const route = useRoute()
const userStore = useUserStore()
const { locale } = useI18n()

const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const loading = ref(false)
const errorMessage = ref('')
const filter = ref('all')
const analysis = ref({ behaviorScore: 0, winRate: 0, drawdownPct: 0, disciplineRate: 0, plan: 'premium' })

const authHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))
const behaviorScore = computed(() => Math.round(Number(analysis.value?.behaviorScore || 0)))

const baseOpportunities = computed(() => [
  {
    id: 'ftmo-elite',
    type: 'prop',
    name: 'FTMO Elite',
    badge: 'HOT',
    funding: '$200K',
    split: '90%',
    needScore: 80,
    needWin: 55,
    needDD: 10
  },
  {
    id: 'the5ers',
    type: 'prop',
    name: 'The5ers Growth',
    badge: 'FEATURED',
    funding: '$100K',
    split: '85%',
    needScore: 75,
    needWin: 52,
    needDD: 12
  },
  {
    id: 'sea-quant',
    type: 'fund',
    name: 'SEA Quant Fund',
    badge: 'NEW',
    funding: '$5M AUM',
    split: '20%',
    needScore: 85,
    needWin: 58,
    needDD: 8
  },
  {
    id: 'remote-trader',
    type: 'job',
    name: 'Remote Trader · CryptoVN',
    badge: 'HIRING',
    funding: '$2K/mo',
    split: 'Bonus 20%',
    needScore: 70,
    needWin: 50,
    needDD: 14
  }
])

const opportunities = computed(() => {
  const score = Number(analysis.value?.behaviorScore || 0)
  const winRate = Number(analysis.value?.winRate || 0)
  const dd = Number(analysis.value?.drawdownPct || 100)
  return baseOpportunities.value
    .map((item) => {
      const scorePart = Math.max(0, Math.min(100, (score / item.needScore) * 50))
      const winPart = Math.max(0, Math.min(100, (winRate / item.needWin) * 30))
      const ddPart = Math.max(0, Math.min(100, (item.needDD / Math.max(dd, 0.5)) * 20))
      const match = Math.max(5, Math.min(99, Math.round(scorePart + winPart + ddPart)))
      return {
        ...item,
        match,
        eligible: match >= 70
      }
    })
    .filter((item) => filter.value === 'all' || item.type === filter.value)
})

async function loadAnalysis() {
  if (!userStore.token) return
  loading.value = true
  errorMessage.value = ''
  try {
    const payload = await apiRequest('/api/trading/exness/analysis', { headers: authHeaders.value })
    analysis.value = payload?.analysis || analysis.value
  } catch (error) {
    errorMessage.value = error.message || 'Không tải được cơ hội từ dữ liệu MT5.'
  } finally {
    loading.value = false
  }
}

function applyNow(item) {
  if (!item?.eligible) return
  alert(
    locale.value === 'vi'
      ? `Đã gửi hồ sơ ứng tuyển: ${item.name}\nHệ thống sẽ gửi trạng thái về email của bạn.`
      : `Application sent: ${item.name}\nStatus update will be sent to your email.`
  )
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
  loadAnalysis()
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
          <h2>{{ locale === 'vi' ? 'Cơ hội dành cho trader' : 'Opportunities for traders' }}</h2>
          <p>{{ locale === 'vi' ? 'Tìm kiếm quỹ đầu tư và cơ hội việc làm dựa trên hiệu suất giao dịch' : 'Find funding and job opportunities based on your trading performance' }}</p>
        </div>
        <div class="tz-header-controls">
          <button class="tz-btn-filter" :disabled="loading" @click="loadAnalysis">
            {{ loading ? (locale === 'vi' ? 'Đang tải...' : 'Loading...') : locale === 'vi' ? 'Làm mới' : 'Refresh' }}
          </button>
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div class="opp-wrap">
          <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>

          <article class="hero card">
            <div class="hero-left">
              <h3>{{ locale === 'vi' ? 'Hồ sơ match hiện tại' : 'Current profile match' }}</h3>
              <div class="score">{{ behaviorScore }}/100</div>
              <p>
                Behavior Score ·
                {{ Number(analysis.winRate || 0).toFixed(1) }}% Winrate ·
                {{ Number(analysis.drawdownPct || 0).toFixed(1) }}% Drawdown
              </p>
            </div>
            <div class="hero-right">
              <span class="chip pro">PREMIUM</span>
              <p>
                {{
                  locale === 'vi'
                    ? 'Kỷ luật giao dịch ổn định và drawdown thấp giúp match rate cao hơn.'
                    : 'Stable trading discipline and lower drawdown improve match rate.'
                }}
              </p>
            </div>
          </article>

          <div class="filters">
            <button class="fbtn" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
            <button class="fbtn" :class="{ active: filter === 'prop' }" @click="filter = 'prop'">Prop Firms</button>
            <button class="fbtn" :class="{ active: filter === 'fund' }" @click="filter = 'fund'">Investors</button>
            <button class="fbtn" :class="{ active: filter === 'job' }" @click="filter = 'job'">Jobs</button>
          </div>

          <div class="grid">
            <article v-for="item in opportunities" :key="item.id" class="card opp">
              <div class="opp-top">
                <h3>{{ item.name }}</h3>
                <span class="badge">{{ item.badge }}</span>
              </div>
              <p class="meta">{{ item.type.toUpperCase() }}</p>
              <div class="stats">
                <span>{{ item.funding }}</span>
                <span>{{ item.split }}</span>
                <span>Need score: {{ item.needScore }}</span>
              </div>
              <div class="match">
                <div class="track"><div class="fill" :style="{ width: `${item.match}%` }"></div></div>
                <strong>{{ item.match }}%</strong>
              </div>
              <button class="btn primary" :disabled="!item.eligible" @click="applyNow(item)">
                {{ item.eligible ? (locale === 'vi' ? 'Apply ngay' : 'Apply now') : locale === 'vi' ? 'Chưa đủ điều kiện' : 'Not eligible' }}
              </button>
            </article>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Syne', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
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

.opp-wrap { max-width: 1260px; margin: 0 auto; display: grid; gap: 14px; }

.card {
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--card);
}

.alert.danger { border: 1px solid rgba(255, 59, 122, 0.3); background: rgba(255, 59, 122, 0.1); color: var(--danger); padding: 10px 12px; border-radius: 12px; font-size: 13px; }

.hero { padding: 16px; display: flex; justify-content: space-between; gap: 14px; }
.hero-left h3 { margin: 0; font-size: 13px; color: var(--primary); }
.score { font-family: var(--font-mono); font-size: 38px; color: var(--primary); margin-top: 4px; font-weight: 800; }
.hero-left p, .hero-right p { margin: 4px 0 0; color: var(--sub); font-size: 12px; }
.hero-right { max-width: 420px; display: grid; gap: 8px; justify-items: flex-start; }
.chip {
  border-radius: 999px; padding: 4px 10px; font-size: 10px; font-weight: 700;
  border: 1px solid var(--border); color: var(--sub);
}
.chip.pro { color: var(--success); border-color: rgba(0, 208, 132, 0.3); background: rgba(0, 208, 132, 0.08); }

.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.fbtn {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card2);
  color: var(--sub);
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 11px;
}
.fbtn.active { color: var(--primary); border-color: var(--primary); background: var(--primary-dim); }

.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.opp { padding: 14px; display: grid; gap: 8px; transition: transform .2s ease, border-color .2s ease; }
.opp:hover { transform: translateY(-2px); border-color: var(--primary); }
.opp-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.opp h3 { margin: 0; font-size: 15px; font-weight: 700; }
.badge { font-size: 9px; font-weight: 700; border-radius: 999px; padding: 3px 8px; background: rgba(0, 208, 132, 0.1); color: var(--success); border: 1px solid rgba(0, 208, 132, 0.3); }
.meta { margin: 0; font-size: 10px; color: var(--sub); letter-spacing: .08em; font-weight: 600; }
.stats { display: grid; gap: 4px; color: var(--sub); font-size: 12px; }
.match { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.track { height: 8px; border-radius: 999px; background: var(--card2); border: 1px solid var(--border); overflow: hidden; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--danger), var(--primary), var(--success)); box-shadow: 0 0 10px var(--primary-glow); }
.match strong { font-family: var(--font-mono); color: var(--primary); font-size: 12px; }

.btn {
  border-radius: 8px;
  border: 1px solid var(--border);
  color: var(--text);
  background: var(--card2);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 12px;
}
.btn.primary { border: none; background: var(--primary); color: #fff; box-shadow: 0 0 16px var(--primary-glow); }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: .6; cursor: default; transform: none !important; }

@media (max-width: 1120px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) {
  .tz-page { --sidebar-w: 72px; }
  .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; }
  .tz-header { height: auto; flex-direction: column; }
  .grid { grid-template-columns: 1fr; }
}
</style>
