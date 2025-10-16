<script setup lang="ts">
import type { Task } from '@/tasks/Task';
import TaskRenderer from '@/tasks/ui/TaskRenderer.vue';

// Local type definition - no composable dependency
type QueueState =
  | { status: 'initializing' }
  | { status: 'loading', message?: string }
  | { status: 'task', currentTask: Task, nextTask: Task | null }
  | { status: 'empty', message: string }
  | { status: 'error', message: string };

interface Props {
  state: QueueState;
  showLoadingUI: boolean;
  modeId: string;
  retry: () => Promise<void>;
  initialize: () => Promise<void>;
  onTaskFinished: () => Promise<void>;
  loadingFallback?: string;
  emptyTitle?: string;
  errorTitle?: string;
  retryLabel?: string;
  checkAgainLabel?: string;
  fallbackLabel?: string;
}

defineProps<Props>();
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

  <!-- Empty State -->
  <Transition
    enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div v-if="state.status === 'empty'" class="hero min-h-96">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1>{{ emptyTitle || $t('practice.widgets.allDone') }}</h1>
          <p class="py-6">{{ state.message }}</p>
          <button class="btn btn-primary" @click="initialize">
            {{ checkAgainLabel || $t('practice.widgets.checkAgain') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Task State -->
  <div v-if="state.status === 'task' && !showLoadingUI">
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
        :practice-context="{ practiceMode: modeId }"
        @finished="onTaskFinished"
      />
    </Transition>
  </div>

  <!-- Fallback State -->
  <Transition
    enter-active-class="transition-opacity duration-[50ms]"
    leave-active-class="transition-opacity duration-[50ms]"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="!['initializing', 'loading', 'task', 'empty', 'error'].includes(state.status)"
      class="alert alert-warning"
    >
      <span>{{ $t('practice.widgets.unknownQueueState') }}</span>
      <button class="btn btn-sm" @click="initialize">
        {{ fallbackLabel || $t('practice.widgets.refresh') }}
      </button>
    </div>
  </Transition>
</template>
