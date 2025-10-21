<template>
  <div class="flex flex-col h-full">
    <Instruction :language-data="languageData" :prompt="props.task.prompt" />

    <section class="flex-1 overflow-auto">
      <div class="container mx-auto p-4">
        <component
          :is="getTaskComponent(props.task.taskType)"
          :task="props.task"
          :repositories="repositories"
          :mode-context="props.modeContext"
          @finished="handleTaskFinished"
        />
      </div>
    </section>

    <ActionBar
      :controls="actionControls"
      @action="handleActionEvent"
    />
  </div>
</template>

<script setup lang="ts">
import { taskRegistry } from './taskRegistry';
import type { Task } from '@/tasks/Task';
import { inject, onMounted, onUnmounted, ref, provide } from 'vue';
import type { ActionControl } from './ActionControl';
import type { LanguageData } from '@/entities/languages/LanguageData';
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
import Instruction from './Instruction.vue';
import ActionBar from './ActionBar.vue';

interface PracticeContext {
  practiceMode: string;
  setId?: string | null;
  [key: string]: unknown;
}

interface Props {
  task: Task;
  practiceContext: PracticeContext;
  modeContext?: {
    setWrongVocabDueAgainImmediately?: boolean;
  };
}

const props = defineProps<Props>();
const languageData = ref<LanguageData | null>(null);
const actionControls = ref<ActionControl[]>([]);

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

// Practice tracking
const tracking = useDetailedPracticeTracking();

onMounted(async () => {
  const lang = await languageRepo.getByCode(props.task.language);
  if (lang) languageData.value = lang;

  // Start timing this task
  tracking.startTaskTiming();
});

onUnmounted(() => {
  // Clean up if component unmounts without completion
});

const emit = defineEmits<{
  finished: [correctness?: TaskCorrectness];
}>();

// Provide action handler registration for task components
const actionHandlers = ref<Map<string, (data?: string) => void>>(new Map());

provide('registerActionHandler', (controlId: string, handler: (data?: string) => void) => {
  actionHandlers.value.set(controlId, handler);
});

provide('registerActionControls', (controls: ActionControl[]) => {
  actionControls.value = controls;
});

function getTaskComponent(taskType: keyof typeof taskRegistry) {
  const taskInfo = taskRegistry[taskType];
  return taskInfo?.component;
}

function handleActionEvent(controlId: string, data?: string) {
  const handler = actionHandlers.value.get(controlId);
  if (handler) {
    handler(data);
  }
}

async function handleTaskFinished(correctness: TaskCorrectness = 'neutral') {
  // Determine set_Id from task context or vocab origins
  let setId: string | null = props.practiceContext.setId || null;

  if (!setId && props.task.associatedVocab?.length) {
    try {
      const vocab = await vocabRepo?.getVocabByUID(props.task.associatedVocab[0]);
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
      props.task.language,
      props.practiceContext.practiceMode,
      props.task.taskType,
      correctness
    );

  } catch (error) {
    const toast = useToast();
    toast.error(`Error recording task completion: ${error}`)
  }

  emit('finished', correctness);
}
</script>