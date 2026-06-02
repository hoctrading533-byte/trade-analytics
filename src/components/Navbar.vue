<script setup>
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from '../composables/useI18n.js'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const avatarLetter = computed(() => (userStore.userName?.[0] || 'G').toUpperCase())
const planCode = computed(() => (userStore.isPro ? 'PREMIUM' : 'PAY 149K'))
const planTone = computed(() => (userStore.isPro ? 'pro' : 'pay'))
const profileTitle = computed(() => (userStore.isPro ? 'Trader Premium' : 'Payment required'))

function goDashboard() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push('/dashboard')
}

function logout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar">
    <div class="logo" @click="goDashboard" role="button" aria-label="Go to dashboard">
      <div class="logo-icon">LF</div>
      Lumina<span>Fox</span>
    </div>

    <div class="nav-links">
      <template v-if="userStore.isLoggedIn">
        <RouterLink to="/dashboard" class="nav-link">{{ t('nav.dashboard') }}</RouterLink>
        <RouterLink to="/prop-guardian" class="nav-link">{{ t('nav.propGuardian') }}</RouterLink>
        <RouterLink to="/ket-noi-may-chu" class="nav-link">{{ t('nav.server') }}</RouterLink>
        <RouterLink to="/lich-su-giao-dich" class="nav-link">{{ t('nav.history') }}</RouterLink>
        <RouterLink to="/journal" class="nav-link">{{ t('nav.journal') }}</RouterLink>
        <RouterLink to="/co-hoi" class="nav-link">{{ t('nav.opportunities') }}</RouterLink>
        <RouterLink to="/cai-dat" class="nav-link">{{ t('nav.settings') }}</RouterLink>
        <RouterLink v-if="userStore.isAdmin" to="/admin" class="nav-link">{{ t('nav.admin') }}</RouterLink>
      </template>
      <template v-else>
        <RouterLink to="/login" class="nav-link">{{ t('nav.login') }}</RouterLink>
        <RouterLink to="/register" class="nav-link">{{ t('nav.register') }}</RouterLink>
      </template>
    </div>

    <div class="nav-right">
      <ThemeToggle />
      <LanguageToggle />
      <div class="user-badge">
        <div class="avatar">{{ avatarLetter }}</div>
        <div class="user-info">
          <div class="user-name">{{ userStore.userName }}</div>
          <div class="user-role">
            <span>{{ profileTitle }}</span>
            <span class="plan-chip" :class="planTone">{{ planCode }}</span>
          </div>
        </div>
        <button v-if="userStore.isLoggedIn" class="logout-btn" @click="logout">{{ t('nav.logout') }}</button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-link {
  text-decoration: none;
  color: inherit;
}

.logout-btn {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
}

.logout-btn:hover {
  color: var(--lf-text);
}

.user-role {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.plan-chip {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.06em;
  border: 1px solid transparent;
}

.plan-chip.pro {
  color: var(--lf-success);
  border-color: color-mix(in srgb, var(--lf-success) 45%, transparent);
  background: color-mix(in srgb, var(--lf-success) 14%, transparent);
}

.plan-chip.pay {
  color: var(--lf-warning);
  border-color: color-mix(in srgb, var(--lf-warning) 45%, transparent);
  background: color-mix(in srgb, var(--lf-warning) 14%, transparent);
}
</style>
