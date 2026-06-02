<template>
  <header class="ta-header">
    <div class="ta-header__title">
      <span class="ta-kicker">{{ t('dashboard.workspace') }}</span>
      <h1>{{ t('dashboard.title') }}</h1>
      <p>{{ t('dashboard.subtitle') }}</p>
    </div>

    <div class="ta-header__controls">
      <label class="ta-search">
        <span>{{ t('common.search') }}</span>
        <input
          :value="search"
          type="search"
          :placeholder="t('dashboard.searchPlaceholder')"
          @input="$emit('update:search', $event.target.value)"
        />
      </label>

      <label class="ta-select">
        <span>{{ t('dashboard.account') }}</span>
        <select :value="selectedAccount" @change="$emit('update:selectedAccount', $event.target.value)">
          <option value="all">{{ t('dashboard.allAccounts') }}</option>
          <option v-for="account in accounts" :key="account.id" :value="account.id">
            {{ account.name }}
          </option>
        </select>
      </label>

      <label class="ta-select ta-select--compact">
        <span>{{ t('dashboard.range') }}</span>
        <select :value="timeRange" @change="$emit('update:timeRange', $event.target.value)">
          <option value="7d">7D</option>
          <option value="30d">30D</option>
          <option value="90d">90D</option>
          <option value="all">All</option>
        </select>
      </label>

      <RouterLink class="ta-add-trade" to="/journal">
        <span>+</span>
        {{ t('dashboard.addTrade') }}
      </RouterLink>

      <ThemeToggle class="ta-header__theme" />
      <LanguageToggle />

      <button class="ta-icon-button" type="button" :aria-label="t('dashboard.notifications')">
        <span class="ta-notification-dot"></span>
        N
      </button>

      <button class="ta-avatar" type="button" :aria-label="t('dashboard.profile')">
        <span>LF</span>
        <strong>Pro</strong>
      </button>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import ThemeToggle from '../ThemeToggle.vue'
import LanguageToggle from '../LanguageToggle.vue'
import { useI18n } from '../../composables/useI18n.js'

defineProps({
  search: { type: String, default: '' },
  timeRange: { type: String, default: '30d' },
  selectedAccount: { type: String, default: 'all' },
  accounts: { type: Array, default: () => [] }
})

defineEmits(['update:search', 'update:timeRange', 'update:selectedAccount'])

const { t } = useI18n()
</script>
