<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import { shuffleArray } from '@/shared/utils/arrayUtils';
import { Rating } from 'ts-fsrs';
import Instruction from '@/tasks/ui/Instruction.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import { useToast } from '@/shared/toasts';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';

interface AnswerOption {
  content: string;
  isCorrect: boolean;
}


interface Props {
  task: Task;
  repositories: RepositoriesContextStrict;
  modeContext?: {
    setWrongVocabDueAgainImmediately?: boolean;
  };
}

const emit = defineEmits<{
  finished: [correctness?: 'correct' | 'incorrect' | 'neutral'];
}>();

const toast = useToast();

const props = defineProps<Props>();

const vocabRepo = props.repositories.vocabRepo;
const translationRepo = props.repositories.translationRepo;

// Exercise state
const selectedIndex = ref<number | null>(null);
const isAnswered = ref(false);
const firstAttemptWrong = ref(false);
const wrongIndices = ref<Set<number>>(new Set());
const answerOptions = ref<AnswerOption[]>([]);
const vocab = ref<VocabData | null>(null);
const translations = ref<TranslationData[]>([]);
const loading = ref(true);
const actionControls = ref<ActionControl[]>([]);

// Get the vocab ID from associated vocab
const vocabId = computed(() => {
  return props.task.associatedVocab?.[0];
});

// Extract task type info from task type
const isReverse = computed(() => {
  return (props.task.taskType as string).includes('native-to-target');
});

const optionCount = computed(() => {
  return (props.task.taskType as string).includes('four') ? 4 : 2;
});


async function loadVocabData() {
  if (!vocabId.value) {
    loading.value = false;
    return;
  }

  try {
    const vocabData = await vocabRepo.getVocabByUID(vocabId.value);
    if (!vocabData) {
      loading.value = false;
      return;
    }

    vocab.value = vocabData;
    translations.value = await translationRepo.getTranslationsByIds(vocabData.translations);

    await generateOptions();
  } catch {
    toast.error('Failed to load vocabulary data');
  } finally {
    loading.value = false;
  }
}

async function generateOptions() {
  if (!vocab.value || translations.value.length === 0) return;

  const options: AnswerOption[] = [];

  if (isReverse.value) {
    // Translation-to-vocab: correct answer is vocab content
    const correctAnswer = vocab.value.content || '';
    options.push({ content: correctAnswer, isCorrect: true });

    // Generate wrong vocab options
    const wrongCount = optionCount.value - 1;
    const wrongAnswers = await vocabRepo.generateWrongVocabs(
      vocab.value.language,
      correctAnswer,
      wrongCount
    );

    wrongAnswers.forEach(wrong => {
      options.push({ content: wrong, isCorrect: false });
    });

  } else {
    // Vocab-to-translation: correct answer is random translation
    const correctAnswer = translations.value[Math.floor(Math.random() * translations.value.length)].content;
    options.push({ content: correctAnswer, isCorrect: true });

    // Generate wrong translation options
    const wrongCount = optionCount.value - 1;
    const wrongAnswers = await translationRepo.generateWrongTranslations(
      correctAnswer,
      wrongCount
    );

    wrongAnswers.forEach(wrong => {
      options.push({ content: wrong, isCorrect: false });
    });
  }

  answerOptions.value = shuffleArray(options);
  updateActionControls();
}

function updateActionControls() {
  actionControls.value = answerOptions.value.map((option, index) => ({
    type: 'button',
    id: `option-${index}`,
    label: option.content,
    position: 'central',
    disabled: isButtonDisabled(index),
    destructive: wrongIndices.value.has(index),
  }));
}

async function selectOption(index: number) {
  if (isAnswered.value) return;
  if (isButtonDisabled(index)) return;

  selectedIndex.value = index;
  const isCorrect = answerOptions.value[index].isCorrect;

  if (isCorrect) {
    isAnswered.value = true;
    updateActionControls();
    await handleCompletion();
  } else {
    // Wrong answer: mark as wrong and disable this specific button
    if (!firstAttemptWrong.value) {
      firstAttemptWrong.value = true;
    }
    wrongIndices.value.add(index);
    updateActionControls();
  }
}

function handleAction(controlId: string) {
  if (controlId.startsWith('option-')) {
    const index = parseInt(controlId.split('-')[1]);
    selectOption(index);
  } else if (controlId === 'skip') {
    emit('finished', 'neutral');
  } else if (controlId === 'jump-to') {
    if (vocab.value) {
      window.location.href = `#/vocab/${vocab.value.id}`;
    }
  }
}

function isButtonDisabled(index: number): boolean {
  // Disable all buttons once answered
  if (isAnswered.value) return true;

  // Disable wrong answers that have been clicked
  if (wrongIndices.value.has(index)) return true;

  return false;
}

const handleCompletion = async () => {
  if (!vocab.value) return;

  try {
    const rating = firstAttemptWrong.value ? Rating.Again : Rating.Good;
    const immediateDue = props.modeContext?.setWrongVocabDueAgainImmediately || false;
    await vocabRepo.scoreVocab(vocab.value.id, rating, immediateDue);
    await vocabRepo.updateLastReview(vocab.value.id);

    const correctness = firstAttemptWrong.value ? 'incorrect' : 'correct';
    setTimeout(() => emit('finished', correctness), 750);
  } catch {
    toast.error('Failed to save vocabulary progress');
    emit('finished', 'neutral');
  }
};

onMounted(loadVocabData);
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <!-- Loading State -->
        <div v-if="loading">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Exercise Content -->
        <div v-else-if="vocab && answerOptions.length > 0">
          <!-- Show vocab or translation (question) - use VocabRenderer -->
          <div class="mb-8 text-center" v-if="!isAnswered">
            <VocabRenderer
              v-if="isReverse"
              :vocab="vocab"
              :repos="repositories"
              hide-content
              only-show-single-random-translation
            />
            <VocabRenderer
              v-else
              :vocab="vocab"
              :repos="repositories"
              hide-translations
            />
          </div>

          <!-- Show full vocab with answer when completed -->
          <div v-else class="text-center">
            <VocabRenderer :vocab="vocab" :repos="repositories" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="text-center">
          <span>{{ $t('practice.tasks.failedToLoad') }}</span>
        </div>
      </div>
    </div>

    <!-- ActionBar always at bottom -->
    <ActionBar :controls="actionControls" @action="handleAction" hide-disable-button />
  </div>
</template>