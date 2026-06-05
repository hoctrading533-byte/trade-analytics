<template>
  <div class="tz-page" :data-theme="theme">
    <aside class="tz-sidebar">
      <div class="tz-sidebar-logo"><div class="tz-logo-icon">LF</div><div class="tz-logo-text">Lumina<span>Fox</span></div></div>
      <nav class="tz-nav-section">
        <div v-for="section in navSections" :key="section.label" class="tz-nav-group">
          <div class="tz-nav-label">{{ section.label }}</div>
          <RouterLink v-for="item in section.items" :key="item.label" class="tz-nav-item" :class="{ active: isNavActive(item) }" :to="item.to"><span class="tz-nav-icon" v-html="item.icon"></span>{{ item.label }}</RouterLink>
        </div>
      </nav>
      <div class="tz-sidebar-user"><div class="tz-user-avatar">TA</div><div class="tz-user-info"><div class="tz-user-name">Trader Alex</div><div class="tz-user-plan">Premium Pro</div></div><span class="tz-user-arrow">›</span></div>
    </aside>
    <div class="tz-main">
      <header class="tz-header">
        <div class="tz-header-welcome"><h2>Education</h2><p>Thư viện kiến thức giao dịch toàn diện</p></div>
        <div class="tz-header-controls">
          <label class="tz-search-bar"><span>⌕</span><input v-model="search" type="text" placeholder="Search courses..." /></label>
          <LanguageToggle />
          <button class="tz-icon-btn" type="button" @click="toggleTheme"><span class="tz-theme-toggle-knob">{{ theme === 'dark' ? '🌙' : '☀️' }}</span></button>
        </div>
      </header>
      <main class="tz-dashboard">
        <div class="tz-ed-categories">
          <button v-for="cat in categories" :key="cat.key" class="tz-ed-cat" :class="{ active: activeCategory === cat.key }" @click="activeCategory = cat.key">{{ cat.label }}</button>
        </div>
        <div class="tz-ed-grid">
          <article v-for="course in filteredCourses" :key="course.id" class="tz-ed-card" @click="openCourse(course)">
            <div class="tz-ed-thumb">
              <div class="tz-ed-thumb-placeholder">{{ course.icon }}</div>
            </div>
            <div class="tz-ed-body">
              <h3>{{ course.title }}</h3>
              <p>{{ course.description }}</p>
              <div class="tz-ed-meta">
                <span>{{ course.duration }}</span>
                <span>{{ course.lessons }} bài học</span>
                <span class="tz-ed-level" :class="course.level">{{ course.level }}</span>
              </div>
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
import LanguageToggle from '../components/LanguageToggle.vue'

const route = useRoute()
const theme = ref(localStorage.getItem('tz-theme') || 'dark')
const search = ref('')
const activeCategory = ref('all')

const categories = [
  { key: 'all', label: 'Tất cả' },
  { key: 'technical', label: 'Phân tích kỹ thuật' },
  { key: 'fundamental', label: 'Phân tích cơ bản' },
  { key: 'psychology', label: 'Tâm lý giao dịch' },
  { key: 'risk', label: 'Quản lý vốn' }
]

const courses = ref([
  { id: 1, title: 'Phân tích kỹ thuật từ A-Z', description: 'Học đầy đủ về nến, trend, support/resistance, indicators.', icon: '📊', duration: '8 giờ', lessons: 24, level: 'beginner', category: 'technical' },
  { id: 2, title: 'Price Action Mastery', description: 'Làm chủ nến Nhật và mô hình giá để giao dịch không cần indicator.', icon: '🕯️', duration: '6 giờ', lessons: 18, level: 'intermediate', category: 'technical' },
  { id: 3, title: 'Smart Money Concepts', description: 'ICT - Dòng tiền thông minh, thanh khoản và cấu trúc thị trường.', icon: '🧠', duration: '10 giờ', lessons: 30, level: 'advanced', category: 'technical' },
  { id: 4, title: 'Phân tích kinh tế vĩ mô', description: 'Hiểu về lãi suất, CPI, NFP và tác động lên thị trường.', icon: '🌍', duration: '5 giờ', lessons: 15, level: 'intermediate', category: 'fundamental' },
  { id: 5, title: 'Tâm lý giao dịch nâng cao', description: 'Làm chủ cảm xúc, tránh FOMO và revenge trading.', icon: '🧘', duration: '4 giờ', lessons: 12, level: 'beginner', category: 'psychology' },
  { id: 6, title: 'Quản lý vốn & Rủi ro', description: 'Position sizing, Kelly Criterion và drawdown management.', icon: '🛡️', duration: '3 giờ', lessons: 10, level: 'intermediate', category: 'risk' },
  { id: 7, title: 'Elliott Wave Theory', description: 'Sóng Elliott và cách ứng dụng trong giao dịch hiện đại.', icon: '🌊', duration: '7 giờ', lessons: 21, level: 'advanced', category: 'technical' },
  { id: 8, title: 'Phân tích đa khung thời gian', description: 'Kết hợp nhiều khung thời gian để có góc nhìn toàn diện.', icon: '⏰', duration: '3 giờ', lessons: 9, level: 'intermediate', category: 'technical' },
])

