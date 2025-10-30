<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDetailedPracticeTracking } from '@/features/track/useDetailedPracticeTracking';
import type { TaskCompletionData } from '@/entities/practice-tracking/TaskCompletionData';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import type { ChartDataCustomTypesPerDataset } from 'chart.js';
import WhiskersChart from './WhiskersChart.vue';

const { t } = useI18n();

const tracking = useDetailedPracticeTracking();
const allEventsRaw = ref<TaskCompletionData[]>([]);

onMounted(async () => {
  allEventsRaw.value = await tracking.getAllCompletionEvents();
});

// Filters and controls
const showFilters = ref(false);
const selectedLanguages = ref<string[]>([]);
const selectedModes = ref<string[]>([]);
const selectedTaskTypes = ref<string[]>([]);
const daysToShow = ref(30); // How many recent days to show

// Accuracy data processing
const allCompletionEvents = computed(() => {
  const filtered = allEventsRaw.value
    .filter(event => event.correctness !== 'neutral')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return filtered;
});

// Get unique values for filters
const availableLanguages = computed(() => {
  const languages = [...new Set(allCompletionEvents.value.map(e => e.language_code))];
  return languages.filter(Boolean).sort();
});

const availableModes = computed(() => {
  const modes = [...new Set(allCompletionEvents.value.map(e => e.practice_mode))];
  return modes.filter(Boolean).sort();
});

const availableTaskTypes = computed(() => {
  const types = [...new Set(allCompletionEvents.value.map(e => e.task_type))];
  return types.filter(Boolean).sort();
});

// Initialize filters with all available options
const initializeFilters = () => {
  if (selectedLanguages.value.length === 0 && availableLanguages.value.length > 0) {
    selectedLanguages.value = [...availableLanguages.value];
  }
  if (selectedModes.value.length === 0 && availableModes.value.length > 0) {
    selectedModes.value = [...availableModes.value];
  }
  if (selectedTaskTypes.value.length === 0 && availableTaskTypes.value.length > 0) {
    selectedTaskTypes.value = [...availableTaskTypes.value];
  }
};

// Watch for data changes and initialize filters
watch([availableLanguages, availableModes, availableTaskTypes], () => {
  initializeFilters();
}, { immediate: true });

// Filter events based on user selection
const filteredEvents = computed(() => {
  return allCompletionEvents.value.filter(event =>
    selectedLanguages.value.includes(event.language_code) &&
    selectedModes.value.includes(event.practice_mode) &&
    selectedTaskTypes.value.includes(event.task_type)
  );
});

// Calculate standard deviation for binary results
const calculateStdDev = (dayEvents: Array<{ correctness: string }>) => {
  const correctResults = dayEvents.map(e => e.correctness === 'correct' ? 1 : 0);
  const mean = correctResults.reduce((sum: number, val) => sum + val, 0) / correctResults.length;
  const variance = correctResults.reduce((sum: number, val) => sum + Math.pow(val - mean, 2), 0) / correctResults.length;
  return Math.sqrt(variance) * 100; // Convert to percentage
};

// Calculate daily accuracy data with standard deviation
const dailyAccuracyData = computed(() => {
  const events = filteredEvents.value;
  if (events.length === 0) return [];

  // Group events by date
  const eventsByDate: { [date: string]: typeof events } = {};
  events.forEach(event => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });

  // Calculate accuracy for each day
  const dailyData = Object.entries(eventsByDate).map(([date, dayEvents]) => {
    const correct = dayEvents.filter(e => e.correctness === 'correct').length;
    const accuracy = (correct / dayEvents.length) * 100;
    const stdDev = calculateStdDev(dayEvents);

    return {
      date,
      accuracy: Math.round(accuracy * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      taskCount: dayEvents.length,
      timestamp: new Date(date + 'T00:00:00').getTime()
    };
  }).sort((a, b) => a.timestamp - b.timestamp);

  // Limit to most recent days
  const maxDays = Math.min(daysToShow.value, dailyData.length);
  return dailyData.slice(-maxDays);
});

// Current stats
const averageAccuracy = computed(() => {
  if (dailyAccuracyData.value.length === 0) return 0;
  const total = dailyAccuracyData.value.reduce((sum, day) => sum + day.accuracy, 0);
  return Math.round((total / dailyAccuracyData.value.length) * 10) / 10;
});

// Chart dimensions
const totalDaysWithData = computed(() => {
  const events = filteredEvents.value;
  const uniqueDates = new Set(events.map(e => new Date(e.timestamp).toISOString().split('T')[0]));
  return uniqueDates.size;
});

// Dynamic max for days slider
const maxPossibleDaysToShow = computed(() => {
  return Math.max(7, totalDaysWithData.value);
});

