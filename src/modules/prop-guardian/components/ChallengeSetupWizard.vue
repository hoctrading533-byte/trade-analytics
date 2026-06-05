<template>
  <article class="pg-card pg-setup-wizard">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('setup.wizardKicker') }}</span>
        <h3>{{ pgT('setup.wizardTitle') }}</h3>
      </div>
      <strong :class="currentRole === 'admin' ? 'pg-ok' : 'pg-warn'">
        {{ currentRole === 'admin' ? 'ADMIN' : 'TRADER (READ-ONLY)' }}
      </strong>
    </div>

    <form class="pg-setup-grid" @submit.prevent="save">
      <div v-if="currentRole === 'user'" class="pg-alert-card pg-card--warning" style="grid-column: 1 / -1; margin-bottom: 12px; padding: 12px 16px; border-radius: 12px;">
        <h4 style="margin: 0 0 4px; color: var(--lf-warning);">{{ locale === 'vi' ? 'Chế độ xem (Trader Mode)' : 'Read-only Mode (Trader Mode)' }}</h4>
        <p style="margin: 0; font-size: 12px; color: var(--lf-text-soft);">
          {{ locale === 'vi' ? 'Bạn đang ở vai trò Trader (User) nên chỉ có quyền xem các luật. Hãy nhấp nút "Mode: TRADER" ở Emergency Bar phía trên để đổi sang Admin để sửa luật.' : 'You are in Trader (User) mode. Settings are read-only. Click the "Mode: TRADER" button in the Emergency Bar above to switch to Admin to configure rules.' }}
        </p>
      </div>

      <label>
        <span>{{ pgT('setup.propFirm') }}</span>
        <input v-model="draft.propFirmName" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.challengeName') }}</span>
        <input v-model="draft.challengeName" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.phase') }}</span>
        <select v-model="draft.phase" :disabled="currentRole === 'user'">
          <option value="phase_1">{{ setupValueLabel('phase_1') }}</option>
          <option value="phase_2">{{ setupValueLabel('phase_2') }}</option>
          <option value="funded">{{ setupValueLabel('funded') }}</option>
        </select>
      </label>
      <label>
        <span>{{ pgT('setup.accountSize') }}</span>
        <input v-model.number="draft.accountSize" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.startBalance') }}</span>
        <input v-model.number="draft.startBalance" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.profitTargetAmount') }}</span>
        <input v-model.number="draft.profitTargetAmount" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.dailyLossLimit') }}</span>
        <input v-model.number="draft.dailyLossLimitAmount" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.maxLossLimit') }}</span>
        <input v-model.number="draft.maxLossLimitAmount" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.drawdownType') }}</span>
        <select v-model="draft.drawdownType" :disabled="currentRole === 'user'">
          <option value="static">{{ setupValueLabel('static') }}</option>
          <option value="trailing">{{ setupValueLabel('trailing') }}</option>
          <option value="eod_trailing">{{ setupValueLabel('eod_trailing') }}</option>
          <option value="intraday_trailing">{{ setupValueLabel('intraday_trailing') }}</option>
        </select>
      </label>
      <label>
        <span>{{ pgT('setup.dailyLossCalculation') }}</span>
        <select v-model="draft.dailyLossCalculation" :disabled="currentRole === 'user'">
          <option value="start_of_day_balance">{{ setupValueLabel('start_of_day_balance') }}</option>
          <option value="start_of_day_equity">{{ setupValueLabel('start_of_day_equity') }}</option>
          <option value="initial_balance">{{ setupValueLabel('initial_balance') }}</option>
          <option value="equity_based">{{ setupValueLabel('equity_based') }}</option>
        </select>
      </label>
      <label>
        <span>{{ pgT('setup.minTradingDays') }}</span>
        <input v-model.number="draft.minTradingDays" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.maxTradesPerDay') }}</span>
        <input v-model.number="draft.maxTradesPerDay" type="number" min="1" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.personalRiskPercent') }}</span>
        <input v-model.number="draft.personalRiskPercent" type="number" min="0.1" step="0.1" :disabled="currentRole === 'user'" />
      </label>
      <label>
        <span>{{ pgT('setup.consistencyMaxDayPercent') }}</span>
        <input v-model.number="draft.consistencyMaxDayProfitPercent" type="number" min="0" :disabled="currentRole === 'user'" />
      </label>
      <label class="pg-check">
        <input v-model="draft.newsTradingAllowed" type="checkbox" :disabled="currentRole === 'user'" />
        <span>{{ pgT('setup.newsTradingAllowed') }}</span>
      </label>
      <label class="pg-check">
        <input v-model="draft.weekendHoldingAllowed" type="checkbox" :disabled="currentRole === 'user'" />
        <span>{{ pgT('setup.weekendHoldingAllowed') }}</span>
      </label>
      <label class="pg-check">
        <input v-model="draft.eaAllowed" type="checkbox" :disabled="currentRole === 'user'" />
        <span>{{ pgT('setup.eaAllowed') }}</span>
      </label>

      <div v-if="currentRole === 'admin'" class="pg-setup-actions">
        <button type="submit">{{ pgT('setup.saveChallenge') }}</button>
        <button type="button" class="ghost" @click="$emit('reset')">{{ pgT('setup.resetDefault') }}</button>
      </div>
    </form>
  </article>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import { usePropGuardian } from '../composables/usePropGuardian.js'

const props = defineProps({
  challenge: { type: Object, required: true }
})
const emit = defineEmits(['save', 'reset'])
const draft = reactive({ ...props.challenge })
const { pgT, setupValueLabel, locale } = usePropGuardianI18n()
const { currentRole } = usePropGuardian()

watch(
  () => props.challenge,
  (value) => Object.assign(draft, value),
  { deep: true }
)

function save() {
  emit('save', { ...draft })
}
</script>
