<template>
  <div class="w-full h-full min-h-[300px]">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDark } from '@vueuse/core';

// Ensure you have run: npm install echarts vue-echarts
// and registered v-chart globally or imported it here.

const props = defineProps<{
  scores: {
    psychology: number;
    discipline: number;
    risk: number;
    execution: number;
    consistency: number;
    behavior: number;
  },
  averages: {
    psychology: number;
    discipline: number;
    risk: number;
    execution: number;
    consistency: number;
    behavior: number;
  }
}>();

const isDark = useDark();

const chartOption = computed(() => {
  const textColor = isDark.value ? '#E2E8F0' : '#1E293B';
  const splitLineColor = isDark.value ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const splitAreaColor = isDark.value 
    ? ['rgba(15, 23, 42, 0.4)', 'rgba(30, 41, 59, 0.4)'] 
    : ['rgba(241, 245, 249, 0.4)', 'rgba(226, 232, 240, 0.4)'];

  return {
    tooltip: { trigger: 'item' },
    toolbox: {
      feature: {
        saveAsImage: { type: 'png', pixelRatio: 2, name: 'Behavior_Radar' }
      }
    },
    radar: {
      indicator: [
        { name: 'Psychology', max: 100 },
        { name: 'Discipline', max: 100 },
        { name: 'Risk', max: 100 },
        { name: 'Execution', max: 100 },
        { name: 'Consistency', max: 100 },
        { name: 'Behavior', max: 100 }
      ],
      axisName: { color: textColor, fontWeight: 'bold' },
      splitLine: { lineStyle: { color: splitLineColor } },
      splitArea: { areaStyle: { color: splitAreaColor } },
      axisLine: { lineStyle: { color: splitLineColor } }
    },
    series: [
      {
        name: 'Behavior Analysis',
        type: 'radar',
        data: [
          {
            value: [
              props.scores.psychology, props.scores.discipline, 
              props.scores.risk, props.scores.execution, 
              props.scores.consistency, props.scores.behavior
            ],
            name: 'Current Session',
            itemStyle: { color: '#10B981' },
            areaStyle: { opacity: 0.3 }
          },
          {
            value: [
              props.averages.psychology, props.averages.discipline, 
              props.averages.risk, props.averages.execution, 
              props.averages.consistency, props.averages.behavior
            ],
            name: '30-Day Avg',
            itemStyle: { color: '#3B82F6' },
            lineStyle: { type: 'dashed' },
            areaStyle: { opacity: 0.1 }
          }
        ]
      }
    ]
  };
});
</script>

<style scoped>
.chart {
  width: 100%;
  height: 100%;
}
</style>
