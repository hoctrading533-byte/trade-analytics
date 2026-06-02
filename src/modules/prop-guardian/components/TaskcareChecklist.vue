<template>
  <article class="pg-card pg-taskcare">
    <div class="pg-card-head">
      <div>
        <span class="pg-kicker">{{ pgT('taskcare.kicker') }}</span>
        <h3>{{ title || pgT('taskcare.todayChecklist') }}</h3>
      </div>
      <strong>{{ doneCount }}/{{ tasks.length }}</strong>
    </div>
    <div class="pg-task-groups">
      <section v-for="group in grouped" :key="group.key" class="pg-task-group">
        <h4>{{ group.label }}</h4>
        <button
          v-for="task in group.items"
          :key="task.id"
          type="button"
          class="pg-task"
          :class="[`pg-task--${task.priority}`, { done: task.status === 'done', skipped: task.status === 'skipped' }]"
          @click="cycle(task)"
        >
          <span class="pg-task__check">{{ taskStatusLabel(task.status) }}</span>
          <span>
            <strong>{{ taskTitle(task) }}</strong>
            <small>{{ taskDescription(task) }}</small>
          </span>
        </button>
      </section>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'

const props = defineProps({
  title: { type: String, default: '' },
  tasks: { type: Array, default: () => [] }
})

const emit = defineEmits(['update-status'])
const { pgT, taskTitle, taskDescription, taskStatusLabel, taskCategoryLabel } = usePropGuardianI18n()

const doneCount = computed(() => props.tasks.filter((task) => task.status === 'done').length)
const grouped = computed(() => {
  const map = new Map()
  for (const task of props.tasks) {
    if (!map.has(task.category)) map.set(task.category, [])
    map.get(task.category).push(task)
  }
  return [...map.entries()].map(([key, items]) => ({ key, label: taskCategoryLabel(key), items }))
})

function cycle(task) {
  const next = task.status === 'todo' ? 'done' : task.status === 'done' ? 'skipped' : 'todo'
  emit('update-status', task.id, next)
}
</script>
