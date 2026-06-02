<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/useUserStore.js'
import { useI18n } from '../../composables/useI18n.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const avatarLetter = computed(() => (userStore.userName?.[0] || 'T').toUpperCase())
const userName = computed(() => userStore.userName || 'Trader Alex')
const userPlan = computed(() => userStore.isPro ? '✦ Premium Pro' : '✦ Free')

const defaultIcon = 'M12 3v14M4 9l8-6 8 6'

const menuGroups = [
  {
    labelKey: 'nav.main',
    items: [
      { key: 'dashboard', labelKey: 'nav.dashboard', to: '/dashboard', icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
      { key: 'journal', labelKey: 'nav.journal', to: '/journal', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
      { key: 'analytics', labelKey: 'nav.analytics', to: '/lich-su-giao-dich', icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
      { key: 'reports', labelKey: 'nav.reports', to: '/co-hoi', icon: '<path d="M9 17H5a2 2 0 0 0-2 2"/><path d="M21 17h-4a2 2 0 0 0-2 2"/><path d="M12 3v14"/><path d="M4 9l8-6 8 6"/>' },
      { key: 'playbook', labelKey: 'nav.playbook', to: '/playbook', icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>' }
    ]
  },
  {
    labelKey: 'nav.tools',
    items: [
      { key: 'backtesting', labelKey: 'nav.backtesting', to: '/backtesting', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
      { key: 'replay', labelKey: 'nav.replay', to: '/replay', icon: '<polygon points="5 3 19 12 5 21 5 3"/>' },
      { key: 'accounts', labelKey: 'nav.accounts', to: '/ket-noi-may-chu', icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' }
    ]
  },
  {
    labelKey: 'nav.learn',
    items: [
      { key: 'mentor', labelKey: 'nav.mentor', to: '/mentor-mode', icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>' },
      { key: 'community', labelKey: 'nav.community', to: '/bang-xep-hang', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
      { key: 'education', labelKey: 'nav.education', to: '/education', icon: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>' },
      { key: 'settings', labelKey: 'nav.settings', to: '/cai-dat', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2"/>' }
    ]
  }
]

function isActive(item) {
  if (!item.to) return false
  if (item.to === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(item.to)
}

function goHome() { router.push('/dashboard') }
function logout() { userStore.logout(); router.push('/login') }
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo" @click="goHome">
      <div class="logo-icon">TZ</div>
      <div class="logo-text">Trade<span>Zella</span></div>
    </div>
    <nav class="nav-section">
      <template v-for="group in menuGroups" :key="group.labelKey">
        <div class="nav-label">{{ t(group.labelKey) }}</div>
        <template v-for="item in group.items" :key="item.key">
          <RouterLink v-if="item.to" class="nav-item" :class="{ active: isActive(item) }" :to="item.to">
            <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" v-html="item.icon"></svg>
            {{ t(item.labelKey) }}
          </RouterLink>
          <div v-else class="nav-item nav-item--disabled">
            <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" v-html="item.icon"></svg>
            {{ t(item.labelKey) }}
            <span class="nav-badge">{{ t('dashboard.soon') }}</span>
          </div>
        </template>
      </template>
      <div v-if="userStore.isAdmin" class="nav-label">Admin</div>
      <RouterLink v-if="userStore.isAdmin" class="nav-item" :class="{ active: route.path.startsWith('/admin') }" to="/admin">
        <svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6z"/><path d="M9 12l2 2 4-5"/></svg>
        {{ t('nav.admin') }}
      </RouterLink>
    </nav>
    <div class="sidebar-user" @click="logout">
      <div class="user-avatar">{{ avatarLetter }}</div>
      <div class="user-info">
        <div class="user-name">{{ userName }}</div>
        <div class="user-plan">{{ userPlan }}</div>
      </div>
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--sub);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  z-index: 10;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px 16px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}

.logo-icon {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, var(--primary), var(--hot));
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: #fff;
  box-shadow: 0 0 16px var(--primary-glow);
  flex-shrink: 0;
}

.logo-text { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.logo-text span { color: var(--primary); }

.nav-section { padding: 10px 0; flex: 1; }
.nav-label { font-size: 9px; font-weight: 600; color: var(--sub); letter-spacing: 1.2px; text-transform: uppercase; padding: 8px 18px 4px; }

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 18px; cursor: pointer;
  font-size: 13px; font-weight: 500; color: var(--sub);
  border-radius: 0; transition: all 0.18s; position: relative;
  text-decoration: none;
}

.nav-item:hover { color: var(--text); background: var(--primary-dim); }
.nav-item.active {
  color: var(--primary); background: var(--primary-dim);
  font-weight: 600;
}
.nav-item.active::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: var(--primary);
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 8px var(--primary);
}

.nav-item--disabled {
  opacity: 0.5;
  cursor: default;
}

.nav-badge {
  margin-left: auto;
  font-size: 8px; padding: 2px 6px; border-radius: 4px;
  background: var(--primary-dim); color: var(--primary); font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
}

.nav-icon { width: 16px; height: 16px; opacity: 0.8; flex-shrink: 0; }
.nav-item.active .nav-icon { opacity: 1; }

.sidebar-user {
  padding: 14px 18px;
  border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
  cursor: pointer;
}

.user-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #a020f0);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
  box-shadow: 0 0 10px var(--primary-glow);
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-plan { font-size: 10px; color: var(--primary); font-weight: 500; }
</style>
