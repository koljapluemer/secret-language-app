<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, toRaw } from 'vue';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { NoteData } from '@/entities/notes/NoteData';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import LinkDisplayMini from '@/shared/links/LinkDisplayMini.vue';
import { useToast } from '@/shared/toasts';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import ActionBar from '@/tasks/ui/ActionBar.vue';

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
const translationRepo = props.repositories.translationRepo;
const noteRepo = props.repositories.noteRepo;

const vocabItems = ref<VocabData[]>([]);
const translations = ref<{ [vocabId: string]: TranslationData[] }>({});
const vocabNotes = ref<{ [vocabId: string]: NoteData[] }>({});
const translationNotes = ref<{ [vocabId: string]: NoteData[] }>({});
const sentence = ref('');

// Recording state
const isRecording = ref(false);
const canRecord = ref(false);
const recordingDuration = ref(0);
const mediaRecorder = ref<MediaRecorder | null>(null);
const recordingTimer = ref<ReturnType<typeof setInterval> | null>(null);
const audioChunks = ref<Blob[]>([]);
const isRecordTask = props.task.taskType === 'vocab-record-sentence' || props.task.taskType === 'vocab-record-sentence-single';
const activeTab = ref<'text' | 'audio'>(isRecordTask ? 'audio' : 'text');
const audioRecording = ref<{ blob: Blob; duration: number } | null>(null);

const isDoneEnabled = computed(() => {
  if (activeTab.value === 'text') {
    return sentence.value.trim().length >= 3;
  } else {
    return audioRecording.value !== null;
  }
});

// ActionBar controls
const actionBarControls = computed<ActionControl[]>(() => {
  const controls: ActionControl[] = [];

  // Central Header: Mode toggle (only for non-record tasks)
  if (!isRecordTask) {
    controls.push({
      type: 'toggle-button-group',
      id: 'mode-toggle',
      position: 'central-header',
      options: [
        { id: 'text', icon: 'pencil', label: 'Write' },
        { id: 'audio', icon: 'microphone', label: 'Record' }
      ],
      selectedId: activeTab.value
    });
  }

  // Central Element: Text mode
  if (activeTab.value === 'text') {
    controls.push({
      type: 'textarea',
      id: 'sentence-input',
      position: 'central',
      value: sentence.value,
      placeholder: vocabItems.value.length === 1
        ? 'Form a sentence using this word...'
        : 'Form a sentence using both words...'
    });

    // Central Footer: Done button (enabled when sentence has 3+ chars)
    if (sentence.value.trim().length >= 3) {
      controls.push({
        type: 'button',
        id: 'done',
        label: 'Done',
        position: 'central-footer',
        disabled: false
      });
    }
  }

  // Central Element: Audio mode
  if (activeTab.value === 'audio') {
    if (!audioRecording.value) {
      // Show record button
      controls.push({
        type: 'record-button',
        id: 'record',
        position: 'central',
        isRecording: isRecording.value
      });
    } else {
      // Show audio player
      controls.push({
        type: 'audio-player',
        id: 'play-recording',
        position: 'central',
        audioBlob: audioRecording.value.blob,
        duration: audioRecording.value.duration
      });

      // Central Footer: Re-record and Done buttons
      controls.push({
        type: 'button',
        id: 're-record',
        label: 'Re-record',
        position: 'central-footer',
        destructive: false
      });
      controls.push({
        type: 'button',
        id: 'done',
        label: 'Done',
        position: 'central-footer',
        disabled: false
      });
    }
  }

  return controls;
});

const loadVocab = async () => {
  const vocabIds = props.task.associatedVocab || [];
  if (vocabIds.length === 0 || vocabIds.length > 2) return;

  const vocabData = await vocabRepo.getVocabByUIDs(vocabIds);
  if (vocabData.length >= 1) {
    vocabItems.value = vocabData;

    for (const vocab of vocabData) {
      const translationData = await translationRepo.getTranslationsByIds(vocab.translations);
      translations.value[vocab.id] = translationData;

      // Load vocab notes
      if (vocab.notes && vocab.notes.length > 0) {
        vocabNotes.value[vocab.id] = await noteRepo.getNotesByUIDs(vocab.notes);
      }

      // Load translation notes
      const allTranslationNoteIds: string[] = [];
      translationData.forEach(translation => {
        if (translation.notes && translation.notes.length > 0) {
          allTranslationNoteIds.push(...translation.notes);
        }
      });
      if (allTranslationNoteIds.length > 0) {
        translationNotes.value[vocab.id] = await noteRepo.getNotesByUIDs(allTranslationNoteIds);
      }
    }
  }
};

// Recording functions
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });

    canRecord.value = true;

    audioChunks.value = [];
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data);
      }
    };

    mediaRecorder.value.onstop = () => {
      stream.getTracks().forEach(track => track.stop());

      if (audioChunks.value.length > 0) {
        const blob = new Blob(audioChunks.value, { type: 'audio/webm;codecs=opus' });
        audioRecording.value = { blob, duration: recordingDuration.value };
      }
    };

    isRecording.value = true;
    recordingDuration.value = 0;
    mediaRecorder.value.start();

    // Start timer
    recordingTimer.value = setInterval(() => {
      recordingDuration.value += 1;

      // Auto-stop after 60 seconds
      if (recordingDuration.value >= 60) {
        stopRecording();
      }
    }, 1000);
  } catch (error) {
    toast.error(`Failed to start recording: ${error}`);
  }
}

function stopRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop();
  }

  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }

  isRecording.value = false;
}

