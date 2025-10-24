<script setup lang="ts">
import { inject, ref, onMounted } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import { useUsedVocabTracker } from '@/features/track/useUsedVocabTracker';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { getRandomGeneratedTaskForVocab } from '@/modes/utils/getRandomGeneratedTaskForVocab';
import { generateGuessWhatSentenceMeans } from '@/tasks/task-guess-what-sentence-means/generate';
import { pickRandom, randomFromArray } from '@/shared/utils/arrayUtils';
import type { QueueState } from '@/modes/utils/usePracticeMode';
import type { Task } from '@/tasks/Task';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

if (!vocabRepo || !translationRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();
const { addUsedVocab, getLastUsedVocabId } = useUsedVocabTracker();

// State management
type Phase = 'vocab-practice' | 'sentence-meaning';

interface VocabPoolItem {
  vocab: VocabData;
  timesShown: number;
}

// Queue state for Layout.vue
const state = ref<QueueState>({ status: 'initializing' });
const showLoadingUI = ref(false);

// Sentence-slide specific state
const currentSentence = ref<VocabData | null>(null);
const vocabPool = ref<Map<string, VocabPoolItem>>(new Map());
const phase = ref<Phase>('vocab-practice');
const sessionVocabIds = ref<Set<string>>(new Set());

// Initialize vocab pool from sentence's contains array
async function initializeVocabPool(sentence: VocabData): Promise<void> {
  const containsIds = sentence.contains || [];
  if (containsIds.length === 0) {
    vocabPool.value = new Map();
    return;
  }

  // Get all vocab from contains array
  const containsVocab = await vocabRepo.getVocabByUIDs(containsIds);

  const now = new Date();
  const pool = new Map<string, VocabPoolItem>();
  const lastUsed = getLastUsedVocabId();

  for (const vocab of containsVocab) {
    // Filter: only due or unseen vocab
    const isDue = vocab.progress.due && vocab.progress.due <= now;
    const isUnseen = vocab.progress.level === -1;

    // Skip if not due/unseen, last used, doNotPractice, or in avoided sets
    if (!isDue && !isUnseen) continue;
    if (vocab.doNotPractice) continue;
    if (lastUsed && vocab.id === lastUsed) continue;
    if (setsToAvoid.value && vocab.origins.some(origin => setsToAvoid.value.includes(origin))) continue;

    pool.set(vocab.id, {
      vocab,
      timesShown: 0
    });
  }

  vocabPool.value = pool;
}

// Generate review task from session vocab
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

    // If we don't have a current sentence, pick a new one
    if (!currentSentence.value) {
      const lastUsed = getLastUsedVocabId();
      const blockList = lastUsed ? [lastUsed] : undefined;

      const sentence = await vocabRepo.getRandomSentenceVocabWithContains(
        languageCodes,
        blockList,
        setsToAvoid.value
      );

      if (!sentence) {
        state.value = { status: 'empty', message: 'No sentence vocabulary available for practice' };
        showLoadingUI.value = false;
        return;
      }

      currentSentence.value = sentence;
      await initializeVocabPool(sentence);
      phase.value = 'vocab-practice';
    }

    // Phase 1: Work through vocab pool
    if (phase.value === 'vocab-practice') {
      if (vocabPool.value.size === 0) {
        // Pool is empty, move to sentence meaning
        phase.value = 'sentence-meaning';
      } else {
        // Filter out last used vocab to prevent immediate repetition
        const lastUsed = getLastUsedVocabId();
        const poolArray = Array.from(vocabPool.value.values());
        const availablePool = lastUsed
          ? poolArray.filter(item => item.vocab.id !== lastUsed)
          : poolArray;

        // If all pool items are the last used vocab, move to sentence meaning
        if (availablePool.length === 0) {
          phase.value = 'sentence-meaning';
        } else {
          // Pick random vocab from available pool
          const selectedItem = pickRandom(availablePool, 1)[0];

          if (selectedItem) {
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
            return;
          }
        }
      }
    }

    // Phase 2: Show sentence meaning task
    if (phase.value === 'sentence-meaning' && currentSentence.value) {
      const task = generateGuessWhatSentenceMeans(currentSentence.value);

      // Reset for next sentence
      currentSentence.value = null;
      vocabPool.value = new Map();
      phase.value = 'vocab-practice';

      state.value = { status: 'task', currentTask: task, nextTask: null };
      showLoadingUI.value = false;
      return;
    }

    // Fallback - shouldn't get here
    state.value = { status: 'empty', message: 'No tasks available' };
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
  currentSentence.value = null;
  vocabPool.value = new Map();
  phase.value = 'vocab-practice';

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
    modeId="sentence-slide"
    :retry="retry"
    :initialize="generateNextTask"
    :onTaskFinished="handleTaskFinished"
    :loadingFallback="$t('practice.widgets.preparingSentenceSlide')"
    emptyTitle="No sentences"
    :checkAgainLabel="$t('practice.widgets.checkForMoreSentences')"
  />
</template>
