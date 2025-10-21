<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import { useToast } from '@/shared/toasts';
import { useI18n } from 'vue-i18n';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';

interface Props {
  task: Task;
  repositories: RepositoriesContextStrict;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [correctness?: 'correct' | 'incorrect' | 'neutral'];
}>();

const toast = useToast();
const { t } = useI18n();
const vocabRepo = props.repositories.vocabRepo;
const vocab = ref<VocabData | null>(null);

const registerActionHandler = inject<(controlId: string, handler: (data?: string) => void) => void>('registerActionHandler');
const registerActionControls = inject<(controls: ActionControl[]) => void>('registerActionControls');

const loadVocab = async () => {
  const vocabId = props.task.associatedVocab?.[0];
  if (!vocabId) return;
  const vocabData = await vocabRepo.getVocabByUID(vocabId);
  if (vocabData) {
    vocab.value = vocabData;
  }
};

const handleDone = async () => {
  if (!vocab.value) return;

  try {
    // Initialize learning card for unseen vocab
    const emptyCard = createEmptyCard();

    const updatedVocab = {
      ...vocab.value,
      progress: {
        ...vocab.value.progress,
        level: 0,
        ...emptyCard
      }
    };

    await vocabRepo.updateVocab(JSON.parse(JSON.stringify(updatedVocab)));
    emit('finished', 'neutral');
  } catch {
    toast.error('Failed to initialize vocabulary');
    emit('finished', 'neutral');
  }
};

const handleSkip = async () => {
  if (!vocab.value) return;

  try {
    // Mark vocab as do not practice
    const updatedVocab = {
      ...vocab.value,
      doNotPractice: true
    };
    await vocabRepo.updateVocab(JSON.parse(JSON.stringify(updatedVocab)));

    emit('finished', 'neutral');
  } catch {
    toast.error('Failed to update vocabulary');
    emit('finished', 'neutral');
  }
};

onMounted(() => {
  loadVocab();

  // Register action controls
  if (registerActionControls) {
    const controls: ActionControl[] = [
      {
        type: 'button',
        id: 'skip',
        label: t('practice.tasks.doNotLearn'),
        position: 'secondary-left'
      },
      {
        type: 'button',
        id: 'done',
        label: t('common.done'),
        position: 'central'
      }
    ];
    registerActionControls(controls);
  }

  // Register action handlers
  if (registerActionHandler) {
    registerActionHandler('skip', handleSkip);
    registerActionHandler('done', handleDone);
  }
});
</script>

<template>
  <div v-if="vocab">
    <VocabRenderer :vocab="vocab" :repos="repositories" show-language />
  </div>

  <div v-else>
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>