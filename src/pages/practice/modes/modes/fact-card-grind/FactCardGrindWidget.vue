<script setup lang="ts">
import { inject, ref } from 'vue';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import { usePracticeFilters } from '@/pages/practice/composables/usePracticeFilters';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { generateFactCard } from './generateFactCardGrindTasks';

// Inject repositories
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!factCardRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages } = usePracticeFilters();
const lastUsedFactCardId = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'fact-card-grind',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedFactCardId.value ? [lastUsedFactCardId.value] : undefined;

    return await generateFactCard(factCardRepo, languageCodes, blockList);
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const factCardId = newCurrentTask.associatedFactCards?.[0];
    if (factCardId) {
      lastUsedFactCardId.value = factCardId;
    }
  },
  messages: {
    loading: 'Preparing next fact card...',
    empty: 'No fact cards are currently available for practice.',
    error: 'Failed to initialize fact card queue. Please try again.'
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="fact-card-grind"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.loadingFactCards')"
  />
</template>
