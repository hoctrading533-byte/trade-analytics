import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiBaseUrl, apiRequest } from '../lib/api.js'

const TOKEN_KEY = 'luminafox_access_token'

export const useUserStore = defineStore('user', () => {
  /** Single-flight bootstrap so concurrent router navigations all await the same fetchMe. */
  let authBootstrapPromise = null

  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(null)
  const loading = ref(false)
  const psychTestStatus = ref(null)

  const isLoggedIn = computed(() => Boolean(token.value && user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const userName = computed(() => user.value?.name || 'Guest')
  const userRole = computed(() => user.value?.role || 'guest')
  const userLevel = computed(() => user.value?.level || 1)
  const userXP = computed(() => user.value?.xp || 0)
  const totalXP = computed(() => (user.value ? user.value.totalXP : 100000))
  const score = computed(() => user.value?.score || 0)
  const rank = computed(() => (isAdmin.value ? 'ADMIN' : user.value ? 'MEMBER' : 'Unranked'))
  const subscription = computed(() => {
    const raw = user.value?.subscription || {}
    const admin = user.value?.role === 'admin'
    const activePro = admin || raw.isPro === true
    return {
      ...raw,
      planCode: activePro ? 'pro' : raw.planCode || 'free',
      planName: activePro ? raw.planName || 'LuminaFox Premium' : raw.planName || 'Payment required',
      status: activePro ? 'active' : raw.status || 'payment_required',
      isPro: activePro,
      requiresPayment: !admin && !activePro,
      priceVnd: Number(raw.priceVnd || 149000),
      adminBypass: admin || raw.adminBypass === true
    }
  })
  const planCode = computed(() => subscription.value.planCode)
  const isPro = computed(() => subscription.value.isPro)
  const requiresPayment = computed(() => Boolean(isLoggedIn.value && !isAdmin.value && !isPro.value))
  const isMaxLevel = computed(() => Boolean(user.value?.isMaxLevel))
  const xpProgress = computed(() => {
    if (isMaxLevel.value || totalXP.value === null) return 100
    if (!totalXP.value) return 0
    return Math.max(0, Math.min(100, (userXP.value / totalXP.value) * 100))
  })
  const needsPsychTestToday = computed(() => {
    if (!isLoggedIn.value || isAdmin.value) return false
    if (!psychTestStatus.value) return true
    return Boolean(psychTestStatus.value.required && !psychTestStatus.value.completed)
  })

  function setToken(nextToken) {
    token.value = nextToken || ''
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value)
    else localStorage.removeItem(TOKEN_KEY)
  }

  function authHeader() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  async function initializeAuth() {
    authBootstrapPromise ??= (async () => {
      try {
        if (!token.value) return
        await fetchMe()
      } catch {
        logout()
      }
    })()
    await authBootstrapPromise
  }

  async function fetchMe() {
    if (!token.value) {
      user.value = null
      return null
    }
    const payload = await apiRequest('/api/auth/me', {
      headers: authHeader()
    })
    user.value = payload.user
    psychTestStatus.value = null
    return user.value
  }

  function applySession(nextToken, nextUser) {
    authBootstrapPromise = null
    setToken(nextToken)
    user.value = nextUser
    psychTestStatus.value = null
  }

  async function fetchPsychTestStatus(force = false) {
    if (!token.value || !user.value) return null
    if (!force && psychTestStatus.value) return psychTestStatus.value
    const payload = await apiRequest('/api/psych-test/status', {
      headers: authHeader()
    })
    psychTestStatus.value = payload
    return payload
  }

  function setPsychTestStatus(status) {
    psychTestStatus.value = status
  }

  async function registerStart({ name, email, phone, password }) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password })
    })
  }

  async function verifyRegisterOtp({ email, otp }) {
    const payload = await apiRequest('/api/auth/verify-register-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    })
    applySession(payload.token, payload.user)
    return payload
  }

  async function loginStart({ email, password }) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async function verifyLoginOtp({ email, otp }) {
    const payload = await apiRequest('/api/auth/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    })
    applySession(payload.token, payload.user)
    return payload
  }

  async function forgotPassword(email) {
    return apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  }

  async function resetPassword({ email, otp, newPassword }) {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    })
  }

  async function loginWithGoogle() {
    const payload = await apiRequest('/api/auth/google/url')
    window.location.href = payload.url
  }

  async function consumeCallbackToken(nextToken) {
    authBootstrapPromise = null
    setToken(nextToken)
    await fetchMe()
  }

  async function fetchAdminUsers() {
    const payload = await apiRequest('/api/admin/users', {
      headers: authHeader()
    })
    return payload.users || []
  }

  async function fetchBillingPlans() {
    const payload = await apiRequest('/api/billing/plans', {
      headers: authHeader()
    })
    return payload.plans || []
  }

  async function fetchBillingMe() {
    const payload = await apiRequest('/api/billing/me', {
      headers: authHeader()
    })
    if (payload?.subscription && user.value) {
      user.value = {
        ...user.value,
        subscription: payload.subscription,
        access: {
          ...(user.value.access || {}),
          isPro: payload.subscription.isPro === true,
          analysisDepth: payload.subscription.isPro ? 'pro' : 'summary'
        }
      }
    }
    return payload
  }

  async function createUpgradeIntent(planCode = 'pro', note = '') {
    return apiRequest('/api/billing/upgrade-intent', {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify({ planCode, note })
    })
  }

  async function markBillingOrderPaid(orderId, payload = {}) {
    return apiRequest(`/api/billing/orders/${orderId}/mark-paid`, {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload || {})
    })
  }

  async function fetchAdminBillingSummary(days = 30) {
    return apiRequest(`/api/admin/billing/summary?days=${Number(days || 30)}`, {
      headers: authHeader()
    })
  }

  async function fetchAdminBillingOrders({ status = 'all', limit = 120 } = {}) {
    return apiRequest(
      `/api/admin/billing/orders?status=${encodeURIComponent(String(status || 'all'))}&limit=${Number(limit || 120)}`,
      {
        headers: authHeader()
      }
    )
  }

  async function updateAdminBillingOrderStatus(orderId, status, reviewNote = '') {
    return apiRequest(`/api/admin/billing/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ status, reviewNote })
    })
  }

  async function updateUserRole(id, role) {
    const payload = await apiRequest(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ role })
    })
    return payload.user
  }

  async function updateUserStatus(id, status) {
    const payload = await apiRequest(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ status })
    })
    return payload.user
  }

  async function updateUserSubscription(id, planCode, durationDays = 30) {
    return apiRequest(`/api/admin/users/${id}/subscription`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ planCode, durationDays })
    })
  }

  function logout() {
    authBootstrapPromise = null
    setToken('')
    user.value = null
    psychTestStatus.value = null
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    isAdmin,
    userName,
    userRole,
    userLevel,
    userXP,
    totalXP,
    score,
    rank,
    subscription,
    planCode,
    isPro,
    requiresPayment,
    isMaxLevel,
    xpProgress,
    psychTestStatus,
    needsPsychTestToday,
    apiBaseUrl,
    initializeAuth,
    fetchMe,
    registerStart,
    verifyRegisterOtp,
    loginStart,
    verifyLoginOtp,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
    consumeCallbackToken,
    fetchPsychTestStatus,
    setPsychTestStatus,
    fetchAdminUsers,
    fetchBillingPlans,
    fetchBillingMe,
    createUpgradeIntent,
    markBillingOrderPaid,
    fetchAdminBillingSummary,
    fetchAdminBillingOrders,
    updateAdminBillingOrderStatus,
    updateUserRole,
    updateUserStatus,
    updateUserSubscription,
    applySession,
    logout
  }
})
