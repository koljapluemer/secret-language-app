<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import TaskRenderer from '@/pages/practice/tasks/ui/TaskRenderer.vue';
import { useQueueState } from '@/pages/practice/modes/utils/useQueueState';
import { generateGoalTask } from './generateGoalGetterTasks';
import { useToast } from '@/shared/toasts';

// Inject repositories
const goalRepo = inject<GoalRepoContract>('goalRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const toast = useToast();

if (!goalRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

// Track last task type to prevent duplicates
const lastTaskType = ref<string | undefined>(undefined);

// Create repositories object for TaskRenderer

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

// Generate a single goal task
async function generateNextTask(): Promise<Task | null> {
  try {
    const languages = await languageRepo!.getActiveTargetLanguages();
    const languageCodes = languages.map(lang => lang.code);

    if (languageCodes.length === 0) {
      return null;
    }

    const task = await generateGoalTask(goalRepo!, languageCodes, lastTaskType.value);

    // Update lastTaskType if we got a task
    if (task) {
      lastTaskType.value = task.taskType;
    }

    return task;
  } catch {
    toast.error('Error generating goal task');
    return null;
  }
}

// Try to transition to task state
async function tryTransitionToTask(): Promise<boolean> {
  setLoading('Preparing next goal task...');
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
  setEmpty('Unable to load more goal tasks. Please try refreshing.');
  return false;
}

// Initialize queue
async function initializeQueue() {
  setLoading('Loading goal tasks...');
  showLoadingUI.value = true; // Show loading immediately for initial load

  try {
    const success = await tryTransitionToTask();
    if (!success) {
      clearDelayedLoading();
      setEmpty('No goal tasks are currently available for practice.');
    }
  } catch {
    toast.error('Initialization failed');
    clearDelayedLoading();
    setError('Failed to initialize goal task queue. Please try again.');
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
  await completeCurrentTask(
    generateNextTask,
    undefined,
    tryTransitionToTask,
    'Excellent work! No more goal tasks are currently available.'
  );
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
          {{ state.status === 'loading' && state.message ? state.message : $t('practice.widgets.loadingGoalTasks') }}
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
        {{ $t('practice.widgets.tryAgain') }}
      </button>
    </div>
  </Transition>

  <!-- No Content Available -->
  <Transition enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="state.status === 'empty'" class="hero min-h-96">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1>{{ $t('practice.widgets.allDone') }}</h1>
          <p class="py-6">{{ state.message }}</p>
          <button class="btn btn-primary" @click="initializeQueue">
            {{ $t('practice.widgets.checkAgain') }}
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
      <TaskRenderer :key="state.currentTask.id" :task="state.currentTask"
        :practice-context="{ practiceMode: 'goal-getter' }"
        @finished="handleTaskFinished" />
    </Transition>
  </div>

  <!-- Fallback (should never happen with state machine) -->
  <Transition enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
    <div v-if="!['initializing', 'loading', 'task', 'empty', 'error'].includes(state.status)"
      class="alert alert-warning">
      <span>{{ $t('practice.widgets.unknownQueueState') }}</span>
      <button class="btn btn-sm" @click="initializeQueue">
        {{ $t('practice.widgets.refresh') }}
      </button>
    </div>
  </Transition>
</template>
