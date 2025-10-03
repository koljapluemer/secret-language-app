<template>
  <div>
    <VocabAddFormMetaRenderer
      :form-data="state.formData"
      :loading="state.loading"
      :saving="state.saving"
      :error="state.error"
      @field-change="handleFieldChange"
      @add-note="addNote"
      @update-note="updateNote"
      @remove-note="removeNote"
      @add-link="addLink"
      @remove-link="removeLink"
      @update-images="updateImages"
      @update-sounds="updateSounds"
      @save="save"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { toRaw } from 'vue';
import VocabAddFormMetaRenderer from './VocabAddFormMetaRenderer.vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { VocabData, VocabImage, VocabSound } from '@/entities/vocab/VocabData';
import type { NoteData } from '@/entities/notes/NoteData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { Link } from '@/shared/links/Link';

interface VocabFormData {
  language: string;
  content: string;
  consideredCharacter?: boolean;
  consideredSentence?: boolean;
  consideredWord?: boolean;
  translations: (TranslationData | Omit<TranslationData, 'id'>)[];
  priority?: number;
  doNotPractice?: boolean;
  notes: (NoteData | Omit<NoteData, 'id'>)[];
  links: Array<{
    label: string;
    url: string;
  }>;
  isPicturable?: boolean;
  images?: VocabImage[];
  sounds?: VocabSound[];
}

interface VocabFormState {
  formData: VocabFormData;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

function formDataToVocabData(formData: VocabFormData): Omit<VocabData, 'id' | 'progress' | 'tasks'> {
  // Don't add an ID - let Dexie generate it when saved
  return {
    language: formData.language,
    content: formData.content,
    consideredCharacter: formData.consideredCharacter,
    consideredSentence: formData.consideredSentence,
    consideredWord: formData.consideredWord,
    translations: formData.translations.filter((t): t is TranslationData => 'id' in t).map(t => t.id),
    priority: formData.priority,
    doNotPractice: formData.doNotPractice,
    notes: formData.notes.filter((n): n is NoteData => 'id' in n).map(n => n.id),
    links: formData.links,
    origins: ['user-added'],
    relatedVocab: [],
    notRelatedVocab: [],
    similarSoundingButNotTheSame: [],
    isPicturable: formData.isPicturable,
    images: formData.images || [],
    sounds: formData.sounds || []
  };
}

const emit = defineEmits<{
  'vocab-saved': [vocabId: string];
}>();

const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const noteRepo = inject<NoteRepoContract>('noteRepo');
if (!vocabRepo) {
  throw new Error('VocabRepo not provided');
}
if (!translationRepo) {
  throw new Error('TranslationRepo not provided');
}
if (!noteRepo) {
  throw new Error('NoteRepo not provided');
}

const state = ref<VocabFormState>({
  formData: {
    language: '',
    content: '',
    consideredCharacter: false,
    consideredSentence: false,
    consideredWord: true,
    translations: [],
    priority: undefined,
    doNotPractice: undefined,
    notes: [],
    links: [],
    isPicturable: undefined,
    images: [],
    sounds: []
  },
  loading: false,
  saving: false,
  error: null
});

const isValid = computed(() => {
  return state.value.formData.language.trim() !== '' && 
         state.value.formData.content.trim() !== '';
});

function serializeFormData(formData: VocabFormData): VocabFormData {
  // Clean serialization - strips ALL Vue reactivity (and Blobs, but we handle those separately)
  return JSON.parse(JSON.stringify(toRaw(formData)));
}

async function saveInternal(): Promise<void> {
  if (!vocabRepo) throw new Error('VocabRepo not available');
  if (!translationRepo) throw new Error('TranslationRepo not available');
  if (!noteRepo) throw new Error('NoteRepo not available');

  // Extract Blobs before serialization (with toRaw to remove Vue reactivity)
  const originalImages = state.value.formData.images ? state.value.formData.images.map(img => toRaw(img)) : [];
  const originalSounds = state.value.formData.sounds ? state.value.formData.sounds.map(sound => toRaw(sound)) : [];
  
  const serializedFormData = serializeFormData(state.value.formData);
  
  // Restore Blobs to serialized data
  serializedFormData.images = originalImages;
  serializedFormData.sounds = originalSounds;
  

  // Save all notes and get real IDs back
  for (let i = 0; i < serializedFormData.notes.length; i++) {
    const note = serializedFormData.notes[i];
    const savedNote = await noteRepo.saveNote(toRaw(note));
    serializedFormData.notes[i] = savedNote;
  }

  // Save all translations and get real IDs back
  for (let i = 0; i < serializedFormData.translations.length; i++) {
    const translation = serializedFormData.translations[i];
    const savedTranslation = await translationRepo.saveTranslation(toRaw(translation));
    serializedFormData.translations[i] = savedTranslation;
  }

  const vocabDataConverted = formDataToVocabData(serializedFormData);
  
  
  const savedVocab = await vocabRepo.saveVocab(toRaw(vocabDataConverted));
  emit('vocab-saved', savedVocab.id);
}

async function save(): Promise<boolean> {
  if (!isValid.value || !vocabRepo) {
    state.value.error = 'Please fill in required fields';
    return false;
  }

  state.value.saving = true;
  state.value.error = null;

  try {
    await saveInternal();
    return true;
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Failed to save vocab';
    return false;
  } finally {
    state.value.saving = false;
  }
}

function handleFieldChange() {
  // For add form, we don't auto-save on field changes
}

function addNote(note: NoteData | Omit<NoteData, 'id'>) {
  // Don't add an ID - let Dexie generate it when saved
  const newNote: Omit<NoteData, 'id'> = {
    content: note.content,
    showBeforeExercise: note.showBeforeExercise,
    noteType: note.noteType
  };
  state.value.formData.notes.push(newNote);
}

function updateNote(updatedNote: NoteData | Omit<NoteData, 'id'>) {
  // Find by id if it exists
  if ('id' in updatedNote && updatedNote.id) {
    const index = state.value.formData.notes.findIndex(n => 'id' in n && n.id === updatedNote.id);
    if (index >= 0) {
      state.value.formData.notes[index] = updatedNote;
    }
  }
}

function removeNote(index: number) {
  state.value.formData.notes.splice(index, 1);
}

function addLink(link: Link) {
  state.value.formData.links.push(link);
}

function removeLink(index: number) {
  state.value.formData.links.splice(index, 1);
}

function updateImages(images: VocabImage[]) {
  state.value.formData.images = [...images];
}

function updateSounds(sounds: VocabSound[]) {
  state.value.formData.sounds = sounds;
}
</script>