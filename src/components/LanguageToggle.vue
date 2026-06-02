<template>
  <button class="language-toggle" type="button" :aria-label="t('common.language')" @click="uiStore.toggleLocale">
    <span :class="{ active: locale === 'vi' }">VI</span>
    <span class="language-toggle__divider"></span>
    <span :class="{ active: locale === 'en' }">EN</span>
  </button>
</template>

<script setup>
import { useI18n } from '../composables/useI18n.js'
import { useUiStore } from '../stores/useUiStore.js'

const uiStore = useUiStore()
const { t, locale } = useI18n()
</script>

<style scoped>
.language-toggle {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border: 1px solid var(--lf-border-soft);
  border-radius: 999px;
  background: var(--lf-panel-plain);
  color: var(--lf-text-muted);
  box-shadow: var(--lf-shadow-soft);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.language-toggle:hover {
  transform: translateY(-1px);
  border-color: var(--lf-border-strong);
  box-shadow: var(--lf-shadow-hover);
  color: var(--lf-text);
}

.language-toggle span {
  font-size: 12px;
  font-weight: 900;
}

.language-toggle span.active {
  color: var(--lf-primary-hot);
}

.language-toggle__divider {
  width: 1px;
  height: 14px;
  background: var(--lf-border-soft);
}
</style>
