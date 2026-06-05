import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/useUserStore.js'
import { pinia } from '../stores/pinia.js'
import Dashboard from '../views/Dashboard.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { guestOnly: true, hideGlobalNavbar: true } },
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue'), meta: { guestOnly: true, hideGlobalNavbar: true } },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPassword.vue'),
    meta: { guestOnly: true, hideGlobalNavbar: true }
  },
  { path: '/auth/callback', name: 'AuthCallback', component: () => import('../views/AuthCallback.vue'), meta: { hideGlobalNavbar: true } },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/Pricing.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  { path: '/psych-test', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/prop-guardian',
    alias: '/quan-ly-tai-khoan-thi-quy',
    name: 'PropGuardian',
    component: () => import('../modules/prop-guardian/views/PropGuardianDashboard.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/prop-guardian/setup',
    name: 'PropGuardianSetup',
    component: () => import('../modules/prop-guardian/views/ChallengeSetup.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/prop-guardian/risk',
    name: 'PropGuardianRisk',
    component: () => import('../modules/prop-guardian/views/RealtimeRiskCenter.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/prop-guardian/behavior',
    name: 'PropGuardianBehavior',
    component: () => import('../modules/prop-guardian/views/BehavioralAI.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/prop-guardian/taskcare',
    redirect: '/prop-guardian'
  },
  {
    path: '/prop-guardian/review',
    name: 'PropGuardianReview',
    component: () => import('../modules/prop-guardian/views/TradeReview.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/prop-evaluation',
    name: 'PropEvaluation',
    component: () => import('../components/prop-evaluation/PropEvaluationDashboard.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/ket-noi-may-chu',
    name: 'ServerConnect',
    component: () => import('../views/ServerConnect.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/lich-su-giao-dich',
    name: 'TradingHistory',
    component: () => import('../views/TradingHistory.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/journal',
    alias: '/nhat-ky-giao-dich',
    name: 'TradingJournal',
    component: () => import('../views/TradingJournal.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/nft-profile',
    name: 'NftProfile',
    component: () => import('../views/NftProfile.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/co-hoi',
    name: 'Opportunities',
    component: () => import('../views/Opportunities.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/phan-tich',
    name: 'Analytics',
    component: () => import('../views/Analytics.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/playbook',
    name: 'Playbook',
    component: () => import('../views/Playbook.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/backtesting',
    name: 'Backtesting',
    component: () => import('../views/Backtesting.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/replay',
    name: 'Replay',
    component: () => import('../views/Replay.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/mentor-mode',
    name: 'MentorMode',
    component: () => import('../views/MentorMode.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/education',
    name: 'Education',
    component: () => import('../views/Education.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/marketplace',
    redirect: '/dashboard'
  },
  {
    path: '/cai-dat',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  {
    path: '/bang-xep-hang',
    name: 'Leaderboard',
    component: () => import('../views/Leaderboard.vue'),
    meta: { requiresAuth: true, hideGlobalNavbar: true }
  },
  { path: '/danh-gia', redirect: '/dashboard' },
  { path: '/danh-gia/phan-ra-hanh-vi', redirect: '/dashboard' },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: () => import('../views/AdminPanel.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to) => {
  const userStore = useUserStore(pinia)
  await userStore.initializeAuth()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'Login' }
  }
  if (to.meta.guestOnly && userStore.isLoggedIn) {
    return { name: 'Dashboard' }
  }
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return { name: 'Dashboard' }
  }
  if (to.meta.requiresAuth && userStore.isLoggedIn && !userStore.isAdmin) {
    // Payment wall has been disabled by user request
    // if (userStore.requiresPayment && to.name !== 'Pricing') {
    //   return { name: 'Pricing', query: { redirect: to.fullPath } }
    // }
    if (to.name === 'Pricing') {
      return { name: 'Dashboard' }
    }
  }
  return true
})

export default router
