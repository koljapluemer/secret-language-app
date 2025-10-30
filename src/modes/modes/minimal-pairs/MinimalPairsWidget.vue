<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/tasks/Task';
import { usePracticeMode } from '@/modes/utils/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { generateMinimalPairsTask } from './generateMinimalPairsTasks';

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
  modeId: 'minimal-pairs',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

    return await generateMinimalPairsTask(vocabRepo, languageCodes, blockList, setsToAvoid.value);
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    if (vocabId) {
      lastUsedVocabId.value = vocabId;
    }
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="minimal-pairs"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
  />
</template>
