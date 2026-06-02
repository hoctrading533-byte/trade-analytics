import { computed, ref } from 'vue'

const THEME_KEY = 'luminafox_theme'
const THEMES = ['dark', 'light']
export const THEME_CHANGE_EVENT = 'luminafox:themechange'

function readStoredTheme() {
  if (typeof window === 'undefined') return 'dark'
  let stored = null
  try {
    stored = window.localStorage.getItem(THEME_KEY)
  } catch {
    stored = null
  }
  return THEMES.includes(stored) ? stored : 'dark'
}

const theme = ref(readStoredTheme())

function applyTheme(nextTheme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.classList.toggle('theme-dark', nextTheme === 'dark')
    document.documentElement.classList.toggle('theme-light', nextTheme === 'light')
    document.documentElement.style.colorScheme = nextTheme
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: nextTheme } }))
  }
}

export function initializeTheme() {
  applyTheme(theme.value)
}

export function getThemeToken(name, fallback = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')
  const themeLabel = computed(() => (isDark.value ? 'Dark' : 'Light'))
  const nextThemeLabel = computed(() => (isDark.value ? 'Light' : 'Dark'))

  function setTheme(nextTheme) {
    const value = THEMES.includes(String(nextTheme)) ? String(nextTheme) : 'dark'
    theme.value = value
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_KEY, value)
      } catch {
        // localStorage can be blocked in private or embedded contexts.
      }
    }
    applyTheme(value)
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return {
    theme,
    isDark,
    themeLabel,
    nextThemeLabel,
    setTheme,
    toggleTheme
  }
}
