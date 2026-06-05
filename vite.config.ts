import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const enableVueDevTools = process.env.VITE_ENABLE_VUE_DEVTOOLS === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: '/trade-analytics/',
  plugins: [vue(), ...(enableVueDevTools ? [vueDevTools()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
