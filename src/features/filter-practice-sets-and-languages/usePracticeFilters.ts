import { ref, computed, inject } from 'vue';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';

// Shared state across all practice pages
const selectedLanguages = ref<string[]>([]);
const selectedSets = ref<string[]>([]);
const availableLanguages = ref<LanguageData[]>([]);
const availableSets = ref<LocalSetData[]>([]);
const loading = ref(false);
const initialized = ref(false);

export function usePracticeFilters() {
  const languageRepo = inject<LanguageRepoContract>('languageRepo');
  const localSetRepo = inject<LocalSetRepoContract>('localSetRepo');

  if (!languageRepo || !localSetRepo) {
    throw new Error('Required repositories not available');
  }

  // Computed sets to avoid (inverted selection)
  const setsToAvoid = computed(() => {
    const allSetIds = ['user-added', ...availableSets.value.map(s => s.id)];
    return allSetIds.filter(id => !selectedSets.value.includes(id));
  });

  // Load available options (only once)
  async function loadOptions() {
    if (initialized.value) return;

    loading.value = true;
    try {
      [availableLanguages.value, availableSets.value] = await Promise.all([
        languageRepo!.getAll(),
        localSetRepo!.getAllLocalSets()
      ]);

      // Initialize with all selected
      selectedLanguages.value = availableLanguages.value.map(l => l.code);
      selectedSets.value = ['user-added', ...availableSets.value.map(s => s.id)];
      initialized.value = true;
    } finally {
      loading.value = false;
    }
  }

  // Toggle language
  function toggleLanguage(languageCode: string) {
    const index = selectedLanguages.value.indexOf(languageCode);
    if (index > -1) {
      selectedLanguages.value.splice(index, 1);
    } else {
      selectedLanguages.value.push(languageCode);
    }
  }

  // Toggle set
  function toggleSet(setId: string) {
    const index = selectedSets.value.indexOf(setId);
    if (index > -1) {
      selectedSets.value.splice(index, 1);
    } else {
      selectedSets.value.push(setId);
    }
  }

  // Reset filters to all selected
  function resetFilters() {
    selectedLanguages.value = availableLanguages.value.map(l => l.code);
    selectedSets.value = ['user-added', ...availableSets.value.map(s => s.id)];
  }

  // Select all languages
  function selectAllLanguages() {
    selectedLanguages.value = availableLanguages.value.map(l => l.code);
  }

  // Deselect all languages
  function deselectAllLanguages() {
    selectedLanguages.value = [];
  }

  // Select all sets
  function selectAllSets() {
    selectedSets.value = ['user-added', ...availableSets.value.map(s => s.id)];
  }

  // Deselect all sets
  function deselectAllSets() {
    selectedSets.value = [];
  }

  return {
    selectedLanguages,
    selectedSets,
    availableLanguages,
    availableSets,
    loading,
    setsToAvoid,
    loadOptions,
    toggleLanguage,
    toggleSet,
    resetFilters,
    selectAllLanguages,
    deselectAllLanguages,
    selectAllSets,
    deselectAllSets
  };
}
