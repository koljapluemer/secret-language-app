<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDetailedPracticeTracking } from '@/app/tracking/useDetailedPracticeTracking';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';

const tracking = useDetailedPracticeTracking();

// Filters and controls
const showFilters = ref(false);
const selectedLanguages = ref<string[]>([]);
const selectedModes = ref<string[]>([]);
const selectedTaskTypes = ref<string[]>([]);
const trailingCount = ref(10);
const maxTasksToShow = ref(50); // How many recent tasks to show on X-axis

// Accuracy data processing
const allCompletionEvents = computed(() => {
  return tracking.getAllCompletionEvents()
    .filter(event => event.correctness !== 'neutral')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
  if (selectedLanguages.value.length === 0) {
    selectedLanguages.value = [...availableLanguages.value];
  }
  if (selectedModes.value.length === 0) {
    selectedModes.value = [...availableModes.value];
  }
  if (selectedTaskTypes.value.length === 0) {
    selectedTaskTypes.value = [...availableTaskTypes.value];
  }
};

// Watch for data changes and initialize filters
if (availableLanguages.value.length > 0) {
  initializeFilters();
}

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

// Chart dimensions and scaling
const chartMinTask = computed(() => {
  if (accuracyData.value.length === 0) return 1;
  return accuracyData.value[0].taskNumber;
});

const chartMaxTask = computed(() => {
  if (accuracyData.value.length === 0) return 1;
  return accuracyData.value[accuracyData.value.length - 1].taskNumber;
});

const chartTaskRange = computed(() => chartMaxTask.value - chartMinTask.value || 1);

const totalFilteredTasks = computed(() => filteredEvents.value.length);

// Dynamic max for chart range slider
const maxPossibleTasksToShow = computed(() => {
  const totalTasks = filteredEvents.value.length;
  return Math.max(10, totalTasks); // At least 10, but use actual task count if higher
});
</script>

<template>
  <!-- Accuracy Graph -->
  <div class="bg-base-100 rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>Trailing Accuracy</h2>
        <div v-if="totalFilteredTasks > 0" class="text-sm text-base-content/60">
          Current: {{ currentAccuracy }}% • {{ totalFilteredTasks }} tasks filtered
        </div>
      </div>
      <button
        @click="showFilters = !showFilters; if (showFilters) initializeFilters()"
        class="btn btn-ghost btn-sm"
      >
        <span>Filters</span>
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
            <span class="font-semibold">Chart Range</span>
            <span class="text-sm opacity-70">{{ maxTasksToShow }} recent tasks</span>
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
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>
            <div class="flex justify-between text-xs">
              <span>10</span>
              <span>{{ Math.floor(maxPossibleTasksToShow * 0.25) }}</span>
              <span>{{ Math.floor(maxPossibleTasksToShow * 0.5) }}</span>
              <span>{{ Math.floor(maxPossibleTasksToShow * 0.75) }}</span>
              <span>{{ maxPossibleTasksToShow }}</span>
            </div>
          </div>
          <p class="text-sm opacity-70">How far back in time to look</p>
        </div>

        <!-- Trailing Window Size -->
        <div class="w-full space-y-4">
          <div class="flex justify-between items-center">
            <span class="font-semibold">Accuracy Window</span>
            <span class="text-sm opacity-70">{{ trailingCount }} task average</span>
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
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
              <span>|</span>
            </div>
            <div class="flex justify-between text-xs">
              <span>3</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
          <p class="text-sm opacity-70">Tasks per accuracy calculation</p>
        </div>
      </div>

      <!-- Language Filter -->
      <div v-if="availableLanguages.length > 0">
        <label class="label">
          <span class="label-text font-medium">Languages:</span>
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
          <span class="label-text font-medium">Practice Modes:</span>
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
          <span class="label-text font-medium">Task Types:</span>
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
      <div class="relative h-64 bg-base-200 rounded p-4">
        <!-- Y-axis labels -->
        <div class="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-xs text-base-content/60">
          <span>100%</span>
          <span>80%</span>
          <span>60%</span>
          <span>40%</span>
          <span>20%</span>
          <span>0%</span>
        </div>

        <!-- Chart area -->
        <div class="ml-10 mr-4 h-full pb-8 relative">
          <!-- Horizontal grid lines -->
          <div class="absolute inset-0 flex flex-col justify-between">
            <div v-for="i in 6" :key="i" class="border-t border-base-300 w-full"></div>
          </div>

          <!-- Chart with canvas-like positioning -->
          <div class="absolute inset-0">
            <div
              v-for="(point, index) in accuracyData"
              :key="point.taskNumber"
              class="absolute w-2 h-2 bg-primary rounded-full cursor-pointer hover:scale-150 transition-transform"
              :style="{
                left: `${(index / Math.max(accuracyData.length - 1, 1)) * 100}%`,
                bottom: `${point.accuracy}%`,
                transform: 'translate(-50%, 50%)'
              }"
              :title="`Task #${point.taskNumber}: ${point.accuracy}% (${point.actualWindowSize} task window)`"
            ></div>

            <!-- Line connecting points -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none">
              <polyline
                v-if="accuracyData.length > 1"
                :points="accuracyData.map((point, index) => {
                  const x = (index / Math.max(accuracyData.length - 1, 1)) * 100;
                  const y = 100 - point.accuracy;
                  return `${x}% ${y}%`;
                }).join(', ')"
                fill="none"
                stroke="hsl(var(--p))"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>

        <!-- X-axis labels -->
        <div class="absolute bottom-0 left-10 right-4 flex justify-between text-xs text-base-content/60">
          <span>Task #{{ chartMinTask }}</span>
          <span v-if="chartTaskRange > 20">Task #{{ Math.round((chartMinTask + chartMaxTask) / 2) }}</span>
          <span>Task #{{ chartMaxTask }}</span>
        </div>
      </div>

      <!-- Chart info -->
      <div class="text-sm text-base-content/60 text-center">
        Each point shows trailing accuracy over {{ trailingCount }} tasks ending at that task number
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center mt-6 text-base-content/60">
      <p>No accuracy data available</p>
      <p class="mt-1">Complete some practice tasks to see your accuracy trends!</p>
    </div>
  </div>
</template>