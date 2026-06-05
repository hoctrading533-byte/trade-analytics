<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const error = ref('')
const requiresOtp = ref(false)
const email = ref('')
const otpCode = ref('')
const loading = ref(false)

onMounted(async () => {
  if (route.query.requires_otp === 'true') {
    requiresOtp.value = true
    email.value = String(route.query.email || '')
    if (!email.value) {
      error.value = 'Missing email for OTP verification'
    }
    return
  }

  const token = String(route.query.token || '')
  if (!token) {
    error.value = 'Missing token in callback'
    return
  }

  try {
    await userStore.consumeCallbackToken(token)
    router.replace('/dashboard')
  } catch (e) {
    error.value = e.message
  }
})

async function verifyOtp() {
  if (!otpCode.value || otpCode.value.length < 6) {
    error.value = 'Vui lòng nhập mã OTP 6 số hợp lệ'
    return
  }
  try {
    loading.value = true
    error.value = ''
    await userStore.verifyRegisterOtp({ email: email.value, otp: otpCode.value })
    router.replace('/dashboard')
  } catch (e) {
    error.value = e.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-card" style="text-align: center;">
      <template v-if="requiresOtp">
        <h1 style="margin-bottom: 12px;">Xác thực Email</h1>
        <p class="auth-sub" style="margin-bottom: 24px;">
          Chúng tôi đã gửi mã OTP gồm 6 số đến email <br><strong>{{ email }}</strong>
        </p>
        
        <div class="auth-error" v-if="error" style="margin-bottom: 16px;">{{ error }}</div>
        
        <div class="auth-form-group" style="text-align: left; margin-bottom: 20px;">
          <label class="auth-label">Mã OTP</label>
          <input 
            v-model="otpCode" 
            type="text" 
            class="auth-input" 
            placeholder="123456" 
            maxlength="6"
            @keyup.enter="verifyOtp"
          />
        </div>
        
        <button class="auth-btn" @click="verifyOtp" :disabled="loading" style="width: 100%;">
          {{ loading ? 'Đang xác thực...' : 'Xác thực OTP' }}
        </button>
      </template>

      <template v-else>
        <h1>Authenticating...</h1>
        <p class="auth-sub" v-if="!error">Please wait while we finish Google sign in.</p>
        <div class="auth-error" v-else>{{ error }}</div>
      </template>
    </div>
  </section>
</template>