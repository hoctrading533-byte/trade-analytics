import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import vi from '../locales/vi.json'

const savedLang = localStorage.getItem('lang') || 'vi'

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: savedLang,
  fallbackLocale: 'vi',
  messages: {
    en,
    vi
  }
})

export default i18n
