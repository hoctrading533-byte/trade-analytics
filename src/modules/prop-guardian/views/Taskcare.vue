<template>
  <section class="pg-page">
    <PropGuardianHeader
      :accounts="accounts"
      :account-id="accountId"
      :risk-mode="evaluation.riskMode"
      @update:account-id="setAccount"
    />
    <main class="pg-content">
      <section class="pg-hero">
        <article class="pg-card pg-hero-card">
          <span class="pg-kicker">{{ pgT('taskcare.pageKicker') }}</span>
          <h1>{{ pgT('taskcare.pageTitle') }}</h1>
          <p>{{ pgT('taskcare.pageSubtitle') }}</p>
        </article>
        <AccountStatusCard :label="pgT('taskcare.completed')" :value="`${doneCount}/${taskcareTasks.length}`" :hint="pgT('taskcare.cycleHint')" :meta="pgT('taskcare.streak')" />
      </section>

      <TaskcareChecklist
        :title="pgT('taskcare.allTasks')"
        :tasks="taskcareTasks"
        @update-status="updateTaskStatus"
      />
    </main>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import AccountStatusCard from '../components/AccountStatusCard.vue'
import PropGuardianHeader from '../components/PropGuardianHeader.vue'
import TaskcareChecklist from '../components/TaskcareChecklist.vue'
import { usePropGuardian } from '../composables/usePropGuardian.js'
import { usePropGuardianI18n } from '../composables/usePropGuardianI18n.js'
import '../prop-guardian.css'

const { accounts, accountId, setAccount, evaluation, taskcareTasks, updateTaskStatus } = usePropGuardian()
const { pgT } = usePropGuardianI18n()
const doneCount = computed(() => taskcareTasks.value.filter((task) => task.status === 'done').length)
</script>
