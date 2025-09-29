<script setup lang="ts">
import StatsCards from './StatsCards.vue';
import WeeklyChart from './WeeklyChart.vue';
import TrailingAccuracyChart from './TrailingAccuracyChart.vue';
import DailyAccuracyChart from './DailyAccuracyChart.vue';
</script>

<template>
  <div class="mb-6">
    <h1>Learning Stats</h1>
    <p class="text-light mt-2">Track your daily progress and learning time</p>
  </div>

  <!-- Stats Cards -->
  <div class="mb-8">
    <StatsCards />
  </div>

  <!-- Weekly Time Chart -->
  <div class="mb-8">
    <WeeklyChart />
  </div>

  <!-- Trailing Accuracy Chart -->
  <div class="mb-8">
    <TrailingAccuracyChart />
  </div>

  <!-- Daily Accuracy Chart -->
  <div class="mb-8">
    <DailyAccuracyChart />
  </div>
</template>