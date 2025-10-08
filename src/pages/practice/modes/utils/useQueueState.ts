import { ref } from 'vue';
import type { Task } from '@/pages/practice/Task';

// Queue state types
export type QueueState =
  | { status: 'initializing' }
  | { status: 'loading', message?: string }
  | { status: 'task', currentTask: Task, nextTask: Task | null }
  | { status: 'empty', message: string }
  | { status: 'error', message: string };

export function useQueueState() {
  // State
  const state = ref<QueueState>({ status: 'initializing' });

  // UI state for smooth transitions
  const showLoadingUI = ref(false);
  let loadingTimeout: NodeJS.Timeout | null = null;

  // Loading UI helpers
  function startDelayedLoading() {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    loadingTimeout = setTimeout(() => {
      showLoadingUI.value = true;
    }, 500);
  }

  function clearDelayedLoading() {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
    showLoadingUI.value = false;
  }

  // State setters
  function setInitializing() {
    state.value = { status: 'initializing' };
  }

  function setLoading(message?: string) {
    state.value = { status: 'loading', message };
  }

  function setTask(currentTask: Task, nextTask: Task | null = null) {
    state.value = { status: 'task', currentTask, nextTask };
  }

  function setEmpty(message: string) {
    state.value = { status: 'empty', message };
  }

  function setError(message: string) {
    state.value = { status: 'error', message };
  }

  // Cleanup function for unmounting
  function cleanup() {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
  }

  // Complete current task and transition to next task
  async function completeCurrentTask(
    generateNextTask: () => Promise<Task | null>,
    onTaskTransition?: (newCurrentTask: Task) => void,
    tryTransitionToTask?: () => Promise<boolean>,
    emptyMessage?: string
  ): Promise<void> {
    if (state.value.status !== 'task') {
      return;
    }

    const currentState = state.value;

    // If we have a next task ready, use it
    if (currentState.nextTask) {
      // Show the preloaded next task
      state.value = {
        status: 'task',
        currentTask: currentState.nextTask,
        nextTask: null
      };

      // Call the transition callback with the NEW current task (fixes the bug)
      if (onTaskTransition) {
        onTaskTransition(currentState.nextTask);
      }

      // Generate new next task for preloading (now with correct blockList)
      try {
        const newNextTask = await generateNextTask();
        if (newNextTask && state.value.status === 'task') {
          state.value.nextTask = newNextTask;
        }
      } catch {
        // Error generating next task - continue with current task
      }
    } else {
      // No next task ready, need to generate one
      if (tryTransitionToTask) {
        const success = await tryTransitionToTask();
        if (!success) {
          setEmpty(emptyMessage || 'No more tasks available.');
        }
      }
    }
  }

  return {
    // State
    state,
    showLoadingUI,

    // Loading UI helpers
    startDelayedLoading,
    clearDelayedLoading,

    // State setters
    setInitializing,
    setLoading,
    setTask,
    setEmpty,
    setError,

    // Task completion
    completeCurrentTask,

    // Cleanup
    cleanup
  };
}