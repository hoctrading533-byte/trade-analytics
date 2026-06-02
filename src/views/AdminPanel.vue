<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'

const userStore = useUserStore()
const error = ref('')
const loading = ref(false)
const saving = ref(false)
const activeTab = ref('users')

const users = ref([])
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const mt5Connections = ref([])
const mt5Search = ref('')
const mt5Days = ref(30)
const mt5BusyUserId = ref('')
const behaviorRows = ref([])
const behaviorDays = ref(30)
const behaviorSearch = ref('')
const reportMonth = ref(new Date().toISOString().slice(0, 7))
const reportBusyUserId = ref('')
const billingSummary = ref({
  days: 30,
  revenuePeriodVnd: 0,
  revenueTotalVnd: 0,
  pendingOrders: 0,
  paidOrders: 0,
  rejectedOrders: 0,
  activeProUsers: 0
})
const billingOrders = ref([])
const billingStatusFilter = ref('all')
const billingDays = ref(30)
const billingLimit = ref(120)
const billingBusyOrderId = ref('')

const psychQuestions = ref([])
const newPsychQuestion = ref({
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  sortOrder: 1
})

const authHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))

const stats = computed(() => {
  const total = users.value.length
  const adminCount = users.value.filter((u) => u.role === 'admin').length
  const activeCount = users.value.filter((u) => u.status === 'active').length
  const googleCount = users.value.filter((u) => u.provider === 'google').length
  return { total, adminCount, activeCount, googleCount }
})

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  return users.value.filter((u) => {
    const keywordOk =
      !q ||
      String(u.name || '')
        .toLowerCase()
        .includes(q) ||
      String(u.email || '')
        .toLowerCase()
        .includes(q) ||
      String(u.phone || '')
        .toLowerCase()
        .includes(q)
    const roleOk = roleFilter.value === 'all' || u.role === roleFilter.value
    const statusOk = statusFilter.value === 'all' || u.status === statusFilter.value
    return keywordOk && roleOk && statusOk
  })
})

const filteredMt5Connections = computed(() => {
  const q = String(mt5Search.value || '').trim().toLowerCase()
  return mt5Connections.value.filter((item) => {
    if (!q) return true
    return (
      String(item.name || '')
        .toLowerCase()
        .includes(q) ||
      String(item.email || '')
        .toLowerCase()
        .includes(q) ||
      String(item.mt5Server || '')
        .toLowerCase()
        .includes(q) ||
      String(item.mt5LoginMasked || '')
        .toLowerCase()
        .includes(q)
    )
  })
})

const mt5Stats = computed(() => {
  const total = mt5Connections.value.length
  const active = mt5Connections.value.filter((x) => x.active).length
  const connected = mt5Connections.value.filter((x) => x.connected).length
  const synced = mt5Connections.value.filter((x) => x.lastSyncAt).length
  return { total, active, connected, synced }
})

const filteredBehaviorRows = computed(() => {
  const q = String(behaviorSearch.value || '').trim().toLowerCase()
  return behaviorRows.value.filter((item) => {
    if (!q) return true
    return (
      String(item.name || '')
        .toLowerCase()
        .includes(q) ||
      String(item.email || '')
        .toLowerCase()
        .includes(q) ||
      String(item.mt5Server || '')
        .toLowerCase()
        .includes(q)
    )
  })
})

const behaviorStats = computed(() => {
  const totalUsers = behaviorRows.value.length
  const mt5Connected = behaviorRows.value.filter((x) => x.mt5Connected).length
  const highRisk = behaviorRows.value.filter((x) => Number(x.behaviorRiskScore || 0) >= 70).length
  const avgScore =
    totalUsers > 0
      ? behaviorRows.value.reduce((acc, x) => acc + Number(x.avgBehaviorScore || 0), 0) / totalUsers
      : 0
  return {
    totalUsers,
    mt5Connected,
    highRisk,
    avgScore: Number(avgScore.toFixed(2))
  }
})

