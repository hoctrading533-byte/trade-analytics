<template>
  <div>
    <div class="modal-title">📖 Trắc Nghiệm Kiến Thức</div>

    <!-- KẾT QUẢ -->
    <div v-if="quiz.isFinished" style="text-align:center;padding:16px 0">
      <div style="font-size:56px;margin-bottom:12px">{{ badge }}</div>
      <div style="font-family:'Orbitron',sans-serif;font-size:40px;color:var(--gold);margin-bottom:4px">
        {{ quiz.score }}<span style="font-size:20px;color:var(--text-muted)">/200</span>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">{{ pct }}% chính xác</div>
      <div style="color:var(--text-secondary);font-size:15px;margin-bottom:16px">{{ msg }}</div>
      <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px;font-size:12px;color:var(--text-muted);margin-bottom:16px">
        📚 Ngân hàng câu hỏi · Random 20 câu mỗi lần
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="modal-btn" style="margin-top:0" @click="quiz.startQuiz()">🔄 Làm Lại</button>
        <button class="modal-btn" style="margin-top:0;background:rgba(255,255,255,.08);box-shadow:none" @click="modal.closeModal()">Đóng</button>
      </div>
    </div>

    <!-- CÂU HỎI -->
    <template v-else-if="quiz.currentQuestion">
      <div class="quiz-progress">
        <span>Câu {{ quiz.currentIndex + 1 }}/20</span>
        <div class="quiz-prog-bar">
          <div class="quiz-prog-fill" :style="{ width: quiz.progress + '%' }"></div>
        </div>
        <span style="color:var(--gold);font-weight:700">{{ quiz.score }} điểm</span>
      </div>

      <div class="quiz-question">{{ quiz.currentQuestion.q }}</div>

      <div class="quiz-options">
        <div
          v-for="(opt, i) in quiz.currentShuffled.opts" :key="i"
          class="quiz-opt"
          :class="optClass(i)"
          @click="answer(i)"
        >
          {{ String.fromCharCode(65+i) }}. {{ opt }}
        </div>
      </div>

      <div v-if="quiz.answered" style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,.04);border-radius:8px;font-size:13px;color:var(--text-muted);line-height:1.5">
        💡 <strong style="color:#fff">Giải thích:</strong> {{ quiz.currentQuestion.exp }}
      </div>

      <button v-if="quiz.answered" class="modal-btn" @click="quiz.nextQuestion()">
        {{ quiz.currentIndex + 1 >= 20 ? 'Xem Kết Quả' : 'Câu Tiếp →' }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useQuizStore }  from '../../stores/useQuizStore.js'
import { useModalStore } from '../../stores/useModalStore.js'

const quiz  = useQuizStore()
const modal = useModalStore()

onMounted(() => quiz.startQuiz())

const pct  = computed(() => Math.round((quiz.score / 200) * 100))
const badge = computed(() => {
  if (pct.value >= 90) return '🏆'
  if (pct.value >= 70) return '🥇'
  if (pct.value >= 50) return '🥈'
  return '📚'
})
const msg = computed(() => {
  if (pct.value >= 90) return 'Xuất sắc! Expert Trader!'
  if (pct.value >= 70) return 'Rất tốt! Trader giỏi 🔥'
  if (pct.value >= 50) return 'Khá tốt! Tiếp tục học nhé 💪'
  return 'Cần ôn thêm! Đừng nản! 💪'
})

function answer(i) {
  if (quiz.answered) return
  quiz.submitAnswer(i)
}
function optClass(i) {
  if (!quiz.answered) return ''
  if (i === quiz.currentShuffled.correctIdx) return 'correct'
  return 'wrong'
}
</script>