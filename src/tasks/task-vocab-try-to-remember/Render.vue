<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import { useToast } from '@/shared/toasts';
import { useI18n } from 'vue-i18n';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import Instruction from '@/tasks/ui/Instruction.vue';

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
const actionControls = ref<ActionControl[]>([]);

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

function handleAction(controlId: string) {
  if (controlId === 'done') handleDone();
  else if (controlId === 'skip') handleSkip();
}

onMounted(() => {
  loadVocab();

  // Set up action controls
  actionControls.value = [
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
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="vocab">
          <VocabRenderer :vocab="vocab" :repos="repositories" show-language />
        </div>

        <div v-else>
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    </div>

    <!-- ActionBar always at bottom -->
    <ActionBar :controls="actionControls" @action="handleAction" />
  </div>
</template>