<template>
  <div>
    <VocabFormMetaRenderer
      :form-data="state.formData"
      :loading="state.loading"
      :saving="state.saving"
      :error="state.error"
      :is-editing="state.isEditing"
      :loaded-vocab-data="loadedVocabData"
      @field-change="handleFieldChange"
      @add-note="addNote"
      @update-note="updateNote"
      @remove-note="removeNote"
      @add-transcription="addTranscription"
      @update-transcription="updateTranscription"
      @remove-transcription="removeTranscription"
      @add-link="addLink"
      @update-link="updateLink"
      @remove-link="removeLink"
      @add-translation="addTranslation"
      @update-translation="updateTranslation"
      @remove-translation="(index) => removeTranslation(index)"
      @update-related-vocab="updateRelatedVocab"
      @update-contains="updateContains"
      @update-similar-sounding-vocab="updateSimilarSoundingVocab"
      @update-picturable="updatePicturable"
      @update-images="updateImages"
      @update-sounds="updateSounds"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import { toRaw } from 'vue';
import VocabFormMetaRenderer from './VocabFormMetaRenderer.vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { VocabData, VocabImage, VocabSound } from '@/entities/vocab/VocabData';
import type { NoteData } from '@/entities/notes/NoteData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { Link } from '@/shared/links/Link';
import { useToast } from '@/shared/toasts';

interface VocabFormData {
  id?: string;
  language: string;
  content: string;
  consideredCharacter?: boolean;
  consideredSentence?: boolean;
  consideredWord?: boolean;
  translations: (TranslationData | Omit<TranslationData, 'id'>)[];
  priority?: number;
  doNotPractice?: boolean;
  notes: (NoteData | Omit<NoteData, 'id'>)[];
  transcriptions: (NoteData | Omit<NoteData, 'id'>)[];
  links: Link[];
  relatedVocab?: string[];
  contains?: string[];
  similarSoundingButNotTheSame?: string[];
  isPicturable?: boolean;
  images?: VocabImage[];
  sounds?: VocabSound[];
}

interface VocabFormState {
  formData: VocabFormData;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isEditing: boolean;
}

function vocabDataToFormData(vocab: VocabData, notes: NoteData[] = [], transcriptions: NoteData[] = [], translations: TranslationData[] = []): VocabFormData {
  return {
    id: vocab.id,
    language: vocab.language,
    content: vocab.content || '',
    consideredCharacter: vocab.consideredCharacter ?? false,
    consideredSentence: vocab.consideredSentence ?? false,
    consideredWord: vocab.consideredWord ?? true,
    translations: translations,
    priority: vocab.priority,
    doNotPractice: vocab.doNotPractice,
    notes: notes,
    transcriptions: transcriptions,
    links: vocab.links ? [...vocab.links] : [],
    relatedVocab: vocab.relatedVocab ? [...vocab.relatedVocab] : [],
    contains: vocab.contains ? [...vocab.contains] : [],
    similarSoundingButNotTheSame: vocab.similarSoundingButNotTheSame ? [...vocab.similarSoundingButNotTheSame] : [],
    isPicturable: vocab.isPicturable,
    images: vocab.images ? [...vocab.images] : [],
    sounds: vocab.sounds ? [...vocab.sounds] : []
  };
}

