import { computed } from 'vue'
import { useUiStore } from '../stores/useUiStore.js'
import { messages } from '../i18n/messages.js'

function getByPath(source, path) {
  const chunks = String(path || '')
    .split('.')
    .filter(Boolean)
  let cursor = source
  for (const chunk of chunks) {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, chunk)) {
      cursor = cursor[chunk]
    } else {
      return null
    }
  }
  return cursor
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))
}

export function useI18n() {
  const uiStore = useUiStore()
  const locale = computed(() => (uiStore.locale === 'en' ? 'en' : 'vi'))
  const dictionary = computed(() => messages[locale.value] || messages.vi)

  function t(path, params = {}) {
    const raw = getByPath(dictionary.value, path) ?? getByPath(messages.vi, path) ?? path
    if (typeof raw !== 'string') return String(path)
    return interpolate(raw, params)
  }

  return {
    locale,
    t
  }
}
