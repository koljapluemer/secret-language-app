<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import type { Task } from '@/tasks/Task';
import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import MarkdownRenderer from '@/shared/ui/MarkdownRenderer.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useToast } from '@/shared/toasts';
import { useI18n } from 'vue-i18n';

interface Props {
  task: Task;
  repositories: RepositoriesContext;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [];
}>();

const toast = useToast();
const { t } = useI18n();

const factCardRepo = props.repositories.factCardRepo!;
const languageRepo = props.repositories.languageRepo!;
const factCard = ref<FactCardData | null>(null);
const languageData = ref<LanguageData | null>(null);
const actionControls = ref<ActionControl[]>([]);

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

function handleAction(controlId: string) {
  if (controlId === 'done') handleDone();
  else if (controlId === 'skip') handleSkip();
}

onMounted(async () => {
  loadFactCard();

  // Load language data
  const lang = await languageRepo.getByCode(props.task.language);
  if (lang) languageData.value = lang;

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
    <Instruction :language-data="languageData" :prompt="task.prompt" />

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
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