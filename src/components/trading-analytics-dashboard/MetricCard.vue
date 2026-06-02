<template>
  <article class="ta-metric-card" :class="`ta-metric-card--${tone}`">
    <div class="ta-metric-card__top">
      <span class="ta-metric-card__icon">{{ icon }}</span>
      <span class="ta-metric-card__trend" :class="trendTone">{{ trend }}</span>
    </div>
    <p class="ta-metric-card__label">{{ label }}</p>
    <div class="ta-metric-card__value">{{ value }}</div>
    <p class="ta-metric-card__hint">{{ hint }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  hint: { type: String, default: '' },
  trend: { type: String, default: '' },
  trendTone: { type: String, default: 'neutral' },
  icon: { type: String, default: 'A' },
  tone: { type: String, default: 'primary' }
})
</script>
