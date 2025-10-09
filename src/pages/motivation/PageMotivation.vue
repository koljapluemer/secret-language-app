<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckCircle2 } from 'lucide-vue-next';
import { useDetailedPracticeTracking } from '@/features/track/useDetailedPracticeTracking';
import type { TaskCompletionData } from '@/entities/practice-tracking/TaskCompletionData';
import type { PracticeTrackingRepoContract } from '@/entities/practice-tracking/PracticeTrackingRepoContract';

const { t } = useI18n();
const tracking = useDetailedPracticeTracking();
const repo = inject<PracticeTrackingRepoContract>('practiceTrackingRepo');
if (!repo) {
  throw new Error('PracticeTrackingRepo not provided');
}

const dailyGoalMinutes = ref(30);
const weeklyGoalMinutes = ref(180);

onMounted(async () => {
  const settings = await repo.getSettings();
  dailyGoalMinutes.value = settings.dailyGoalMinutes;
  weeklyGoalMinutes.value = settings.weeklyGoalMinutes;
});

// Helper functions to get data by day
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEventsForDay(events: TaskCompletionData[], daysAgo: number): TaskCompletionData[] {
  const today = getStartOfDay(new Date());
  const targetDay = new Date(today);
  targetDay.setDate(today.getDate() - daysAgo);
  const nextDay = new Date(targetDay);
  nextDay.setDate(targetDay.getDate() + 1);

  return events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= targetDay && eventDate < nextDay;
  });
}

function getMinutesForDay(events: TaskCompletionData[], daysAgo: number): number {
  const dayEvents = getEventsForDay(events, daysAgo);
  const totalMs = dayEvents.reduce((sum, event) => sum + event.activeDuration, 0);
  return totalMs / (1000 * 60);
}

function getTaskCountForDay(events: TaskCompletionData[], daysAgo: number): number {
  return getEventsForDay(events, daysAgo).length;
}

function getWeekMinutes(events: TaskCompletionData[], weeksAgo: number): number {
  const today = getStartOfDay(new Date());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() - (weeksAgo * 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const weekEvents = events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startOfWeek && eventDate < endOfWeek;
  });

  const totalMs = weekEvents.reduce((sum, event) => sum + event.activeDuration, 0);
  return totalMs / (1000 * 60);
}

function getAverageMinutes(events: TaskCompletionData[], days: number): number {
  const today = getStartOfDay(new Date());
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const periodEvents = events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startDate && eventDate < today;
  });

  const totalMs = periodEvents.reduce((sum, event) => sum + event.activeDuration, 0);
  return totalMs / (1000 * 60) / days;
}

// Grid item computations
const allEvents = ref<TaskCompletionData[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  const settings = await repo.getSettings();
  dailyGoalMinutes.value = settings.dailyGoalMinutes;
  weeklyGoalMinutes.value = settings.weeklyGoalMinutes;
  allEvents.value = await tracking.getAllCompletionEvents();
  isLoading.value = false;
});

// 1. Practiced longer than yesterday
const longerThanYesterday = computed(() => {
  const today = getMinutesForDay(allEvents.value, 0);
  const yesterday = getMinutesForDay(allEvents.value, 1);
  const diff = today - yesterday;
  return {
    achieved: diff > 0,
    current: today,
    target: yesterday,
    diff: Math.round(diff)
  };
});

// 2. Practiced longer than day before yesterday
const longerThanDayBeforeYesterday = computed(() => {
  const today = getMinutesForDay(allEvents.value, 0);
  const dayBeforeYesterday = getMinutesForDay(allEvents.value, 2);
  const diff = today - dayBeforeYesterday;
  return {
    achieved: diff > 0,
    current: today,
    target: dayBeforeYesterday,
    diff: Math.round(diff)
  };
});

// 3. More tasks than yesterday
const moreTasksThanYesterday = computed(() => {
  const today = getTaskCountForDay(allEvents.value, 0);
  const yesterday = getTaskCountForDay(allEvents.value, 1);
  const diff = today - yesterday;
  return {
    achieved: diff > 0,
    current: today,
    target: yesterday,
    diff
  };
});

// 4. More tasks than day before yesterday
const moreTasksThanDayBeforeYesterday = computed(() => {
  const today = getTaskCountForDay(allEvents.value, 0);
  const dayBeforeYesterday = getTaskCountForDay(allEvents.value, 2);
  const diff = today - dayBeforeYesterday;
  return {
    achieved: diff > 0,
    current: today,
    target: dayBeforeYesterday,
    diff
  };
});

// 5. Daily goal reached
const dailyGoalReached = computed(() => {
  const today = getMinutesForDay(allEvents.value, 0);
  const goal = dailyGoalMinutes.value;
  return {
    achieved: today >= goal && goal > 0,
    current: Math.round(today),
    target: goal,
    percentage: goal > 0 ? Math.round((today / goal) * 100) : 0
  };
});

// 6. Weekly goal reached
const weeklyGoalReached = computed(() => {
  const thisWeek = getWeekMinutes(allEvents.value, 0);
  const goal = weeklyGoalMinutes.value;
  return {
    achieved: thisWeek >= goal && goal > 0,
    current: Math.round(thisWeek),
    target: goal,
    percentage: goal > 0 ? Math.round((thisWeek / goal) * 100) : 0
  };
});

// 7. Practiced longer than 10-day average
const longerThan10DayAverage = computed(() => {
  const today = getMinutesForDay(allEvents.value, 0);
  const avg = getAverageMinutes(allEvents.value, 10);
  const diff = today - avg;
  return {
    achieved: diff > 0,
    current: Math.round(today),
    target: Math.round(avg),
    diff: Math.round(diff)
  };
});

