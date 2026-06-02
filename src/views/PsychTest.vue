<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest } from '../lib/api.js'
import { useUserStore } from '../stores/useUserStore.js'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const questions = ref([])
const selected = ref({})
const completed = ref(false)
const score = ref(null)
const result = ref('')

const authHeaders = computed(() => ({ Authorization: `Bearer ${userStore.token}` }))
const isReadyToSubmit = computed(() => {
  if (!questions.value.length) return false
  return questions.value.every((q) => ['A', 'B', 'C'].includes(selected.value[q.id] || ''))
})

function resultGuide(resultText = '') {
  if (resultText.includes('on dinh')) return 'Co the giao dich theo plan'
  if (resultText.includes('Thieu ky luat')) return 'Nen giam khoi luong, trade can than'
  if (resultText.includes('FOMO')) return 'De vao lenh sai, nen han che trade'
  return 'Khong nen giao dich hom nay'
}

async function loadStatusAndQuestions() {
  try {
    loading.value = true
    error.value = ''
    const status = await apiRequest('/api/psych-test/status', { headers: authHeaders.value })
    userStore.setPsychTestStatus(status)
    completed.value = Boolean(status.completed)
    score.value = status.score ?? null
    result.value = status.result || ''
    if (!completed.value) {
      const payload = await apiRequest('/api/psych-test/questions', { headers: authHeaders.value })
      questions.value = payload.questions || []
      selected.value = {}
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function submitPsychTest() {
  if (!isReadyToSubmit.value || saving.value) return
  try {
    saving.value = true
    error.value = ''
    const answers = questions.value.map((q) => ({
      questionId: q.id,
      choice: selected.value[q.id]
    }))
    const payload = await apiRequest('/api/psych-test/submit', {
      method: 'POST',
      headers: authHeaders.value,
      body: JSON.stringify({ answers })
    })
    completed.value = true
    score.value = payload.score
    result.value = payload.result
    userStore.setPsychTestStatus({
      required: true,
      completed: true,
      score: payload.score,
      result: payload.result
    })
    await userStore.fetchMe()
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function goDashboard() {
  router.push('/dashboard')
}

onMounted(loadStatusAndQuestions)
</script>

<template>
  <section class="psych-page">
    <div class="psych-card">
      <h1>Test Tam Ly Trader</h1>
      <p class="auth-sub">Nguoi dung can hoan thanh test trong ngay truoc khi vao he thong. Admin duoc bo qua.</p>

      <div class="auth-error" v-if="error">{{ error }}</div>
      <div class="auth-info" v-if="loading">Dang tai bai test...</div>

      <template v-if="!loading && completed">
        <div class="psych-result">
          <div class="psych-score">Diem hom nay: {{ score ?? 0 }}/20</div>
          <div class="psych-label">{{ result }}</div>
          <div class="psych-guide">{{ resultGuide(result) }}</div>
        </div>
        <button class="auth-btn" @click="goDashboard">Vao he thong</button>
      </template>

      <template v-if="!loading && !completed">
        <div class="psych-list">
          <article class="psych-q" v-for="(q, idx) in questions" :key="q.id">
            <h3>{{ idx + 1 }}. {{ q.question }}</h3>
            <label class="psych-opt">
              <input type="radio" :name="`q-${q.id}`" value="A" v-model="selected[q.id]" />
              <span>A. {{ q.options.A }}</span>
            </label>
            <label class="psych-opt">
              <input type="radio" :name="`q-${q.id}`" value="B" v-model="selected[q.id]" />
              <span>B. {{ q.options.B }}</span>
            </label>
            <label class="psych-opt">
              <input type="radio" :name="`q-${q.id}`" value="C" v-model="selected[q.id]" />
              <span>C. {{ q.options.C }}</span>
            </label>
          </article>
        </div>

        <button class="auth-btn" @click="submitPsychTest" :disabled="saving || !isReadyToSubmit">
          {{ saving ? 'Dang nop...' : 'Hoan thanh test tam ly' }}
        </button>
      </template>
    </div>
  </section>
</template>
