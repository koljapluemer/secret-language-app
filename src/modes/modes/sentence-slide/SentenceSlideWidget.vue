<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/modes/composables/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/components/PracticeModeLayout.vue';
import { generateSentenceSlideTask, removeVocabIfNotDue } from './generateSentenceSlideTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!vocabRepo || !translationRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();
const lastUsedContentId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'sentence-slide',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedContentId.value ? [lastUsedContentId.value] : undefined;

    return await generateSentenceSlideTask(
      vocabRepo,
      translationRepo,
      languageCodes,
      blockList,
      setsToAvoid.value
    );
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    if (vocabId) {
      lastUsedContentId.value = vocabId;
    }
  },
  messages: {
    loading: 'Sliding to next sentence...',
    empty: 'No sentence vocabulary is currently available for practice.',
    error: 'Failed to initialize sentence slide session. Please try again.'
  }
});

// Custom task finished handler that removes vocab if not due
async function handleTaskFinished() {
  if (mode.state.value.status === 'task') {
    const currentTask = mode.state.value.currentTask;
    const vocabId = currentTask.associatedVocab?.[0];

    if (vocabId && vocabRepo) {
      await removeVocabIfNotDue(vocabId, vocabRepo);
    }
  }

  await mode.handleTaskFinished();
}
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="sentence-slide"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="handleTaskFinished"
    :loadingFallback="$t('practice.widgets.preparingSentenceSlide')"
    :checkAgainLabel="$t('practice.widgets.checkForMoreSentences')"
    :fallbackLabel="$t('practice.widgets.resetSlide')"
  />
</template>
