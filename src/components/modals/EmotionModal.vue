<template>
  <div>
    <div class="modal-title">😈 Trắc Nghiệm Cảm Xúc</div>
    <div v-if="!answered">
      <div class="modal-body" style="margin-bottom:16px;color:#fff;font-size:15px">
        Khi thị trường đang tăng mạnh và bạn chưa vào lệnh, bạn cảm thấy thế nào?
      </div>
      <div class="quiz-options">
        <div class="quiz-opt" @click="pick('fomo')">😰 Rất lo lắng, muốn vào ngay lập tức</div>
        <div class="quiz-opt" @click="pick('calm')">😌 Bình tĩnh, chờ setup hoàn hảo</div>
        <div class="quiz-opt" @click="pick('fomo')">🤑 Tiếc nuối, sợ bỏ lỡ cơ hội lớn</div>
        <div class="quiz-opt" @click="pick('calm')">📊 Phân tích lại chart trước khi quyết định</div>
      </div>
    </div>
    <div v-else style="text-align:center;padding:16px 0">
      <div style="font-size:48px;margin-bottom:12px">{{ result.icon }}</div>
      <div style="font-family:'Orbitron',sans-serif;font-size:16px;font-weight:700;color:#fff;margin-bottom:12px">{{ result.title }}</div>
      <p class="modal-body">{{ result.text }}</p>
      <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;font-size:13px;color:var(--text-muted)">
        💡 Tip: Luôn đợi setup xuất hiện trước khi vào lệnh.
      </div>
      <button class="modal-btn" @click="modal.closeModal()">HIỂU RỒI</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useModalStore } from '../../stores/useModalStore.js'

const modal    = useModalStore()
const answered = ref(false)
const result   = ref({})

function pick(type) {
  answered.value = true
  result.value = type === 'fomo'
    ? { icon:'😰', title:'⚠️ FOMO Phát Hiện!', text:'Bạn đang có dấu hiệu FOMO. Market luôn có cơ hội mới. Vào lệnh khi chưa có setup rõ ràng là đánh bạc!' }
    : { icon:'😌', title:'✅ Tâm Lý Ổn Định!',  text:'Tuyệt vời! Tâm lý ổn định là nền tảng của trader thành công. Hãy luôn giữ vững!' }
}
</script>