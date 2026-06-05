<template>
  <section class="pg-page">
    <PropGuardianHeader
      :accounts="accounts"
      :account-id="accountId"
      :risk-mode="evaluation.riskMode"
      :evaluation="evaluation"
      @update:account-id="setAccount"
    />
    <main class="pg-content">
      <section class="pg-hero">
        <article class="pg-card pg-hero-card">
          <span class="pg-kicker">{{ pgT('setup.heroKicker') }}</span>
          <h1>{{ pgT('setup.heroTitle') }}</h1>
          <p>{{ pgT('setup.heroSubtitle') }}</p>
        </article>
        <ProfitTargetProgress :progress="evaluation.targetProgress" />
      </section>

      <ChallengeSetupWizard
        :challenge="selectedChallenge"
        @save="updateChallenge"
        @reset="resetChallenge"
      />
    </main>
  </section>
</template>

<script setup>
import ChallengeSetupWizard from '../components/ChallengeSetupWizard.vue'
import ProfitTargetProgress from '../components/ProfitTargetProgress.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const {
  accounts,
  accountId,
  setAccount,
  selectedChallenge,
  updateChallenge,
  resetChallenge,
  evaluation
} = usePropGuardian()

const { pgT } = usePropGuardianI18n()
</script>
