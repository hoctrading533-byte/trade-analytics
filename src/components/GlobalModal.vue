<template>
  <Teleport to="body">
    <div
      v-if="modal.isOpen"
      class="modal-overlay open"
      @click.self="modal.closeModal()"
    >
      <div class="modal">
        <button class="modal-close" @click="modal.closeModal()">×</button>
        <QuizModal      v-if="modal.modalType === 'quiz'" />
        <EmotionModal   v-else-if="modal.modalType === 'emotion'" />
        <ChartDemoModal v-else-if="modal.modalType === 'chartDemo'" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useModalStore }   from '../stores/useModalStore.js'
import QuizModal           from './modals/QuizModal.vue'
import EmotionModal        from './modals/EmotionModal.vue'
import ChartDemoModal      from './modals/ChartDemoModal.vue'

const modal = useModalStore()
</script>