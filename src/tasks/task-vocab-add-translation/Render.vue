<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useI18n } from 'vue-i18n';

interface Props {
  task: Task;
  repositories: RepositoriesContextStrict;
}

const props = defineProps<Props>();
const emit = defineEmits<{ finished: [correctness?: 'correct' | 'incorrect' | 'neutral'] }>();

const { t } = useI18n();
const vocabRepo = props.repositories.vocabRepo;
const translationRepo = props.repositories.translationRepo;

const vocab = ref<VocabData | null>(null);
const translationInputValue = ref('');
const actionControls = ref<ActionControl[]>([]);

async function loadVocab() {
  const vocabId = props.task.associatedVocab?.[0];
  if (!vocabId) return;
  const data = await vocabRepo.getVocabByUID(vocabId);
  vocab.value = data || null;
}

function updateActionControls() {
  const controls: ActionControl[] = [
    {
      type: 'text-input',
      id: 'translation-input',
      value: translationInputValue.value,
      placeholder: 'Add translation...',
      position: 'central'
    }
  ];

  // Add done button only if input has content
  if (translationInputValue.value.trim().length > 0) {
    controls.push({
      type: 'button',
      id: 'done',
      label: t('common.done'),
      position: 'central-footer'
    });
  }

  actionControls.value = controls;
}

async function handleDone() {
  if (!vocab.value) return;
  const trimmed = translationInputValue.value.trim();
  if (!trimmed) return;

  // Save the single translation
  const saved = await translationRepo.saveTranslation({
    content: trimmed,
    priority: 1,
    notes: []
  });

  const updatedVocab: VocabData = {
    ...JSON.parse(JSON.stringify(vocab.value)),
    translations: [...vocab.value.translations, saved.id]
  };
  await vocabRepo.updateVocab(updatedVocab);
  emit('finished', 'neutral');
}

function handleTranslationInput(value?: string) {
  translationInputValue.value = value || '';
}

async function handleDisable() {
  if (!vocab.value) return;

  const updatedVocab: VocabData = {
    ...JSON.parse(JSON.stringify(vocab.value)),
    notInterestedInAddingTranslations: true
  };
  await vocabRepo.updateVocab(updatedVocab);
  emit('finished', 'neutral');
}

function handleAction(controlId: string, data?: string) {
  if (controlId === 'translation-input') handleTranslationInput(data);
  else if (controlId === 'done') handleDone();
  else if (controlId === 'disable') handleDisable();
  else if (controlId === 'skip') emit('finished', 'neutral');
}

// Watch for input changes to update controls
watch(translationInputValue, () => {
  updateActionControls();
});

onMounted(() => {
  loadVocab();

  // Initial control registration
  updateActionControls();
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <VocabRenderer
          v-if="vocab"
          :vocab="vocab"
          :repos="repositories"
          :show-all-notes-immediately="true"
        />
        <div v-else>
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    </div>

    <!-- ActionBar always at bottom -->
    <ActionBar :controls="actionControls" @action="handleAction" />
  </div>
</template>


