<script setup lang="ts">
import { inject } from 'vue';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { getRandomExtractKnowledgeTask } from '@/pages/practice/tasks/task-resource-extract-knowledge/getRandom';

// Inject repositories
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!resourceRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'resource-rotation',
  generateTask: async () => {
    const languages = await languageRepo.getActiveTargetLanguages();
    const languageCodes = languages.map(lang => lang.code);

    if (languageCodes.length === 0) return null;

    return await getRandomExtractKnowledgeTask({
      resourceRepo,
      languageCodes
    });
  },
  messages: {
    loading: 'Finding resources to extract knowledge from...',
    empty: 'No resources are available for knowledge extraction. Add some resources to get started!',
    error: 'Failed to initialize resource rotation. Please try again.'
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="resource-rotation"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.preparingResourceRotation')"
    :emptyTitle="$t('practice.widgets.resourceRotationIcon')"
  />
</template>
