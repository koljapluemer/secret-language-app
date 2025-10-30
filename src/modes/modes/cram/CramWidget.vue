<script setup lang="ts">
import { inject, ref, onMounted } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import { useUsedVocabTracker } from '@/features/track/useUsedVocabTracker';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { getRandomGeneratedTaskForVocab } from '@/modes/utils/getRandomGeneratedTaskForVocab';
import { pickRandom, randomFromArray } from '@/shared/utils/arrayUtils';
import type { QueueState } from '@/modes/utils/usePracticeMode';
import type { Task } from '@/tasks/Task';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

if (!vocabRepo || !translationRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid, loadOptions } = usePracticeFilters();
const { addUsedVocab, getLastUsedVocabId } = useUsedVocabTracker();

// State management
interface VocabPoolItem {
  vocab: VocabData;
  timesShown: number;
}

// Queue state for Layout.vue
const state = ref<QueueState>({ status: 'initializing' });
const showLoadingUI = ref(false);

// Cram mode specific state
const vocabPool = ref<Map<string, VocabPoolItem>>(new Map());
const sessionVocabIds = ref<Set<string>>(new Set());

// Build vocab pool with component-first logic
async function buildVocabPool(): Promise<void> {
  const languageCodes = selectedLanguages.value;

  if (languageCodes.length === 0) {
    vocabPool.value = new Map();
    return;
  }

  const lastUsed = getLastUsedVocabId();
  const blockList = lastUsed ? [lastUsed] : undefined;

  // Get both due and unseen vocab from selected sets
  let dueVocab: VocabData[] = [];
  let unseenVocab: VocabData[] = [];

  try {
    dueVocab = await vocabRepo.getRandomAlreadySeenDueVocab(10, languageCodes, blockList, setsToAvoid.value);
  } catch (error) {
    throw error;
  }

  try {
    unseenVocab = await vocabRepo.getRandomUnseenVocab(10, languageCodes, blockList, setsToAvoid.value);
  } catch (error) {
    throw error;
  }

  const allVocab = [...dueVocab, ...unseenVocab];
  const pool = new Map<string, VocabPoolItem>();

  // For each vocab, check if it has components to practice first
  for (const vocab of allVocab) {

    // If vocab has contains array, add component vocab to pool first
    if (vocab.contains && vocab.contains.length > 0) {
      // Filter out any undefined, null, or empty string IDs
      const componentIds = vocab.contains.filter(id => id && typeof id === 'string' && id.trim().length > 0);

      // Only fetch if we have valid IDs
      if (componentIds.length === 0) {
        continue;
      }

      let componentVocabList: VocabData[] = [];
      try {
        componentVocabList = await vocabRepo.getDueOrUnseenVocabFromIds(componentIds);
      } catch (error) {
        throw error;
      }

      // Add components to pool (prioritized by being added first)
      for (const componentVocab of componentVocabList) {
        if (!pool.has(componentVocab.id) &&
            !componentVocab.doNotPractice &&
            componentVocab.id !== lastUsed) {
          pool.set(componentVocab.id, {
            vocab: componentVocab,
            timesShown: 0
          });
        }
      }
    }

    // Add the vocab itself to pool
    if (!pool.has(vocab.id) &&
        !vocab.doNotPractice &&
        vocab.id !== lastUsed) {
      pool.set(vocab.id, {
        vocab: vocab,
        timesShown: 0
      });
    }
  }

  vocabPool.value = pool;
}

// Generate review task from session vocab (20% chance)
async function generateReviewTask(): Promise<Task | null> {
  // Need at least 3 items to start reviewing
  if (sessionVocabIds.value.size < 3) {
    return null;
  }

  // Get only the vocab that is currently due according to FSRS
  const dueVocab = await vocabRepo.getDueVocabByIds(Array.from(sessionVocabIds.value));
  if (dueVocab.length === 0) {
    return null;
  }

  // Filter out the last used vocab to prevent immediate repetition
  const lastUsed = getLastUsedVocabId();
  const availableVocab = lastUsed ? dueVocab.filter(v => v.id !== lastUsed) : dueVocab;

  if (availableVocab.length === 0) {
    return null;
  }

  // Pick a random vocab from the due ones
  const selectedVocab = randomFromArray(availableVocab);
  if (!selectedVocab) {
    return null;
  }

  // Generate task for this vocab
  const translations = await translationRepo.getTranslationsByIds(selectedVocab.translations || []);
  return getRandomGeneratedTaskForVocab(selectedVocab, translations, vocabRepo);
}

