<template>
  <div class="card mission-card">
    <div class="card-title">📋 Nhiem vu hang ngay</div>
    <div
      v-for="m in missions"
      :key="m.id"
      class="mission-item"
      @click="m.done = !m.done"
    >
      <div class="mission-check" :class="{ done: m.done }">{{ m.done ? '✓' : '' }}</div>
      <span>{{ m.label }}</span>
      <span class="mission-count">{{ m.done ? '1/1' : '0/1' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const missions = ref([
  { id: 1, label: 'Kiem tra cam xuc', done: false },
{ id: 2, label: 'Nhat ky giao dich', done: false },
  { id: 3, label: 'Nhat ky giao dich', done: false },
  { id: 4, label: 'Hoc bai moi hom nay', done: false }
])
</script>
