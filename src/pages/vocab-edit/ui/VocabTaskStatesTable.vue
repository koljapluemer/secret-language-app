<template>
  <div class="card shadow">
    <div class="card-body">
      <h2>Available Tasks</h2>

      <div v-if="loading" class="flex justify-center p-4">
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <div v-else-if="taskStates.length === 0" class="text-base-content/60 p-4">
        No tasks available for this vocab item.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>Task</th>
              <th>State</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="taskState in taskStates" :key="taskState.name">
              <td>{{ taskState.displayName }}</td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'badge-success': taskState.state === 'active',
                    'badge-ghost': taskState.state === 'inactive',
                    'badge-warning': taskState.state === 'disabled',
                    'badge-error': taskState.state === 'impossible'
                  }"
                >
                  {{ taskState.state }}
                </span>
              </td>
              <td class="text-sm text-base-content/60">{{ taskState.reason || '-' }}</td>
              <td>
                <button
                  v-if="taskState.state !== 'impossible'"
                  class="btn btn-sm btn-ghost btn-square"
                  @click="previewTask(taskState.name)"
                  title="Preview task"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Task Preview Modal -->
    <dialog ref="taskPreviewModal" class="modal">
      <div class="modal-box max-w-4xl w-full h-[90vh] p-0">
        <form method="dialog">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10">✕</button>
        </form>

        <div v-if="previewingTask" class="h-full">
          <component
            :is="getTaskComponent(previewingTask.taskType)"
            :task="previewingTask"
            :repositories="repositories"
            :mode-context="{ setWrongVocabDueAgainImmediately: false }"
            @finished="closePreview"
          />
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { Task } from '@/tasks/Task';
import type { TaskState } from '@/tasks/utils/TaskState';

// Import all task state checkers
import { getAddTranslationTaskState } from '@/tasks/task-vocab-add-translation/taskStateForVocab';
import { getVocabTryToRememberTaskState } from '@/tasks/task-vocab-try-to-remember/taskStateForVocab';
import { getGuessWhatSentenceMeansTaskState } from '@/tasks/task-guess-what-sentence-means/taskStateForVocab';
import { getVocabRevealTargetToNativeTaskState, getVocabRevealNativeToTargetTaskState } from '@/tasks/task-vocab-reveal/taskStateForVocab';
import {
  getVocabChoiceFromTwoTargetToNativeTaskState,
  getVocabChoiceFromTwoNativeToTargetTaskState,
  getVocabChoiceFromFourTargetToNativeTaskState,
  getVocabChoiceFromFourNativeToTargetTaskState
} from '@/tasks/task-vocab-single-choice/taskStateForVocab';
import { getClozeChoiceFromTwoTaskState, getClozeChoiceFromFourTaskState } from '@/tasks/task-cloze-choice/taskStateForVocab';
import { getClozeRevealTaskState } from '@/tasks/task-cloze-reveal/taskStateForVocab';
import { getFormSentenceTaskState } from '@/tasks/task-vocab-form-sentence/taskStateForVocab';
import { getVocabChooseImageBySoundTaskState } from '@/tasks/task-vocab-choose-image-by-sound/taskStateForVocab';
import { getVocabChooseFromSoundTaskState } from '@/tasks/task-vocab-choose-from-sound/taskStateForVocab';

// Import task generators
import { generateAddTranslation } from '@/tasks/task-vocab-add-translation/generate';
import { generateVocabTryToRemember } from '@/tasks/task-vocab-try-to-remember/generate';
import { generateGuessWhatSentenceMeans } from '@/tasks/task-guess-what-sentence-means/generate';
import { generateVocabRevealTargetToNative, generateVocabRevealNativeToTarget } from '@/tasks/task-vocab-reveal/generate';
import {
  generateVocabChoiceFromTwoTargetToNative,
  generateVocabChoiceFromTwoNativeToTarget,
  generateVocabChoiceFromFourTargetToNative,
  generateVocabChoiceFromFourNativeToTarget
} from '@/tasks/task-vocab-single-choice/generate';
import { generateClozeChoiceFromTwo, generateClozeChoiceFromFour } from '@/tasks/task-cloze-choice/generate';
import { generateClozeReveal } from '@/tasks/task-cloze-reveal/generate';
import { generateFormSentenceTaskFromSingleVocab } from '@/tasks/task-vocab-form-sentence/generate';
import { generateVocabChooseImageBySound } from '@/tasks/task-vocab-choose-image-by-sound/generate';
import { generateVocabChooseFromSound } from '@/tasks/task-vocab-choose-from-sound/generate';

