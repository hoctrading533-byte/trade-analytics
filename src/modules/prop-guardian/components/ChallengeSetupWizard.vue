<template>
  <article class="pg-card pg-setup-wizard">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('setup.wizardKicker') }}</span>
        <h3>{{ pgT('setup.wizardTitle') }}</h3>
      </div>
      <strong>{{ pgT('common.custom') }}</strong>
    </div>

    <form class="pg-setup-grid" @submit.prevent="save">
      <label>
        <span>{{ pgT('setup.propFirm') }}</span>
        <input v-model="draft.propFirmName" />
      </label>
      <label>
        <span>{{ pgT('setup.challengeName') }}</span>
        <input v-model="draft.challengeName" />
      </label>
      <label>
        <span>{{ pgT('setup.phase') }}</span>
        <select v-model="draft.phase">
          <option value="phase_1">{{ setupValueLabel('phase_1') }}</option>
          <option value="phase_2">{{ setupValueLabel('phase_2') }}</option>
          <option value="funded">{{ setupValueLabel('funded') }}</option>
        </select>
      </label>
      <label>
        <span>{{ pgT('setup.accountSize') }}</span>
        <input v-model.number="draft.accountSize" type="number" min="0" />
      </label>
      <label>
        <span>{{ pgT('setup.startBalance') }}</span>
        <input v-model.number="draft.startBalance" type="number" min="0" />
      </label>
      <label>
        <span>{{ pgT('setup.profitTargetAmount') }}</span>
        <input v-model.number="draft.profitTargetAmount" type="number" min="0" />
      </label>
      <label>
        <span>{{ pgT('setup.dailyLossLimit') }}</span>
        <input v-model.number="draft.dailyLossLimitAmount" type="number" min="0" />
      </label>
      <label>
        <span>{{ pgT('setup.maxLossLimit') }}</span>
        <input v-model.number="draft.maxLossLimitAmount" type="number" min="0" />
      </label>
      <label>
        <span>{{ pgT('setup.drawdownType') }}</span>
        <select v-model="draft.drawdownType">
          <option value="static">{{ setupValueLabel('static') }}</option>
          <option value="trailing">{{ setupValueLabel('trailing') }}</option>
          <option value="eod_trailing">{{ setupValueLabel('eod_trailing') }}</option>
          <option value="intraday_trailing">{{ setupValueLabel('intraday_trailing') }}</option>
        </select>
      </label>
      <label>
        <span>{{ pgT('setup.dailyLossCalculation') }}</span>
        <select v-model="draft.dailyLossCalculation">
          <option value="start_of_day_balance">{{ setupValueLabel('start_of_day_balance') }}</option>
          <option value="start_of_day_equity">{{ setupValueLabel('start_of_day_equity') }}</option>
          <option value="initial_balance">{{ setupValueLabel('initial_balance') }}</option>
          <option value="equity_based">{{ setupValueLabel('equity_based') }}</option>
        </select>
      </label>
      <label>
        <span>{{ pgT('setup.minTradingDays') }}</span>
        <input v-model.number="draft.minTradingDays" type="number" min="0" />
      </label>
      <label>
        <span>{{ pgT('setup.maxTradesPerDay') }}</span>
        <input v-model.number="draft.maxTradesPerDay" type="number" min="1" />
      </label>
      <label>
        <span>{{ pgT('setup.personalRiskPercent') }}</span>
        <input v-model.number="draft.personalRiskPercent" type="number" min="0.1" step="0.1" />
      </label>
      <label>
        <span>{{ pgT('setup.consistencyMaxDayPercent') }}</span>
        <input v-model.number="draft.consistencyMaxDayProfitPercent" type="number" min="0" />
      </label>
      <label class="pg-check">
        <input v-model="draft.newsTradingAllowed" type="checkbox" />
        <span>{{ pgT('setup.newsTradingAllowed') }}</span>
      </label>
      <label class="pg-check">
        <input v-model="draft.weekendHoldingAllowed" type="checkbox" />
        <span>{{ pgT('setup.weekendHoldingAllowed') }}</span>
      </label>
      <label class="pg-check">
        <input v-model="draft.eaAllowed" type="checkbox" />
        <span>{{ pgT('setup.eaAllowed') }}</span>
      </label>

      <div class="pg-setup-actions">
        <button type="submit">{{ pgT('setup.saveChallenge') }}</button>
        <button type="button" class="ghost" @click="$emit('reset')">{{ pgT('setup.resetDefault') }}</button>
      </div>
    </form>
  </article>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

const props = defineProps({
  challenge: { type: Object, required: true }
})
const emit = defineEmits(['save', 'reset'])
const draft = reactive({ ...props.challenge })
const { pgT, setupValueLabel } = usePropGuardianI18n()

watch(
  () => props.challenge,
  (value) => Object.assign(draft, value),
  { deep: true }
)

function save() {
  emit('save', { ...draft })
}
</script>
