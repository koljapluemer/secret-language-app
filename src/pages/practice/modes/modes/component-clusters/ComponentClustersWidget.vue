<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { Task } from '@/pages/practice/Task';
import TaskRenderer from '@/pages/practice/tasks/ui/TaskRenderer.vue';
import { useQueueState } from '@/pages/practice/modes/utils/useQueueState';
import { generateComponentClustersTask, removeVocabIfNotDue } from './generateComponentClustersTasks';
import { useToast } from '@/shared/toasts';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const goalRepo = inject<GoalRepoContract>('goalRepo');
const noteRepo = inject<NoteRepoContract>('noteRepo');
const toast = useToast();

if (!vocabRepo || !translationRepo || !factCardRepo || !languageRepo || !resourceRepo || !goalRepo || !noteRepo) {
  throw new Error('Required repositories not available');
}

// Queue state
const {
  state,
  showLoadingUI,
  startDelayedLoading,
  clearDelayedLoading,
  setLoading,
  setTask,
  setEmpty,
  setError,
  completeCurrentTask,
  cleanup
} = useQueueState();

const lastUsedVocabId = ref<string | null>(null);

// Generate a single component clusters task
async function generateNextTask(): Promise<Task | null> {
  try {
    const languages = await languageRepo!.getActiveTargetLanguages();
    const languageCodes = languages.map(lang => lang.code);

    if (languageCodes.length === 0) {
      return null;
    }

    // Create block list with last used vocab
    const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

    return await generateComponentClustersTask(
      vocabRepo!,
      translationRepo!,
      languageCodes,
      blockList
    );
  } catch {
    toast.error('Error generating component clusters task');
    return null;
  }
}

// Try to transition to task state
async function tryTransitionToTask(): Promise<boolean> {
  setLoading('Finding component clusters...');
  startDelayedLoading();

  try {
    const currentTask = await generateNextTask();

    if (currentTask) {
      // Generate next task for preloading
      const nextTask = await generateNextTask();

      clearDelayedLoading();
      setTask(currentTask, nextTask);
      return true;
    }
  } catch {
    toast.error('Task generation failed');
  }

  clearDelayedLoading();
  setEmpty('No component clusters available for practice.');
  return false;
}

// Initialize queue
async function initializeQueue() {
  setLoading('Loading Component Clusters mode...');
  showLoadingUI.value = true; // Show loading immediately for initial load

  try {
    const success = await tryTransitionToTask();
    if (!success) {
      clearDelayedLoading();
      setEmpty('No component vocab (contained in multiple other vocab) is available for practice.');
    }
  } catch {
    toast.error('Initialization failed');
    clearDelayedLoading();
    setError('Failed to initialize Component Clusters mode. Please try again.');
  }
}

// Update tracking when transitioning to new task
function onTaskTransition(newCurrentTask: Task) {
  const vocabId = newCurrentTask.associatedVocab?.[0];
  if (vocabId) {
    lastUsedVocabId.value = vocabId;
  }
}

// Retry on error
async function retry() {
  await initializeQueue();
}

onMounted(async () => {
  await initializeQueue();
});

onUnmounted(() => {
  cleanup();
});

// Handle task completion
const handleTaskFinished = async () => {
  // Track the vocab UID and handle vocab removal before completing the task
  if (state.value.status === 'task') {
    const currentTask = state.value.currentTask;
    const vocabId = currentTask.associatedVocab?.[0];

    if (vocabId) {
      // Check if this vocab should be removed from container queue
      await removeVocabIfNotDue(vocabId, vocabRepo!);
    }
  }

  await completeCurrentTask(generateNextTask, onTaskTransition, tryTransitionToTask, 'Great work! All component clusters have been mastered.');
};
</script>

<template>
  <!-- Loading State (only show when showLoadingUI is true or initializing) -->
  <Transition enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="state.status === 'initializing' || showLoadingUI" class="flex justify-center items-center min-h-96">
      <div class="text-center">
        <span class="loading loading-spinner loading-lg"></span>
        <p class="mt-4 text-lg">
          {{ state.status === 'loading' && state.message ? state.message : 'Loading Component Clusters...' }}
        </p>
      </div>
    </div>
  </Transition>

  <!-- Error State -->
  <Transition enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="state.status === 'error'" class="alert alert-error">
      <span>{{ state.message }}</span>
      <button class="btn btn-sm" @click="retry">
        Try Again
      </button>
    </div>
  </Transition>

  <!-- No Content Available -->
  <Transition enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="state.status === 'empty'" class="hero min-h-96">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1>📦</h1>
          <h2>All Clusters Mastered!</h2>
          <p class="py-6">{{ state.message }}</p>
          <button class="btn btn-primary" @click="initializeQueue">
            Check Again
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Task -->
  <div v-if="state.status === 'task' && !showLoadingUI">
    <Transition mode="out-in" enter-active-class="transition-opacity duration-[50ms] ease-out"
      leave-active-class="transition-opacity duration-[50ms] ease-in" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <TaskRenderer
        :key="state.currentTask.id"
        :task="state.currentTask"
        :practice-context="{ practiceMode: 'component-clusters' }"
        :mode-context="{ setWrongVocabDueAgainImmediately: true }"
        @finished="handleTaskFinished"
      />
    </Transition>
  </div>

  <!-- Fallback (should never happen with state machine) -->
  <Transition enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="!['initializing', 'loading', 'task', 'empty', 'error'].includes(state.status)"
      class="alert alert-warning">
      <span>Something went wrong with the queue.</span>
      <button class="btn btn-sm" @click="initializeQueue">
        Reset
      </button>
    </div>
  </Transition>
</template>
