import { onMounted, onUnmounted } from 'vue';
import type { Task } from '@/pages/practice/Task';
import { useQueueState } from '@/modes/utils/useQueueState';
import { useToast } from '@/shared/toasts';

export interface PracticeModeConfig {
  modeId: string;
  generateTask: () => Promise<Task | null>;
  onTaskTransition?: (newCurrentTask: Task) => void;
  messages: {
    loading: string;
    empty: string;
    error: string;
  };
}

export function usePracticeMode(config: PracticeModeConfig) {
  const toast = useToast();

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

  // Try to transition to task state
  async function tryTransitionToTask(): Promise<boolean> {
    setLoading(config.messages.loading);
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
    setEmpty(config.messages.empty);
    return false;
  }

  // Initialize queue
  async function initialize() {
    setLoading(config.messages.loading);
    showLoadingUI.value = true;

    try {
      const success = await tryTransitionToTask();
      if (!success) {
        clearDelayedLoading();
        setEmpty(config.messages.empty);
      }
    } catch (error) {
      toast.error(`Initialization failed: ${String(error)}`);
      clearDelayedLoading();
      setError(config.messages.error);
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
      config.messages.empty
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
