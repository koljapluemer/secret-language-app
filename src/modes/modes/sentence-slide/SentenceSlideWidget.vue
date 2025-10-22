<script setup lang="ts">
import { inject, ref, onMounted } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { getRandomGeneratedTaskForVocab } from '@/modes/utils/getRandomGeneratedTaskForVocab';
import { generateGuessWhatSentenceMeans } from '@/tasks/task-guess-what-sentence-means/generate';
import { pickRandom } from '@/shared/utils/arrayUtils';
import type { QueueState } from '@/modes/utils/usePracticeMode';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

if (!vocabRepo || !translationRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();

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
const lastUsedVocabId = ref<string | null>(null);

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
  const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

  for (const vocab of containsVocab) {
    // Filter: only due or unseen vocab
    const isDue = vocab.progress.due && vocab.progress.due <= now;
    const isUnseen = vocab.progress.level === -1;

    // Skip if not due/unseen, in blocklist, doNotPractice, or in avoided sets
    if (!isDue && !isUnseen) continue;
    if (vocab.doNotPractice) continue;
    if (blockList?.includes(vocab.id)) continue;
    if (setsToAvoid.value && vocab.origins.some(origin => setsToAvoid.value.includes(origin))) continue;

    pool.set(vocab.id, {
      vocab,
      timesShown: 0
    });
  }

  vocabPool.value = pool;
}

// Generate next task
async function generateNextTask(): Promise<void> {
  state.value = { status: 'loading' };
  showLoadingUI.value = true;

  try {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) {
      state.value = { status: 'empty', message: 'No languages selected for practice' };
      showLoadingUI.value = false;
      return;
    }

    // If we don't have a current sentence, pick a new one
    if (!currentSentence.value) {
      const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

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
        // Pick random vocab from pool using proper random picker
        const poolArray = Array.from(vocabPool.value.values());
        const selectedItem = pickRandom(poolArray, 1)[0];

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
      lastUsedVocabId.value = vocabId;
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
  lastUsedVocabId.value = null;

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