const billingStats = computed(() => ({
  revenuePeriodVnd: Number(billingSummary.value?.revenuePeriodVnd || 0),
  revenueTotalVnd: Number(billingSummary.value?.revenueTotalVnd || 0),
  pendingOrders: Number(billingSummary.value?.pendingOrders || 0),
  paidOrders: Number(billingSummary.value?.paidOrders || 0),
  rejectedOrders: Number(billingSummary.value?.rejectedOrders || 0),
  activeProUsers: Number(billingSummary.value?.activeProUsers || 0)
}))

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('vi-VN')
}

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('vi-VN')
}

function formatVnd(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`
}

function mapAdminError(message) {
  const text = String(message || '').trim()
  if (!text) return 'Co loi xay ra. Vui long thu lai.'
  if (text.includes('MT5 initialize failed')) return 'Khong khoi tao duoc MT5 service. Kiem tra terminal64.exe tren server.'
  if (text.includes('MT5 login failed')) return 'Dang nhap MT5 that bai. Kiem tra login/password/server cua user.'
  if (text.includes('Connection is inactive')) return 'Ket noi MT5 cua user dang bi vo hieu hoa.'
  if (text.includes('cau hoi') || text.includes('A/B/C')) return text
  return text
}

async function loadUsers() {
  const payload = await userStore.fetchAdminUsers()
  users.value = payload || []
}

async function loadPsychQuestions() {
  const payload = await apiRequest('/api/admin/psych-test/questions', { headers: authHeaders.value })
  psychQuestions.value = payload.questions || []
  if (!newPsychQuestion.value.sortOrder || newPsychQuestion.value.sortOrder < 1) {
    newPsychQuestion.value.sortOrder = Math.max(1, psychQuestions.value.length + 1)
  }
}

async function loadMt5Connections() {
  const payload = await apiRequest('/api/admin/trading/mt5-connections', { headers: authHeaders.value })
  mt5Connections.value = payload.connections || []
}

async function loadBehaviorOverview() {
  const payload = await apiRequest(`/api/admin/trading/behavior-overview?days=${Number(behaviorDays.value || 30)}`, {
    headers: authHeaders.value
  })
  behaviorRows.value = payload.rows || []
}

async function loadBillingData() {
  const [summary, ordersPayload] = await Promise.all([
    userStore.fetchAdminBillingSummary(Number(billingDays.value || 30)),
    userStore.fetchAdminBillingOrders({
      status: billingStatusFilter.value,
      limit: Number(billingLimit.value || 120)
    })
  ])
  billingSummary.value = summary || billingSummary.value
  billingOrders.value = ordersPayload?.orders || []
}

async function loadData() {
  loading.value = true
  error.value = ''
  const results = await Promise.allSettled([
    loadUsers(),
    loadPsychQuestions(),
    loadMt5Connections(),
    loadBehaviorOverview(),
    loadBillingData()
  ])
  const failed = results.find((item) => item.status === 'rejected')
  if (failed) {
    error.value = mapAdminError(failed.reason?.message || failed.reason)
  }
  loading.value = false
}

async function setMt5Active(item, active) {
  if (!item?.userId) return
  try {
    mt5BusyUserId.value = item.userId
    await apiRequest(`/api/admin/trading/mt5-connections/${item.userId}/status`, {
      method: 'PATCH',
      headers: authHeaders.value,
      body: JSON.stringify({ active })
    })
    await loadMt5Connections()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    mt5BusyUserId.value = ''
  }
}

async function removeMt5Connection(item) {
  if (!item?.userId) return
  if (!confirm(`Remove MT5 connection of ${item.email}?`)) return
  try {
    mt5BusyUserId.value = item.userId
    await apiRequest(`/api/admin/trading/mt5-connections/${item.userId}`, {
      method: 'DELETE',
      headers: authHeaders.value
    })
    await loadMt5Connections()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    mt5BusyUserId.value = ''
  }
}

async function syncMt5Connection(item) {
  if (!item?.userId) return
  try {
    mt5BusyUserId.value = item.userId
    await apiRequest(`/api/admin/trading/mt5-connections/${item.userId}/sync`, {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({ days: Number(mt5Days.value || 30) })
    })
    await loadMt5Connections()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    mt5BusyUserId.value = ''
  }
}

async function sendUserMonthlyReport(item) {
  if (!item?.userId) return
  try {
    reportBusyUserId.value = item.userId
    error.value = ''
    await apiRequest('/api/admin/trading/reports/monthly/send', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({
        userId: item.userId,
        month: String(reportMonth.value || '').trim(),
        force: true
      })
    })
    await loadBehaviorOverview()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    reportBusyUserId.value = ''
  }
}

async function updateBillingOrderStatus(order, status) {
  if (!order?.id || !status) return
  try {
    billingBusyOrderId.value = String(order.id)
    error.value = ''
    await userStore.updateAdminBillingOrderStatus(order.id, status)
    await loadBillingData()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    billingBusyOrderId.value = ''
  }
}

async function changeRole(user, nextRole) {
  if (!nextRole || user.role === nextRole) return
  try {
    saving.value = true
    await userStore.updateUserRole(user.id, nextRole)
    await loadUsers()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    saving.value = false
  }
}

async function changeStatus(user, nextStatus) {
  if (!nextStatus || user.status === nextStatus) return
  try {
    saving.value = true
    await userStore.updateUserStatus(user.id, nextStatus)
    await loadUsers()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    saving.value = false
  }
}

async function addPsychQuestion() {
  const question = String(newPsychQuestion.value.question || '').trim()
  const optionA = String(newPsychQuestion.value.optionA || '').trim()
  const optionB = String(newPsychQuestion.value.optionB || '').trim()
  const optionC = String(newPsychQuestion.value.optionC || '').trim()
  if (!question || !optionA || !optionB || !optionC) {
    error.value = 'Moi cau hoi can day du noi dung va 3 dap an A/B/C.'
    return
  }
  try {
    saving.value = true
    error.value = ''
    await apiRequest('/api/admin/psych-test/questions', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({
        question,
        optionA,
        optionB,
        optionC,
        sortOrder: Number(newPsychQuestion.value.sortOrder || psychQuestions.value.length + 1)
      })
    })
    newPsychQuestion.value = {
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      sortOrder: psychQuestions.value.length + 1
    }
    await loadPsychQuestions()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    saving.value = false
  }
}

async function savePsychQuestion(item) {
  const question = String(item.question || '').trim()
  const optionA = String(item.optionA || '').trim()
  const optionB = String(item.optionB || '').trim()
  const optionC = String(item.optionC || '').trim()
  if (!question || !optionA || !optionB || !optionC) {
    error.value = 'Moi cau hoi can day du noi dung va 3 dap an A/B/C.'
    return
  }
  try {
    saving.value = true
    error.value = ''
    await apiRequest(`/api/admin/psych-test/questions/${item.id}`, {
      method: 'PATCH',
      headers: authHeaders.value,
      body: JSON.stringify({
        question,
        optionA,
        optionB,
        optionC,
        sortOrder: Number(item.sortOrder || 1),
        isActive: item.isActive !== false
      })
    })
    await loadPsychQuestions()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    saving.value = false
  }
}

async function deletePsychQuestion(item) {
  if (!confirm(`Delete question #${item.id}?`)) return
  try {
    saving.value = true
    error.value = ''
    await apiRequest(`/api/admin/psych-test/questions/${item.id}`, {
      method: 'DELETE',
      headers: authHeaders.value
    })
    await loadPsychQuestions()
  } catch (e) {
    error.value = mapAdminError(e.message)
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <section class="admin-page">
    <div class="admin-wrap">
      <header class="admin-head">
        <div>
          <h1>Admin Control Center</h1>
          <p class="auth-sub">Quan ly user, MT5, behavior analytics, tien bac va cau hinh web.</p>
        </div>
        <button class="mini-btn admin-refresh" @click="loadData" :disabled="loading || saving">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </header>

      <div class="admin-tabs">
        <button class="mini-btn" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">User management</button>
        <button class="mini-btn" :class="{ active: activeTab === 'mt5' }" @click="activeTab = 'mt5'">MT5/API</button>
        <button class="mini-btn" :class="{ active: activeTab === 'behavior' }" @click="activeTab = 'behavior'">Behavior analytics</button>
        <button class="mini-btn" :class="{ active: activeTab === 'billing' }" @click="activeTab = 'billing'">Tien bac & Web</button>
        <button class="mini-btn" :class="{ active: activeTab === 'psych' }" @click="activeTab = 'psych'">Psych test</button>
      </div>

      <div class="auth-error" v-if="error">{{ error }}</div>

      <template v-if="activeTab === 'users'">
        <div class="admin-stats">
          <article class="admin-stat-card">
            <span class="label">Tong user</span>
            <strong>{{ stats.total }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Admin</span>
            <strong>{{ stats.adminCount }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Dang active</span>
            <strong>{{ stats.activeCount }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Google account</span>
            <strong>{{ stats.googleCount }}</strong>
          </article>
        </div>

        <div class="admin-filters">
          <input v-model="search" class="auth-input admin-search" placeholder="Tim theo ten, email, so dien thoai..." />
          <select v-model="roleFilter" class="admin-select">
            <option value="all">Tat ca role</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select v-model="statusFilter" class="admin-select">
            <option value="all">Tat ca trang thai</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Provider</th>
                <th>Joined</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ user.name }}</strong>
                    <span>{{ user.email }}</span>
                  </div>
                </td>
                <td>{{ user.phone || '-' }}</td>
                <td>
                  <select class="admin-select" :value="user.role" @change="changeRole(user, $event.target.value)" :disabled="saving">
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </td>
                <td>
                  <select class="admin-select" :value="user.status" @change="changeStatus(user, $event.target.value)" :disabled="saving">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </td>
                <td>
                  <div class="actions">
                    <span class="chip" :class="{ on: user.subscription?.isPro, off: !user.subscription?.isPro }">
                      {{ user.role === 'admin' ? 'ADMIN BYPASS' : user.subscription?.isPro ? 'PAID PREMIUM' : 'PAYMENT REQUIRED' }}
                    </span>
                  </div>
                </td>
                <td>
                  <span class="chip">{{ user.provider }}</span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td>Lv.{{ user.level || 1 }} • {{ user.xp || 0 }} XP</td>
              </tr>
              <tr v-if="!filteredUsers.length">
                <td colspan="8">Khong co user phu hop bo loc hien tai.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'mt5'">
        <div class="admin-stats">
          <article class="admin-stat-card">
            <span class="label">Tong ket noi</span>
            <strong>{{ mt5Stats.total }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Dang active</span>
            <strong>{{ mt5Stats.active }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Da ket noi</span>
            <strong>{{ mt5Stats.connected }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Da sync data</span>
            <strong>{{ mt5Stats.synced }}</strong>
          </article>
        </div>

        <div class="admin-filters">
          <input v-model="mt5Search" class="auth-input admin-search" placeholder="Tim user/email/server/login..." />
          <input v-model.number="mt5Days" class="auth-input" type="number" min="1" max="365" placeholder="So ngay sync" />
          <button class="mini-btn" @click="loadMt5Connections" :disabled="saving || loading">Refresh MT5</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>MT5</th>
                <th>Connection</th>
                <th>Last Sync</th>
                <th>Source</th>
                <th>Behavior</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredMt5Connections" :key="item.userId">
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.email }}</span>
                  </div>
                </td>
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ item.mt5LoginMasked || '-' }}</strong>
                    <span>{{ item.mt5Server || '-' }}</span>
                  </div>
                </td>
                <td>
                  <span class="chip" :class="{ on: item.active, off: !item.active }">
                    {{ item.active ? 'active' : 'inactive' }}
                  </span>
                  <div class="admin-sub">{{ formatDateTime(item.connectionUpdatedAt) }}</div>
                </td>
                <td>{{ formatDateTime(item.lastSyncAt) }}</td>
                <td>{{ item.source || '-' }}</td>
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ Number(item.analysis?.winRate || 0).toFixed(2) }}%</strong>
                    <span>PF {{ Number(item.analysis?.profitFactor || 0).toFixed(2) }} • {{ item.analysis?.behaviorLabel || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div class="actions">
                    <button
                      class="mini-btn"
                      @click="syncMt5Connection(item)"
                      :disabled="mt5BusyUserId === item.userId || !item.active"
                    >
                      Sync now
                    </button>
                    <button
                      class="mini-btn"
                      @click="setMt5Active(item, !item.active)"
                      :disabled="mt5BusyUserId === item.userId"
                    >
                      {{ item.active ? 'Disable' : 'Enable' }}
                    </button>
                    <button
                      class="mini-btn danger"
                      @click="removeMt5Connection(item)"
                      :disabled="mt5BusyUserId === item.userId"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredMt5Connections.length">
                <td colspan="7">Chua co ket noi MT5/API nao.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'behavior'">
        <div class="admin-stats">
          <article class="admin-stat-card">
            <span class="label">Users co du lieu</span>
            <strong>{{ behaviorStats.totalUsers }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">MT5 connected</span>
            <strong>{{ behaviorStats.mt5Connected }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">High risk</span>
            <strong>{{ behaviorStats.highRisk }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Avg behavior</span>
            <strong>{{ behaviorStats.avgScore }}</strong>
          </article>
        </div>

        <div class="admin-filters">
          <input v-model="behaviorSearch" class="auth-input admin-search" placeholder="Tim theo user/email/server..." />
          <input v-model.number="behaviorDays" class="auth-input" type="number" min="1" max="365" placeholder="So ngay tong hop" />
          <input v-model="reportMonth" class="auth-input" type="month" />
          <button class="mini-btn" @click="loadBehaviorOverview" :disabled="saving || loading">Refresh behavior</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Net day/week/month</th>
                <th>Trades month</th>
                <th>Behavior</th>
                <th>Report</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredBehaviorRows" :key="item.userId">
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.email }}</span>
                  </div>
                </td>
                <td>
                  <div class="admin-user-cell">
                    <strong :class="{ 'pnl-positive': Number(item.netDay || 0) >= 0, 'pnl-negative': Number(item.netDay || 0) < 0 }">
                      D {{ Number(item.netDay || 0).toFixed(2) }}
                    </strong>
                    <span :class="{ 'pnl-positive': Number(item.netWeek || 0) >= 0, 'pnl-negative': Number(item.netWeek || 0) < 0 }">
                      W {{ Number(item.netWeek || 0).toFixed(2) }} | M {{ Number(item.netMonth || 0).toFixed(2) }}
                    </span>
                  </div>
                </td>
                <td>{{ item.tradesMonth || 0 }}</td>
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ Number(item.behaviorRiskScore || 0).toFixed(2) }}</strong>
                    <span>{{ item.behaviorLabel || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ item.latestReportMonth || '--' }}</strong>
                    <span>{{ item.latestReportStatus || '--' }} · {{ formatDateTime(item.latestReportSentAt) }}</span>
                  </div>
                </td>
                <td>
                  <button
                    class="mini-btn"
                    @click="sendUserMonthlyReport(item)"
                    :disabled="reportBusyUserId === item.userId"
                  >
                    {{ reportBusyUserId === item.userId ? 'Sending...' : 'Send report' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredBehaviorRows.length">
                <td colspan="6">Chua co du lieu behavior de hien thi.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="activeTab === 'billing'">
        <section class="admin-guide">
          <h3>Quan ly tien bac & web</h3>
          <p>User thuong phai thanh toan 149K moi vao app. Admin duoc bypass va co the duyet, tu choi, kiem tra don PayOS/QR tai day.</p>
        </section>

        <div class="admin-stats">
          <article class="admin-stat-card">
            <span class="label">Doanh thu {{ Number(billingSummary.days || billingDays) }} ngày</span>
            <strong>{{ formatVnd(billingStats.revenuePeriodVnd) }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Tổng doanh thu</span>
            <strong>{{ formatVnd(billingStats.revenueTotalVnd) }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Pro đang hoạt động</span>
            <strong>{{ billingStats.activeProUsers }}</strong>
          </article>
          <article class="admin-stat-card">
            <span class="label">Đơn chờ xử lý</span>
            <strong>{{ billingStats.pendingOrders }}</strong>
          </article>
        </div>

        <div class="admin-filters">
          <select v-model="billingStatusFilter" class="admin-select">
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">pending</option>
            <option value="waiting_admin">waiting_admin</option>
            <option value="paid">paid</option>
            <option value="rejected">rejected</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input v-model.number="billingDays" class="auth-input" type="number" min="7" max="365" placeholder="Số ngày thống kê" />
          <input v-model.number="billingLimit" class="auth-input" type="number" min="10" max="500" placeholder="Giới hạn dòng" />
          <button class="mini-btn" @click="loadBillingData" :disabled="saving || loading">Refresh billing</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>User</th>
                <th>Plan</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Người CK</th>
                <th>Chứng từ</th>
                <th>Tạo lúc</th>
                <th>Thanh toán</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in billingOrders" :key="item.id">
                <td>
                  <div class="admin-user-cell">
                    <strong>#{{ item.id }}</strong>
                    <span>{{ item.paymentMethod || 'bank_qr' }} {{ item.providerOrderCode ? '· ' + item.providerOrderCode : '' }}</span>
                    <a v-if="item.checkoutUrl" :href="item.checkoutUrl" target="_blank" rel="noopener noreferrer">PayOS link</a>
                  </div>
                </td>
                <td>{{ item.userName || 'User' }}</td>
                <td>{{ String(item.planCode || 'pro').toUpperCase() }}</td>
                <td>{{ formatVnd(item.amountVnd) }}</td>
                <td>
                  <span class="chip">{{ item.status }}</span>
                </td>
                <td>
                  <div class="admin-user-cell">
                    <strong>{{ item.payerName || '-' }}</strong>
                    <span>{{ item.payerPhone || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div class="admin-user-cell">
                    <a v-if="item.proofImageUrl" class="mini-btn" :href="item.proofImageUrl" target="_blank" rel="noopener noreferrer">Xem ảnh</a>
                    <span v-else>-</span>
                    <span>{{ formatDateTime(item.proofUploadedAt) }}</span>
                  </div>
                </td>
                <td>{{ formatDateTime(item.createdAt) }}</td>
                <td>{{ formatDateTime(item.paidAt || item.approvedAt) }}</td>
                <td>
                  <div class="actions">
                    <button
                      class="mini-btn"
                      @click="updateBillingOrderStatus(item, 'paid')"
                      :disabled="billingBusyOrderId === String(item.id) || item.status === 'paid'"
                    >
                      Duyệt paid
                    </button>
                    <button
                      class="mini-btn danger"
                      @click="updateBillingOrderStatus(item, 'rejected')"
                      :disabled="billingBusyOrderId === String(item.id) || item.status === 'rejected'"
                    >
                      Từ chối
                    </button>
                    <button
                      class="mini-btn"
                      @click="updateBillingOrderStatus(item, 'waiting_admin')"
                      :disabled="billingBusyOrderId === String(item.id) || item.status === 'waiting_admin'"
                    >
                      Chờ duyệt
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!billingOrders.length">
                <td colspan="10">Chưa có đơn thanh toán nào.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <section class="admin-guide">
          <h3>Psych Test Manager</h3>
          <p>Admin co the them/sua/xoa cau hoi test tam ly. Nguoi dung thuong phai lam test moi ngay 1 lan.</p>
        </section>

        <div class="admin-learning-add">
          <input v-model="newPsychQuestion.question" class="auth-input" placeholder="Noi dung cau hoi" />
          <input v-model="newPsychQuestion.optionA" class="auth-input" placeholder="Dap an A" />
          <input v-model="newPsychQuestion.optionB" class="auth-input" placeholder="Dap an B" />
          <input v-model="newPsychQuestion.optionC" class="auth-input" placeholder="Dap an C" />
          <input v-model.number="newPsychQuestion.sortOrder" type="number" min="1" class="auth-input" placeholder="Thu tu" />
          <button class="mini-btn" @click="addPsychQuestion" :disabled="saving">Add question</button>
        </div>

        <div class="admin-learning-list">
          <article class="admin-learning-item" v-for="item in psychQuestions" :key="item.id">
            <div class="admin-psych-head">Question #{{ item.id }}</div>
            <div class="admin-psych-grid">
              <input v-model="item.question" class="auth-input" placeholder="Noi dung cau hoi" />
              <input v-model="item.optionA" class="auth-input" placeholder="Dap an A" />
              <input v-model="item.optionB" class="auth-input" placeholder="Dap an B" />
              <input v-model="item.optionC" class="auth-input" placeholder="Dap an C" />
              <input v-model.number="item.sortOrder" type="number" min="1" class="auth-input" placeholder="Thu tu" />
            </div>
            <div class="actions">
              <button class="mini-btn" @click="savePsychQuestion(item)" :disabled="saving">Save question</button>
              <button class="mini-btn danger" @click="deletePsychQuestion(item)" :disabled="saving">Delete question</button>
            </div>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>
