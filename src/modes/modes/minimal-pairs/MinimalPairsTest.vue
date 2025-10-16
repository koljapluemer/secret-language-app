<script setup lang="ts">
import { inject, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { Task } from '@/tasks/Task';
import type { TestResult } from '@/modes/utils/useTestMode';
import { useTestMode } from '@/modes/utils/useTestMode';
import TestLayout from '@/modes/utils/TestLayout.vue';
import { generateMinimalPairsTestTask } from './generateMinimalPairsTestTask';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');

if (!vocabRepo) {
  throw new Error('Required repositories not available');
}

const route = useRoute();
const lastUsedVocabId = ref<string | null>(null);

// Get query params
const setId = computed(() => route.query.set as string);
const testType = computed(() => (route.query.type as 'seen' | 'all') || 'all');

// Test mode configuration
const mode = useTestMode({
  modeId: 'minimal-pairs',
  totalTasks: 20, // 20 tasks per test
  generateTask: async () => {
    if (!setId.value) {
      return null;
    }

    const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

    return await generateMinimalPairsTestTask(
      vocabRepo,
      setId.value,
      testType.value,
      blockList
    );
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    if (vocabId) {
      lastUsedVocabId.value = vocabId;
    }
  },
  messages: {
    loading: 'Loading test...',
    empty: 'No vocab available for this test. Try a different set or test type.',
    error: 'Failed to load Minimal Pairs test. Please try again.'
  }
});

// Handle task completion - extract result from task event
async function handleTaskFinished() {
  if (mode.state.value.status !== 'task') {
    return;
  }

  const currentTask = mode.state.value.currentTask;

  // Create test result
  const result: TestResult = {
    taskId: currentTask.id,
    vocabIds: currentTask.associatedVocab || [],
    correct: true // For now, assume correct. Task components should track this
  };

  await mode.handleTaskFinished(result);
}
</script>

<template>
  <TestLayout
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    :current-task-number="mode.currentTaskNumber.value"
    :total-tasks="mode.totalTasks"
    modeId="minimal-pairs"
    :retry="mode.retry"
    :onTaskFinished="handleTaskFinished"
    :loadingFallback="$t('selfTest.loadingTest')"
  />
</template>
