<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDetailedPracticeTracking } from '@/app/tracking/useDetailedPracticeTracking';
import { formatTime } from '@/shared/utils/formatTime';
import type { TaskCompletionData } from '@/entities/practice-tracking/TaskCompletionData';

const { t } = useI18n();

const tracking = useDetailedPracticeTracking();
const allEvents = ref<TaskCompletionData[]>([]);

onMounted(async () => {
  allEvents.value = await tracking.getAllCompletionEvents();
});

// Convert events to daily data for compatibility
const getAllTimeData = (events: TaskCompletionData[]) => {
  const dailyData: { [date: string]: number } = {};

  events.forEach(event => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const minutes = event.activeDuration / (1000 * 60);
    dailyData[date] = (dailyData[date] || 0) + minutes;
  });

  return dailyData;
};

const chartData = computed(() => {
  const allData = getAllTimeData(allEvents.value);
  const today = new Date();
  const last7Days = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    last7Days.push({
      date: dateKey,
      day: dayName,
      minutes: allData[dateKey] || 0
    });
  }

  return last7Days;
});

const maxMinutes = computed(() => {
  return Math.max(...chartData.value.map(d => d.minutes), 1);
});
</script>

<template>
  <div class="bg-base-100 rounded-lg shadow p-6">
    <h2>{{ t('stats.last7Days') }}</h2>

    <div class="space-y-3">
      <div v-for="day in chartData" :key="day.date" class="flex items-center gap-4">
        <div class="w-12  font-medium text-right">
          {{ day.day }}
        </div>

        <div class="flex-1 relative">
          <div class="w-full bg-base-200 rounded h-8 relative overflow-hidden">
            <div class="h-full bg-primary transition-all duration-300 rounded flex items-center justify-end pr-2"
              :style="{ width: `${(day.minutes / maxMinutes) * 100}%` }">
              <span v-if="day.minutes > 0" class="text-primary-content text-xs font-medium">
                {{ formatTime(day.minutes) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="maxMinutes <= 1" class="text-center mt-6 text-base-content/60">
      <p>{{ t('stats.noDataYet') }}</p>
      <p class="mt-1">{{ t('stats.startLearning') }}</p>
    </div>
  </div>
</template>