<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useDetailedPracticeTracking } from '@/app/tracking/useDetailedPracticeTracking';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import { renderLanguage } from '@/entities/languages/renderLanguage';
import type { LanguageData } from '@/entities/languages/LanguageData';
import { inject } from 'vue';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'vue-chartjs';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const tracking = useDetailedPracticeTracking();
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;

// Store language data
const languagesMap = ref<Map<string, LanguageData>>(new Map());

onMounted(async () => {
  const languages = await languageRepo.getAll();
  languages.forEach(lang => {
    languagesMap.value.set(lang.code, lang);
  });
});

// Filters and controls
const showFilters = ref(false);
const daysToShow = ref(30);

// Get all completion events
const allCompletionEvents = computed(() => {
  return tracking.getAllCompletionEvents()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
});

// Calculate daily language exercise counts
const dailyLanguageData = computed(() => {
  const events = allCompletionEvents.value;
  if (events.length === 0) return { dates: [], languageCounts: {}, allLanguages: [] };

  // Group events by date and language
  const eventsByDate: { [date: string]: { [language: string]: number } } = {};

  events.forEach(event => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    const language = event.language_code || 'Unknown';

    if (!eventsByDate[date]) {
      eventsByDate[date] = {};
    }
    eventsByDate[date][language] = (eventsByDate[date][language] || 0) + 1;
  });

  // Convert to array and sort by date
  const sortedDates = Object.keys(eventsByDate).sort();

  // Limit to most recent days
  const recentDates = sortedDates.slice(-Math.min(daysToShow.value, sortedDates.length));

  // Get all unique languages
  const allLanguages = [...new Set(events.map(e => e.language_code || 'Unknown'))].sort();

  // Build language counts per date
  const languageCounts: { [language: string]: number[] } = {};
  allLanguages.forEach(lang => {
    languageCounts[lang] = recentDates.map(date => eventsByDate[date][lang] || 0);
  });

  return {
    dates: recentDates,
    languageCounts,
    allLanguages
  };
});

// Total days with data
const totalDaysWithData = computed(() => {
  const events = allCompletionEvents.value;
  const uniqueDates = new Set(events.map(e => new Date(e.timestamp).toISOString().split('T')[0]));
  return uniqueDates.size;
});

// Dynamic max for days slider
const maxPossibleDaysToShow = computed(() => {
  return Math.max(7, totalDaysWithData.value);
});

// Generate RANDOM color for each language using HSL
const generateLanguageColor = (): string => {
  // Random hue between 0-360
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70; // Fixed saturation for vibrant colors
  const lightness = 55;  // Fixed lightness for good visibility

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Chart.js data configuration
const chartData = computed(() => {
  const data = dailyLanguageData.value;

  if (data.dates.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  const labels = data.dates.map(date =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  const datasets = data.allLanguages.map((languageCode) => {
    const color = generateLanguageColor();
    const langData = languagesMap.value.get(languageCode);
    const label = langData ? renderLanguage(langData) : languageCode;

    return {
      label,
      data: data.languageCounts[languageCode],
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
    };
  });

  return {
    labels,
    datasets
  };
});

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      title: {
        display: true,
        text: 'Date',
        color: '#374151',
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)',
      },
      ticks: {
        color: '#666666',
      },
    },
    y: {
      stacked: true,
      title: {
        display: true,
        text: 'Number of Exercises',
        color: '#374151',
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        borderColor: 'rgba(0, 0, 0, 0.2)',
      },
      ticks: {
        color: '#666666',
        stepSize: 1,
      },
    },
  },
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#111827',
      bodyColor: '#374151',
      borderColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        footer: function(context: any) {
          const total = context.reduce((sum: number, item: any) => sum + item.parsed.y, 0);
          return `Total: ${total} exercises`;
        }
      }
    },
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: '#374151',
        usePointStyle: true,
        padding: 15,
      },
    },
  },
}));
</script>

<template>
  <!-- Daily Language Exercise Chart -->
  <div class="bg-base-100 rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2>Daily Exercises by Language</h2>
        <div v-if="dailyLanguageData.dates.length > 0" class="text-sm text-base-content/60">
          {{ dailyLanguageData.dates.length }} days shown
        </div>
      </div>
      <button
        @click="showFilters = !showFilters"
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
    </div>

    <!-- Chart -->
    <div v-if="dailyLanguageData.dates.length > 0" class="space-y-4">
      <!-- Chart container -->
      <div class="rounded p-4">
        <div style="height: 320px" class="relative">
          <Bar
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>

      <!-- Chart info -->
      <div class="text-sm text-base-content/60 text-center">
        Stacked bars show the number of exercises completed per language each day.
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center mt-6 text-base-content/60">
      <p>No exercise data available</p>
      <p class="mt-1">Complete practice tasks to see your daily language activity!</p>
    </div>
  </div>
</template>