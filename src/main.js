import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { pinia } from './stores/pinia.js'
import './assets/main.css'
import './assets/theme.css'
import './assets/theme-overrides.css'
import { initializeTheme } from './composables/useTheme.js'
import i18n from './i18n/index.js'

initializeTheme()

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
