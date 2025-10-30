<script setup lang="ts">
import { inject } from 'vue';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import { usePracticeMode } from '@/modes/utils/usePracticeMode';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import { generateResourceRotationTask } from './generateResourceRotationTasks';

// Inject repositories
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!resourceRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages } = usePracticeFilters();

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'resource-rotation',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    return await generateResourceRotationTask(resourceRepo, languageCodes);
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
  />
</template>
