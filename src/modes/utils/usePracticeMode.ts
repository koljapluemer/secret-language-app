import { ref, onMounted, onUnmounted } from 'vue';
import type { Task } from '@/tasks/Task';
import { useToast } from '@/shared/toasts';

// Queue state types
export type QueueState =
  | { status: 'initializing' }
  | { status: 'loading', message?: string }
  | { status: 'task', currentTask: Task, nextTask: Task | null }
  | { status: 'empty', message: string }
  | { status: 'error', message: string };

export interface PracticeModeConfig {
  modeId: string;
  generateTask: () => Promise<Task | null>;
  onTaskTransition?: (newCurrentTask: Task) => void;
}

export function usePracticeMode(config: PracticeModeConfig) {
  const toast = useToast();

  // Queue state (merged from useQueueState)
  const state = ref<QueueState>({ status: 'initializing' });
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

      // Call the transition callback with the NEW current task
      if (onTaskTransition) {
        onTaskTransition(currentState.nextTask);
      }

      // Generate new next task for preloading
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

  // Try to transition to task state
  async function tryTransitionToTask(): Promise<boolean> {
    setLoading();
    startDelayedLoading();

    try {
      const currentTask = await config.generateTask();

      if (currentTask) {
        // Generate next task for preloading
        const nextTask = await config.generateTask();

        clearDelayedLoading();
        setTask(currentTask, nextTask);
        return true;
      }
    } catch (error) {
      toast.error(`Task generation failed: ${String(error)}`);
    }

    clearDelayedLoading();
    setEmpty('practice.states.modeEmpty');
    return false;
  }

  // Initialize queue
  async function initialize() {
    setLoading();
    showLoadingUI.value = true;

    try {
      const success = await tryTransitionToTask();
      if (!success) {
        clearDelayedLoading();
        setEmpty('practice.states.modeEmpty');
      }
    } catch (error) {
      toast.error(`Initialization failed: ${String(error)}`);
      clearDelayedLoading();
      setError('practice.states.modeError');
    }
  }

  // Retry on error
  async function retry() {
    await initialize();
  }

  // Handle task completion
  async function handleTaskFinished() {
    await completeCurrentTask(
      config.generateTask,
      config.onTaskTransition,
      tryTransitionToTask,
      'practice.states.modeEmpty'
    );
  }

  // Lifecycle
  onMounted(initialize);
  onUnmounted(cleanup);

  return {
    state,
    showLoadingUI,
    retry,
    initialize,
    handleTaskFinished
  };
}
