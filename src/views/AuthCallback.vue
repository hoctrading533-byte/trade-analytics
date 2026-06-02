<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const error = ref('')

onMounted(async () => {
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
</script>

<template>
  <section class="auth-page">
    <div class="auth-card">
      <h1>Authenticating...</h1>
      <p class="auth-sub" v-if="!error">Please wait while we finish Google sign in.</p>
      <div class="auth-error" v-else>{{ error }}</div>
    </div>
  </section>
</template>