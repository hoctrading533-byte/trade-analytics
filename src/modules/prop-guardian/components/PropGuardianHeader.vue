<template>
  <div v-if="evaluation" class="pg-emergency-bar" :class="`pg-emergency-bar--${riskTone}`">
    <div class="pg-emergency-bar__inner">
      <div class="pg-emergency-status">
        <span class="pg-status-dot"></span>
        <span class="pg-status-text">
          Status: <strong>{{ statusText }}</strong>
        </span>
      </div>

      <div class="pg-emergency-progress">
        <span>Profit Target:</span>
        <code class="pg-progress-bar-text">{{ progressBarText }}</code>
        <span>
          {{ evaluation.targetProgress.percent.toFixed(1) }}%
          ({{ money(evaluation.targetProgress.profit) }} / {{ money(evaluation.targetProgress.target) }})
        </span>
      </div>

      <div class="pg-emergency-role">
        <button class="pg-role-btn" @click="toggleRole">
          Role: <strong>{{ currentRole === 'admin' ? 'ADMIN' : 'TRADER' }}</strong>
        </button>
      </div>
    </div>
  </div>

  <header class="pg-header">
    <RouterLink class="pg-brand" to="/prop-guardian">
      <span>LF</span>
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
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ThemeToggle from '../../../components/ThemeToggle.vue'
import LanguageToggle from '../../../components/LanguageToggle.vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import RiskModeBadge from './RiskModeBadge.vue'

const props = defineProps({
  accounts: { type: Array, default: () => [] },
  accountId: { type: String, default: '' },
  riskMode: { type: String, default: 'SAFE' },
  evaluation: { type: Object, default: null }
})

defineEmits(['update:accountId'])

const { pgT, locale } = usePropGuardianI18n()
const { currentRole, toggleRole } = usePropGuardian()

const riskTone = computed(() => {
  if (!props.evaluation) return 'safe'
  const mode = props.evaluation.riskMode
  const violated = props.evaluation.violated
  if (violated || mode === 'LOCKDOWN') return 'critical'
  if (mode === 'DANGER' || mode === 'CAUTION') return 'warning'
  return 'safe'
})

const statusText = computed(() => {
  if (!props.evaluation) return 'SAFE'
  const mode = props.evaluation.riskMode
  const violated = props.evaluation.violated
  if (violated) return locale.value === 'vi' ? 'ĐÃ VI PHẠM / CHÁY' : 'BREACHED / VIOLATED'
  if (mode === 'LOCKDOWN') return locale.value === 'vi' ? 'KHÓA RỦI RO' : 'LOCKDOWN'
  if (mode === 'DANGER') return locale.value === 'vi' ? 'NGUY HIỂM' : 'DANGER'
  if (mode === 'CAUTION') return locale.value === 'vi' ? 'CẬN KỀ GIỚI HẠN' : 'CAUTION'
  return locale.value === 'vi' ? 'AN TOÀN' : 'SAFE'
})

const progressBarText = computed(() => {
  if (!props.evaluation || !props.evaluation.targetProgress) return '[░░░░░░░░░░]'
  const pct = props.evaluation.targetProgress.percent || 0
  const filled = Math.min(10, Math.max(0, Math.floor(pct / 10)))
  const empty = 10 - filled
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
})

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
</script>
