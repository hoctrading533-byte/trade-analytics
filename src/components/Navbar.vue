<script setup>
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from 'vue-i18n'
import ThemeToggle from './ThemeToggle.vue'
import LanguageSwitcher from './layout/LanguageSwitcher.vue'

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
        <RouterLink to="/dashboard" class="nav-link">{{ $t('sidebar.dashboard') }}</RouterLink>
        <RouterLink to="/prop-guardian" class="nav-link">Prop Guardian</RouterLink>
        <RouterLink to="/ket-noi-may-chu" class="nav-link">{{ $t('sidebar.accounts') }}</RouterLink>
        <RouterLink to="/journal" class="nav-link">{{ $t('sidebar.journal') }}</RouterLink>
        <RouterLink to="/cai-dat" class="nav-link">{{ $t('sidebar.settings') }}</RouterLink>
      </template>
      <template v-else>
        <RouterLink to="/" class="nav-link">{{ $t('nav.home') }}</RouterLink>
        <RouterLink to="/platform" class="nav-link">{{ $t('nav.platform') }}</RouterLink>
        <RouterLink to="/pricing" class="nav-link">{{ $t('nav.pricing') }}</RouterLink>
        <RouterLink to="/education" class="nav-link">{{ $t('nav.education') }}</RouterLink>
      </template>
    </div>

    <div class="nav-actions">
      <ThemeToggle />
      <LanguageSwitcher />
      
      <template v-if="userStore.isLoggedIn">
        <div class="nav-user" @click="logout" title="Logout">
          <div class="avatar">{{ avatarLetter }}</div>
          <div class="user-info">
            <span class="plan-badge" :class="planTone">{{ planCode }}</span>
            <span class="user-title">{{ profileTitle }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <RouterLink to="/login" class="nav-link login-btn">{{ $t('nav.login') }}</RouterLink>
        <RouterLink to="/register" class="nav-btn primary">{{ $t('nav.start_free') }}</RouterLink>
      </template>
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
