<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/tasks/Task';
import { usePracticeMode } from '@/modes/utils/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { generateCramTask } from './generateCramTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!vocabRepo || !translationRepo || !factCardRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid, loadOptions } = usePracticeFilters();
const lastUsedContentId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'cram',
  generateTask: async () => {
    // Ensure filters are loaded before proceeding
    await loadOptions();

    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedContentId.value ? [lastUsedContentId.value] : undefined;

    return await generateCramTask(
      vocabRepo,
      translationRepo,
      factCardRepo,
      languageCodes,
      blockList,
      setsToAvoid.value
    );
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    const factCardId = newCurrentTask.associatedFactCards?.[0];
    const contentId = vocabId || factCardId;

    if (contentId) {
      lastUsedContentId.value = contentId;
    }
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="cram"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
  />
</template>
