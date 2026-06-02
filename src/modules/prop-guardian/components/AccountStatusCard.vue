<template>
  <article class="pg-card pg-stat-card" :class="tone ? `pg-card--${tone}` : ''">
    <div class="pg-stat-card__top">
      <span>{{ label }}</span>
      <small v-if="meta">{{ meta }}</small>
    </div>
    <strong>{{ value }}</strong>
    <p v-if="hint">{{ hint }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  hint: { type: String, default: '' },
  meta: { type: String, default: '' },
  tone: { type: String, default: '' }
})
</script>
