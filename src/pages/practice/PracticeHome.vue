<script setup lang="ts">
import { computed } from 'vue';
import { modes } from '@/modes/modes';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';
import LanguageAndSetFilters from '@/shared/ui/LanguageAndSetFilters.vue';

const {
  selectedLanguages,
  selectedSets,
  availableLanguages,
  availableSets,
  toggleLanguage,
  toggleSet,
  selectAllLanguages,
  deselectAllLanguages,
  selectAllSets,
  deselectAllSets
} = usePracticeFilters();

// Filter to only show modes with a practice route (exclude test-only modes)
const practiceModes = computed(() =>
  modes.filter((mode): mode is typeof mode & { route: NonNullable<typeof mode.route> } =>
    mode.route !== undefined
  )
);
</script>

<template>
  <div class="practice-overview">
    <h1>{{ $t('practice.title') }}</h1>

    <div class="max-w-4xl mx-auto">
      <!-- Practice Filters -->
      <LanguageAndSetFilters
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

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <router-link v-for="option in practiceModes" :key="option.name" :to="option.route"
          class="card shadow transition-hover hover:shadow-md">
          <div class="card-body text-center">
            <div class="flex justify-center mb-4">
              <component :is="option.icon" :size="48" />
            </div>
            <h2>{{ option.name }}</h2>
            <p class="text-light">{{ option.description }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>