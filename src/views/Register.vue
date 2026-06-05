<script setup>
import { ref } from 'vue'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from '../composables/useI18n.js'

const userStore = useUserStore()
const { t } = useI18n()
const error = ref('')

async function loginGoogle() {
  try {
    error.value = ''
    await userStore.loginWithGoogle()
  } catch (e) {
    error.value = e.message || 'Lỗi khi chuyển hướng đăng ký Google.'
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card" style="text-align: center;">
      <h1 style="margin-bottom: 24px;">LuminaFox</h1>
      <div class="auth-error" v-if="error">{{ error }}</div>
      <button class="auth-btn" @click="loginGoogle">Đăng nhập/Đăng ký bằng Google</button>
    </div>
  </section>
</template>
