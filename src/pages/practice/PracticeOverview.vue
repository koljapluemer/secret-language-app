<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Filter } from 'lucide-vue-next';
import PracticeFilterModal from './PracticeFilterModal.vue';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';

const filterModalOpen = ref(false);

const {
  selectedLanguages,
  selectedSets,
  availableLanguages,
  availableSets,
  loadOptions,
  toggleLanguage,
  toggleSet,
  selectAllLanguages,
  deselectAllLanguages,
  selectAllSets,
  deselectAllSets
} = usePracticeFilters();

onMounted(() => {
  loadOptions();
});
</script>

<template>
  <div class="relative">
    <router-view />

    <!-- FAB - Fixed position -->
    <div class="fixed top-24 right-4 z-50">
      <label for="practice-filter-modal" class="btn btn-circle btn-primary shadow-lg">
        <Filter :size="24" />
      </label>
    </div>

    <!-- Filter Modal -->
    <PracticeFilterModal
      modal-id="practice-filter-modal"
      v-model:is-open="filterModalOpen"
      :available-languages="availableLanguages"
      :selected-languages="selectedLanguages"
      :available-sets="availableSets"
      :selected-sets="selectedSets"
      @toggle-language="toggleLanguage"
      @toggle-set="toggleSet"
      @select-all-languages="selectAllLanguages"
      @deselect-all-languages="deselectAllLanguages"
      @select-all-sets="selectAllSets"
      @deselect-all-sets="deselectAllSets"
    />
  </div>
</template>