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
const daysToShow = ref(30); // How many recent days to show

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

// Calculate daily accuracy data
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

    return {
      date,
      accuracy: Math.round(accuracy * 10) / 10,
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
</script>

<template>
  <!-- Daily Accuracy Graph -->
  <div class="bg-base-100 rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>Daily Average Accuracy</h2>
        <div v-if="dailyAccuracyData.length > 0" class="text-sm text-base-content/60">
          Average: {{ averageAccuracy }}% • {{ dailyAccuracyData.length }} days shown
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
      <!-- Days Range Control -->
      <div class="w-full space-y-4">
        <div class="flex justify-between items-center">
          <span class="font-semibold">Days to Show</span>
          <span class="text-sm opacity-70">{{ daysToShow }} recent days</span>
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
            <span>|</span>
            <span>|</span>
            <span>|</span>
            <span>|</span>
            <span>|</span>
          </div>
          <div class="flex justify-between text-xs">
            <span>7</span>
            <span>{{ Math.floor(maxPossibleDaysToShow * 0.25) }}</span>
            <span>{{ Math.floor(maxPossibleDaysToShow * 0.5) }}</span>
            <span>{{ Math.floor(maxPossibleDaysToShow * 0.75) }}</span>
            <span>{{ maxPossibleDaysToShow }}</span>
          </div>
        </div>
        <p class="text-sm opacity-70">How many recent days to display</p>
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

    <!-- Daily Accuracy Chart -->
    <div v-if="dailyAccuracyData.length > 0" class="space-y-4">
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
              v-for="(point, index) in dailyAccuracyData"
              :key="point.date"
              class="absolute w-3 h-3 bg-secondary rounded-full cursor-pointer hover:scale-150 transition-transform"
              :style="{
                left: `${(index / Math.max(dailyAccuracyData.length - 1, 1)) * 100}%`,
                bottom: `${point.accuracy}%`,
                transform: 'translate(-50%, 50%)'
              }"
              :title="`${point.date}: ${point.accuracy}% (${point.taskCount} tasks)`"
            ></div>

            <!-- Line connecting points -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none">
              <polyline
                v-if="dailyAccuracyData.length > 1"
                :points="dailyAccuracyData.map((point, index) => {
                  const x = (index / Math.max(dailyAccuracyData.length - 1, 1)) * 100;
                  const y = 100 - point.accuracy;
                  return `${x}% ${y}%`;
                }).join(', ')"
                fill="none"
                stroke="hsl(var(--s))"
                stroke-width="2"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>

        <!-- X-axis labels -->
        <div class="absolute bottom-0 left-10 right-4 flex justify-between text-xs text-base-content/60">
          <span>{{ new Date(dailyAccuracyData[0]?.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</span>
          <span v-if="dailyAccuracyData.length > 2">
            {{ new Date(dailyAccuracyData[Math.floor(dailyAccuracyData.length / 2)]?.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
          </span>
          <span>{{ new Date(dailyAccuracyData[dailyAccuracyData.length - 1]?.date || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}</span>
        </div>
      </div>

      <!-- Chart info -->
      <div class="text-sm text-base-content/60 text-center">
        Each point shows the average accuracy for all tasks completed on that day
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center mt-6 text-base-content/60">
      <p>No daily accuracy data available</p>
      <p class="mt-1">Complete practice tasks across multiple days to see your daily trends!</p>
    </div>
  </div>
</template>