<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { Rating } from 'ts-fsrs';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useToast } from '@/shared/toasts';
import { useI18n } from 'vue-i18n';

interface Props {
  task: Task;
  repositories: RepositoriesContextStrict;
  modeContext?: {
    setWrongVocabDueAgainImmediately?: boolean;
  };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [correctness?: 'correct' | 'incorrect' | 'neutral'];
}>();

const toast = useToast();
const { t } = useI18n();
const vocabRepo = props.repositories.vocabRepo;
const vocab = ref<VocabData | null>(null);
const translations = ref<TranslationData[]>([]);
const isRevealed = ref(false);

const isNativeToTarget = computed(() => props.task.taskType === 'vocab-reveal-native-to-target');

const isSentence = computed(() => {
  return vocab.value?.consideredSentence === true;
});

const solution = computed(() => {
  if (!vocab.value || translations.value.length === 0) return '';

  if (isNativeToTarget.value) {
    return vocab.value.content; // Show vocab as solution
  } else {
    return translations.value.map(t => t.content).join(', '); // Show translations as solution
  }
});

// ActionBar controls
const actionBarControls = computed<ActionControl[]>(() => {
  const controls: ActionControl[] = [];

  if (!isRevealed.value) {
    // Show reveal button
    controls.push({
      type: 'button',
      id: 'reveal',
      label: t('practice.tasks.reveal'),
      position: 'central',
      disabled: false
    });
  } else {
    // Show rating buttons
    controls.push(
      {
        type: 'button',
        id: 'rating-1',
        label: t('practice.tasks.rating.again'),
        position: 'central'
      },
      {
        type: 'button',
        id: 'rating-2',
        label: t('practice.tasks.rating.hard'),
        position: 'central'
      },
      {
        type: 'button',
        id: 'rating-3',
        label: t('practice.tasks.rating.good'),
        position: 'central'
      },
      {
        type: 'button',
        id: 'rating-4',
        label: t('practice.tasks.rating.easy'),
        position: 'central'
      }
    );
  }

  return controls;
});

const loadVocab = async () => {
  const vocabId = props.task.associatedVocab?.[0];
  if (!vocabId) return;

  const vocabData = await vocabRepo.getVocabByUID(vocabId);
  if (vocabData) {
    vocab.value = vocabData;
    translations.value = await props.repositories.translationRepo.getTranslationsByIds(vocabData.translations);
  }
};

const handleRating = async (rating: Rating) => {
  if (!vocab.value) return;

  try {
    // Score vocab and update last review
    // In illegal immersion mode, use immediateDue for low ratings
    const immediateDue = props.modeContext?.setWrongVocabDueAgainImmediately || false;
    await vocabRepo.scoreVocab(vocab.value.id, rating, immediateDue);
    await vocabRepo.updateLastReview(vocab.value.id);

    // Map rating to correctness
    const correctness = (rating === 1 || rating === 2) ? 'incorrect' : 'correct'; // Rating.Again=1, Hard=2 are incorrect
    emit('finished', correctness);
  } catch {
    toast.error('Failed to save vocabulary progress');
    emit('finished', 'neutral');
  }
};

const handleAction = (controlId: string) => {
  if (controlId === 'reveal') {
    isRevealed.value = true;
  } else if (controlId.startsWith('rating-')) {
    const rating = parseInt(controlId.split('-')[1]) as Rating;
    handleRating(rating);
  }
};

onMounted(loadVocab);
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="vocab">
          <!-- Show vocab in native-to-target mode, hide translations initially -->
          <VocabRenderer
            v-if="isNativeToTarget"
            :vocab="vocab"
            :repos="repositories"
            :hide-content="!isRevealed"
            :show-question-marks="!isRevealed"
            :show-all-notes-immediately="isRevealed"
          />

          <!-- Show translations in target-to-native mode, hide translations initially -->
          <VocabRenderer
            v-else
            :vocab="vocab"
            :repos="repositories"
            :hide-translations="!isRevealed"
            :show-all-notes-immediately="isRevealed"
          />
        </div>

        <div v-else>
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    </div>

    <!-- ActionBar -->
    <ActionBar v-if="vocab" :controls="actionBarControls" @action="handleAction" />
  </div>
</template>