<template>
  <div class="w-full h-full min-h-[250px]">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDark } from '@vueuse/core';

// Ensure you have run: npm install echarts vue-echarts

const props = defineProps<{
  year: string;
  data: [string, number][]; // Array of [DateString, PnL] e.g., [['2026-06-05', 450]]
}>();

const isDark = useDark();

const chartOption = computed(() => {
  const textColor = isDark.value ? '#94A3B8' : '#64748B';
  const borderColor = isDark.value ? '#1E293B' : '#E2E8F0';
  const splitLineColor = isDark.value ? '#334155' : '#CBD5E1';

  return {
    tooltip: { 
      position: 'top',
      formatter: function (p: any) {
        const format = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        return `${p.data[0]}<br/>PnL: <b>${format.format(p.data[1])}</b>`;
      }
    },
    toolbox: {
      feature: {
        saveAsImage: { type: 'png', pixelRatio: 2, name: 'PnL_Heatmap' }
      }
    },
    visualMap: {
      min: -1000,
      max: 1000,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      top: 'top',
      textStyle: { color: textColor },
      inRange: {
        color: ['#EF4444', isDark.value ? '#1E293B' : '#F1F5F9', '#10B981']
      }
    },
    calendar: [
      {
        range: props.year,
        cellSize: ['auto', 20],
        right: 20,
        left: 30,
        top: 70,
        itemStyle: {
          color: isDark.value ? '#0F172A' : '#FFFFFF',
          borderColor: borderColor,
          borderWidth: 1
        },
        splitLine: {
          show: true,
          lineStyle: { color: splitLineColor, width: 2, type: 'solid' }
        },
        dayLabel: { color: textColor },
        monthLabel: { color: textColor },
        yearLabel: { show: false }
      }
    ],
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: props.data
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
