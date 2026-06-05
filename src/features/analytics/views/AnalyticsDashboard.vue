<template>
  <div class="analytics-layout dark:bg-gray-900 bg-white min-h-screen text-gray-900 dark:text-gray-100 p-6">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Behavior Analytics</h1>
      
      <!-- UI Control (Pinia) -->
      <div class="flex gap-4">
        <button @click="uiStore.setAccount(123)" class="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">
          Simulate Account Select
        </button>
      </div>
    </header>

    <!-- Server State Loading (Vue Query) -->
    <div v-if="isLoading" class="animate-pulse space-y-4">
      <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
      <div class="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
    </div>

    <div v-else-if="error" class="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-xl">
      Failed to load analytics server state.
    </div>

    <!-- Data Loaded -->
    <main v-else-if="data" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- High Performance ECharts Wrapper goes here -->
      <section class="lg:col-span-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold mb-4">Equity Curve & Psychology</h2>
        <div class="text-3xl font-bold text-green-500 mb-6">+${{ data.netProfit.toLocaleString() }}</div>
        
        <!-- Virtualized Timeline Component would be rendered here -->
        <div class="h-4 flex rounded overflow-hidden mt-4">
          <div v-for="(pt, idx) in data.psychTimeline" :key="idx"
               :style="{ backgroundColor: pt.color }"
               class="flex-1"
               :title="pt.state">
          </div>
        </div>
      </section>

      <!-- AI Insights Sidebar -->
      <aside class="space-y-6">
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 class="text-lg font-semibold mb-4">Lumina AI Coach</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Vue Query intelligently handles background refetching for these insights.
          </p>
        </div>

        <!-- Radar Chart Panel -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 class="text-lg font-semibold mb-4 text-center">Quant Score Radar</h2>
          <RadarAnalysisChart :scores="mockScores" :averages="mockAverages" />
        </div>
      </aside>
    </main>
    
    <!-- Heatmap Full Width Panel -->
    <section v-if="data" class="mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 class="text-lg font-semibold mb-4">Daily Profit Calendar</h2>
      <HeatmapChart year="2026" :data="mockHeatmapData" />
    </section>

    <!-- Empty State -->
    <div v-else class="text-center py-20 text-gray-500 dark:text-gray-400">
      Please select an account to begin.
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAnalyticsUIStore } from '../stores/useAnalyticsUIStore';
import { useAnalyticsQuery } from '../composables/useAnalyticsQuery';
import RadarAnalysisChart from '../components/charts/RadarAnalysisChart.vue';
import HeatmapChart from '../components/charts/HeatmapChart.vue';

// 1. Client State (Synchronous, instant)
const uiStore = useAnalyticsUIStore();

// 2. Server State (Asynchronous, cached)
const { data, isLoading, error } = useAnalyticsQuery();

// Mock Data for demonstration
const mockScores = { psychology: 40, discipline: 50, risk: 90, execution: 75, consistency: 80, behavior: 67 };
const mockAverages = { psychology: 80, discipline: 85, risk: 70, execution: 80, consistency: 85, behavior: 80 };
const mockHeatmapData: [string, number][] = [
  ['2026-06-01', 450], ['2026-06-02', -200], ['2026-06-03', 150], ['2026-06-04', 800], ['2026-06-05', -100]
];
</script>
