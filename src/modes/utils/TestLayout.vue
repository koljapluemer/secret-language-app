<script setup lang="ts">
import type { Task } from '@/tasks/Task';
import type { TestResult } from './useTestMode';
import type { TaskCorrectness } from '@/entities/practice-tracking/TaskCompletionData';
import TaskRenderer from '@/tasks/ui/TaskRenderer.vue';
import TestResults from '@/widgets/test/TestResults.vue';

// Local type definition
type TestState =
  | { status: 'initializing' }
  | { status: 'loading', message?: string }
  | { status: 'task', currentTask: Task, currentTaskNumber: number, nextTask: Task | null }
  | { status: 'completed', results: TestResult[] }
  | { status: 'error', message: string };

interface Props {
  state: TestState;
  showLoadingUI: boolean;
  modeId: string;
  currentTaskNumber: number;
  totalTasks: number;
  retry: () => Promise<void>;
  onTaskFinished: (result: TestResult) => Promise<void>;
  loadingFallback?: string;
  errorTitle?: string;
  retryLabel?: string;
}

const props = defineProps<Props>();

// Handle task finished from TaskRenderer
async function handleTaskFinished(correctness: TaskCorrectness = 'neutral') {
  if (props.state.status !== 'task') {
    return;
  }

  const currentTask = props.state.currentTask;

  // Convert TaskCorrectness to TestResult
  const result: TestResult = {
    taskId: currentTask.id,
    vocabIds: currentTask.associatedVocab || [],
    correct: correctness === 'correct'
  };

  await props.onTaskFinished(result);
}
</script>

<template>
  <!-- Loading State -->
  <Transition
    enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="state.status === 'initializing' || showLoadingUI"
      class="flex justify-center items-center min-h-96"
    >
      <div class="text-center">
        <span class="loading loading-spinner loading-lg"></span>
        <p class="mt-4 text-lg">
          {{ state.status === 'loading' && state.message ? state.message : (loadingFallback || $t('practice.widgets.loading')) }}
        </p>
      </div>
    </div>
  </Transition>

  <!-- Error State -->
  <Transition
    enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div v-if="state.status === 'error'" class="alert alert-error">
      <span>{{ state.message }}</span>
      <button class="btn btn-sm" @click="retry">
        {{ retryLabel || $t('practice.widgets.tryAgain') }}
      </button>
    </div>
  </Transition>

  <!-- Task State with Progress -->
  <div v-if="state.status === 'task' && !showLoadingUI">
    <div class="mb-4 text-center">
      <p class="text-lg font-semibold">
        {{ $t('selfTest.progress', { current: currentTaskNumber, total: totalTasks }) }}
      </p>
      <progress class="progress progress-primary w-full max-w-md" :value="currentTaskNumber" :max="totalTasks"></progress>
    </div>
    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-[50ms] ease-out"
      leave-active-class="transition-opacity duration-[50ms] ease-in"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <TaskRenderer
        :key="state.currentTask.id"
        :task="state.currentTask"
        :practice-context="{ practiceMode: modeId, isTest: true }"
        @finished="handleTaskFinished"
      />
    </Transition>
  </div>

  <!-- Completed State - Show Results -->
  <Transition
    enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div v-if="state.status === 'completed'">
      <TestResults :results="state.results" :mode-id="modeId" />
    </div>
  </Transition>
</template>