// 8. Practiced longer than 3-day average
const longerThan3DayAverage = computed(() => {
  const today = getMinutesForDay(allEvents.value, 0);
  const avg = getAverageMinutes(allEvents.value, 3);
  const diff = today - avg;
  return {
    achieved: diff > 0,
    current: Math.round(today),
    target: Math.round(avg),
    diff: Math.round(diff)
  };
});

// 9. Practiced longer this week than last week
const longerThisWeekThanLastWeek = computed(() => {
  const thisWeek = getWeekMinutes(allEvents.value, 0);
  const lastWeek = getWeekMinutes(allEvents.value, 1);
  const diff = thisWeek - lastWeek;
  return {
    achieved: diff > 0,
    current: Math.round(thisWeek),
    target: Math.round(lastWeek),
    diff: Math.round(diff)
  };
});
</script>

<template>
  <div class="container mx-auto p-4 md:p-8">
    <h1 class="text-3xl font-bold mb-6">{{ t('motivation.title') }}</h1>

    <div v-if="isLoading" class="flex justify-center items-center min-h-96">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="allEvents.length === 0" class="alert alert-info">
      <p>{{ t('motivation.noDataYet') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <!-- 1. Practiced longer than yesterday -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="longerThanYesterday.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.longerThanYesterday') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.longerThanYesterday') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="longerThanYesterday.current"
            :max="longerThanYesterday.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ longerThanYesterday.diff >= 0 ? '+' : '' }}{{ longerThanYesterday.diff }} min
          </p>
        </div>
      </div>

      <!-- 2. Practiced longer than day before yesterday -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="longerThanDayBeforeYesterday.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.longerThanDayBeforeYesterday') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.longerThanDayBeforeYesterday') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="longerThanDayBeforeYesterday.current"
            :max="longerThanDayBeforeYesterday.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ longerThanDayBeforeYesterday.diff >= 0 ? '+' : '' }}{{ longerThanDayBeforeYesterday.diff }} min
          </p>
        </div>
      </div>

      <!-- 3. More tasks than yesterday -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="moreTasksThanYesterday.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.moreTasksThanYesterday') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.moreTasksThanYesterday') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="moreTasksThanYesterday.current"
            :max="moreTasksThanYesterday.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ moreTasksThanYesterday.diff >= 0 ? '+' : '' }}{{ moreTasksThanYesterday.diff }} tasks
          </p>
        </div>
      </div>

      <!-- 4. More tasks than day before yesterday -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="moreTasksThanDayBeforeYesterday.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.moreTasksThanDayBeforeYesterday') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.moreTasksThanDayBeforeYesterday') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="moreTasksThanDayBeforeYesterday.current"
            :max="moreTasksThanDayBeforeYesterday.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ moreTasksThanDayBeforeYesterday.diff >= 0 ? '+' : '' }}{{ moreTasksThanDayBeforeYesterday.diff }} tasks
          </p>
        </div>
      </div>

      <!-- 5. Daily goal reached -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="dailyGoalReached.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.dailyGoalReached') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.dailyGoalReached') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="dailyGoalReached.current"
            :max="dailyGoalReached.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ dailyGoalReached.current }} / {{ dailyGoalReached.target }} min ({{ dailyGoalReached.percentage }}%)
          </p>
        </div>
      </div>

      <!-- 6. Weekly goal reached -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="weeklyGoalReached.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.weeklyGoalReached') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.weeklyGoalReached') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="weeklyGoalReached.current"
            :max="weeklyGoalReached.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ weeklyGoalReached.current }} / {{ weeklyGoalReached.target }} min ({{ weeklyGoalReached.percentage }}%)
          </p>
        </div>
      </div>

      <!-- 7. Practiced longer than 10-day average -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="longerThan10DayAverage.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.longerThan10DayAverage') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.longerThan10DayAverage') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="longerThan10DayAverage.current"
            :max="longerThan10DayAverage.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ longerThan10DayAverage.diff >= 0 ? '+' : '' }}{{ longerThan10DayAverage.diff }} min
          </p>
        </div>
      </div>

      <!-- 8. Practiced longer than 3-day average -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="longerThan3DayAverage.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.longerThan3DayAverage') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.longerThan3DayAverage') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="longerThan3DayAverage.current"
            :max="longerThan3DayAverage.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ longerThan3DayAverage.diff >= 0 ? '+' : '' }}{{ longerThan3DayAverage.diff }} min
          </p>
        </div>
      </div>

      <!-- 9. Practiced longer this week than last week -->
      <div class="card shadow hover:shadow-md transition-shadow p-6 flex items-center justify-center min-h-[150px]">
        <div v-if="longerThisWeekThanLastWeek.achieved" class="text-center">
          <CheckCircle2 :size="64" class="text-success mx-auto mb-2" />
          <p class="text-sm font-medium">{{ t('motivation.goals.longerThisWeekThanLastWeek') }}</p>
        </div>
        <div v-else class="w-full">
          <p class="text-sm mb-3 text-center font-medium">{{ t('motivation.goals.longerThisWeekThanLastWeek') }}</p>
          <progress
            class="progress progress-primary w-full"
            :value="longerThisWeekThanLastWeek.current"
            :max="longerThisWeekThanLastWeek.target || 1"
          ></progress>
          <p class="text-xs text-center mt-2 text-base-content/60">
            {{ longerThisWeekThanLastWeek.diff >= 0 ? '+' : '' }}{{ longerThisWeekThanLastWeek.diff }} min
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
