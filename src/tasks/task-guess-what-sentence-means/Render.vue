<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { createEmptyCard } from 'ts-fsrs';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { NoteData } from '@/entities/notes/NoteData';
import NoteDisplayMini from '@/entities/notes/NoteDisplayMini.vue';
import LinkDisplayMini from '@/shared/links/LinkDisplayMini.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';
import type { ActionControl } from '@/tasks/ui/ActionControl';
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
const vocab = ref<VocabData | null>(null);
const translations = ref<string[]>([]);
const vocabNotes = ref<NoteData[]>([]);
const userGuess = ref('');
const showTranslation = ref(false);

const canReveal = computed(() => {
  return userGuess.value.trim().length > 0;
});

const actionBarControls = computed<ActionControl[]>(() => {
  if (!showTranslation.value) {
    return [
      {
        id: 'user-guess-input',
        type: 'textarea',
        value: userGuess.value,
        placeholder: 'Type what you think this sentence means...',
        position: 'central',
        disabled: false
      },
      {
        id: 'reveal',
        type: 'button',
        label: 'Reveal Translation',
        position: 'central',
        disabled: !canReveal.value
      }
    ];
  } else {
    return [
      {
        id: 'done',
        type: 'button',
        label: 'Done',
        position: 'central'
      }
    ];
  }
});

const loadVocab = async () => {
  const vocabId = props.task.associatedVocab?.[0];
  if (!vocabId) return;

  const vocabData = await vocabRepo.getVocabByUID(vocabId);
  if (vocabData) {
    vocab.value = vocabData;
    const translationData = await translationRepo.getTranslationsByIds(vocabData.translations);
    translations.value = translationData.map(t => t.content);
    
    // Load vocab notes
    if (vocabData.notes && vocabData.notes.length > 0) {
      vocabNotes.value = await noteRepo.getNotesByUIDs(vocabData.notes);
    }
  }
};

const handleAction = async (actionId: string, data?: string) => {
  if (actionId === 'user-guess-input') {
    userGuess.value = data || '';
  } else if (actionId === 'reveal') {
    showTranslation.value = true;
  } else if (actionId === 'done') {
    await handleDone();
  } else if (actionId === 'skip') {
    emit('finished');
  } else if (actionId === 'disable') {
    // TODO: Implement disable functionality
    emit('finished');
  } else if (actionId === 'jump-to') {
    // TODO: Implement jump-to functionality (open vocab edit page)
  }
};

const handleDone = async () => {
  if (!vocab.value) return;

  try {
    // Save user's guess as a note if they provided one
    if (userGuess.value.trim()) {
      const noteData = {
        content: userGuess.value.trim(),
        noteType: 'initially guessed answer'
      };
      
      const savedNote = await noteRepo.saveNote(noteData);
      
      // Add note to vocab
      const updatedVocab = {
        ...vocab.value,
        notes: [...vocab.value.notes, savedNote.id],
        progress: {
          ...vocab.value.progress,
          level: 0,
          ...createEmptyCard()
        }
      };
      
      await vocabRepo.updateVocab(JSON.parse(JSON.stringify(updatedVocab)));
    } else {
      // Initialize learning card for unseen vocab without saving note
      const updatedVocab = {
        ...vocab.value,
        progress: {
          ...vocab.value.progress,
          level: 0,
          ...createEmptyCard()
        }
      };
      
      await vocabRepo.updateVocab(JSON.parse(JSON.stringify(updatedVocab)));
    }

    emit('finished');
  } catch {
    toast.error('Failed to save vocabulary progress');
    emit('finished');
  }
};

onMounted(loadVocab);
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4 pb-24">
        <div v-if="vocab" class="max-w-4xl mx-auto">
          <!-- Vocab section with sidebar -->
          <div class="flex gap-4 mb-8">
            <div class="flex-1">
              <div class="text-3xl font-bold p-6 bg-base-200 rounded-lg">
                {{ vocab.content }}
              </div>
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

          <div v-if="showTranslation">
            <div class="mb-8">
              <div class="divider text-lg font-medium">{{ $t('practice.tasks.translation') }}</div>
              <div class="text-2xl font-bold text-center p-6 bg-accent/10 rounded-lg">
                {{ translations.join(', ') }}
              </div>
            </div>

            <!-- Links -->
            <div v-if="vocab.links && vocab.links.length > 0" class="space-y-2 mb-6">
              <LinkDisplayMini
                v-for="(link, index) in vocab.links"
                :key="index"
                :link="link"
              />
            </div>
          </div>
        </div>

        <div v-else class="text-center">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    </div>

    <ActionBar
      :controls="actionBarControls"
      @action="handleAction"
    />
  </div>
</template>