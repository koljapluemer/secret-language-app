<script setup lang="ts">
import { inject, ref, computed, onMounted, provide } from 'vue';
import { useRoute } from 'vue-router';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { SituationRepoContract } from '@/entities/situation/SituationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { TestResultRepoContract } from '@/entities/test-results/TestResultRepoContract';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/tasks/Task';
import { generateVocabChooseFromSound } from '@/tasks/task-vocab-choose-from-sound/generate';
import { taskRegistry } from '@/tasks/ui/taskRegistry';
import TestResults from '@/widgets/test/TestResults.vue';
import type { TaskCorrectness } from '@/entities/practice-tracking/TaskCompletionData';
import { useToast } from '@/shared/toasts';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const situationRepo = inject<SituationRepoContract>('situationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const goalRepo = inject<GoalRepoContract>('goalRepo');
const noteRepo = inject<NoteRepoContract>('noteRepo');
const testResultRepo = inject<TestResultRepoContract>('testResultRepo');

if (!vocabRepo || !translationRepo || !situationRepo || !factCardRepo || !languageRepo || !resourceRepo || !goalRepo || !noteRepo || !testResultRepo) {
  throw new Error('Required repositories not available');
}

const repositories: RepositoriesContextStrict = {
  vocabRepo,
  translationRepo,
  situationRepo,
  factCardRepo,
  languageRepo,
  resourceRepo,
  goalRepo,
  noteRepo
};

provide('repositories', repositories);

function getTaskComponent(taskType: keyof typeof taskRegistry) {
  const taskInfo = taskRegistry[taskType];
  return taskInfo?.component;
}

const route = useRoute();
const toast = useToast();

// Get query params
const setId = computed(() => route.query.set as string);
const testType = computed(() => (route.query.type as 'seen' | 'all') || 'all');

// Simple state
const tasks = ref<Task[]>([]);
const currentIndex = ref(0);
const results = ref<Array<{ taskId: string; vocabIds: string[]; correct: boolean }>>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const testStartTime = ref<number>(0);

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
onMounted(() => {
  testStartTime.value = Date.now();
  loadTasks();
});

// Handle task completion
async function handleTaskFinished(correctness: TaskCorrectness = 'neutral') {
  if (!currentTask.value) return;

  // Save result
  results.value.push({
    taskId: currentTask.value.id,
    vocabIds: currentTask.value.associatedVocab || [],
    correct: correctness === 'correct'
  });

  // Move to next task
  currentIndex.value++;

  // If test is complete, save to repository
  if (currentIndex.value >= tasks.value.length && tasks.value.length > 0) {
    await saveTestResult();
  }
}

// Save test result to repository
async function saveTestResult() {
  if (!testResultRepo || !setId.value) return;

  try {
    const durationMs = Date.now() - testStartTime.value;

    // Deep clone to strip all Vue reactivity
    const testResultData = JSON.parse(JSON.stringify({
      testMode: 'minimal-pairs',
      completedAt: new Date(),
      durationMs,
      testConfig: {
        type: 'vocab-based',
        setId: setId.value,
        testType: testType.value,
        mode: 'minimal-pairs'
      },
      results: results.value
    }));

    await testResultRepo.saveTestResult(testResultData);
  } catch (err) {
    toast.error(`Failed to save test result: ${String(err)}`);
  }
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
    <component
      :is="getTaskComponent(currentTask.taskType)"
      :key="currentTask.id"
      :task="currentTask"
      :repositories="repositories"
      :mode-context="{ setWrongVocabDueAgainImmediately: false }"
      @finished="handleTaskFinished"
    />
  </div>
</template>
