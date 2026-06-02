<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from '../composables/useI18n.js'

const userStore = useUserStore()
const { t } = useI18n()

const email = ref('')
const otp = ref('')
const newPassword = ref('')
const sent = ref(false)
const error = ref('')
const success = ref('')
const loading = ref(false)

async function sendOtp() {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    await userStore.forgotPassword(email.value)
    sent.value = true
    success.value = t('auth.sendOtpDone')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function updatePassword() {
  try {
    loading.value = true
    error.value = ''
    success.value = ''
    await userStore.resetPassword({
      email: email.value,
      otp: otp.value,
      newPassword: newPassword.value
    })
    success.value = t('auth.passwordUpdated')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>{{ t('auth.forgotTitle') }}</h1>
      <p class="auth-sub">{{ t('auth.forgotSub') }}</p>

      <div class="auth-error" v-if="error">{{ error }}</div>
      <div class="auth-success" v-if="success">{{ success }}</div>

      <label>{{ t('auth.email') }}</label>
      <input v-model="email" type="email" class="auth-input" placeholder="you@example.com" />

      <button class="auth-btn" @click="sendOtp" :disabled="loading">
        {{ loading ? t('auth.processing') : t('auth.sendOtp') }}
      </button>

      <template v-if="sent">
        <label>{{ t('auth.otpCode') }}</label>
        <input v-model="otp" class="auth-input" maxlength="6" placeholder="6 digits" />

        <label>{{ t('auth.newPassword') }}</label>
        <input v-model="newPassword" type="password" class="auth-input" placeholder="Minimum 6 chars" />

        <button class="auth-btn" @click="updatePassword" :disabled="loading">
          {{ loading ? t('auth.updating') : t('auth.updatePassword') }}
        </button>
      </template>

      <div class="auth-links single">
        <RouterLink to="/login">{{ t('auth.backLogin') }}</RouterLink>
      </div>
    </div>
  </section>
</template>
