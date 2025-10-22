<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import type { NoteData } from '@/entities/notes/NoteData';
import NoteDisplayMini from '@/entities/notes/NoteDisplayMini.vue';
import LinkDisplayCompact from '@/shared/links/LinkDisplayCompact.vue';
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
const noteRepo = props.repositories.noteRepo;

const vocab = ref<VocabData | null>(null);
const translationInputValue = ref('');
const vocabNotes = ref<NoteData[]>([]);
const translationNotes = ref<NoteData[]>([]);
const actionControls = ref<ActionControl[]>([]);

async function loadVocab() {
  const vocabId = props.task.associatedVocab?.[0];
  if (!vocabId) return;
  const data = await vocabRepo.getVocabByUID(vocabId);
  vocab.value = data || null;
  if (vocab.value) {
    const existing = await translationRepo.getTranslationsByIds(vocab.value.translations);

    // Load vocab notes
    if (vocab.value.notes && vocab.value.notes.length > 0) {
      vocabNotes.value = await noteRepo.getNotesByUIDs(vocab.value.notes);
    }

    // Load translation notes
    const allTranslationNoteIds: string[] = [];
    existing.forEach(translation => {
      if (translation.notes && translation.notes.length > 0) {
        allTranslationNoteIds.push(...translation.notes);
      }
    });
    if (allTranslationNoteIds.length > 0) {
      translationNotes.value = await noteRepo.getNotesByUIDs(allTranslationNoteIds);
    }
  }
}

function updateActionControls() {
  const controls: ActionControl[] = [
    {
      type: 'button',
      id: 'skip',
      label: t('practice.tasks.skipDisable'),
      position: 'secondary-left'
    },
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
      position: 'central'
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

async function handleSkipAndDisable() {
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
  else if (controlId === 'skip') handleSkipAndDisable();
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
    <Instruction :language-data="languageData" :prompt="task.prompt" />

    <!-- Scrollable content area -->
    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="vocab">
          <!-- Vocab section -->
          <div class="flex gap-4 mb-6">
            <div class="flex-1">
              <h2 class="text-3xl font-bold">{{ vocab.content }}</h2>
            </div>
            <!-- Vocab notes sidebar -->
            <div v-if="vocabNotes.filter(note => note.showBeforeExercise).length > 0" class="w-64 space-y-2">
              <NoteDisplayMini
                v-for="note in vocabNotes.filter(note => note.showBeforeExercise)"
                :key="note.id"
                :note="note"
              />
            </div>
          </div>

          <!-- Translation notes -->
          <div v-if="translationNotes.filter(note => note.showBeforeExercise).length > 0" class="flex gap-4 mb-4">
            <div class="flex-1"></div>
            <div class="w-64 space-y-2">
              <NoteDisplayMini
                v-for="note in translationNotes.filter(note => note.showBeforeExercise)"
                :key="note.id"
                :note="note"
              />
            </div>
          </div>

          <!-- Links -->
          <div v-if="vocab.links && vocab.links.length > 0" class="flex flex-wrap gap-2 mb-6">
            <LinkDisplayCompact
              v-for="(link, index) in vocab.links"
              :key="index"
              :link="link"
            />
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


