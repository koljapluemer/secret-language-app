<script setup lang="ts">
import { computed } from 'vue';
import { useDetailedPracticeTracking } from '@/app/tracking/useDetailedPracticeTracking';
import { formatTime } from '@/shared/utils/formatTime';

const tracking = useDetailedPracticeTracking();

const todayMinutes = computed(() => formatTime(tracking.getTodayMinutes()));
const weekMinutes = computed(() => formatTime(tracking.getThisWeekMinutes()));
const totalMinutes = computed(() => formatTime(tracking.getTotalMinutes()));
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="stat bg-base-100 rounded-lg shadow">
      <div class="stat-title">Today</div>
      <div class="stat-value text-primary">{{ todayMinutes }}</div>
      <div class="stat-desc">time learned</div>
    </div>

    <div class="stat bg-base-100 rounded-lg shadow">
      <div class="stat-title">This Week</div>
      <div class="stat-value text-secondary">{{ weekMinutes }}</div>
      <div class="stat-desc">time learned</div>
    </div>

    <div class="stat bg-base-100 rounded-lg shadow">
      <div class="stat-title">Total</div>
      <div class="stat-value text-accent">{{ totalMinutes }}</div>
      <div class="stat-desc">time learned</div>
    </div>
  </div>
</template>