import { taskRegistry } from '@/tasks/ui/taskRegistry';
import { inject, provide } from 'vue';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import { useToast } from '@/shared/toasts';

interface Props {
  vocab: VocabData;
  translations: TranslationData[];
}

interface TaskStateInfo {
  name: string;
  displayName: string;
  state: TaskState;
  reason?: string;
  generator?: () => Task | Promise<Task>;
}

const props = defineProps<Props>();
const toast = useToast();
const loading = ref(false);
const taskPreviewModal = ref<HTMLDialogElement | null>(null);
const previewingTask = ref<Task | null>(null);

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

// Provide repositories to task components in the modal
provide('repositories', repositories);

function getTaskComponent(taskType: keyof typeof taskRegistry) {
  const taskInfo = taskRegistry[taskType];
  return taskInfo?.component;
}

const taskStates = computed<TaskStateInfo[]>(() => {
  const states: TaskStateInfo[] = [];

  // Add translation task
  const addTranslationState = getAddTranslationTaskState(props.vocab, props.translations);
  states.push({
    name: 'add-translation',
    displayName: 'Add Translation',
    state: addTranslationState.state,
    reason: addTranslationState.reason,
    generator: addTranslationState.state !== 'impossible' ? () => generateAddTranslation(props.vocab) : undefined
  });

  // Try to remember task
  const tryToRememberState = getVocabTryToRememberTaskState(props.vocab, props.translations);
  states.push({
    name: 'vocab-try-to-remember',
    displayName: 'Try to Remember',
    state: tryToRememberState.state,
    reason: tryToRememberState.reason,
    generator: tryToRememberState.state !== 'impossible' ? () => generateVocabTryToRemember(props.vocab) : undefined
  });

  // Guess sentence meaning task
  const guessSentenceState = getGuessWhatSentenceMeansTaskState(props.vocab, props.translations);
  states.push({
    name: 'guess-sentence-meaning',
    displayName: 'Guess Sentence Meaning',
    state: guessSentenceState.state,
    reason: guessSentenceState.reason,
    generator: guessSentenceState.state !== 'impossible' ? () => generateGuessWhatSentenceMeans(props.vocab) : undefined
  });

  // Choice tasks
  const choice2TNState = getVocabChoiceFromTwoTargetToNativeTaskState(props.vocab, props.translations);
  states.push({
    name: 'choice-2-target-to-native',
    displayName: 'Choice (2) Target→Native',
    state: choice2TNState.state,
    reason: choice2TNState.reason,
    generator: choice2TNState.state !== 'impossible' ? () => generateVocabChoiceFromTwoTargetToNative(props.vocab) : undefined
  });

  const choice4TNState = getVocabChoiceFromFourTargetToNativeTaskState(props.vocab, props.translations);
  states.push({
    name: 'choice-4-target-to-native',
    displayName: 'Choice (4) Target→Native',
    state: choice4TNState.state,
    reason: choice4TNState.reason,
    generator: choice4TNState.state !== 'impossible' ? () => generateVocabChoiceFromFourTargetToNative(props.vocab) : undefined
  });

  const choice2NTState = getVocabChoiceFromTwoNativeToTargetTaskState(props.vocab, props.translations);
  states.push({
    name: 'choice-2-native-to-target',
    displayName: 'Choice (2) Native→Target',
    state: choice2NTState.state,
    reason: choice2NTState.reason,
    generator: choice2NTState.state !== 'impossible' ? () => generateVocabChoiceFromTwoNativeToTarget(props.vocab) : undefined
  });

  const choice4NTState = getVocabChoiceFromFourNativeToTargetTaskState(props.vocab, props.translations);
  states.push({
    name: 'choice-4-native-to-target',
    displayName: 'Choice (4) Native→Target',
    state: choice4NTState.state,
    reason: choice4NTState.reason,
    generator: choice4NTState.state !== 'impossible' ? () => generateVocabChoiceFromFourNativeToTarget(props.vocab) : undefined
  });

  // Reveal tasks
  const revealTNState = getVocabRevealTargetToNativeTaskState(props.vocab, props.translations);
  states.push({
    name: 'reveal-target-to-native',
    displayName: 'Reveal Target→Native',
    state: revealTNState.state,
    reason: revealTNState.reason,
    generator: revealTNState.state !== 'impossible' ? () => generateVocabRevealTargetToNative(props.vocab) : undefined
  });

  const revealNTState = getVocabRevealNativeToTargetTaskState(props.vocab, props.translations);
  states.push({
    name: 'reveal-native-to-target',
    displayName: 'Reveal Native→Target',
    state: revealNTState.state,
    reason: revealNTState.reason,
    generator: revealNTState.state !== 'impossible' ? () => generateVocabRevealNativeToTarget(props.vocab) : undefined
  });

  // Cloze tasks
  const cloze2State = getClozeChoiceFromTwoTaskState(props.vocab, props.translations);
  states.push({
    name: 'cloze-choice-2',
    displayName: 'Cloze Choice (2)',
    state: cloze2State.state,
    reason: cloze2State.reason,
    generator: cloze2State.state !== 'impossible' ? () => generateClozeChoiceFromTwo(props.vocab) : undefined
  });

  const cloze4State = getClozeChoiceFromFourTaskState(props.vocab, props.translations);
  states.push({
    name: 'cloze-choice-4',
    displayName: 'Cloze Choice (4)',
    state: cloze4State.state,
    reason: cloze4State.reason,
    generator: cloze4State.state !== 'impossible' ? () => generateClozeChoiceFromFour(props.vocab) : undefined
  });

  const clozeRevealState = getClozeRevealTaskState(props.vocab, props.translations);
  states.push({
    name: 'cloze-reveal',
    displayName: 'Cloze Reveal',
    state: clozeRevealState.state,
    reason: clozeRevealState.reason,
    generator: clozeRevealState.state !== 'impossible' ? () => generateClozeReveal(props.vocab) : undefined
  });

  // Form sentence task
  const formSentenceState = getFormSentenceTaskState(props.vocab);
  states.push({
    name: 'form-sentence',
    displayName: 'Form Sentence',
    state: formSentenceState.state,
    reason: formSentenceState.reason,
    generator: formSentenceState.state !== 'impossible' ? () => generateFormSentenceTaskFromSingleVocab(props.vocab) : undefined
  });

  // Sound-based tasks
  const chooseImageBySoundState = getVocabChooseImageBySoundTaskState(props.vocab);
  states.push({
    name: 'choose-image-by-sound',
    displayName: 'Choose Image by Sound',
    state: chooseImageBySoundState.state,
    reason: chooseImageBySoundState.reason,
    generator: chooseImageBySoundState.state !== 'impossible' ? () => generateVocabChooseImageBySound(props.vocab) : undefined
  });

  const chooseFromSoundState = getVocabChooseFromSoundTaskState(props.vocab);
  states.push({
    name: 'choose-from-sound',
    displayName: 'Choose from Sound (Minimal Pairs)',
    state: chooseFromSoundState.state,
    reason: chooseFromSoundState.reason,
    generator: chooseFromSoundState.state !== 'impossible' ? () => generateVocabChooseFromSound(props.vocab) : undefined
  });

  return states;
});

async function previewTask(taskName: string) {
  const taskStateInfo = taskStates.value.find(t => t.name === taskName);
  if (!taskStateInfo?.generator) return;

  loading.value = true;
  try {
    const task = await taskStateInfo.generator();
    previewingTask.value = task;
    taskPreviewModal.value?.showModal();
  } catch (error) {
    toast.error(`Failed to generate task preview: ${String(error)}`);
  } finally {
    loading.value = false;
  }
}

function closePreview() {
  taskPreviewModal.value?.close();
  previewingTask.value = null;
}
</script>
