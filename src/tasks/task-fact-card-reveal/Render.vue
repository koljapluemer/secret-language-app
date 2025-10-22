<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Rating } from 'ts-fsrs';
import SpacedRepetitionRating from '@/tasks/ui/SpacedRepetitionRating.vue';
import MarkdownRenderer from '@/shared/ui/MarkdownRenderer.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useToast } from '@/shared/toasts';

interface Props {
  task: Task;
  repositories: RepositoriesContext;
  modeContext?: {
    setWrongVocabDueAgainImmediately?: boolean;
  };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [];
}>();

const toast = useToast();

const factCardRepo = props.repositories.factCardRepo!;
const factCard = ref<FactCardData | null>(null);
const isRevealed = ref(false);

const loadFactCard = async () => {
  const factCardId = props.task.associatedFactCards?.[0];
  if (!factCardId) return;
  
  const factCardData = await factCardRepo.getFactCardByUID(factCardId);
  if (factCardData) {
    factCard.value = factCardData;
  }
};

const handleRating = async (rating: Rating) => {
  if (!factCard.value) return;
  
  try {
    // Score fact card and update last review
    const immediateDue = props.modeContext?.setWrongVocabDueAgainImmediately || false;
    await factCardRepo.scoreFactCard(factCard.value.id, rating, immediateDue);
    await factCardRepo.updateLastReview(factCard.value.id);

    emit('finished');
  } catch {
    toast.error('Failed to save fact card progress');
    emit('finished');
  }
};

onMounted(loadFactCard);
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="factCard">
          <div class="text-center mb-8">
            <div class="text-4xl mb-6">
              <MarkdownRenderer :content="factCard.front" />
            </div>

            <div v-if="isRevealed">
              <div class="divider mb-6">{{ $t('practice.tasks.answer') }}</div>
              <div class="text-2xl text-light mb-6">
                <MarkdownRenderer :content="factCard.back" />
              </div>

              <SpacedRepetitionRating @rating="handleRating" />
            </div>

            <div v-else>
              <button @click="isRevealed = true" class="btn btn-primary">{{ $t('practice.tasks.reveal') }}</button>
            </div>
          </div>
        </div>

        <div v-else>
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    </div>
  </div>
</template>