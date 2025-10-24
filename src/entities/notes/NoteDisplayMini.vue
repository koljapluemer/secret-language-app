<template>
  <div v-if="note" class="join">
    <div class="join-item border rounded-l p-1 text-xs bg-base-200  border-base-300">
      {{ note.noteType || 'Note' }}
    </div>
    <div class="join-item border rounded-r p-1 text-xs border-base-300">
      {{ note.content }}
      <div v-if="showBeforeExerciseInfo && note.showBeforeExercise" class="text-xs text-blue-600 mt-2">
        {{ $t('notes.types.beforeExercise') }}
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { NoteData } from './NoteData';

interface Props {
  note: NoteData | Omit<NoteData, 'id'> | null | undefined;
  showBeforeExerciseInfo?: boolean;
}

withDefaults(defineProps<Props>(), {
  showBeforeExerciseInfo: false
});
</script>