<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/modes/composables/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/components/PracticeModeLayout.vue';
import { generateSisyphosTask } from './generateSisyphosTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!vocabRepo || !translationRepo || !factCardRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();
const lastUsedContentId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'sisyphos',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedContentId.value ? [lastUsedContentId.value] : undefined;

    return await generateSisyphosTask(
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
  },
  messages: {
    loading: 'Rolling the boulder...',
    empty: 'The boulder has reached the top! No more reviews available.',
    error: 'Failed to initialize review session. Please try again.'
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="sisyphos"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.preparingEternalReview')"
    :emptyTitle="$t('practice.widgets.boulderAtRest')"
    :checkAgainLabel="$t('practice.widgets.rollAgain')"
    :fallbackLabel="$t('practice.widgets.resetBoulder')"
  />
</template>
