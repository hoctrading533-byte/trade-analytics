<template>
  <header class="pg-header">
    <RouterLink class="pg-brand" to="/prop-guardian">
      <span>PG</span>
      <strong>{{ pgT('brand.title') }}</strong>
    </RouterLink>

    <nav class="pg-tabs" :aria-label="pgT('brand.navLabel')">
      <RouterLink to="/prop-guardian">{{ pgT('nav.dashboard') }}</RouterLink>
      <RouterLink to="/prop-guardian/setup">{{ pgT('nav.setup') }}</RouterLink>
      <RouterLink to="/prop-guardian/risk">{{ pgT('nav.risk') }}</RouterLink>
      <RouterLink to="/prop-guardian/behavior">{{ pgT('nav.behavior') }}</RouterLink>
      <RouterLink to="/prop-guardian/review">{{ pgT('nav.review') }}</RouterLink>
    </nav>

    <div class="pg-header__actions">
      <select :value="accountId" @change="$emit('update:accountId', $event.target.value)">
        <option v-for="account in accounts" :key="account.id" :value="account.id">
          {{ account.accountName }}
        </option>
      </select>
      <RiskModeBadge :mode="riskMode" />
      <ThemeToggle />
      <LanguageToggle />
      <RouterLink class="pg-back-link" to="/dashboard">{{ pgT('nav.mainDashboard') }}</RouterLink>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import ThemeToggle from '../../../components/ThemeToggle.vue'
import LanguageToggle from '../../../components/LanguageToggle.vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import RiskModeBadge from './RiskModeBadge.vue'

defineProps({
  accounts: { type: Array, default: () => [] },
  accountId: { type: String, default: '' },
  riskMode: { type: String, default: 'SAFE' }
})

defineEmits(['update:accountId'])

const { pgT } = usePropGuardianI18n()
</script>
