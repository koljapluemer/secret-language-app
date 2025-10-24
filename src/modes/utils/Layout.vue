<script setup lang="ts">
import type { Task } from '@/tasks/Task';
import { taskRegistry } from '@/tasks/ui/taskRegistry';
import { inject, onMounted, onUnmounted, ref, provide, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import { useDetailedPracticeTracking } from '@/features/track/useDetailedPracticeTracking';
import type { TaskCorrectness } from '@/entities/practice-tracking/TaskCompletionData';
import { useToast } from '@/shared/toasts';

// Local type definition - no composable dependency
type QueueState =
  | { status: 'initializing' }
  | { status: 'loading', message?: string }
  | { status: 'task', currentTask: Task, nextTask: Task | null }
  | { status: 'empty', message: string }
  | { status: 'error', message: string };

interface Props {
  state: QueueState;
  showLoadingUI: boolean;
  modeId: string;
  retry: () => Promise<void>;
  initialize: () => Promise<void>;
  onTaskFinished: () => Promise<void>;
  loadingFallback?: string;
  emptyTitle?: string;
  errorTitle?: string;
  retryLabel?: string;
  checkAgainLabel?: string;
  fallbackLabel?: string;
}

const props = defineProps<Props>();

const router = useRouter();
const toast = useToast();

// Watch for empty state and redirect
watch(() => props.state, (newState) => {
  if (newState.status === 'empty') {
    toast.warning(newState.message);
    router.push({ name: 'practice-overview' });
  }
}, { immediate: true });

// Inject all repositories
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

const repositories: RepositoriesContextStrict = {
  vocabRepo,
  translationRepo,
  factCardRepo,
  languageRepo,
  resourceRepo,
  goalRepo,
  noteRepo
};

// Provide repositories to child components
provide('repositories', repositories);

// Practice tracking
const tracking = useDetailedPracticeTracking();
const currentTaskId = ref<string | null>(null);

function getTaskComponent(taskType: keyof typeof taskRegistry) {
  const taskInfo = taskRegistry[taskType];
  return taskInfo?.component;
}

async function handleTaskFinished(correctness: TaskCorrectness = 'neutral') {
  if (!props.state || props.state.status !== 'task') return;

  const task = props.state.currentTask;

  // Determine set_Id from vocab origins
  let setId: string | null = null;

  if (task.associatedVocab?.length) {
    try {
      const vocab = await vocabRepo?.getVocabByUID(task.associatedVocab[0]);
      if (vocab?.origins.length && vocab.origins[0] !== 'user-added') {
        setId = vocab.origins[0];
      }
    } catch {
      // Ignore error, setId remains null
    }
  }

  try {
    await tracking.recordTaskCompletion(
      setId,
      task.language,
      props.modeId,
      task.taskType,
      correctness
    );
  } catch (error) {
    const toast = useToast();
    toast.error(`Error recording task completion: ${error}`)
  }

  props.onTaskFinished();
}

// Watch for task changes to start timing
onMounted(() => {
  if (props.state.status === 'task') {
    currentTaskId.value = props.state.currentTask.id;
    tracking.startTaskTiming();
  }
});

onUnmounted(() => {
  // Clean up if component unmounts without completion
});

// Start timing when task changes
function startTimingIfNeeded() {
  if (props.state.status === 'task' && props.state.currentTask.id !== currentTaskId.value) {
    currentTaskId.value = props.state.currentTask.id;
    tracking.startTaskTiming();
  }
}
</script>

<template>
  <div class="section">
    <!-- Loading State -->
    <Transition enter-active-class="transition-opacity duration-[50ms]"
      leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div v-if="state.status === 'initializing' || showLoadingUI" class="flex justify-center items-center min-h-96">
        <div class="text-center">
          <span class="loading loading-spinner loading-lg"></span>
          <p class="mt-4 text-lg">
            {{ state.status === 'loading' && state.message ? state.message : (loadingFallback ||
              $t('practice.widgets.loading')) }}
          </p>
        </div>
      </div>
    </Transition>

    <!-- Error State -->
    <Transition enter-active-class="transition-opacity duration-[50ms]"
      leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div v-if="state.status === 'error'" class="alert alert-error">
        <span>{{ state.message }}</span>
        <button class="btn btn-sm" @click="retry">
          {{ retryLabel || $t('practice.widgets.tryAgain') }}
        </button>
      </div>
    </Transition>

    <!-- Task State -->
    <div v-if="state.status === 'task' && !showLoadingUI" class="h-screen">
      <Transition mode="out-in" enter-active-class="transition-opacity duration-[50ms] ease-out"
        leave-active-class="transition-opacity duration-[50ms] ease-in" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-from-class="opacity-100" leave-to-class="opacity-0"
        @after-enter="startTimingIfNeeded">
        <component :is="getTaskComponent(state.currentTask.taskType)" :key="state.currentTask.id"
          :task="state.currentTask" :repositories="repositories"
          :mode-context="{ setWrongVocabDueAgainImmediately: false }" @finished="handleTaskFinished" />
      </Transition>
    </div>

    <!-- Fallback State -->
    <Transition enter-active-class="transition-opacity duration-[50ms]"
      leave-active-class="transition-opacity duration-[50ms]" enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div v-if="!['initializing', 'loading', 'task', 'empty', 'error'].includes(state.status)"
        class="alert alert-warning">
        <span>{{ $t('practice.widgets.unknownQueueState') }}</span>
        <button class="btn btn-sm" @click="initialize">
          {{ fallbackLabel || $t('practice.widgets.refresh') }}
        </button>
      </div>
    </Transition>
  </div>
</template>
