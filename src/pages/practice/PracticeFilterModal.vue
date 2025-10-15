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
          :open="true"
          @toggle="toggleLanguage"
          @select-all="selectAllLanguages"
          @deselect-all="deselectAllLanguages"
        />

        <!-- Set Filter -->
        <SetFilter
          :available-sets="availableSets"
          :selected-sets="selectedSets"
          title="Sets"
          :open="true"
          @toggle="toggleSet"
          @select-all="selectAllSets"
          @deselect-all="deselectAllSets"
        />
      </div>

      <!-- Actions -->
      <div class="modal-action">
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
  'select-all-languages': [];
  'deselect-all-languages': [];
  'select-all-sets': [];
  'deselect-all-sets': [];
}>();

const isOpen = defineModel<boolean>('isOpen', { default: false });

function toggleLanguage(languageCode: string) {
  emit('toggle-language', languageCode);
}

function toggleSet(setId: string) {
  emit('toggle-set', setId);
}

function selectAllLanguages() {
  emit('select-all-languages');
}

function deselectAllLanguages() {
  emit('deselect-all-languages');
}

function selectAllSets() {
  emit('select-all-sets');
}

function deselectAllSets() {
  emit('deselect-all-sets');
}
</script>
