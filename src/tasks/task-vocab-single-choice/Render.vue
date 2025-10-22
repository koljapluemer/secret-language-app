<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import { shuffleArray } from '@/shared/utils/arrayUtils';
import { Rating } from 'ts-fsrs';
import Instruction from '@/tasks/ui/Instruction.vue';
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
const answerOptions = ref<AnswerOption[]>([]);
const vocab = ref<VocabData | null>(null);
const translations = ref<TranslationData[]>([]);
const loading = ref(true);

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
}

async function selectOption(index: number) {
  if (isAnswered.value) return;

  selectedIndex.value = index;
  const isCorrect = answerOptions.value[index].isCorrect;

  if (isCorrect) {
    isAnswered.value = true;
    await handleCompletion();
  } else {
    // Wrong answer: mark first attempt as wrong, disable button
    firstAttemptWrong.value = true;
  }
}

function getButtonClass(index: number): string {
  const isCorrect = answerOptions.value[index].isCorrect;
  const isSelected = index === selectedIndex.value;

  if (isCorrect && isSelected) {
    return 'btn-success';
  }

  if (!isCorrect && isSelected) {
    return 'btn-error';
  }

  if (isAnswered.value && isCorrect) {
    return 'btn-success';
  }

  if (isAnswered.value && !isCorrect) {
    return 'btn-outline opacity-50';
  }

  return 'btn-outline';
}

function isButtonDisabled(index: number): boolean {
  const isCorrect = answerOptions.value[index].isCorrect;
  const isSelected = index === selectedIndex.value;

  if (isAnswered.value) return true;
  if (!isCorrect && isSelected) return true;

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
        <div v-else-if="vocab && answerOptions.length > 0" class="text-center">
          <!-- Show vocab or translation (question) - use VocabRenderer -->
          <div class="mb-8">
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

          <!-- Answer Options - only show when not answered -->
          <div v-if="!isAnswered" class="flex flex-col md:flex-row gap-2 mb-6">
            <button v-for="(option, index) in answerOptions" :key="index" :class="getButtonClass(index)"
              :disabled="isButtonDisabled(index)" @click="selectOption(index)" class="btn btn-lg flex-1">
              {{ option.content }}
            </button>
          </div>

          <!-- Show full vocab with answer when completed -->
          <div v-if="isAnswered">
            <VocabRenderer :vocab="vocab" :repos="repositories" />
          </div>
        </div>

        <!-- Error State -->
        <div v-else>
          <span>{{ $t('practice.tasks.failedToLoad') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>