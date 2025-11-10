<script setup lang="ts">
import { inject, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { GoalData } from '@/entities/goals/GoalData';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import { useUsedVocabTracker } from '@/features/track/useUsedVocabTracker';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { getRandomGeneratedTaskForVocab } from '@/modes/utils/getRandomGeneratedTaskForVocab';
import { randomFromArray } from '@/shared/utils/arrayUtils';
import type { QueueState } from '@/modes/utils/usePracticeMode';
import { generateGoalAttemptTask } from '@/tasks/task-goal-attempt/generate';
import { useToast } from '@/shared/toasts';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const goalRepo = inject<GoalRepoContract>('goalRepo')!;

if (!vocabRepo || !translationRepo || !goalRepo) {
  throw new Error('Required repositories not available');
}

const { selectedSets, loadOptions } = usePracticeFilters();
const { addUsedVocab } = useUsedVocabTracker();
const toast = useToast();
const router = useRouter();

// Queue state for Layout.vue
const state = ref<QueueState>({ status: 'initializing' });
const showLoadingUI = ref(false);

// Lesson state
interface LessonState {
  goal: GoalData;
  vocabQueue: VocabData[]; // Component vocab first, then main vocab
  currentVocabIndex: number;
  tasksPerVocab: number; // How many tasks to show per vocab item
  tasksShownForCurrentVocab: number;
}

const currentLesson = ref<LessonState | null>(null);

// Recursively build vocab queue with depth-first traversal
// This ensures dependencies are practiced before their dependents
async function buildVocabQueueRecursive(
  vocabId: string,
  visited: Set<string>,
  queue: VocabData[]
): Promise<void> {
  // Prevent circular dependencies and duplicate processing
  if (visited.has(vocabId)) {
    return;
  }
  visited.add(vocabId);

  // Fetch the vocab
  const vocab = await vocabRepo.getVocabByUID(vocabId);
  if (!vocab || vocab.doNotPractice) {
    return;
  }

  // First, recursively process all component vocab (depth-first)
  if (vocab.contains && vocab.contains.length > 0) {
    const componentIds = vocab.contains.filter(
      id => id && typeof id === 'string' && id.trim().length > 0
    );

    for (const componentId of componentIds) {
      await buildVocabQueueRecursive(componentId, visited, queue);
    }
  }

  // After all dependencies are processed, add this vocab to the queue
  queue.push(vocab);
}

// Start a new lesson by selecting a goal and building vocab queue
async function startNewLesson(): Promise<void> {
  // Ensure only one set is selected
  if (selectedSets.value.length !== 1) {
    throw new Error('Cram mode requires exactly one set to be selected');
  }

  const setId = selectedSets.value[0];

  // Get goals from this set
  const goals = await goalRepo.getGoalsByOrigins([setId]);

  if (goals.length === 0) {
    toast.error('No goals found in the selected set');
    throw new Error('No goals found in the selected set');
  }

  // Filter out achieved goals
  const practiceableGoals = goals.filter(g => !g.isAchieved);

  if (practiceableGoals.length === 0) {
    toast.error('No practiceable goals found in the selected set');
    throw new Error('No practiceable goals found in the selected set');
  }

  // Pick a random goal
  const selectedGoal = randomFromArray(practiceableGoals);
  if (!selectedGoal) {
    throw new Error('Failed to select a goal');
  }

  // Goals no longer track vocab directly - this cram mode is deprecated
  // For now, fetch vocab from all translations to find related vocab
  const vocabIds = new Set<string>();

  // Get all vocab and filter by those that reference these translations
  const allVocab = await vocabRepo.getVocab();
  for (const vocab of allVocab) {
    for (const translationId of vocab.translations) {
      if (selectedGoal.translations.includes(translationId)) {
        vocabIds.add(vocab.id);
        break;
      }
    }
  }

  const vocabArray = Array.from(vocabIds);
  if (vocabArray.length === 0) {
    toast.error('Selected goal has no associated vocabulary');
    throw new Error('Selected goal has no associated vocabulary');
  }

  // Pick a random vocab from available vocab
  const selectedVocabId = randomFromArray(vocabArray);
  if (!selectedVocabId) {
    throw new Error('Failed to select vocabulary from goal');
  }

  const selectedVocab = await vocabRepo.getVocabByUID(selectedVocabId);
  if (!selectedVocab) {
    throw new Error(`Selected vocabulary not found: ${selectedVocabId}`);
  }

  // Build the vocab queue recursively with depth-first traversal
  // This ensures all dependencies at any depth are practiced first
  const vocabQueue: VocabData[] = [];
  const visited = new Set<string>();

  await buildVocabQueueRecursive(selectedVocabId, visited, vocabQueue);

  // Initialize lesson state
  currentLesson.value = {
    goal: selectedGoal,
    vocabQueue,
    currentVocabIndex: 0,
    tasksPerVocab: 1, // Show 2 tasks per vocab item
    tasksShownForCurrentVocab: 0
  };
}

// Generate next task in the lesson
async function generateNextTask(): Promise<void> {
  state.value = { status: 'loading' };
  showLoadingUI.value = true;

  try {
    // Ensure filters are loaded before proceeding
    await loadOptions();

    // Validate that exactly one set is selected
    if (selectedSets.value.length !== 1) {
      state.value = {
        status: 'empty',
        message: 'Cram mode requires exactly one set to be selected. Please select one set in the filters.'
      };
      showLoadingUI.value = false;
      return;
    }

    // If no lesson is active, start a new one
    if (!currentLesson.value) {
      await startNewLesson();
    }

    // If still no lesson (startNewLesson failed), show error
    if (!currentLesson.value) {
      state.value = { status: 'empty', message: 'Failed to start lesson' };
      showLoadingUI.value = false;
      return;
    }

    const lesson = currentLesson.value;

    // Check if we've completed all vocab in the queue
    if (lesson.currentVocabIndex >= lesson.vocabQueue.length) {
      // All vocab practiced, show goal-attempt task
      const goalAttemptTask = generateGoalAttemptTask(lesson.goal);
      state.value = { status: 'task', currentTask: goalAttemptTask, nextTask: null };
      showLoadingUI.value = false;
      return;
    }

    // Get current vocab
    const currentVocab = lesson.vocabQueue[lesson.currentVocabIndex];

    // Generate task for current vocab
    const translations = await translationRepo.getTranslationsByIds(currentVocab.translations || []);
    const task = await getRandomGeneratedTaskForVocab(currentVocab, translations, vocabRepo);

    if (!task) {
      // Couldn't generate task for this vocab, skip to next
      lesson.currentVocabIndex++;
      lesson.tasksShownForCurrentVocab = 0;
      await generateNextTask();
      return;
    }

    state.value = { status: 'task', currentTask: task, nextTask: null };
    showLoadingUI.value = false;

  } catch (error) {
    state.value = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to generate task'
    };
    showLoadingUI.value = false;
  }
}

