<template>
  <!-- Modal Trigger (Hidden checkbox for DaisyUI modal) -->
  <input type="checkbox" :id="modalId" class="modal-toggle" v-model="isOpen" />

  <!-- Modal -->
  <div class="modal" role="dialog">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Practice Filters</h3>

      <div class="space-y-4">
        <!-- Language Filter -->
        <LanguageFilter
          :available-languages="availableLanguages"
          :selected-languages="selectedLanguages"
          title="Languages"
          @toggle="toggleLanguage"
        />

        <!-- Set Filter -->
        <SetFilter
          :available-sets="availableSets"
          :selected-sets="selectedSets"
          title="Sets"
          @toggle="toggleSet"
        />
      </div>

      <!-- Actions -->
      <div class="modal-action">
        <button @click="resetFilters" class="btn btn-ghost">
          Reset to All
        </button>
        <label :for="modalId" class="btn btn-primary">
          Apply Filters
        </label>
      </div>
    </div>

    <!-- Backdrop to close modal -->
    <label class="modal-backdrop" :for="modalId">Close</label>
  </div>
</template>

<script setup lang="ts">
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import LanguageFilter from '@/shared/ui/LanguageFilter.vue';
import SetFilter from '@/shared/ui/SetFilter.vue';

interface Props {
  modalId: string;
  availableLanguages: LanguageData[];
  selectedLanguages: string[];
  availableSets: LocalSetData[];
  selectedSets: string[];
}

defineProps<Props>();

const emit = defineEmits<{
  'toggle-language': [languageCode: string];
  'toggle-set': [setId: string];
  'reset': [];
}>();

const isOpen = defineModel<boolean>('isOpen', { default: false });

function toggleLanguage(languageCode: string) {
  emit('toggle-language', languageCode);
}

function toggleSet(setId: string) {
  emit('toggle-set', setId);
}

function resetFilters() {
  emit('reset');
}
</script>
