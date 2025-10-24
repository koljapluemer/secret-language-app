<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { Rating } from 'ts-fsrs';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import { generateClozeFromText, isRTLText, type ClozeData } from '@/tasks/utils/clozeUtils';
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

const emit = defineEmits<{
  finished: [];
}>();

const toast = useToast();
const { t } = useI18n();

const props = defineProps<Props>();

const vocabRepo = props.repositories.vocabRepo;
const translationRepo = props.repositories.translationRepo;

const vocab = ref<VocabData | null>(null);
const translations = ref<TranslationData[]>([]);
const loading = ref(true);
const clozeData = ref<ClozeData | null>(null);
const isRevealed = ref(false);

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

const isRTL = computed(() => {
  if (!vocab.value?.content) return false;
  return isRTLText(vocab.value.content);
});

const translationContent = computed(() => {
  if (translations.value.length === 0) return '';

  if (isReverse.value) {
    // Show vocab content as secondary when translation is primary (cloze)
    return vocab.value?.content || '';
  } else {
    // Show translation as secondary when vocab is primary (cloze)
    const randomTranslation = translations.value[Math.floor(Math.random() * translations.value.length)];
    return randomTranslation?.content || '';
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

    generateCloze();
  } catch {
    toast.error('Failed to load vocabulary data');
  } finally {
    loading.value = false;
  }
}

function generateCloze() {
  if (!vocab.value || translations.value.length === 0) return;

  const text = isReverse.value 
    ? translations.value[Math.floor(Math.random() * translations.value.length)].content
    : vocab.value.content || '';
  
  clozeData.value = generateClozeFromText(text, vocab.value.progress.level);
}

const handleRating = async (rating: Rating) => {
  if (!vocab.value) return;

  try {
    const immediateDue = props.modeContext?.setWrongVocabDueAgainImmediately || false;
    await vocabRepo.scoreVocab(vocab.value.id, rating, immediateDue);
    await vocabRepo.updateLastReview(vocab.value.id);

    emit('finished');
  } catch {
    toast.error('Failed to save vocabulary progress');
    emit('finished');
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

        <div v-else-if="vocab && clozeData" class="text-center">
          <!-- Cloze rendering via VocabRenderer -->
          <VocabRenderer
            :vocab="vocab"
            :repos="repositories"
            :cloze-data="clozeData"
            :show-cloze-answer="isRevealed"
            :is-r-t-l="isRTL"
            :show-all-notes-immediately="isRevealed"
            :hide-translations="true"
          />

          <!-- Secondary content (translation hint) -->
          <div v-if="translationContent" class="text-2xl text-base-content/60 mt-4 mb-6">
            {{ translationContent }}
          </div>
        </div>

        <div v-else>
          <span>{{ $t('practice.tasks.failedToLoad') }}</span>
        </div>
      </div>
    </div>

    <!-- ActionBar -->
    <ActionBar v-if="vocab && clozeData" :controls="actionBarControls" @action="handleAction" />
  </div>
</template>