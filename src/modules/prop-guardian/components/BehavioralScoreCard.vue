<template>
  <article class="pg-card pg-behavior-card">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ kicker || pgT('nav.behavior') }}</span>
        <h3>{{ title }}</h3>
      </div>
      <strong :class="score >= 70 ? 'pg-ok' : score >= 45 ? 'pg-warn' : 'pg-danger'">{{ score }}</strong>
    </div>
    <div class="pg-score-meter">
      <span :style="{ width: `${score}%` }"></span>
    </div>
    <p>{{ description }}</p>
  </article>
</template>

<script setup>
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  score: { type: Number, required: true },
  description: { type: String, default: '' }
})

const { pgT } = usePropGuardianI18n()
</script>
