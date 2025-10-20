<script setup lang="ts">
import { inject, ref, onMounted } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/tasks/Task';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import TaskRenderer from '@/tasks/ui/TaskRenderer.vue';
import { getRandomGeneratedTaskForVocab } from '@/modes/utils/getRandomGeneratedTaskForVocab';
import { generateGuessWhatSentenceMeans } from '@/tasks/task-guess-what-sentence-means/generate';
import { pickRandom } from '@/shared/utils/arrayUtils';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

if (!vocabRepo || !translationRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();

// State management
type Status = 'loading' | 'error' | 'empty' | 'task';
type Phase = 'vocab-practice' | 'sentence-meaning';

interface VocabPoolItem {
  vocab: VocabData;
  timesShown: number;
}

interface State {
  status: Status;
  currentTask: Task | null;
  error: string | null;
  currentSentence: VocabData | null;
  vocabPool: Map<string, VocabPoolItem>;
  phase: Phase;
}

const state = ref<State>({
  status: 'loading',
  currentTask: null,
  error: null,
  currentSentence: null,
  vocabPool: new Map(),
  phase: 'vocab-practice'
});

const lastUsedVocabId = ref<string | null>(null);

// Initialize vocab pool from sentence's contains array
async function initializeVocabPool(sentence: VocabData): Promise<void> {
  const containsIds = sentence.contains || [];
  if (containsIds.length === 0) {
    state.value.vocabPool = new Map();
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

  state.value.vocabPool = pool;
}

// Generate next task
async function generateNextTask(): Promise<void> {
  state.value.status = 'loading';

  try {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) {
      state.value.status = 'empty';
      state.value.error = 'No languages selected for practice';
      return;
    }

    // If we don't have a current sentence, pick a new one
    if (!state.value.currentSentence) {
      const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

      const sentence = await vocabRepo.getRandomSentenceVocabWithContains(
        languageCodes,
        blockList,
        setsToAvoid.value
      );

      if (!sentence) {
        state.value.status = 'empty';
        state.value.currentTask = null;
        state.value.error = null;
        return;
      }

      state.value.currentSentence = sentence;
      await initializeVocabPool(sentence);
      state.value.phase = 'vocab-practice';
    }

    // Phase 1: Work through vocab pool
    if (state.value.phase === 'vocab-practice') {
      if (state.value.vocabPool.size === 0) {
        // Pool is empty, move to sentence meaning
        state.value.phase = 'sentence-meaning';
      } else {
        // Pick random vocab from pool using proper random picker
        const poolArray = Array.from(state.value.vocabPool.values());
        const selectedItem = pickRandom(poolArray, 1)[0];

        if (selectedItem) {
          // Generate task for this vocab
          const translations = await translationRepo.getTranslationsByIds(selectedItem.vocab.translations || []);
          const task = await getRandomGeneratedTaskForVocab(selectedItem.vocab, translations, vocabRepo);

          if (!task) {
            // Couldn't generate task, remove from pool and try again
            state.value.vocabPool.delete(selectedItem.vocab.id);
            await generateNextTask();
            return;
          }

          state.value.status = 'task';
          state.value.currentTask = task;
          return;
        }
      }
    }

    // Phase 2: Show sentence meaning task
    if (state.value.phase === 'sentence-meaning' && state.value.currentSentence) {
      const task = generateGuessWhatSentenceMeans(state.value.currentSentence);

      // Reset for next sentence
      state.value.currentSentence = null;
      state.value.vocabPool = new Map();
      state.value.phase = 'vocab-practice';

      state.value.status = 'task';
      state.value.currentTask = task;
      return;
    }

    // Fallback - shouldn't get here
    state.value.status = 'empty';
    state.value.currentTask = null;

  } catch (error) {
    state.value.status = 'error';
    state.value.currentTask = null;
    state.value.error = error instanceof Error ? error.message : 'Failed to generate task';
  }
}

// Update pool after task completion
async function updatePoolAfterTask(vocabId: string): Promise<void> {
  const poolItem = state.value.vocabPool.get(vocabId);
  if (!poolItem) return;

  // Increment times shown
  poolItem.timesShown++;

  // Check if vocab was unseen when we started
  const wasUnseen = poolItem.vocab.progress.level === -1;

  if (wasUnseen) {
    // Unseen vocab: remove only after showing twice
    if (poolItem.timesShown >= 2) {
      state.value.vocabPool.delete(vocabId);
    }
  } else {
    // Due vocab: remove after showing once
    state.value.vocabPool.delete(vocabId);
  }
}

// Handle task completion
async function handleTaskFinished() {
  if (state.value.currentTask) {
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
  state.value.currentSentence = null;
  state.value.vocabPool = new Map();
  state.value.phase = 'vocab-practice';
  lastUsedVocabId.value = null;

  await generateNextTask();
}

// Initialize on mount
onMounted(() => {
  generateNextTask();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Loading State -->
    <div v-if="state.status === 'loading'" class="flex flex-col items-center justify-center h-full">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4">{{ $t('practice.widgets.preparingSentenceSlide') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="state.status === 'error'" class="flex flex-col items-center justify-center h-full gap-4">
      <div class="alert alert-error">
        <span>{{ state.error || 'Failed to load sentence slide' }}</span>
      </div>
      <button @click="retry" class="btn btn-primary">
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="state.status === 'empty'" class="flex flex-col items-center justify-center h-full gap-4">
      <p class="text-lg">No sentence vocabulary available for practice</p>
      <button @click="retry" class="btn btn-primary">
        {{ $t('practice.widgets.checkForMoreSentences') }}
      </button>
    </div>

    <!-- Task State -->
    <TaskRenderer
      v-else-if="state.status === 'task' && state.currentTask"
      :task="state.currentTask"
      :practice-context="{ practiceMode: 'sentence-slide' }"
      @finished="handleTaskFinished"
    />
  </div>
</template>
