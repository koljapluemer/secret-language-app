<script setup lang="ts">
import { inject, ref } from 'vue';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import { usePracticeFilters } from '@/pages/practice/composables/usePracticeFilters';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { generateGoalTask } from './generateGoalGetterTasks';

// Inject repositories
const goalRepo = inject<GoalRepoContract>('goalRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!goalRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const { selectedLanguages } = usePracticeFilters();
const lastTaskType = ref<string | undefined>(undefined);

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'goal-getter',
  generateTask: async () => {
    const languageCodes = selectedLanguages.value;

    if (languageCodes.length === 0) return null;

    return await generateGoalTask(goalRepo, languageCodes, lastTaskType.value);
  },
  onTaskTransition: (newCurrentTask: Task) => {
    lastTaskType.value = newCurrentTask.taskType;
  },
  messages: {
    loading: 'Preparing next goal task...',
    empty: 'No goal tasks are currently available for practice.',
    error: 'Failed to initialize goal task queue. Please try again.'
  }
});
</script>

<template>
  <PracticeModeLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="goal-getter"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.loadingGoalTasks')"
  />
</template>
