<template>
  <div class="flex flex-col gap-2 mb-6">
    <!-- Language Filter -->
    <LanguageFilter
      :available-languages="availableLanguages"
      :selected-languages="selectedLanguages"
      :title="languageTitle"
      :open="languageOpen"
      @toggle="$emit('toggle-language', $event)"
      @select-all="$emit('select-all-languages')"
      @deselect-all="$emit('deselect-all-languages')"
    />

    <!-- Set Filter -->
    <SetFilter
      :available-sets="availableSets"
      :selected-sets="selectedSets"
      :title="setTitle"
      :open="setOpen"
      @toggle="$emit('toggle-set', $event)"
      @select-all="$emit('select-all-sets')"
      @deselect-all="$emit('deselect-all-sets')"
    />
  </div>
</template>

<script setup lang="ts">
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import LanguageFilter from './LanguageFilter.vue';
import SetFilter from './SetFilter.vue';

interface Props {
  availableLanguages: LanguageData[];
  selectedLanguages: string[];
  availableSets: LocalSetData[];
  selectedSets: string[];
  languageTitle?: string;
  setTitle?: string;
  languageOpen?: boolean;
  setOpen?: boolean;
}

withDefaults(defineProps<Props>(), {
  languageTitle: 'Languages',
  setTitle: 'Sets',
  languageOpen: false,
  setOpen: false
});

defineEmits<{
  'toggle-language': [languageCode: string];
  'toggle-set': [setId: string];
  'select-all-languages': [];
  'deselect-all-languages': [];
  'select-all-sets': [];
  'deselect-all-sets': [];
}>();
</script>
