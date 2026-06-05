<template>
  <div class="language-switcher">
    <button 
      class="lang-btn" 
      :class="{ active: currentLang === 'vi' }" 
      @click="setLang('vi')"
    >
      VN
    </button>
    <span class="divider">|</span>
    <button 
      class="lang-btn" 
      :class="{ active: currentLang === 'en' }" 
      @click="setLang('en')"
    >
      EN
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()
const currentLang = ref(locale.value)

function setLang(lang) {
  locale.value = lang
  currentLang.value = lang
  localStorage.setItem('lang', lang)
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--lf-card-bg);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--lf-border-color);
}

.lang-btn {
  background: none;
  border: none;
  color: var(--lf-text-muted);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.lang-btn:hover {
  color: var(--lf-primary);
}

.lang-btn.active {
  color: var(--lf-primary);
  background: rgba(255, 0, 127, 0.1);
}

.divider {
  color: var(--lf-border-color);
  font-size: 14px;
}
</style>