function clearRecording() {
  audioRecording.value = null;
  recordingDuration.value = 0;
}


// Action handler for ActionBar
const handleAction = (controlId: string, data?: string) => {
  switch (controlId) {
    case 'mode-toggle':
      if (data === 'text' || data === 'audio') {
        activeTab.value = data;
      }
      break;
    case 'sentence-input':
      sentence.value = data || '';
      break;
    case 'record':
      if (isRecording.value) {
        stopRecording();
      } else {
        startRecording();
      }
      break;
    case 're-record':
      clearRecording();
      break;
    case 'done':
      handleDone();
      break;
    case 'skip':
      handleSkip();
      break;
    case 'disable':
      // Handle disable action
      break;
    case 'jump-to':
      handleJumpTo();
      break;
  }
};

const handleJumpTo = () => {
  if (vocabItems.value.length > 0) {
    const vocabId = vocabItems.value[0].id;
    // Navigate to vocab edit page
    window.location.href = `#/vocab/${vocabId}`;
  }
};

const handleSkip = async () => {
  await handleTaskCompletion();
  emit('finished', 'neutral');
};


const handleDone = async () => {
  if (!isDoneEnabled.value || vocabItems.value.length === 0) return;

  try {

    if (activeTab.value === 'text') {
      // Create note with the sentence
      const noteData = {
        content: sentence.value.trim(),
        noteType: 'example sentence task',
        showBeforeExercise: false
      };

      const savedNote = await noteRepo.saveNote(toRaw(noteData));


      // Attach note to both vocab items
      for (const vocab of vocabItems.value) {
        const freshVocab = await vocabRepo.getVocabByUID(vocab.id);
        if (!freshVocab) {

          continue;
        }
        const updatedVocab = {
          ...freshVocab,
          notes: [...(freshVocab.notes || []), savedNote.id]
        };
        await vocabRepo.updateVocab(updatedVocab);
      }
    } else if (activeTab.value === 'audio' && audioRecording.value) {
      // Create VocabSound from the audio recording
      const vocabSound = {
        id: crypto.randomUUID(),
        blob: audioRecording.value.blob,
        addedAt: new Date(),
        fileSize: audioRecording.value.blob.size,
        mimeType: audioRecording.value.blob.type,
        duration: audioRecording.value.duration,
        originalFileName: `sentence-${Date.now()}.webm`,
        disableForPractice: true // Set this to true as requested
      };

      // Attach sound to both vocab items
      for (const vocab of vocabItems.value) {
        const freshVocab = await vocabRepo.getVocabByUID(vocab.id);
        if (!freshVocab) {

          continue;
        }
        const updatedVocab = {
          ...freshVocab,
          sounds: [...(freshVocab.sounds || []), vocabSound]
        };
        await vocabRepo.updateVocab(updatedVocab);
      }
    }


    await handleTaskCompletion();
    emit('finished', 'neutral');
  } catch (error) {

    toast.error(`Failed to save sentence: ${error}`);
    await handleTaskCompletion();
    emit('finished', 'neutral');
  }
};

const handleTaskCompletion = async () => {
  // For backup tasks (single word or lowest due vocab), update lastSeenAt and due date
  if (props.task.taskType === 'vocab-form-sentence-single' ||
    (props.task.taskType === 'vocab-form-sentence' && vocabItems.value.length <= 2)) {
    const vocabIds = props.task.associatedVocab || [];
    if (vocabIds.length > 0) {
      // Set due date to 60 minutes in the future
      const fiveMinutesFromNow = new Date(Date.now() + 60 * 60 * 1000);
      await vocabRepo.updateVocabLastSeenAndDueDate(vocabIds, fiveMinutesFromNow);
    }
  }
};

onMounted(async () => {
  await loadVocab();

  // Initialize microphone access for audio mode
  if (isRecordTask || activeTab.value === 'audio') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      canRecord.value = true;

      // Stop the stream for now, we'll restart when recording
      stream.getTracks().forEach(track => track.stop());
    } catch {
      toast.error('Failed to access microphone');
      canRecord.value = false;
    }
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
  }
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop();
  }
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <div v-if="vocabItems.length >= 1" class="flex flex-col gap-4">
          <!-- Vocabulary Display -->
          <div class="grid gap-6" :class="vocabItems.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'">
            <div v-for="vocab in vocabItems" :key="vocab.id" class="text-center">
              <VocabRenderer :vocab="vocab" :repos="repositories" show-all-notes-immediately />
            </div>
          </div>

          <!-- Helper messages -->
          <div class="chat chat-start" v-if="vocabItems.length === 1">
            <div class="chat-bubble">
              {{ $t('practice.tasks.sentenceIdea', { word: vocabItems[0].content }) }}
            </div>
          </div>
          <div class="chat chat-start">
            <div class="chat-bubble">
              If you are not confident to form a full sentence, make a sentence in your native language and mix in
              target language vocabulary.
            </div>
          </div>

          <!-- Links -->
          <div class="space-y-2 mb-6">
            <template v-for="vocabItem in vocabItems" :key="vocabItem.id">
              <LinkDisplayMini v-for="(link, index) in vocabItem.links || []" :key="`${vocabItem.id}-${index}`"
                :link="link" />
            </template>
          </div>
        </div>

        <div v-else class="text-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
          <p class="mt-4 text-light">{{ $t('practice.tasks.loadingVocabulary') }}</p>
        </div>
      </div>
    </div>

    <!-- ActionBar -->
    <ActionBar v-if="vocabItems.length >= 1" :controls="actionBarControls" @action="handleAction" />
  </div>
</template>
