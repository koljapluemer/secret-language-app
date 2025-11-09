<template>
  <div class="flex flex-col gap-2 w-full">
    <div class="flex flex-row gap-1 w-full flex-wrap">
      <!-- Main content card -->
      <div class="card card-sm shadow-sm flex-1">
        <div class="card-body">
          <div class="flex-1 flex flex-col gap-4">
            <!-- Translation content -->
            <div class="font-bold text-center w-full text-5xl">
              {{ translation.content }}
            </div>
          </div>

          <!-- Notes and metadata section -->
          <div class="flex flex-col gap-2 items-start">
            <!-- Notes -->
            <div v-if="notes.length > 0" class="flex flex-row gap-1 flex-wrap">
              <NoteDisplayMini v-for="note in notes" :key="note.id" :note="note" />
            </div>

            <!-- Deep data metadata badges -->
            <div v-if="showDeepData" class="flex flex-row gap-1 flex-wrap">
              <span v-if="translation.priority" class="badge badge-sm" :class="{
                'badge-error': translation.priority >= 4,
                'badge-warning': translation.priority === 3,
                'badge-info': translation.priority <= 2
              }">Priority {{ translation.priority }}</span>
            </div>
          </div>

          <!-- Origins (showDeepData) -->
          <div v-if="showDeepData && translation.origins && translation.origins.length > 0" class="flex flex-col gap-1 w-full">
            <div class="text-sm font-medium text-base-content/70">Origins:</div>
            <div class="flex flex-row gap-1 flex-wrap">
              <span v-for="origin in translation.origins" :key="origin" class="badge badge-sm badge-ghost">{{ origin }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Vocab cards (same style as translation cards in VocabRenderer) -->
      <div class="flex flex-col gap-2 flex-1" v-if="relatedVocabItems.length > 0">
        <!-- Individual vocab cards -->
        <div class="card card-sm shadow-sm" v-for="vocab in relatedVocabItems" :key="vocab.id">
          <div class="card-body">
            <div class="flex flex-row gap-1">
              <div class="card-title text-xl flex-1">{{ vocab.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { NoteData } from '@/entities/notes/NoteData';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import NoteDisplayMini from '@/entities/notes/NoteDisplayMini.vue';

const props = defineProps<{
  translation: TranslationData;
  repos: RepositoriesContext;
  showDeepData?: boolean;
}>();

const noteRepo = props.repos.noteRepo;
const vocabRepo = props.repos.vocabRepo;

const notes = ref<NoteData[]>([]);
const relatedVocabItems = ref<VocabData[]>([]);

onMounted(async () => {
  // Load notes
  if (props.translation.notes && props.translation.notes.length > 0 && noteRepo) {
    notes.value = await noteRepo.getNotesByUIDs(props.translation.notes);
  }

  // Load related vocab (reverse lookup)
  if (vocabRepo) {
    const allVocab = await vocabRepo.getVocab();
    relatedVocabItems.value = allVocab.filter((vocab: VocabData) =>
      vocab.translations && vocab.translations.includes(props.translation.id)
    );
  }
});
</script>
