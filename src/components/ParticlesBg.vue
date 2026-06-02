<template>
  <div class="particles">
    <div
      v-for="p in floatParticles"
      :key="`f-${p.id}`"
      class="particle"
      :class="p.kind"
      :style="p.style"
    />
    <div
      v-for="s in sparkleParticles"
      :key="`s-${s.id}`"
      class="particle-spark"
      :style="s.style"
    />
    <div class="cursor-aura" :style="auraStyle" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const floatParticles = ref(
  Array.from({ length: 54 }, (_, i) => {
    const size = Math.random() < 0.3 ? 3 : 2
    return {
      id: i,
      kind: Math.random() < 0.28 ? 'bright' : 'soft',
      style: {
        left: `${Math.random() * 100}%`,
        '--dur': `${6 + Math.random() * 16}s`,
        '--delay': `${Math.random() * -14}s`,
        '--drift': `${(Math.random() - 0.5) * 240}px`,
        width: `${size}px`,
        height: `${size}px`
      }
    }
  })
)

const sparkleParticles = ref(
  Array.from({ length: 24 }, (_, i) => ({
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      '--dur': `${2.4 + Math.random() * 4.2}s`,
      '--delay': `${Math.random() * -6}s`,
      '--scale': `${0.7 + Math.random() * 0.7}`
    }
  }))
)

const pointer = ref({ x: 50, y: 50, active: false })
let pointerActiveTimer = null

const auraStyle = computed(() => ({
  '--mx': `${pointer.value.x}%`,
  '--my': `${pointer.value.y}%`,
  '--op': pointer.value.active ? 1 : 0
}))

function onPointerMove(event) {
  const width = window.innerWidth || 1
  const height = window.innerHeight || 1
  pointer.value.x = (event.clientX / width) * 100
  pointer.value.y = (event.clientY / height) * 100
  pointer.value.active = true
  if (pointerActiveTimer) window.clearTimeout(pointerActiveTimer)
  pointerActiveTimer = window.setTimeout(() => {
    pointer.value.active = false
  }, 1800)
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  if (pointerActiveTimer) window.clearTimeout(pointerActiveTimer)
})
</script>
