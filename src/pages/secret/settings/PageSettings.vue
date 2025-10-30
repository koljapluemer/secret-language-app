<script setup lang="ts">
import { inject, ref } from 'vue';
import { toRaw } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { NoteData } from '@/entities/notes/NoteData';
import { useToast } from '@/shared/toasts';
import AudioAnalysis from './AudioAnalysis.vue';

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const noteRepo = inject<NoteRepoContract>('noteRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const toast = useToast();

const isDeduplicating = ref(false);
const deduplicationResults = ref<{ vocabProcessed: number; translationsProcessed: number; duplicatesRemoved: number } | null>(null);

// Practice goals
const MOTIVATION_SETTINGS_KEY = 'linguanodon-motivation-settings';
interface MotivationSettings {
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
}

const dailyGoal = ref(30);
const weeklyGoal = ref(180);

function loadGoals() {
  const stored = localStorage.getItem(MOTIVATION_SETTINGS_KEY);
  if (stored) {
    const settings: MotivationSettings = JSON.parse(stored);
    dailyGoal.value = settings.dailyGoalMinutes;
    weeklyGoal.value = settings.weeklyGoalMinutes;
  }
}

function saveGoals() {
  const settings: MotivationSettings = {
    dailyGoalMinutes: dailyGoal.value,
    weeklyGoalMinutes: weeklyGoal.value
  };
  localStorage.setItem(MOTIVATION_SETTINGS_KEY, JSON.stringify(settings));
  toast.success('Goals saved successfully');
}

loadGoals();

async function deduplicateNotesAndTranslations() {
  isDeduplicating.value = true;
  deduplicationResults.value = null;
  
  try {
    let vocabProcessed = 0;
    let translationsProcessed = 0;
    let duplicatesRemoved = 0;

    // Process all vocab entries
    const allVocab = await vocabRepo.getVocab();
    
    for (const vocab of allVocab) {
      if (vocab.notes && vocab.notes.length > 1) {
        const notes = await noteRepo.getNotesByUIDs(vocab.notes);
        const { keptNotes, removedCount } = await deduplicateNotes(notes);
        
        if (removedCount > 0) {
          // Update vocab with deduplicated note UIDs
          const updatedVocab = {
            ...vocab,
            notes: keptNotes.map(note => note.id)
          };
          await vocabRepo.updateVocab(toRaw(updatedVocab));
          duplicatesRemoved += removedCount;
        }
      }
      vocabProcessed++;
    }

    // Process all translations
    const allTranslations = await translationRepo.getAllTranslations();
    
    for (const translation of allTranslations) {
      if (translation.notes && translation.notes.length > 1) {
        const notes = await noteRepo.getNotesByUIDs(translation.notes);
        const { keptNotes, removedCount } = await deduplicateNotes(notes);
        
        if (removedCount > 0) {
          // Update translation with deduplicated note UIDs
          const updatedTranslation = {
            ...translation,
            notes: keptNotes.map(note => note.id)
          };
          await translationRepo.updateTranslation(toRaw(updatedTranslation));
          duplicatesRemoved += removedCount;
        }
      }
      translationsProcessed++;
    }

    deduplicationResults.value = { vocabProcessed, translationsProcessed, duplicatesRemoved };
    
  } catch (error) {
    toast.error(`Error during deduplication: ${String(error)}`);
    alert('An error occurred during deduplication. Check console for details.');
  } finally {
    isDeduplicating.value = false;
  }
}

async function deduplicateNotes(notes: NoteData[]): Promise<{ keptNotes: NoteData[]; removedCount: number }> {
  // Group notes by content + noteType signature
  const noteGroups = new Map<string, NoteData[]>();
  
  for (const note of notes) {
    const signature = `${note.content}|${note.noteType || ''}`;
    if (!noteGroups.has(signature)) {
      noteGroups.set(signature, []);
    }
    noteGroups.get(signature)!.push(note);
  }
  
  const keptNotes: NoteData[] = [];
  let removedCount = 0;
  
  // For each group, keep the first note and delete the rest
  for (const group of noteGroups.values()) {
    if (group.length > 1) {
      // Keep the first note
      keptNotes.push(group[0]);
      
      // Delete the duplicate notes
      const duplicateIds = group.slice(1).map(note => note.id);
      await noteRepo.deleteNotes(duplicateIds);
      removedCount += duplicateIds.length;
    } else {
      // No duplicates, keep the note
      keptNotes.push(group[0]);
    }
  }
  
  return { keptNotes, removedCount };
}
</script>

<template>
  <h1>{{ $t('navigation.settings') }}</h1>

  <AudioAnalysis :vocab-repo="vocabRepo" />

  <h3>{{ $t('settings.practiceGoals') }}</h3>
  <p class="text-light mb-4">
    {{ $t('settings.practiceGoalsDescription') }}
  </p>

  <div class="space-y-4 mb-8">
    <div class="form-control w-full max-w-xs">
      <label class="label">
        <span class="label-text">{{ $t('settings.dailyGoal') }}</span>
      </label>
      <input
        v-model.number="dailyGoal"
        type="number"
        :placeholder="$t('settings.dailyGoalPlaceholder')"
        class="input input-bordered w-full max-w-xs"
        min="0"
        @change="saveGoals"
      />
    </div>

    <div class="form-control w-full max-w-xs">
      <label class="label">
        <span class="label-text">{{ $t('settings.weeklyGoal') }}</span>
      </label>
      <input
        v-model.number="weeklyGoal"
        type="number"
        :placeholder="$t('settings.weeklyGoalPlaceholder')"
        class="input input-bordered w-full max-w-xs"
        min="0"
        @change="saveGoals"
      />
    </div>
  </div>

  <h3>{{ $t('settings.noteDeduplication') }}</h3>
  <p class="text-light mb-4">
    {{ $t('settings.noteDeduplicationDescription') }}
  </p>

  <button 
    @click="deduplicateNotesAndTranslations" 
    :disabled="isDeduplicating" 
    class="btn btn-outline btn-sm w-fit"
  >
    <span v-if="isDeduplicating" class="loading loading-spinner loading-xs mr-2"></span>
    {{ isDeduplicating ? $t('settings.deduplicating') : $t('settings.deduplicateNotes') }}
  </button>

  <div v-if="deduplicationResults" class="mt-4">
    <p>{{ $t('settings.removedDuplicates') }} {{ deduplicationResults.duplicatesRemoved }} {{ $t('settings.duplicateNotesFrom') }} {{ deduplicationResults.vocabProcessed + deduplicationResults.translationsProcessed }} {{ $t('settings.entries') }}</p>
  </div>
</template>