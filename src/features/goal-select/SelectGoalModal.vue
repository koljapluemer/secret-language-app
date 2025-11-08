<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Select Existing Goal</h3>

      <!-- Search -->
      <fieldset class="fieldset">
        <label for="goal-search" class="label">Search</label>
        <input
          id="goal-search"
          type="text"
          v-model="searchQuery"
          class="input"
          placeholder="Search goals..."
          @input="debouncedSearch"
        />
      </fieldset>

      <!-- Language Filter -->
      <LanguageFilter
        :available-languages="availableLanguages"
        :selected-languages="selectedLanguages"
        title="Filter by Language"
        :open="false"
        @toggle="toggleLanguage"
        @select-all="selectAllLanguages"
        @deselect-all="deselectAllLanguages"
      />

      <!-- Results -->
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="filteredGoals.length === 0" class="text-center py-8">
        <p class="text-light">No goals found</p>
      </div>

      <div v-else class="grid gap-2 mt-4 max-h-96 overflow-y-auto">
        <button
          v-for="goal in filteredGoals"
          :key="goal.id"
          @click="selectGoal(goal.id)"
          class="btn btn-outline justify-start text-left h-auto py-2 px-4"
        >
          <div class="flex-1">
            <div class="font-bold">{{ goal.title }}</div>
            <div class="text-sm text-light">{{ getLanguageName(goal.language) }}</div>
          </div>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="close">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { GoalData } from '@/entities/goals/GoalData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import LanguageFilter from '@/shared/ui/LanguageFilter.vue';

const props = defineProps<{
  show: boolean;
  excludeGoalIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  'goal-selected': [string];
}>();

const goalRepo = inject<GoalRepoContract>('goalRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;

const goals = ref<GoalData[]>([]);
const availableLanguages = ref<LanguageData[]>([]);
const selectedLanguages = ref<string[]>([]);
const searchQuery = ref('');
const loading = ref(false);

let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const filteredGoals = computed(() => {
  return goals.value.filter(goal => {
    // Exclude already attached goals
    if (props.excludeGoalIds.includes(goal.id)) {
      return false;
    }

    // Language filter
    if (selectedLanguages.value.length > 0 && !selectedLanguages.value.includes(goal.language)) {
      return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      return goal.title.toLowerCase().includes(query);
    }

    return true;
  });
});

async function loadGoals() {
  loading.value = true;
  try {
    goals.value = await goalRepo.getAll();

    // Get unique languages from goals and fetch their data
    const uniqueLangCodes = new Set(goals.value.map(g => g.language));
    const allLanguages = await languageRepo.getAll();
    availableLanguages.value = allLanguages.filter(lang => uniqueLangCodes.has(lang.code));
  } finally {
    loading.value = false;
  }
}

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // Search happens via computed property
  }, 300);
}

function toggleLanguage(languageCode: string) {
  const index = selectedLanguages.value.indexOf(languageCode);
  if (index > -1) {
    selectedLanguages.value.splice(index, 1);
  } else {
    selectedLanguages.value.push(languageCode);
  }
}

function selectAllLanguages() {
  selectedLanguages.value = availableLanguages.value.map(l => l.code);
}

function deselectAllLanguages() {
  selectedLanguages.value = [];
}

function getLanguageName(code: string): string {
  const lang = availableLanguages.value.find(l => l.code === code);
  return lang ? `${lang.emoji} ${lang.name}` : code;
}

function selectGoal(goalId: string) {
  emit('goal-selected', goalId);
  emit('close');
}

function close() {
  emit('close');
}

// Load goals when modal opens
watch(() => props.show, (isShown) => {
  if (isShown) {
    loadGoals();
  }
});
</script>
