<template>
  <aside class="ta-sidebar">
    <RouterLink class="ta-brand" to="/dashboard" aria-label="LuminaFox dashboard">
      <span class="ta-brand__mark">LF</span>
      <span>
        <strong>LuminaFox</strong>
        <small>{{ t('dashboard.dataEngineLabel') }}</small>
      </span>
    </RouterLink>

    <ThemeToggle class="ta-sidebar__theme" />
    <LanguageToggle class="ta-sidebar__theme" />

    <nav class="ta-side-nav" aria-label="Trading analytics navigation">
      <template v-for="item in menuItems" :key="item.labelKey">
        <RouterLink
          v-if="item.to"
          class="ta-side-link"
          :class="{ active: isActive(item) }"
          :to="item.to"
        >
          <span class="ta-side-link__icon">{{ item.icon }}</span>
          <span>{{ item.label || t(item.labelKey) }}</span>
        </RouterLink>
        <button
          v-else
          class="ta-side-link ta-side-link--disabled"
          type="button"
          :title="`${item.label || t(item.labelKey)} phase`"
        >
          <span class="ta-side-link__icon">{{ item.icon }}</span>
          <span>{{ item.label || t(item.labelKey) }}</span>
          <span class="ta-side-link__badge">{{ t('dashboard.soon') }}</span>
        </button>
      </template>
    </nav>

    <section class="ta-sidebar-status">
      <div>
        <span class="ta-status-dot"></span>
        <span>{{ t('dashboard.dataEngine') }}</span>
      </div>
      <strong>{{ t('dashboard.mockLive') }}</strong>
      <p>{{ t('dashboard.mockNote') }}</p>
    </section>
  </aside>
</template>

<script setup>
import { RouterLink, useRoute } from 'vue-router'
import ThemeToggle from '../ThemeToggle.vue'
import LanguageToggle from '../LanguageToggle.vue'
import { useI18n } from '../../composables/useI18n.js'

const route = useRoute()
const { t } = useI18n()

const menuItems = [
  { labelKey: 'nav.dashboard', icon: 'DB', to: '/dashboard' },
  { labelKey: 'nav.propGuardian', icon: 'PG', to: '/prop-guardian' },
  { labelKey: 'nav.journal', icon: 'JN', to: '/journal' },
  { labelKey: 'nav.playbook', icon: 'PB' },
  { labelKey: 'nav.backtesting', icon: 'BT' },
  { labelKey: 'nav.replay', icon: 'RY' },
  { labelKey: 'nav.accounts', icon: 'AC', to: '/ket-noi-may-chu' },
  { labelKey: 'nav.mentor', icon: 'MM' },
  { labelKey: 'nav.community', icon: 'CM', to: '/bang-xep-hang' },
  { labelKey: 'nav.education', icon: 'ED' },
  { labelKey: 'nav.settings', icon: 'ST', to: '/cai-dat' }
]

function isActive(item) {
  if (!item.to) return false
  return route.path === item.to || (item.to !== '/dashboard' && route.path.startsWith(item.to))
}
</script>
