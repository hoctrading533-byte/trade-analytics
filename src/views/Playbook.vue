<template>
  <div class="tz-page" :data-theme="theme">
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
        <div class="tz-header-welcome"><h2>Playbook giao dịch</h2><p>Bộ chiến lược và kịch bản giao dịch mẫu</p></div>
        <div class="tz-header-controls">
          <button class="tz-btn-filter" type="button" @click="showForm = !showForm">+ Tạo Playbook</button>
          <label class="tz-search-bar"><span>⌕</span><input v-model="search" type="text" placeholder="Search playbooks..." /></label>
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div v-if="showForm" class="tz-playbook-form">
          <h3>Tạo Playbook mới</h3>
          <div class="tz-pf-grid">
            <input v-model="newPlaybook.name" placeholder="Tên playbook" class="tz-input" />
            <select v-model="newPlaybook.category" class="tz-input"><option value="setup">Setup</option><option value="psychology">Psychology</option><option value="risk">Risk Management</option><option value="analysis">Analysis</option></select>
            <textarea v-model="newPlaybook.description" placeholder="Mô tả chi tiết..." class="tz-input tz-textarea" rows="3"></textarea>
            <textarea v-model="newPlaybook.rules" placeholder="Rules (mỗi dòng 1 rule)..." class="tz-input tz-textarea" rows="3"></textarea>
          </div>
          <button class="tz-btn-add" @click="savePlaybook">Lưu Playbook</button>
        </div>
        <div class="tz-playbook-grid">
          <article v-for="pb in filteredPlaybooks" :key="pb.id" class="tz-pb-card">
            <div class="tz-pb-head"><h3>{{ pb.name }}</h3><span class="tz-pb-badge">{{ pb.category }}</span></div>
            <p class="tz-pb-desc">{{ pb.description }}</p>
            <div class="tz-pb-rules"><strong>Rules:</strong>
              <ul><li v-for="(rule, i) in pb.rulesList" :key="i">{{ rule }}</li></ul>
            </div>
            <div class="tz-pb-meta"><span>Created: {{ pb.createdAt }}</span><span>{{ pb.tradesCount || 0 }} trades</span></div>
          </article>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const search = ref('')
const showForm = ref(false)
const newPlaybook = ref({ name: '', category: 'setup', description: '', rules: '' })
const playbooks = ref([
  { id: 1, name: 'London Breakout', category: 'setup', description: 'Giao dịch breakout đầu phiên London dựa trên vùng giá châu Á.', rules: 'Chờ giá phá vỡ range châu Á\nVào lệnh sau nến xác nhận\nSL trên/dưới range 10 pips\nTP = 2x risk', createdAt: '2024-01-15', tradesCount: 24 },
  { id: 2, name: 'Liquidity Sweep', category: 'setup', description: 'Săn lệnh sau khi giá quét thanh khoản vùng đỉnh/đáy.', rules: 'Xác định vùng thanh khoản rõ ràng\nChờ phản ứng giá tại vùng\nVào lệnh theo hướng phản ứng\nSL vượt quá vùng quét', createdAt: '2024-02-10', tradesCount: 18 },
  { id: 3, name: 'Pre-Trade Checklist', category: 'psychology', description: 'Kiểm tra tâm lý trước mỗi lệnh để tránh FOMO.', rules: 'Có setup rõ ràng không?\nRisk dưới 2% chưa?\nCó đang revenge trading?\nSL đã đặt chưa?', createdAt: '2024-03-05', tradesCount: 0 },
  { id: 4, name: 'Risk Management Basic', category: 'risk', description: 'Nguyên tắc quản lý vốn cơ bản.', rules: 'Risk tối đa 2%/lệnh\nRR tối thiểu 1:2\nKhông giao dịch tin news\nMax 3 lệnh/ngày', createdAt: '2024-01-20', tradesCount: 0 },
])

const icons = { grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>', card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>', gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>' }
const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]

function isNavActive(item) { if (!item.to) return false; if (item.to === '/dashboard') return route.path === '/dashboard'; return route.path.startsWith(item.to) }

const filteredPlaybooks = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return playbooks.value
  return playbooks.value.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
})

