<script setup lang="ts">
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { Task } from '@/tasks/Task';
import { usePracticeMode } from '@/modes/utils/usePracticeMode';
import PracticeModeLayout from '@/modes/utils/Layout.vue';
import GoalInputForm from '@/features/goal-driven-learning/GoalInputForm.vue';
import { generateGoalDrivenTasks } from '@/features/goal-driven-learning/generateGoalDrivenTasks';
import { openAIService } from '@/features/goal-driven-learning/OpenAIService';
import { useToast } from '@/shared/toasts';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const goalRepo = inject<GoalRepoContract>('goalRepo');

if (!vocabRepo || !translationRepo || !goalRepo) {
  throw new Error('Required repositories not available');
}

const router = useRouter();
const toast = useToast();

// Phase management
type Phase = 'input' | 'generating' | 'practicing';
const currentPhase = ref<Phase>('input');

// Generated tasks queue
const generatedTasks = ref<Task[]>([]);
let taskIndex = 0;

// Generating state
const isGenerating = ref(false);
const generationError = ref<string | null>(null);
const generatedGoalId = ref<string | null>(null);

// Check for API key on mount
const hasApiKey = ref(false);
hasApiKey.value = openAIService.hasApiKey();

if (!hasApiKey.value) {
  toast.error('OpenAI API key not found. Please set it in Settings first.');
}

// Handle form submission
async function handleGoalSubmit(payload: { goalText: string; languageCode: string }) {
  if (!openAIService.hasApiKey()) {
    toast.error('Please set your OpenAI API key in Settings');
    router.push('/settings');
    return;
  }

  isGenerating.value = true;
  generationError.value = null;
  currentPhase.value = 'generating';

  try {
    const result = await generateGoalDrivenTasks(
      payload.goalText,
      payload.languageCode,
      {
        vocabRepo: vocabRepo!,
        translationRepo: translationRepo!,
        goalRepo: goalRepo!
      }
    );

    generatedTasks.value = result.tasks;
    generatedGoalId.value = result.goalId;
    taskIndex = 0;

    toast.success(`Generated ${result.tasks.length} exercises!`);

    // Transition to practicing phase
    currentPhase.value = 'practicing';

    // Initialize the practice mode
    await mode.initialize();
  } catch (error) {
    generationError.value = String(error);
    toast.error(`Failed to generate tasks: ${String(error)}`);
    currentPhase.value = 'input'; // Go back to input
  } finally {
    isGenerating.value = false;
  }
}

// Practice mode configuration (only used during practicing phase)
const mode = usePracticeMode({
  modeId: 'goal-driven-learning',
  generateTask: async () => {
    if (currentPhase.value !== 'practicing') return null;

    if (taskIndex < generatedTasks.value.length) {
      const task = generatedTasks.value[taskIndex];
      taskIndex++;
      return task;
    }

    // All tasks completed - redirect to practice home
    toast.success('Congratulations! You completed all exercises for this goal.');
    router.push('/practice');
    return null;
  },
  onTaskTransition: () => {
    // No special handling needed
  }
});

function goToSettings() {
  router.push('/settings');
}
</script>

<template>
  <div class="h-full w-full">
    <!-- Input Phase -->
    <div v-if="currentPhase === 'input'" class="p-6">
      <div v-if="!hasApiKey" class="alert alert-warning mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <div class="font-bold">API Key Required</div>
          <div>You need to set your OpenAI API key in Settings to use this feature.</div>
        </div>
        <button @click="goToSettings" class="btn btn-sm btn-outline">
          Go to Settings
        </button>
      </div>

      <GoalInputForm
        v-else
        @submit="handleGoalSubmit"
      />
    </div>

    <!-- Generating Phase -->
    <div v-else-if="currentPhase === 'generating'" class="flex flex-col items-center justify-center h-full space-y-6 p-6">
      <div class="text-center space-y-4">
        <div class="loading loading-spinner loading-lg"></div>
        <h2 class="text-2xl font-bold">Designing Your Learning Path</h2>
        <p class="text-light max-w-md">
          AI is analyzing your goal, identifying core vocabulary, and creating personalized exercises...
        </p>
      </div>

      <div class="space-y-2 text-sm text-light">
        <p>✓ Analyzing learning goal</p>
        <p>✓ Identifying core sentences</p>
        <p>✓ Extracting building blocks</p>
        <p>✓ Creating vocabulary entries</p>
        <p>✓ Designing practice tasks</p>
      </div>

      <div v-if="generationError" class="alert alert-error max-w-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ generationError }}</span>
      </div>
    </div>

    <!-- Practicing Phase -->
    <div v-else-if="currentPhase === 'practicing'" class="h-full w-full">
      <PracticeModeLayout
        :state="mode.state.value"
        :showLoadingUI="mode.showLoadingUI.value"
        modeId="goal-driven-learning"
        :retry="mode.retry"
        :initialize="mode.initialize"
        :onTaskFinished="mode.handleTaskFinished"
      />
    </div>
  </div>
</template>