// Generate next task
async function generateNextTask(): Promise<void> {
  state.value = { status: 'loading' };
  showLoadingUI.value = true;

  try {
    // Ensure filters are loaded before proceeding
    await loadOptions();

    // 20% chance to show a review task instead of normal flow
    if (Math.random() < 0.2) {
      const reviewTask = await generateReviewTask();
      if (reviewTask) {
        state.value = { status: 'task', currentTask: reviewTask, nextTask: null };
        showLoadingUI.value = false;
        return;
      }
      // If review task generation failed, continue with normal flow
    }

    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) {
      state.value = { status: 'empty', message: 'No languages selected for practice' };
      showLoadingUI.value = false;
      return;
    }

    // If pool is empty or getting low, rebuild it
    if (vocabPool.value.size < 3) {
      await buildVocabPool();
    }

    if (vocabPool.value.size === 0) {
      state.value = { status: 'empty', message: 'No vocabulary available for practice in selected sets' };
      showLoadingUI.value = false;
      return;
    }

    // Filter out last used vocab to prevent immediate repetition
    const lastUsed = getLastUsedVocabId();
    const poolArray = Array.from(vocabPool.value.values());
    const availablePool = lastUsed
      ? poolArray.filter(item => item.vocab.id !== lastUsed)
      : poolArray;

    if (availablePool.length === 0) {
      // All pool items are the last used vocab, rebuild pool
      await buildVocabPool();
      if (vocabPool.value.size === 0) {
        state.value = { status: 'empty', message: 'No vocabulary available for practice' };
        showLoadingUI.value = false;
        return;
      }
      // Try again with new pool
      const newPoolArray = Array.from(vocabPool.value.values());
      const newAvailablePool = lastUsed
        ? newPoolArray.filter(item => item.vocab.id !== lastUsed)
        : newPoolArray;

      if (newAvailablePool.length === 0) {
        state.value = { status: 'empty', message: 'No vocabulary available for practice' };
        showLoadingUI.value = false;
        return;
      }
    }

    // Pick random vocab from available pool
    const selectedItem = pickRandom(availablePool.length > 0 ? availablePool : poolArray, 1)[0];

    if (!selectedItem) {
      state.value = { status: 'empty', message: 'No vocabulary available for practice' };
      showLoadingUI.value = false;
      return;
    }

    // Generate task for this vocab
    const translations = await translationRepo.getTranslationsByIds(selectedItem.vocab.translations || []);
    const task = await getRandomGeneratedTaskForVocab(selectedItem.vocab, translations, vocabRepo);

    if (!task) {
      // Couldn't generate task, remove from pool and try again
      vocabPool.value.delete(selectedItem.vocab.id);
      await generateNextTask();
      return;
    }

    state.value = { status: 'task', currentTask: task, nextTask: null };
    showLoadingUI.value = false;

  } catch (error) {
    state.value = { status: 'error', message: error instanceof Error ? error.message : 'Failed to generate task' };
    showLoadingUI.value = false;
  }
}

// Update pool after task completion
async function updatePoolAfterTask(vocabId: string): Promise<void> {
  const poolItem = vocabPool.value.get(vocabId);
  if (!poolItem) return;

  // Get fresh vocab data to check current level (after scoring)
  const freshVocab = await vocabRepo.getVocabByUID(vocabId);
  if (!freshVocab) {
    vocabPool.value.delete(vocabId);
    return;
  }

  // Increment times shown
  poolItem.timesShown++;

  // Check if vocab was unseen INITIALLY (when we added it to pool)
  const wasInitiallyUnseen = poolItem.vocab.progress.level === -1;

  // Update the pool item with fresh vocab data for next time
  poolItem.vocab = freshVocab;

  if (wasInitiallyUnseen) {
    // Unseen vocab: remove only after showing twice
    if (poolItem.timesShown >= 2) {
      vocabPool.value.delete(vocabId);
    }
  } else {
    // Due vocab: remove after showing once
    vocabPool.value.delete(vocabId);
  }
}

// Handle task completion
async function handleTaskFinished() {
  if (state.value.status === 'task') {
    const vocabId = state.value.currentTask.associatedVocab?.[0];

    if (vocabId) {
      // Update the pool based on completion
      await updatePoolAfterTask(vocabId);

      // Track this vocab to avoid immediate repetition
      addUsedVocab(vocabId);

      // Add to session tracking for review tasks
      sessionVocabIds.value.add(vocabId);
    }
  }

  // Generate next task
  await generateNextTask();
}

// Retry on error
async function retry() {
  // Reset state
  vocabPool.value = new Map();
  sessionVocabIds.value = new Set();

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
