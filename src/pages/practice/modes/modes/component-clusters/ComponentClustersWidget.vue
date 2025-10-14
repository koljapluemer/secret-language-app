<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import { usePracticeFilters } from '@/pages/practice/composables/usePracticeFilters';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { generateComponentClustersTask, removeVocabIfNotDue } from './generateComponentClustersTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!vocabRepo || !translationRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages, setsToAvoid } = usePracticeFilters();
const lastUsedVocabId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'component-clusters',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

    return await generateComponentClustersTask(
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
      lastUsedVocabId.value = vocabId;
    }
  },
  messages: {
    loading: 'Finding component clusters...',
    empty: 'No component vocab (contained in multiple other vocab) is available for practice.',
    error: 'Failed to initialize Component Clusters mode. Please try again.'
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
    modeId="component-clusters"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="handleTaskFinished"
    loadingFallback="Loading Component Clusters..."
  />
</template>
