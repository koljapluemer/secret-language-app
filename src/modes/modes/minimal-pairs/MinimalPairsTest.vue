<script setup lang="ts">
import { inject, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { Task } from '@/tasks/Task';
import { generateVocabChooseFromSound } from '@/tasks/task-vocab-choose-from-sound/generate';
import TaskRenderer from '@/tasks/ui/TaskRenderer.vue';
import TestResults from '@/widgets/test/TestResults.vue';
import type { TaskCorrectness } from '@/entities/practice-tracking/TaskCompletionData';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');

if (!vocabRepo) {
  throw new Error('Required repositories not available');
}

const route = useRoute();

// Get query params
const setId = computed(() => route.query.set as string);
const testType = computed(() => (route.query.type as 'seen' | 'all') || 'all');

// Simple state
const tasks = ref<Task[]>([]);
const currentIndex = ref(0);
const results = ref<Array<{ taskId: string; vocabIds: string[]; correct: boolean }>>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Computed
const currentTask = computed(() => tasks.value[currentIndex.value] || null);
const isComplete = computed(() => currentIndex.value >= tasks.value.length && tasks.value.length > 0);
const currentTaskNumber = computed(() => currentIndex.value + 1);
const totalTasks = computed(() => tasks.value.length);

// Load tasks
async function loadTasks() {
  try {
    isLoading.value = true;
    error.value = null;

    if (!setId.value) {
      error.value = 'No set ID provided';
      isLoading.value = false;
      return;
    }

    // Guard check
    if (!vocabRepo) {
      error.value = 'Repository not available';
      isLoading.value = false;
      return;
    }

    // Fetch 20 shuffled vocab
    const includeOnlySeen = testType.value === 'seen';
    const vocabList = await vocabRepo.getShuffledVocabForMinimalPairsFromSet(
      setId.value,
      20,
      includeOnlySeen
    );

    if (vocabList.length === 0) {
      error.value = 'No vocab available for this test. Try a different set or test type.';
      isLoading.value = false;
      return;
    }

    // Generate tasks
    tasks.value = vocabList.map(vocab => generateVocabChooseFromSound(vocab));
    isLoading.value = false;
  } catch {
    error.value = 'Failed to load test. Please try again.';
    isLoading.value = false;
  }
}

// Load on mount
onMounted(loadTasks);

// Handle task completion
function handleTaskFinished(correctness: TaskCorrectness = 'neutral') {
  if (!currentTask.value) return;

  // Save result
  results.value.push({
    taskId: currentTask.value.id,
    vocabIds: currentTask.value.associatedVocab || [],
    correct: correctness === 'correct'
  });

  // Move to next task
  currentIndex.value++;
}

// Retry
function retry() {
  currentIndex.value = 0;
  results.value = [];
  loadTasks();
}
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="flex justify-center items-center min-h-96">
    <div class="text-center">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4 text-lg">{{ $t('selfTest.loadingTest') }}</p>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="alert alert-error">
    <span>{{ error }}</span>
    <button class="btn btn-sm" @click="retry">
      {{ $t('practice.widgets.tryAgain') }}
    </button>
  </div>

  <!-- Completed -->
  <div v-else-if="isComplete">
    <TestResults :results="results" mode-id="minimal-pairs" />
  </div>

  <!-- Task -->
  <div v-else-if="currentTask">
    <div class="mb-4 text-center">
      <p class="text-lg font-semibold">
        {{ $t('selfTest.progress', { current: currentTaskNumber, total: totalTasks }) }}
      </p>
      <progress class="progress progress-primary w-full max-w-md" :value="currentTaskNumber" :max="totalTasks"></progress>
    </div>
    <TaskRenderer
      :key="currentTask.id"
      :task="currentTask"
      :practice-context="{ practiceMode: 'minimal-pairs', isTest: true }"
      @finished="handleTaskFinished"
    />
  </div>
</template>
