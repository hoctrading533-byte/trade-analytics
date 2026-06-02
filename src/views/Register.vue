<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'
import { useI18n } from '../composables/useI18n.js'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const otp = ref('')
const needOtp = ref(false)
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  try {
    loading.value = true
    error.value = ''
    await userStore.registerStart({
      name: name.value,
      email: email.value,
      phone: phone.value,
      password: password.value
    })
    needOtp.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  try {
    loading.value = true
    error.value = ''
    await userStore.verifyRegisterOtp({
      email: email.value,
      otp: otp.value
    })
    router.push('/dashboard')
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
      <h1>{{ t('auth.registerTitle') }}</h1>
      <p class="auth-sub">{{ t('auth.registerSub') }}</p>

      <div class="auth-error" v-if="error">{{ error }}</div>
      <template v-if="!needOtp">
        <label>{{ t('auth.fullName') }}</label>
        <input v-model="name" class="auth-input" :placeholder="t('auth.fullName')" />

        <label>{{ t('auth.email') }}</label>
        <input v-model="email" type="email" class="auth-input" placeholder="you@example.com" />

        <label>{{ t('auth.phone') }}</label>
        <input v-model="phone" class="auth-input" placeholder="e.g. 0901234567" />

        <label>{{ t('auth.password') }}</label>
        <input v-model="password" type="password" class="auth-input" placeholder="Minimum 6 chars" />

        <button class="auth-btn" @click="handleRegister" :disabled="loading">
          {{ loading ? t('auth.submitting') : t('auth.submitRegister') }}
        </button>
      </template>

      <template v-else>
        <label>{{ t('auth.otpCode') }}</label>
        <input v-model="otp" class="auth-input" placeholder="6 digits" maxlength="6" />
        <button class="auth-btn" @click="verifyOtp" :disabled="loading">
          {{ loading ? t('auth.verifying') : t('auth.verifyAndContinue') }}
        </button>
      </template>

      <div class="auth-links single">
        <RouterLink to="/login">{{ t('auth.backLogin') }}</RouterLink>
      </div>
    </div>
  </section>
</template>
