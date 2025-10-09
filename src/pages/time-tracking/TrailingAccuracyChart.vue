<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDetailedPracticeTracking } from '@/features/track/useDetailedPracticeTracking';
import type { TaskCompletionData } from '@/entities/practice-tracking/TaskCompletionData';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import SimpleLineChart from './SimpleLineChart.vue';

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
const trailingCount = ref(10);
const maxTasksToShow = ref(50); // How many recent tasks to show on X-axis

// Accuracy data processing
const allCompletionEvents = computed(() => {
  const filtered = allEventsRaw.value
    .filter(event => event.correctness !== 'neutral')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  console.log('[TrailingAccuracy] Total events:', allEventsRaw.value.length, 'Non-neutral:', filtered.length);
  console.log('[TrailingAccuracy] Sample events:', allEventsRaw.value.slice(0, 3));
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

// Calculate trailing accuracy data
const accuracyData = computed(() => {
  const events = filteredEvents.value;
  if (events.length === 0) return [];

  const windowSize = trailingCount.value;

  // Calculate accuracy for all tasks first
  const allAccuracyData = [];
  const startIndex = Math.max(0, windowSize - 1);

  for (let i = startIndex; i < events.length; i++) {
    // Get the window: current task + previous (windowSize-1) tasks
    const windowStart = Math.max(0, i - windowSize + 1);
    const window = events.slice(windowStart, i + 1);
    const correct = window.filter(e => e.correctness === 'correct').length;
    const accuracy = (correct / window.length) * 100;

    allAccuracyData.push({
      taskNumber: i + 1, // Actual task number (1-based)
      accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal place
      actualWindowSize: window.length,
      timestamp: events[i].timestamp
    });
  }

  // Now limit to the most recent maxTasksToShow tasks (but not more than available)
  const maxTasks = Math.min(maxTasksToShow.value, allAccuracyData.length);
  if (allAccuracyData.length <= maxTasks) {
    return allAccuracyData;
  }

  // Take the last maxTasks items
  return allAccuracyData.slice(-maxTasks);
});

// Current stats
const currentAccuracy = computed(() => {
  if (accuracyData.value.length === 0) return 0;
  return accuracyData.value[accuracyData.value.length - 1].accuracy;
});

const totalFilteredTasks = computed(() => filteredEvents.value.length);

// Dynamic max for chart range slider
const maxPossibleTasksToShow = computed(() => {
  const totalTasks = filteredEvents.value.length;
  return Math.max(10, totalTasks); // At least 10, but use actual task count if higher
});

// Chart.js data configuration
const chartData = computed(() => {
  if (accuracyData.value.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  const labels = accuracyData.value.map(point => `${t('stats.task')} #${point.taskNumber}`);

  return {
    labels,
    datasets: [
      {
        label: t('stats.trailingAccuracy'),
        data: accuracyData.value.map(point => point.accuracy),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F6',
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#1E40AF',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#10B981',
        pointHoverBorderColor: '#059669',
        fill: false,
        tension: 0.1,
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
        text: t('stats.taskNumber')
      },
    },
    y: {
      title: {
        display: true,
        text: t('stats.accuracy')
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
          const point = accuracyData.value[context[0].dataIndex];
          return `${t('stats.task')} #${point.taskNumber}`;
        },
        label: function(context: { dataIndex: number }) {
          const point = accuracyData.value[context.dataIndex];
          return `${t('stats.accuracyPercent')} ${point.accuracy}%`;
        },
        afterLabel: function(context: { dataIndex: number }) {
          const point = accuracyData.value[context.dataIndex];
          return `${t('stats.windowSize')} ${point.actualWindowSize} ${t('stats.tasks')}`;
        }
      }
    }
  },
}));
</script>

<template>
  <!-- Accuracy Graph -->
  <div class="bg-base-100 rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>{{ t('stats.trailingAccuracy') }}</h2>
        <div v-if="totalFilteredTasks > 0" class="text-sm text-base-content/60">
          {{ `${t('stats.current')}: ${currentAccuracy}% • ${totalFilteredTasks} ${t('stats.tasksFiltered')}` }}
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
      <!-- Chart Range Controls -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- X-Axis Range (How many recent tasks to show) -->
        <div class="w-full space-y-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold">{{ t('stats.chartRange') }}</span>
            <span class="text-sm opacity-70">{{ maxTasksToShow }} {{ t('stats.recentTasks') }}</span>
          </div>
          <div>
            <input
              v-model.number="maxTasksToShow"
              type="range"
              min="10"
              :max="maxPossibleTasksToShow"
              :step="Math.max(1, Math.floor(maxPossibleTasksToShow / 20))"
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
              <span v-text="'10'" />
              <span>{{ Math.floor(maxPossibleTasksToShow * 0.25) }}</span>
              <span>{{ Math.floor(maxPossibleTasksToShow * 0.5) }}</span>
              <span>{{ Math.floor(maxPossibleTasksToShow * 0.75) }}</span>
              <span>{{ maxPossibleTasksToShow }}</span>
            </div>
          </div>
          <p class="text-sm opacity-70">{{ t('stats.howFarBack') }}</p>
        </div>

        <!-- Trailing Window Size -->
        <div class="w-full space-y-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold">{{ t('stats.accuracyWindow') }}</span>
            <span class="text-sm opacity-70">{{ trailingCount }} {{ t('stats.taskAverage') }}</span>
          </div>
          <div>
            <input
              v-model.number="trailingCount"
              type="range"
              min="3"
              max="100"
              step="1"
              class="range range-secondary w-full"
            />
            <div class="flex justify-between text-xs mt-2">
              <span v-text="'|'" />
              <span v-text="'|'" />
              <span v-text="'|'" />
              <span v-text="'|'" />
              <span v-text="'|'" />
            </div>
            <div class="flex justify-between text-xs">
              <span v-text="'3'" />
              <span v-text="'25'" />
              <span v-text="'50'" />
              <span v-text="'75'" />
              <span v-text="'100'" />
            </div>
          </div>
          <p class="text-sm opacity-70">{{ t('stats.tasksPerCalculation') }}</p>
        </div>
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

    <!-- Accuracy Chart -->
    <div v-if="accuracyData.length > 0" class="space-y-4">
      <!-- Chart container -->
      <div class="rounded p-4">
        <SimpleLineChart
          :data="chartData"
          :options="chartOptions"
          :height="320"
        />
      </div>

      <!-- Chart info -->
      <div class="text-sm text-base-content/60 text-center">
        {{ t('stats.trailingAccuracyDescription', { window: trailingCount }) }}
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center mt-6 text-base-content/60">
      <p>{{ t('stats.noAccuracyData') }}</p>
      <p class="mt-1">{{ t('stats.completeTasksPrompt') }}</p>
    </div>
  </div>
</template>