// Chart.js data configuration with whiskers
const chartData = computed((): ChartDataCustomTypesPerDataset<'boxplot'> => {
  if (dailyAccuracyData.value.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  const labels = dailyAccuracyData.value.map(point =>
    new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  return {
    labels,
    datasets: [
      {
        type: 'boxplot',
        label: 'Daily Accuracy Distribution',
        data: dailyAccuracyData.value.map(point => ({
          min: Math.max(0, point.accuracy - point.stdDev),
          q1: Math.max(0, point.accuracy - point.stdDev * 0.5),
          median: point.accuracy,
          q3: Math.min(100, point.accuracy + point.stdDev * 0.5),
          max: Math.min(100, point.accuracy + point.stdDev),
          outliers: []
        })),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        itemRadius: 2,
        itemBackgroundColor: 'rgba(16, 185, 129, 0.3)',
        itemBorderColor: '#059669',
        itemBorderWidth: 1,
      }
    ]
  };
});

// Chart options
const chartOptions = computed(() => ({
  scales: {
    x: {
      title: {
        display: true,
        text: 'Date'
      },
    },
    y: {
      title: {
        display: true,
        text: 'Accuracy (%)'
      },
      min: 0,
      max: 100,
      ticks: {
        callback: function(value: number | string) {
          return value + '%';
        }
      }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        title: function(context: Array<{ dataIndex: number }>) {
          const point = dailyAccuracyData.value[context[0].dataIndex];
          return point.date;
        },
        label: function(context: { dataIndex: number; datasetIndex: number }) {
          const point = dailyAccuracyData.value[context.dataIndex];
          if (context.datasetIndex === 0) {
            return `Average: ${point.accuracy}% ± ${point.stdDev}%`;
          } else {
            return `Standard Deviation: ±${point.stdDev}%`;
          }
        },
        afterLabel: function(context: { dataIndex: number }) {
          const point = dailyAccuracyData.value[context.dataIndex];
          return `Tasks completed: ${point.taskCount}`;
        }
      }
    },
    legend: {
      display: true,
      position: 'top' as const,
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
}));
</script>

<template>
  <!-- Daily Accuracy Graph -->
  <div class="bg-base-100 rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>{{ t('stats.dailyAverageAccuracy') }}</h2>
        <div v-if="dailyAccuracyData.length > 0" class="text-sm text-base-content/60">
          {{ `${t('stats.average')} ${averageAccuracy}% • ${dailyAccuracyData.length} ${t('stats.daysShown')}` }}
        </div>
      </div>
      <button
        @click="showFilters = !showFilters; if (showFilters) initializeFilters()"
        class="btn btn-ghost btn-sm"
      >
        <span>{{ t('stats.filters') }}</span>
        <ChevronDown v-if="!showFilters" :size="16" />
        <ChevronUp v-if="showFilters" :size="16" />
      </button>
    </div>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="bg-base-200 rounded-lg p-6 mb-6 space-y-6">
      <!-- Days Range Control -->
      <div class="w-full space-y-4">
        <div class="flex justify-between items-center">
          <span class="font-semibold">{{ t('stats.daysToShow') }}</span>
          <span class="text-sm opacity-70">{{ daysToShow }} {{ t('stats.recentDays') }}</span>
        </div>
        <div>
          <input
            v-model.number="daysToShow"
            type="range"
            min="7"
            :max="maxPossibleDaysToShow"
            :step="Math.max(1, Math.floor(maxPossibleDaysToShow / 20))"
            class="range range-primary w-full"
          />
          <div class="flex justify-between text-xs mt-2">
            <span v-text="'|'" />
            <span v-text="'|'" />
            <span v-text="'|'" />
            <span v-text="'|'" />
            <span v-text="'|'" />
          </div>
          <div class="flex justify-between text-xs">
            <span v-text="'7'" />
            <span>{{ Math.floor(maxPossibleDaysToShow * 0.25) }}</span>
            <span>{{ Math.floor(maxPossibleDaysToShow * 0.5) }}</span>
            <span>{{ Math.floor(maxPossibleDaysToShow * 0.75) }}</span>
            <span>{{ maxPossibleDaysToShow }}</span>
          </div>
        </div>
        <p class="text-sm opacity-70">{{ t('stats.howManyRecentDays') }}</p>
      </div>

      <!-- Language Filter -->
      <div v-if="availableLanguages.length > 0">
        <label class="label">
          <span class="label-text font-medium">{{ t('stats.languages') }}</span>
        </label>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label v-for="language in availableLanguages" :key="language" class="cursor-pointer label">
            <input
              v-model="selectedLanguages"
              :value="language"
              type="checkbox"
              class="checkbox checkbox-sm"
            />
            <span class="label-text ml-2">{{ language }}</span>
          </label>
        </div>
      </div>

      <!-- Practice Mode Filter -->
      <div v-if="availableModes.length > 0">
        <label class="label">
          <span class="label-text font-medium">{{ t('stats.practiceModes') }}</span>
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label v-for="mode in availableModes" :key="mode" class="cursor-pointer label">
            <input
              v-model="selectedModes"
              :value="mode"
              type="checkbox"
              class="checkbox checkbox-sm"
            />
            <span class="label-text ml-2">{{ mode }}</span>
          </label>
        </div>
      </div>

      <!-- Task Type Filter -->
      <div v-if="availableTaskTypes.length > 0">
        <label class="label">
          <span class="label-text font-medium">{{ t('stats.taskTypes') }}</span>
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label v-for="taskType in availableTaskTypes" :key="taskType" class="cursor-pointer label">
            <input
              v-model="selectedTaskTypes"
              :value="taskType"
              type="checkbox"
              class="checkbox checkbox-sm"
            />
            <span class="label-text ml-2">{{ taskType }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Daily Accuracy Chart -->
    <div v-if="dailyAccuracyData.length > 0" class="space-y-4">
      <!-- Chart container -->
      <div class="rounded p-4">
        <WhiskersChart
          :data="chartData"
          :options="chartOptions"
          :height="320"
        />
      </div>

      <!-- Chart info -->
      <div class="text-sm text-base-content/60 text-center">
        {{ t('stats.dailyAccuracyDescription') }}
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center mt-6 text-base-content/60">
      <p>{{ t('stats.noDailyAccuracyData') }}</p>
      <p class="mt-1">{{ t('stats.completeDailyTasks') }}</p>
    </div>
  </div>
</template>