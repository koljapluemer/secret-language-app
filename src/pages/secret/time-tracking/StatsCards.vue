<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDetailedPracticeTracking } from '@/features/track/useDetailedPracticeTracking';
import { formatTime } from '@/shared/utils/formatTime';

const { t } = useI18n();
const tracking = useDetailedPracticeTracking();

const todayMinutes = ref('0m');
const weekMinutes = ref('0m');
const totalMinutes = ref('0m');

onMounted(async () => {
  todayMinutes.value = formatTime(await tracking.getTodayMinutes());
  weekMinutes.value = formatTime(await tracking.getThisWeekMinutes());
  totalMinutes.value = formatTime(await tracking.getTotalMinutes());
});
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="stat bg-base-100 rounded-lg shadow">
      <div class="stat-title">{{ t('stats.today') }}</div>
      <div class="stat-value text-primary">{{ todayMinutes }}</div>
      <div class="stat-desc">{{ t('stats.timeLearned') }}</div>
    </div>

    <div class="stat bg-base-100 rounded-lg shadow">
      <div class="stat-title">{{ t('stats.thisWeek') }}</div>
      <div class="stat-value text-secondary">{{ weekMinutes }}</div>
      <div class="stat-desc">{{ t('stats.timeLearned') }}</div>
    </div>

    <div class="stat bg-base-100 rounded-lg shadow">
      <div class="stat-title">{{ t('stats.total') }}</div>
      <div class="stat-value text-accent">{{ totalMinutes }}</div>
      <div class="stat-desc">{{ t('stats.timeLearned') }}</div>
    </div>
  </div>
</template>