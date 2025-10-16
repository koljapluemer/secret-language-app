import { ref, onMounted, onUnmounted } from 'vue';
import type { Task } from '@/tasks/Task';
import { useToast } from '@/shared/toasts';

// Test result for a single task
export interface TestResult {
  taskId: string;
  vocabIds: string[];
  correct: boolean;
}

// Test state types
export type TestState =
  | { status: 'initializing' }
  | { status: 'loading', message?: string }
  | { status: 'task', currentTask: Task, currentTaskNumber: number, nextTask: Task | null }
  | { status: 'completed', results: TestResult[] }
  | { status: 'error', message: string };

export interface TestModeConfig {
  modeId: string;
  totalTasks: number; // Number of tasks in the test (e.g., 20)
  generateTask: () => Promise<Task | null>;
  onTaskTransition?: (newCurrentTask: Task) => void;
  messages: {
    loading: string;
    empty: string;
    error: string;
  };
}

export function useTestMode(config: TestModeConfig) {
  const toast = useToast();

  // Test state
  const state = ref<TestState>({ status: 'initializing' });
  const showLoadingUI = ref(false);
  let loadingTimeout: NodeJS.Timeout | null = null;

  // Test results tracking
  const results = ref<TestResult[]>([]);
  const currentTaskNumber = ref(0);

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

  function setTask(currentTask: Task, taskNumber: number, nextTask: Task | null = null) {
    state.value = { status: 'task', currentTask, currentTaskNumber: taskNumber, nextTask };
  }

  function setCompleted(testResults: TestResult[]) {
    state.value = { status: 'completed', results: testResults };
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

  // Try to transition to task state
  async function tryTransitionToTask(): Promise<boolean> {
    setLoading(config.messages.loading);
    startDelayedLoading();

    try {
      const currentTask = await config.generateTask();

      if (currentTask) {
        // Generate next task for preloading
        const nextTask = currentTaskNumber.value < config.totalTasks - 1
          ? await config.generateTask()
          : null;

        clearDelayedLoading();
        currentTaskNumber.value++;
        setTask(currentTask, currentTaskNumber.value, nextTask);
        return true;
      }
    } catch (error) {
      toast.error(`Task generation failed: ${String(error)}`);
    }

    clearDelayedLoading();
    return false;
  }

  // Initialize test
  async function initialize() {
    setLoading(config.messages.loading);
    showLoadingUI.value = true;

    // Reset test state
    results.value = [];
    currentTaskNumber.value = 0;

    try {
      const success = await tryTransitionToTask();
      if (!success) {
        clearDelayedLoading();
        setError(config.messages.empty);
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
  async function handleTaskFinished(result: TestResult) {
    if (state.value.status !== 'task') {
      return;
    }

    // Save result
    results.value.push(result);

    // Check if test is complete
    if (currentTaskNumber.value >= config.totalTasks) {
      setCompleted(results.value);
      return;
    }

    const currentState = state.value;

    // If we have a next task ready, use it
    if (currentState.nextTask) {
      currentTaskNumber.value++;
      // Show the preloaded next task
      state.value = {
        status: 'task',
        currentTask: currentState.nextTask,
        currentTaskNumber: currentTaskNumber.value,
        nextTask: null
      };

      // Call the transition callback with the NEW current task
      if (config.onTaskTransition) {
        config.onTaskTransition(currentState.nextTask);
      }

      // Generate new next task for preloading (if not the last task)
      if (currentTaskNumber.value < config.totalTasks) {
        try {
          const newNextTask = await config.generateTask();
          if (newNextTask && state.value.status === 'task') {
            state.value.nextTask = newNextTask;
          }
        } catch {
          // Error generating next task - continue with current task
        }
      }
    } else {
      // No next task ready, need to generate one
      const success = await tryTransitionToTask();
      if (!success) {
        // If no task available but we haven't completed all tasks yet, show error
        if (currentTaskNumber.value < config.totalTasks) {
          setError('Not enough tasks available to complete the test.');
        } else {
          setCompleted(results.value);
        }
      }
    }
  }

  // Lifecycle
  onMounted(initialize);
  onUnmounted(cleanup);

  return {
    state,
    showLoadingUI,
    currentTaskNumber,
    totalTasks: config.totalTasks,
    results,
    retry,
    initialize,
    handleTaskFinished
  };
}