function savePlaybook() {
  if (!newPlaybook.value.name.trim()) return
  playbooks.value.unshift({
    id: Date.now(),
    name: newPlaybook.value.name,
    category: newPlaybook.value.category,
    description: newPlaybook.value.description,
    rulesList: newPlaybook.value.rules.split('\n').filter(Boolean),
    createdAt: new Date().toISOString().slice(0, 10),
    tradesCount: 0
  })
  newPlaybook.value = { name: '', category: 'setup', description: '', rules: '' }
  showForm.value = false
}

function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; localStorage.setItem('tz-theme', theme.value); document.documentElement.setAttribute('data-theme', theme.value) }
onMounted(() => document.documentElement.setAttribute('data-theme', theme.value))
</script>

<style scoped>
.tz-page { --bg: #07070a; --card: #141018; --card2: #1a1320; --border: #2a142a; --primary: #ff2d9a; --primary-glow: rgba(255,45,154,0.18); --primary-dim: rgba(255,45,154,0.08); --hot: #ff4da6; --text: #ffffff; --sub: #b8a8b8; --success: #00d084; --danger: #ff3b7a; --sidebar-w: 220px; --header-h: 64px; --radius: 16px; --font-ui: 'Syne', sans-serif; --font-mono: 'JetBrains Mono', monospace; display: flex; width: 100%; height: 100vh; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-ui); }
.tz-page[data-theme='light'] { --bg: #fff7fb; --card: #ffffff; --card2: #fff0f7; --border: #f2d6e6; --primary: #ff3b9d; --primary-glow: rgba(255,59,157,0.1); --primary-dim: rgba(255,59,157,0.05); --hot: #ff3b9d; --text: #17121a; --sub: #6f6472; --success: #00a86b; --danger: #ff3366; }
.tz-sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); height: 100vh; display: flex; flex-direction: column; background: var(--card); border-right: 1px solid var(--border); }
.tz-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 20px 18px 16px; border-bottom: 1px solid var(--border); }
.tz-logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--hot)); box-shadow: 0 0 16px var(--primary-glow); color: #fff; font-size: 16px; font-weight: 800; }
.tz-logo-text { color: var(--text); font-size: 16px; font-weight: 700; }
.tz-logo-text span { color: var(--primary); }
.tz-nav-section { flex: 1; padding: 10px 0; }
.tz-nav-label { padding: 8px 18px 4px; color: var(--sub); font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; }
.tz-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 18px; color: var(--sub); text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.18s; }
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
.tz-btn-filter, .tz-btn-add, .tz-search-bar, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-btn-filter, .tz-btn-add { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
.tz-btn-add { padding: 7px 14px; border: none; background: var(--primary); color: #fff; font-weight: 600; }
.tz-search-bar { width: 180px; display: flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 8px; font-size: 12px; }
.tz-search-bar input { width: 100%; border: none; outline: none; background: transparent; color: var(--text); font-size: 12px; }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-playbook-form { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; margin-bottom: 14px; }
.tz-playbook-form h3 { font-size: 14px; margin-bottom: 10px; }
.tz-pf-grid { display: grid; gap: 10px; margin-bottom: 10px; }
.tz-input { padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--card2); color: var(--text); font-size: 12px; }
.tz-textarea { resize: vertical; }
.tz-playbook-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tz-pb-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; transition: all 0.2s; }
.tz-pb-card:hover { border-color: var(--primary); box-shadow: 0 0 20px var(--primary-dim); }
.tz-pb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.tz-pb-head h3 { font-size: 14px; }
.tz-pb-badge { font-size: 9px; padding: 3px 8px; border-radius: 999px; background: var(--primary-dim); color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px; }
.tz-pb-desc { font-size: 12px; color: var(--sub); margin-bottom: 8px; }
.tz-pb-rules { font-size: 11px; }
.tz-pb-rules strong { display: block; margin-bottom: 4px; }
.tz-pb-rules ul { list-style: none; padding: 0; }
.tz-pb-rules li { padding: 2px 0; color: var(--sub); }
.tz-pb-rules li::before { content: '→ '; color: var(--primary); }
.tz-pb-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--sub); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
@media (max-width: 1200px) { .tz-playbook-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .tz-page { --sidebar-w: 72px; } .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; } .tz-header { height: auto; flex-direction: column; } .tz-playbook-grid { grid-template-columns: 1fr; } }
</style>
