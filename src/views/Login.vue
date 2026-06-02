<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from '../composables/useI18n.js'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  try {
    loading.value = true
    error.value = ''
    const payload = await userStore.loginStart({
      email: email.value,
      password: password.value
    })
    userStore.applySession(payload.token, payload.user)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loginGoogle() {
  try {
    error.value = ''
    await userStore.loginWithGoogle()
  } catch (e) {
    error.value = e.message
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>{{ t('auth.loginTitle') }}</h1>
      <p class="auth-sub">{{ t('auth.loginSub') }}</p>

      <div class="auth-error" v-if="error">{{ error }}</div>
      <label>{{ t('auth.email') }}</label>
      <input v-model="email" type="email" class="auth-input" placeholder="you@example.com" />

      <label>{{ t('auth.password') }}</label>
      <input v-model="password" type="password" class="auth-input" placeholder="******" />

      <button class="auth-btn" @click="handleLogin" :disabled="loading">
        {{ loading ? t('auth.processing') : t('auth.login') }}
      </button>

      <button class="auth-btn ghost" @click="loginGoogle" :disabled="loading">{{ t('auth.loginGoogle') }}</button>

      <div class="auth-links">
        <RouterLink to="/register">{{ t('auth.createAccount') }}</RouterLink>
        <RouterLink to="/forgot-password">{{ t('auth.forgotPassword') }}</RouterLink>
      </div>
    </div>
  </section>
</template>
