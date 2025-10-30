<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { Task } from '@/tasks/Task';
import { usePracticeMode } from '@/modes/utils/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { generateIllegalImmersionTask } from './generateIllegalImmersionTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');

if (!vocabRepo || !translationRepo || !factCardRepo || !languageRepo || !resourceRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages } = usePracticeFilters();
const lastUsedContentId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'illegal-immersion',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedContentId.value ? [lastUsedContentId.value] : undefined;

    return await generateIllegalImmersionTask(
      vocabRepo,
      translationRepo,
      factCardRepo,
      resourceRepo,
      languageCodes,
      blockList
    );
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    const factCardId = newCurrentTask.associatedFactCards?.[0];
    const resourceId = newCurrentTask.associatedResources?.[0];
    const contentId = vocabId || factCardId || resourceId;

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
    modeId="illegal-immersion"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
  />
</template>
