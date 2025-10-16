<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import type { Task } from '@/pages/practice/Task';
import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import MarkdownRenderer from '@/shared/ui/MarkdownRenderer.vue';
import { useToast } from '@/shared/toasts';

interface Props {
  task: Task;
  repositories: RepositoriesContext;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [];
}>();

const toast = useToast();

const factCardRepo = props.repositories.factCardRepo!;
const factCard = ref<FactCardData | null>(null);

const loadFactCard = async () => {
  const factCardId = props.task.associatedFactCards?.[0];
  if (!factCardId) return;

  const factCardData = await factCardRepo.getFactCardByUID(factCardId);
  if (factCardData) {
    factCard.value = factCardData;
  }
};

const handleDone = async () => {
  if (!factCard.value) return;
  
  try {
    // Initialize learning card for unseen fact card
    const updatedFactCard = {
      ...factCard.value,
      progress: {
        ...factCard.value.progress,
        level: 0,
        card: createEmptyCard()
      }
    };
    await factCardRepo.updateFactCard(JSON.parse(JSON.stringify(updatedFactCard)));

    emit('finished');
  } catch {
    toast.error('Failed to initialize fact card');
    emit('finished');
  }
};

const handleSkip = async () => {
  if (!factCard.value) return;
  
  try {
    // Mark fact card as do not practice
    const updatedFactCard = {
      ...factCard.value,
      doNotPractice: true
    };
    await factCardRepo.updateFactCard(JSON.parse(JSON.stringify(updatedFactCard)));

    emit('finished');
  } catch {
    toast.error('Failed to update fact card');
    emit('finished');
  }
};

onMounted(loadFactCard);
</script>

<template>
  <div v-if="factCard">
    <div class="text-center mb-8">
      <div class="text-3xl mb-6">
        <MarkdownRenderer :content="factCard.front" />
      </div>
      <div class="divider mb-6"></div>
      <div class="text-3xl text-light">
        <MarkdownRenderer :content="factCard.back" />
      </div>
    </div>
    
    <div class="flex justify-center gap-4">
      <button @click="handleSkip" class="btn btn-ghost">{{ $t('practice.tasks.doNotLearn') }}</button>
      <button @click="handleDone" class="btn btn-primary">{{ $t('common.done') }}</button>
    </div>
  </div>

  <div v-else>
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>