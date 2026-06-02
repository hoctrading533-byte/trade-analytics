import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModalStore = defineStore('modal', () => {
  const isOpen    = ref(false)
  const modalType = ref('')   // 'quiz' | 'emotion' | 'chartDemo'
  const modalData = ref(null)

  function openModal(type, data = null) {
    modalType.value = type
    modalData.value = data
    isOpen.value    = true
  }
  function closeModal() {
    isOpen.value    = false
    modalType.value = ''
    modalData.value = null
  }
  return { isOpen, modalType, modalData, openModal, closeModal }
})