<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { generateUltraRandomTask } from './generateUltraRandomTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const factCardRepo = inject<FactCardRepoContract>('factCardRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const goalRepo = inject<GoalRepoContract>('goalRepo');
const noteRepo = inject<NoteRepoContract>('noteRepo');

if (!vocabRepo || !translationRepo || !factCardRepo || !languageRepo || !resourceRepo || !goalRepo || !noteRepo) {
  throw new Error('Required repositories not available');
}

const lastUsedTaskType = ref<string | null>(null);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'ultrarandom',
  generateTask: async () => {
    const languages = await languageRepo.getActiveTargetLanguages();
    const languageCodes = languages.map(lang => lang.code);

    if (languageCodes.length === 0) return null;

    return await generateUltraRandomTask(
      vocabRepo,
      translationRepo,
      factCardRepo,
      resourceRepo,
      goalRepo,
      noteRepo,
      languageCodes,
      lastUsedTaskType.value
    );
  },
  onTaskTransition: (newCurrentTask: Task) => {
    lastUsedTaskType.value = newCurrentTask.taskType;
  },
  messages: {
    loading: 'Spinning the wheel of randomness...',
    empty: 'Maximum randomness achieved! No more tasks available at the moment.',
    error: 'Failed to initialize ultra random session. Please try again.'
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="ultrarandom"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.preparingUltraRandom')"
    :emptyTitle="$t('practice.widgets.randomComplete')"
    :checkAgainLabel="$t('practice.widgets.rollAgain')"
    :fallbackLabel="$t('practice.widgets.resetRandom')"
  />
</template>
