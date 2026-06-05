<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/useUserStore.js'
import { useTheme } from '../../composables/useTheme.js'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'

const router = useRouter()
const userStore = useUserStore()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()

const searchQuery = ref('')

function addTrade() { router.push('/journal') }
</script>

<template>
  <header class="header">
    <div class="header-welcome">
      <h2>{{ t('layout.welcome') }}</h2>
      <p>{{ t('layout.overview') }}</p>
    </div>
    <div class="header-controls">
      <button class="btn-filter" type="button">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {{ t('layout.thisWeek') }}
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <button class="btn-add" type="button" @click="addTrade">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {{ t('dashboard.addTrade') }}
      </button>
      <label class="search-bar">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="searchQuery" type="text" :placeholder="t('layout.searchAnything')">
      </label>
      <button class="icon-btn" type="button" :aria-label="t('dashboard.notifications')">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <div class="notif-badge">3</div>
      </button>
        <button class="icon-btn" type="button" @click="toggleTheme" :title="isDark ? 'Light mode' : 'Dark mode'">
          <span>{{ isDark ? 'Moon' : 'Sun' }}</span>
        </button>
        <LanguageSwitcher />
        <div class="user-avatar" style="width:32px;height:32px;font-size:11px;">{{ (userStore.userName?.[0] || 'T').toUpperCase() }}</div>
    </div>
  </header>
</template>

<style scoped>
.header {
  height: 64px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-welcome { flex: 1; }
.header-welcome h2 { font-size: 15px; font-weight: 700; color: var(--text); line-height: 1; margin: 0; }
.header-welcome p { font-size: 11px; color: var(--sub); margin: 2px 0 0; }

.header-controls { display: flex; align-items: center; gap: 8px; }

.btn-filter {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--card2);
  color: var(--text); font-size: 12px; font-family: inherit; font-weight: 500;
  cursor: pointer; transition: all 0.18s;
}
.btn-filter:hover { border-color: var(--primary); }

.btn-add {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  background: var(--primary); border: none;
  color: #fff; font-size: 12px; font-family: inherit; font-weight: 600;
  cursor: pointer; transition: all 0.18s;
  box-shadow: 0 0 16px var(--primary-glow);
}
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 20px var(--primary-glow); }

.search-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--card2);
  color: var(--sub); font-size: 12px;
  width: 180px;
}
.search-bar input {
  border: none; background: transparent; font-family: inherit;
  font-size: 12px; color: var(--text); outline: none; width: 100%;
}
.search-bar input::placeholder { color: var(--sub); }

.icon-btn {
  width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--card2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--sub); font-size: 10px;
  transition: all 0.18s; position: relative;
}
.icon-btn:hover { border-color: var(--primary); color: var(--primary); }
.icon-btn span { line-height: 1; }

.notif-badge {
  position: absolute; top: -4px; right: -4px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--primary); color: #fff;
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.user-avatar {
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #a020f0);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; color: #fff;
  box-shadow: 0 0 10px var(--primary-glow);
  flex-shrink: 0;
}
</style>
