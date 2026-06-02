import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const LOCALE_KEY = 'luminafox_locale'
const SUPPORTED = ['vi', 'en']

export const useUiStore = defineStore('ui', () => {
  const locale = ref(SUPPORTED.includes(localStorage.getItem(LOCALE_KEY)) ? localStorage.getItem(LOCALE_KEY) : 'vi')

  const isVietnamese = computed(() => locale.value === 'vi')

  function setLocale(nextLocale) {
    const value = SUPPORTED.includes(String(nextLocale || '').toLowerCase())
      ? String(nextLocale).toLowerCase()
      : 'vi'
    locale.value = value
    localStorage.setItem(LOCALE_KEY, value)
  }

  function toggleLocale() {
    setLocale(locale.value === 'vi' ? 'en' : 'vi')
  }

  return {
    locale,
    isVietnamese,
    setLocale,
    toggleLocale
  }
})

