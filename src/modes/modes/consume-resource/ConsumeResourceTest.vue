<script setup lang="ts">
import { inject, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { TestResultRepoContract } from '@/entities/test-results/TestResultRepoContract';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { Task } from '@/tasks/Task';
import { generateConsumeImmersionContent } from '@/tasks/task-consume-immersion-content/generate';
import { taskRegistry } from '@/tasks/ui/taskRegistry';
import { provide } from 'vue';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import { useToast } from '@/shared/toasts';

// Inject repositories
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const testResultRepo = inject<TestResultRepoContract>('testResultRepo');
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const goalRepo = inject<GoalRepoContract>('goalRepo');
const noteRepo = inject<NoteRepoContract>('noteRepo');

if (!resourceRepo || !testResultRepo || !vocabRepo || !translationRepo || !factCardRepo || !languageRepo || !goalRepo || !noteRepo) {
  throw new Error('Required repositories not available');
}

const repositories: RepositoriesContextStrict = {
  vocabRepo,
  translationRepo,
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
const router = useRouter();
const toast = useToast();

// Get query param
const resourceId = computed(() => route.query.resource as string);

// Simple state
const resource = ref<ResourceData | null>(null);
const task = ref<Task | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isComplete = ref(false);
const testStartTime = ref<number>(0);
const experienceNote = ref<string | undefined>(undefined);

// Load resource and generate task
async function loadTask() {
  try {
    isLoading.value = true;
    error.value = null;

    if (!resourceId.value) {
      error.value = 'No resource ID provided';
      isLoading.value = false;
      return;
    }

    if (!resourceRepo) {
      error.value = 'Repository not available';
      isLoading.value = false;
      return;
    }

    // Fetch resource
    const resourceData = await resourceRepo.getResourceById(resourceId.value);

    if (!resourceData) {
      error.value = 'Resource not found';
      isLoading.value = false;
      return;
    }

    if (!resourceData.isImmersionContent) {
      error.value = 'This resource is not immersion content';
      isLoading.value = false;
      return;
    }

    resource.value = resourceData;

    // Generate task
    task.value = generateConsumeImmersionContent(resourceData);
    isLoading.value = false;
  } catch {
    error.value = 'Failed to load resource. Please try again.';
    isLoading.value = false;
  }
}

// Load on mount
onMounted(() => {
  testStartTime.value = Date.now();
  loadTask();
});

// Handle task completion
async function handleTaskFinished(note?: string) {
  experienceNote.value = note;
  await saveTestResult();
  isComplete.value = true;
}

// Save test result to repository
async function saveTestResult() {
  if (!testResultRepo || !resourceId.value || !resource.value) return;

  try {
    const durationMs = Date.now() - testStartTime.value;

    // Deep clone to strip all Vue reactivity
    const testResultData = JSON.parse(JSON.stringify({
      testMode: 'consume-resource',
      completedAt: new Date(),
      durationMs,
      testConfig: {
        type: 'resource-based',
        resourceId: resourceId.value,
        mode: 'consume-resource'
      },
      results: {
        resourceId: resourceId.value,
        experienceNote: experienceNote.value
      }
    }));

    await testResultRepo.saveTestResult(testResultData);
  } catch (err) {
    toast.error(`Failed to save test result: ${String(err)}`);
  }
}

// Return to self-test home
function returnToSelfTest() {
  router.push({ name: 'self-test' });
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
    <button class="btn btn-sm" @click="returnToSelfTest">
      {{ $t('selfTest.returnToTests') }}
    </button>
  </div>

  <!-- Completed -->
  <div v-else-if="isComplete" class="hero min-h-96">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">{{ $t('selfTest.consumeResourceComplete') }}</h1>
        <p class="py-6">{{ $t('selfTest.consumeResourceCompleteMessage') }}</p>
        <button class="btn btn-primary" @click="returnToSelfTest">
          {{ $t('selfTest.returnToTests') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Task -->
  <div v-else-if="task">
    <div class="mb-4">
      <h2 class="text-2xl font-bold">{{ resource?.title }}</h2>
      <p class="text-sm text-base-content/70">{{ $t('selfTest.consumeResourceInstructions') }}</p>
    </div>
    <component
      :is="getTaskComponent(task.taskType)"
      :key="task.id"
      :task="task"
      :repositories="repositories"
      :mode-context="{ setWrongVocabDueAgainImmediately: false }"
      @finished="handleTaskFinished"
    />
  </div>
</template>