function formDataToVocabData(formData: VocabFormData, existingVocab?: VocabData): Omit<VocabData, 'id' | 'progress' | 'tasks'> | VocabData {
  const baseData: Omit<VocabData, 'id' | 'progress' | 'tasks'> | VocabData = existingVocab ? {
    // For updates: include id and all fields
    id: existingVocab.id,
    language: formData.language,
    content: formData.content,
    consideredCharacter: formData.consideredCharacter,
    consideredSentence: formData.consideredSentence,
    consideredWord: formData.consideredWord,
    translations: formData.translations.filter((t): t is TranslationData => 'id' in t).map(t => t.id),
    priority: formData.priority,
    doNotPractice: formData.doNotPractice,
    notes: formData.notes.filter((n): n is NoteData => 'id' in n).map(n => n.id),
    transcriptions: formData.transcriptions.filter((n): n is NoteData => 'id' in n).map(n => n.id),
    links: formData.links,
    origins: existingVocab.origins,
    relatedVocab: formData.relatedVocab || [],
    notRelatedVocab: existingVocab.notRelatedVocab || [],
    contains: formData.contains || [],
    similarSoundingButNotTheSame: formData.similarSoundingButNotTheSame || [],
    isPicturable: formData.isPicturable,
    images: formData.images || [],
    sounds: formData.sounds || [],
    progress: existingVocab.progress
  } : {
    // For new vocab: omit id, let Dexie generate it
    language: formData.language,
    content: formData.content,
    consideredCharacter: formData.consideredCharacter,
    consideredSentence: formData.consideredSentence,
    consideredWord: formData.consideredWord,
    translations: formData.translations.filter((t): t is TranslationData => 'id' in t).map(t => t.id),
    priority: formData.priority,
    doNotPractice: formData.doNotPractice,
    notes: formData.notes.filter((n): n is NoteData => 'id' in n).map(n => n.id),
    transcriptions: formData.transcriptions.filter((n): n is NoteData => 'id' in n).map(n => n.id),
    links: formData.links,
    origins: ['user-added'],
    relatedVocab: formData.relatedVocab || [],
    notRelatedVocab: [],
    contains: formData.contains || [],
    similarSoundingButNotTheSame: formData.similarSoundingButNotTheSame || [],
    isPicturable: formData.isPicturable,
    images: formData.images || [],
    sounds: formData.sounds || []
  };

  return baseData;
}

const props = defineProps<{
  vocabId?: string;
}>();

const emit = defineEmits<{
  'vocab-saved': [vocabId: string];
}>();

const toast = useToast();

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
    transcriptions: [],
    links: [],
    relatedVocab: [],
    contains: [],
    similarSoundingButNotTheSame: []
  },
  loading: false,
  saving: false,
  error: null,
  isEditing: !!props.vocabId
});

const loadedVocabData = ref<VocabData | null>(null);
const loadedNotes = ref<NoteData[]>([]);
const loadedTranscriptions = ref<NoteData[]>([]);
const loadedTranslations = ref<TranslationData[]>([]);

const isValid = computed(() => {
  return state.value.formData.language.trim() !== '' && 
         state.value.formData.content.trim() !== '';
});

function serializeFormData(formData: VocabFormData): VocabFormData {
  // Clean serialization - strips ALL Vue reactivity (and Blobs, but we handle those separately)
  return JSON.parse(JSON.stringify(toRaw(formData)));
}