const filteredCourses = computed(() => {
  const q = search.value.trim().toLowerCase()
  return courses.value.filter(c => {
    if (activeCategory.value !== 'all' && c.category !== activeCategory.value) return false
    if (q && !c.title.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false
    return true
  })
})

function openCourse(course) {
  alert(`Mở khóa học: ${course.title}\n\n${course.description}\n\nThời lượng: ${course.duration}\nBài học: ${course.lessons}\nTrình độ: ${course.level}`)
}

const icons = { grid: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', doc: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', bars: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', wave: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', play: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>', card: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', heart: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 0 0 1.06-8.84z"/></svg>', gear: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>' }
const navSections = [
  { label: 'Main', items: [{ label: 'Dashboard', icon: icons.grid, to: '/dashboard' }, { label: 'Journal', icon: icons.doc, to: '/journal' }, { label: 'Analytics', icon: icons.bars, to: '/phan-tich' }, { label: 'Reports', icon: icons.bars, to: '/co-hoi' }, { label: 'Playbook', icon: icons.doc, to: '/playbook' }] },
  { label: 'Tools', items: [{ label: 'Backtesting', icon: icons.wave, to: '/backtesting' }, { label: 'Replay', icon: icons.play, to: '/replay' }, { label: 'Accounts', icon: icons.card, to: '/ket-noi-may-chu' }] },
  { label: 'Learn', items: [{ label: 'Mentor Mode', icon: icons.heart, to: '/mentor-mode' }, { label: 'Community', icon: icons.heart, to: '/bang-xep-hang' }, { label: 'Education', icon: icons.doc, to: '/education' }, { label: 'Settings', icon: icons.gear, to: '/cai-dat' }] }
]
function isNavActive(item) { if (!item.to) return false; if (item.to === '/dashboard') return route.path === '/dashboard'; return route.path.startsWith(item.to) }
function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark'; localStorage.setItem('tz-theme', theme.value); document.documentElement.setAttribute('data-theme', theme.value) }
onMounted(() => document.documentElement.setAttribute('data-theme', theme.value))
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
.tz-search-bar, .tz-icon-btn { border: 1px solid var(--border); background: var(--card2); color: var(--text); font-family: var(--font-ui); }
.tz-search-bar { width: 180px; display: flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 8px; font-size: 12px; }
.tz-search-bar input { width: 100%; border: none; outline: none; background: transparent; color: var(--text); font-size: 12px; }
.tz-icon-btn { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; }
.tz-dashboard { flex: 1; overflow-y: auto; padding: 16px 20px; background: var(--bg); }
.tz-ed-categories { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.tz-ed-cat { padding: 8px 16px; border: 1px solid var(--border); border-radius: 999px; background: var(--card2); color: var(--sub); font-size: 12px; cursor: pointer; }
.tz-ed-cat.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.tz-ed-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tz-ed-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: all 0.2s; }
.tz-ed-card:hover { border-color: var(--primary); box-shadow: 0 0 20px var(--primary-dim); transform: translateY(-2px); }
.tz-ed-thumb { height: 100px; background: linear-gradient(135deg, var(--primary-dim), var(--card2)); display: flex; align-items: center; justify-content: center; }
.tz-ed-thumb-placeholder { font-size: 36px; }
.tz-ed-body { padding: 14px; }
.tz-ed-body h3 { font-size: 14px; margin-bottom: 6px; }
.tz-ed-body p { font-size: 11px; color: var(--sub); line-height: 1.5; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tz-ed-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 10px; color: var(--sub); }
.tz-ed-level { padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 700; }
.tz-ed-level.beginner { background: rgba(0,208,132,0.15); color: var(--success); }
.tz-ed-level.intermediate { background: rgba(255,200,97,0.15); color: #d58a00; }
.tz-ed-level.advanced { background: rgba(255,59,122,0.15); color: var(--danger); }
@media (max-width: 1400px) { .tz-ed-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 1100px) { .tz-ed-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .tz-page { --sidebar-w: 72px; } .tz-logo-text, .tz-nav-label, .tz-nav-item:not(.active), .tz-user-info, .tz-user-arrow { display: none; } .tz-ed-grid { grid-template-columns: 1fr; } }
</style>
