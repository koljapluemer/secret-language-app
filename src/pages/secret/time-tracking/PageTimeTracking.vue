<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import StatsCards from './StatsCards.vue';
import WeeklyChart from './WeeklyChart.vue';
import TrailingAccuracyChart from './TrailingAccuracyChart.vue';
import DailyAccuracyChart from './DailyAccuracyChart.vue';
import DailyLanguageChart from './DailyLanguageChart.vue';

const { t } = useI18n();
</script>

<template>
  <div class="mb-6">
    <h1>{{ t('stats.title') }}</h1>
    <p class="text-light mt-2">{{ t('stats.subtitle') }}</p>
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

  <!-- Daily Language Chart -->
  <div class="mb-8">
    <DailyLanguageChart />
  </div>
</template>