// Handle task completion
async function handleTaskFinished() {
  if (state.value.status !== 'task') {
    await generateNextTask();
    return;
  }

  const task = state.value.currentTask;

  // Check if this was a goal-attempt task
  if (task.taskType === 'goal-attempt') {
    // Lesson complete, navigate back to home
    const goalTitle = currentLesson.value?.goal.title || 'the goal';
    toast.success(`Lesson complete! You practiced: ${goalTitle}`);
    currentLesson.value = null;
    router.push({ name: 'cram-home' });
    return;
  }

  // Track vocab usage
  const vocabId = task.associatedVocab?.[0];
  if (vocabId) {
    addUsedVocab(vocabId);
  }

  // Update lesson progress
  if (currentLesson.value) {
    const lesson = currentLesson.value;
    lesson.tasksShownForCurrentVocab++;

    // Check if we've shown enough tasks for this vocab
    if (lesson.tasksShownForCurrentVocab >= lesson.tasksPerVocab) {
      // Move to next vocab
      lesson.currentVocabIndex++;
      lesson.tasksShownForCurrentVocab = 0;
    }
  }

  // Generate next task
  await generateNextTask();
}

// Retry on error
async function retry() {
  // Reset state
  currentLesson.value = null;
  await generateNextTask();
}

// Initialize on mount
onMounted(() => {
  generateNextTask();
});
</script>

<template>
  <PracticeModeLayout
    :state="state"
    :showLoadingUI="showLoadingUI"
    modeId="cram"
    :retry="retry"
    :initialize="generateNextTask"
    :onTaskFinished="handleTaskFinished"
  />
</template>
