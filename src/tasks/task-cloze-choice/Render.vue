<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import { shuffleArray } from '@/shared/utils/arrayUtils';
import { Rating } from 'ts-fsrs';
import { generateClozeFromText, isRTLText, type ClozeData } from '@/tasks/utils/clozeUtils';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useToast } from '@/shared/toasts';

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

const selectedIndex = ref<number | null>(null);
const isAnswered = ref(false);
const firstAttemptWrong = ref(false);
const answerOptions = ref<AnswerOption[]>([]);
const vocab = ref<VocabData | null>(null);
const translations = ref<TranslationData[]>([]);
const loading = ref(true);
const clozeData = ref<ClozeData | null>(null);

const vocabId = computed(() => {
  return props.task.associatedVocab?.[0];
});


const isReverse = computed(() => {
  // Sentence/phrase cloze only goes content→translation
  if (vocab.value?.consideredSentence === true || vocab.value?.consideredWord !== false) {
    return false;
  }
  // Vocab-based cloze can go both ways
  return props.task.taskType.includes('native-to-target');
});

const optionCount = computed(() => {
  return props.task.taskType.includes('four') ? 4 : 2;
});

const isRTL = computed(() => {
  if (!vocab.value?.content) return false;
  return isRTLText(vocab.value.content);
});

const secondaryContent = computed(() => {
  if (!vocab.value || translations.value.length === 0) return '';

  if (isReverse.value) {
    // Show vocab content as secondary when translation is primary (cloze)
    return vocab.value.content || '';
  } else {
    // Show translation as secondary when vocab is primary (cloze)
    const randomTranslation = translations.value[Math.floor(Math.random() * translations.value.length)];
    return randomTranslation?.content || '';
  }
});

// ActionBar controls
const actionBarControls = computed<ActionControl[]>(() => {
  const controls: ActionControl[] = [];

  if (!isAnswered.value) {
    // Show choice buttons as central elements (large buttons)
    answerOptions.value.forEach((option, index) => {
      const isSelected = index === selectedIndex.value;
      const isCorrect = option.isCorrect;

      controls.push({
        type: 'button',
        id: `option-${index}`,
        label: option.content,
        position: 'central',
        disabled: !isCorrect && isSelected,
        destructive: !isCorrect && isSelected
      });
    });
  }

  return controls;
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

    await generateClozeOptions();
  } catch {
    toast.error('Failed to load vocabulary data');
  } finally {
    loading.value = false;
  }
}


async function generateClozeOptions() {
  if (!vocab.value || translations.value.length === 0) return;

  const sourceText = isReverse.value 
    ? translations.value[Math.floor(Math.random() * translations.value.length)].content
    : vocab.value.content || '';
  
  clozeData.value = generateClozeFromText(sourceText, vocab.value.progress.level);
  const correctAnswer = clozeData.value.hiddenWord;
  
  const options: AnswerOption[] = [];
  options.push({ content: correctAnswer, isCorrect: true });
  
  const wrongCount = optionCount.value - 1;
  const wrongAnswers = isReverse.value
    ? await translationRepo.generateWrongTranslations(correctAnswer, wrongCount)
    : await vocabRepo.generateWrongVocabs(vocab.value.language, correctAnswer, wrongCount);

  wrongAnswers.forEach(wrong => {
    options.push({ content: wrong, isCorrect: false });
  });

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
    firstAttemptWrong.value = true;
  }
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

const handleAction = (controlId: string) => {
  if (controlId.startsWith('option-')) {
    const index = parseInt(controlId.split('-')[1]);
    selectOption(index);
  }
};

onMounted(loadVocabData);
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="loading">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="vocab && answerOptions.length > 0 && clozeData" class="text-center">
          <!-- Cloze rendering via VocabRenderer -->
          <VocabRenderer
            :vocab="vocab"
            :repos="repositories"
            :cloze-data="clozeData"
            :show-cloze-answer="isAnswered"
            :is-r-t-l="isRTL"
            :show-all-notes-immediately="false"
            :hide-translations="true"
          />

          <!-- Secondary content (translation hint) -->
          <div v-if="secondaryContent" class="text-2xl text-base-content/60 mt-4 mb-6">
            {{ secondaryContent }}
          </div>
        </div>

        <div v-else>
          <span>{{ $t('practice.tasks.failedToLoad') }}</span>
        </div>
      </div>
    </div>

    <!-- ActionBar -->
    <ActionBar v-if="vocab && answerOptions.length > 0 && clozeData" :controls="actionBarControls" @action="handleAction" />
  </div>
</template>