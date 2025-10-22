<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import VocabImageManager from '@/features/vocab-image-management/VocabImageManager.vue';
import TaskSkipDisableDone from '@/tasks/ui/TaskSkipDisableDone.vue';
import type { NoteData } from '@/entities/notes/NoteData';
import NoteDisplayMini from '@/entities/notes/NoteDisplayMini.vue';
import LinkDisplayCompact from '@/shared/links/LinkDisplayCompact.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useToast } from '@/shared/toasts';

interface Props {
  task: Task;
  repositories: RepositoriesContextStrict;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [];
}>();

const toast = useToast();

const vocabRepo = props.repositories.vocabRepo;
const translationRepo = props.repositories.translationRepo;
const noteRepo = props.repositories.noteRepo;
const languageRepo = props.repositories.languageRepo;
const vocab = ref<VocabData | null>(null);
const translations = ref<TranslationData[]>([]);
const vocabNotes = ref<NoteData[]>([]);
const translationNotes = ref<NoteData[]>([]);


// Task state
const hasChanges = ref(false);

const isSentence = computed(() => {
  return vocab.value?.consideredSentence === true;
});

const loadVocab = async () => {
  const vocabId = props.task.associatedVocab?.[0];
  if (!vocabId) return;

  const vocabData = await vocabRepo.getVocabByUID(vocabId);
  if (vocabData) {
    vocab.value = vocabData;
    translations.value = await translationRepo.getTranslationsByIds(vocabData.translations);

    // Load vocab notes
    if (vocabData.notes && vocabData.notes.length > 0) {
      vocabNotes.value = await noteRepo.getNotesByUIDs(vocabData.notes);
    }

    // Load translation notes
    const allTranslationNoteIds: string[] = [];
    translations.value.forEach(translation => {
      if (translation.notes && translation.notes.length > 0) {
        allTranslationNoteIds.push(...translation.notes);
      }
    });
    if (allTranslationNoteIds.length > 0) {
      translationNotes.value = await noteRepo.getNotesByUIDs(allTranslationNoteIds);
    }
  }
};

// Handle image changes from VocabImageManager
const handleImagesChanged = () => {
  hasChanges.value = true;
};

const handleSkip = async () => {
  emit('finished');
};

const handleSkipAndDisable = async () => {
  if (!vocab.value) return;

  try {
    await vocabRepo.markVocabNotPicturable(vocab.value.id);
    emit('finished');
  } catch {
    toast.error('Failed to update vocabulary settings');
    emit('finished');
  }
};

const handleDone = () => {
  emit('finished');
};

onMounted(loadVocab);
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="vocab">
      <div class="mb-8">
        <!-- Vocab section -->
        <div class="flex gap-4 mb-6">
          <div class="flex-1 text-center">
            <div :class="isSentence ? 'text-3xl' : 'text-6xl'" class="font-bold">{{ vocab.content }}</div>
          </div>
          <!-- Vocab notes sidebar -->
          <div v-if="vocabNotes.filter(note => note.showBeforeExercise).length > 0" class="w-64 space-y-2">
            <NoteDisplayMini v-for="note in vocabNotes.filter(note => note.showBeforeExercise)" :key="note.id"
              :note="note" />
          </div>
        </div>

        <div class="divider mb-6"></div>

        <!-- Translation sections -->
        <div class="space-y-4 mb-8">
          <div v-for="translation in translations" :key="translation.id" class="flex gap-4">
            <div class="flex-1 text-center">
              <div :class="isSentence ? 'text-xl' : 'text-2xl'" class="text-light">{{ translation.content }}</div>
            </div>
            <!-- Translation notes sidebar -->
            <div
              v-if="translationNotes.filter(note => note.showBeforeExercise && translation.notes?.includes(note.id)).length > 0"
              class="w-64 space-y-2">

              <NoteDisplayMini
                v-for="note in translationNotes.filter(note => note.showBeforeExercise && translation.notes?.includes(note.id))"
                :key="note.id" :note="note" />
            </div>
          </div>
        </div>
      </div>

      <!-- Image Management -->
      <div class="max-w-2xl mx-auto mb-8">
        <VocabImageManager :vocab-id="vocab.id" :images="vocab.images" :is-picturable="vocab.isPicturable"
          @images-changed="handleImagesChanged" />
      </div>

      <!-- Links -->
      <div v-if="vocab.links && vocab.links.length > 0" class="flex flex-wrap gap-2 mb-6">
        <LinkDisplayCompact v-for="(link, index) in vocab.links" :key="index" :link="link" />
      </div>

          <!-- Action Buttons -->
          <TaskSkipDisableDone :done-disabled="!hasChanges" @skip="handleSkip" @skip-and-disable="handleSkipAndDisable"
            @done="handleDone" />
        </div>

        <div v-else>
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    </div>
  </div>
</template>