async function loadVocab() {
  if (!props.vocabId || !vocabRepo) return;

  state.value.loading = true;
  state.value.error = null;

  try {
    const vocab = await vocabRepo.getVocabByUID(props.vocabId);
    if (vocab) {
      loadedVocabData.value = vocab;
      
      if (vocab.notes && vocab.notes.length > 0 && noteRepo) {
        try {
          const notes = await noteRepo.getNotesByUIDs(vocab.notes);
          loadedNotes.value = notes;
        } catch {
          toast.error('Failed to load notes');
          loadedNotes.value = [];
        }
      } else {
        loadedNotes.value = [];
      }

      if (vocab.transcriptions && vocab.transcriptions.length > 0 && noteRepo) {
        try {
          const transcriptions = await noteRepo.getNotesByUIDs(vocab.transcriptions);
          loadedTranscriptions.value = transcriptions;
        } catch {
          toast.error('Failed to load transcriptions');
          loadedTranscriptions.value = [];
        }
      } else {
        loadedTranscriptions.value = [];
      }

      if (vocab.translations && vocab.translations.length > 0 && translationRepo) {
        try {
          const translations = await translationRepo.getTranslationsByIds(vocab.translations);
          loadedTranslations.value = translations;
        } catch {
          toast.error('Failed to load translations');
          loadedTranslations.value = [];
        }
      } else {
        loadedTranslations.value = [];
      }
      
      state.value.formData = vocabDataToFormData(vocab, loadedNotes.value, loadedTranscriptions.value, loadedTranslations.value);
    } else {
      state.value.error = 'Vocab not found';
    }
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Failed to load vocab';
  } finally {
    state.value.loading = false;
  }
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
  

  // Save or update notes
  for (let i = 0; i < serializedFormData.notes.length; i++) {
    const note = serializedFormData.notes[i];
    if ('id' in note && note.id && loadedNotes.value.find(n => n.id === note.id)) {
      // Existing note - update it
      await noteRepo.updateNote(toRaw(note as NoteData));
    } else {
      // New note (no id) - save it and get the real ID back
      const savedNote = await noteRepo.saveNote(toRaw(note));
      serializedFormData.notes[i] = savedNote;
    }
  }

  const currentNoteUIDs = serializedFormData.notes.filter((n): n is NoteData => 'id' in n).map(n => n.id);
  const notesToDelete = loadedNotes.value.filter(n => !currentNoteUIDs.includes(n.id));
  if (notesToDelete.length > 0) {
    await noteRepo.deleteNotes(notesToDelete.map(n => n.id));
  }

  // Save or update transcriptions
  for (let i = 0; i < serializedFormData.transcriptions.length; i++) {
    const transcription = serializedFormData.transcriptions[i];
    if ('id' in transcription && transcription.id && loadedTranscriptions.value.find(n => n.id === transcription.id)) {
      // Existing transcription - update it
      await noteRepo.updateNote(toRaw(transcription as NoteData));
    } else {
      // New transcription (no id) - save it and get the real ID back
      const savedTranscription = await noteRepo.saveNote(toRaw(transcription));
      serializedFormData.transcriptions[i] = savedTranscription;
    }
  }

  const currentTranscriptionUIDs = serializedFormData.transcriptions.filter((n): n is NoteData => 'id' in n).map(n => n.id);
  const transcriptionsToDelete = loadedTranscriptions.value.filter(n => !currentTranscriptionUIDs.includes(n.id));
  if (transcriptionsToDelete.length > 0) {
    await noteRepo.deleteNotes(transcriptionsToDelete.map(n => n.id));
  }

  // Save or update translations
  for (let i = 0; i < serializedFormData.translations.length; i++) {
    const translation = serializedFormData.translations[i];
    if ('id' in translation && translation.id && loadedTranslations.value.find(t => t.id === translation.id)) {
      // Existing translation - update it
      await translationRepo.updateTranslation(toRaw(translation as TranslationData));
    } else {
      // New translation (no id) - save it and get the real ID back
      const savedTranslation = await translationRepo.saveTranslation(toRaw(translation));
      serializedFormData.translations[i] = savedTranslation;
    }
  }

  const currentTranslationUIDs = serializedFormData.translations.filter((t): t is TranslationData => 'id' in t).map(t => t.id);
  const translationsToDelete = loadedTranslations.value.filter(t => !currentTranslationUIDs.includes(t.id));
  if (translationsToDelete.length > 0) {
    await translationRepo.deleteTranslations(translationsToDelete.map(t => t.id));
  }

  let finalVocabId = props.vocabId;
  
  if (state.value.isEditing && props.vocabId) {
    const existingVocab = await vocabRepo.getVocabByUID(props.vocabId);
    if (!existingVocab) {
      throw new Error('Vocab not found');
    }

    const formDataConverted = formDataToVocabData(serializedFormData, existingVocab);
    
    const updatedVocab = {
      ...existingVocab,
      ...formDataConverted
    };
    
    
    await vocabRepo.updateVocab(toRaw(updatedVocab));
    finalVocabId = updatedVocab.id;
  } else {
    const savedVocab = await vocabRepo.saveVocab(toRaw(formDataToVocabData(serializedFormData)));
    finalVocabId = savedVocab.id;
  }

  if (finalVocabId) {
    emit('vocab-saved', finalVocabId);
  }

  // Update loaded data with the saved entities (which now have real Dexie IDs)
  loadedNotes.value = serializedFormData.notes.filter((n): n is NoteData => 'id' in n);
  loadedTranscriptions.value = serializedFormData.transcriptions.filter((n): n is NoteData => 'id' in n);
  loadedTranslations.value = serializedFormData.translations.filter((t): t is TranslationData => 'id' in t);

  // Update form state with real IDs to keep everything in sync
  state.value.formData.notes = serializedFormData.notes.filter((n): n is NoteData => 'id' in n);
  state.value.formData.transcriptions = serializedFormData.transcriptions.filter((n): n is NoteData => 'id' in n);
  state.value.formData.translations = serializedFormData.translations.filter((t): t is TranslationData => 'id' in t);
  state.value.formData.id = finalVocabId;
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

async function handleFieldChange() {
  if (state.value.isEditing) {
    await save();
  }
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
  // Find by id if it exists, otherwise this is a bug - notes should be identified
  if ('id' in updatedNote && updatedNote.id) {
    const index = state.value.formData.notes.findIndex(n => 'id' in n && n.id === updatedNote.id);
    if (index >= 0) {
      state.value.formData.notes[index] = updatedNote;
      handleFieldChange();
    }
  }
}

function removeNote(index: number) {
  state.value.formData.notes.splice(index, 1);
}

function addTranscription(transcription: NoteData | Omit<NoteData, 'id'>) {
  const newTranscription: Omit<NoteData, 'id'> = {
    content: transcription.content,
    showBeforeExercise: transcription.showBeforeExercise,
    noteType: transcription.noteType
  };
  state.value.formData.transcriptions.push(newTranscription);
}

function updateTranscription(updatedTranscription: NoteData | Omit<NoteData, 'id'>) {
  if ('id' in updatedTranscription && updatedTranscription.id) {
    const index = state.value.formData.transcriptions.findIndex(n => 'id' in n && n.id === updatedTranscription.id);
    if (index >= 0) {
      state.value.formData.transcriptions[index] = updatedTranscription;
      handleFieldChange();
    }
  }
}

function removeTranscription(index: number) {
  state.value.formData.transcriptions.splice(index, 1);
}

function addLink(link: Link) {
  state.value.formData.links.push(link);
}

function updateLink(index: number, link: Link) {
  state.value.formData.links[index] = link;
}

async function removeLink(index: number) {
  state.value.formData.links.splice(index, 1);
  await handleFieldChange();
}

function addTranslation(translation: TranslationData | Omit<TranslationData, 'id'>) {
  state.value.formData.translations.push(translation);
  handleFieldChange();
}

function updateTranslation(updatedTranslation: TranslationData | Omit<TranslationData, 'id'>) {
  // Find by id if it exists
  if ('id' in updatedTranslation && updatedTranslation.id) {
    const index = state.value.formData.translations.findIndex(t => 'id' in t && t.id === updatedTranslation.id);
    if (index >= 0) {
      state.value.formData.translations[index] = updatedTranslation;
      handleFieldChange();
    }
  }
}

async function removeTranslation(index: number) {
  state.value.formData.translations.splice(index, 1);
  await handleFieldChange();
}

async function updateRelatedVocab(vocabIds: string[]) {
  state.value.formData.relatedVocab = vocabIds;
  await handleFieldChange();
}

async function updateContains(vocabIds: string[]) {
  state.value.formData.contains = vocabIds;
  await handleFieldChange();
}

async function updateSimilarSoundingVocab(vocabIds: string[]) {
  state.value.formData.similarSoundingButNotTheSame = vocabIds;
  await handleFieldChange();
}

async function updatePicturable(isPicturable: boolean) {
  state.value.formData.isPicturable = isPicturable;
  await handleFieldChange();
}

async function updateImages(images: VocabImage[]) {
  state.value.formData.images = [...images];
  await handleFieldChange();
}

async function updateSounds(sounds: VocabSound[]) {
  state.value.formData.sounds = sounds;
  await handleFieldChange();
}

onMounted(() => {
  if (props.vocabId) {
    loadVocab();
  }
});
</script>