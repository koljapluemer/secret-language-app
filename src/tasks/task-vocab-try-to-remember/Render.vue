<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import VocabWithTranslationsDisplay from '@/features/display-vocab-with-translations/VocabWithTranslationsDisplay.vue';
import { useToast } from '@/shared/toasts';

interface Props {
  task: Task;
  repositories: RepositoriesContextStrict;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [correctness?: 'correct' | 'incorrect' | 'neutral'];
}>();

const toast = useToast();
const vocabRepo = props.repositories.vocabRepo;
const vocab = ref<VocabData | null>(null);

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

onMounted(loadVocab);
</script>

<template>
  <div v-if="vocab">
    <VocabWithTranslationsDisplay
      :vocab-id="task.associatedVocab?.[0] || ''"
      :repositories="repositories"
    />
    
    <div class="flex justify-center gap-4 mt-6">
      <button @click="handleSkip" class="btn btn-ghost">{{ $t('practice.tasks.doNotLearn') }}</button>
      <button @click="handleDone" class="btn btn-primary">{{ $t('common.done') }}</button>
    </div>
  </div>

  <div v-else>
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>