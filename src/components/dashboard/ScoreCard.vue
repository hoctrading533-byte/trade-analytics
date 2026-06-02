<script setup>
import { computed } from 'vue'
import { useUserStore } from '../../stores/useUserStore.js'

const userStore = useUserStore()

const formattedScore = computed(() => Number(userStore.score).toFixed(1))
const xpText = computed(() => `${userStore.userXP.toLocaleString()} / ${userStore.totalXP.toLocaleString()} XP`)
const progressStyle = computed(() => ({ width: `${userStore.xpProgress}%` }))
const stars = computed(() => {
  const count = Math.max(0, Math.min(5, Math.floor(userStore.score / 2)))
  return '★'.repeat(count).padEnd(5, '☆')
})
</script>

<template>
  <div class="card score-card">
    <div class="card-title">⚡ Tong diem Trader</div>
    <div class="score-main">
      <div class="score-num">{{ formattedScore }}</div>
      <div class="score-denom">/10</div>
      <div class="rank-badge">{{ userStore.rank }}</div>
    </div>
    <div class="score-xp">{{ xpText }}</div>
    <div class="score-xp-bar"><div class="score-xp-fill" :style="progressStyle"></div></div>
    <div class="score-level">
      <span>🎮</span> Level {{ userStore.userLevel }}
      <span class="stars">{{ stars }}</span>
    </div>
  </div>
</template>
