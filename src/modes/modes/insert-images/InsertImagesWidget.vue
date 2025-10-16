<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/modes/utils/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/Layout.vue';
import { generateInsertImagesTask } from './generateInsertImagesTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!vocabRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();
const lastUsedVocabId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'insert-images',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

    return await generateInsertImagesTask(vocabRepo, languageCodes, blockList, setsToAvoid.value);
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    if (vocabId) {
      lastUsedVocabId.value = vocabId;
    }
  },
  messages: {
    loading: 'Finding vocabulary that needs images...',
    empty: 'No vocabulary needs images right now. Check back later!',
    error: 'Failed to initialize image insertion session. Please try again.'
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="insert-images"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.preparingImageInsertion')"
  />
</template>
