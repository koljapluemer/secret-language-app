<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, toRaw } from 'vue';
import type { Task } from '@/tasks/Task';
import type { GoalData } from '@/entities/goals/GoalData';
import type { RepositoriesContextStrict } from '@/shared/types/RepositoriesContext';
import type { ActionControl } from '@/tasks/ui/ActionControl';
import { useToast } from '@/shared/toasts';
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

const goalRepo = props.repositories.goalRepo;
const noteRepo = props.repositories.noteRepo;

const goal = ref<GoalData | null>(null);
const response = ref('');

// Recording state
const isRecording = ref(false);
const canRecord = ref(false);
const recordingDuration = ref(0);
const mediaRecorder = ref<MediaRecorder | null>(null);
const recordingTimer = ref<ReturnType<typeof setInterval> | null>(null);
const audioChunks = ref<Blob[]>([]);
const activeTab = ref<'text' | 'audio'>('text');
const audioRecording = ref<{ blob: Blob; duration: number } | null>(null);

const isDoneEnabled = computed(() => {
  if (activeTab.value === 'text') {
    return response.value.trim().length >= 3;
  } else {
    return audioRecording.value !== null;
  }
});

// ActionBar controls
const actionBarControls = computed<ActionControl[]>(() => {
  const controls: ActionControl[] = [];

  // Central Header: Mode toggle
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

  // Central Element: Text mode
  if (activeTab.value === 'text') {
    controls.push({
      type: 'textarea',
      id: 'response-input',
      position: 'central',
      value: response.value,
      placeholder: 'Write your response...'
    });

    // Central Footer: Done button (enabled when response has 3+ chars)
    if (response.value.trim().length >= 3) {
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
        position: 'central-footer'
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

const loadGoal = async () => {
  const goalIds = props.task.associatedGoals || [];
  if (goalIds.length === 0) return;

  const goalData = await goalRepo.getById(goalIds[0]);
  if (goalData) {
    goal.value = goalData;
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
    case 'response-input':
      response.value = data || '';
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
  }
};

const handleSkip = async () => {
  emit('finished', 'neutral');
};

const handleDone = async () => {
  if (!isDoneEnabled.value || !goal.value) return;

  try {
    if (activeTab.value === 'text') {
      // Create note with the response
      const noteData = {
        content: response.value.trim(),
        noteType: 'goal attempt task',
        showBeforeExercise: false
      };

      const savedNote = await noteRepo.saveNote(toRaw(noteData));

      // Attach note to the goal
      const updatedGoal = {
        ...toRaw(goal.value),
        notes: [...(goal.value.notes || []), savedNote.id]
      };
      await goalRepo.update(goal.value.id, updatedGoal);
    } else if (activeTab.value === 'audio' && audioRecording.value) {
      // Create a note with audio recording reference
      const noteData = {
        content: `Audio response recorded at ${new Date().toISOString()}`,
        noteType: 'goal attempt task (audio)',
        showBeforeExercise: false
      };

      const savedNote = await noteRepo.saveNote(toRaw(noteData));

      // Attach note to the goal
      const updatedGoal = {
        ...toRaw(goal.value),
        notes: [...(goal.value.notes || []), savedNote.id]
      };
      await goalRepo.update(goal.value.id, updatedGoal);
    }

    emit('finished', 'neutral');
  } catch (error) {
    toast.error(`Failed to save response: ${error}`);
    emit('finished', 'neutral');
  }
};

onMounted(async () => {
  await loadGoal();

  // Initialize microphone access
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
    canRecord.value = false;
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
        <div v-if="goal" class="flex flex-col gap-4">
          <!-- Goal Display -->
          <div class="text-center">
            <div class="card bg-base-200 shadow-xl">
              <div class="card-body">
                <h2 class="card-title text-2xl justify-center">{{ goal.title }}</h2>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-12">
          <span class="loading loading-spinner loading-lg"></span>
          <p class="mt-4 text-light">Loading goal...</p>
        </div>
      </div>
    </div>

    <!-- ActionBar -->
    <ActionBar v-if="goal" :controls="actionBarControls" @action="handleAction" />
  </div>
</template>
