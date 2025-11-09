<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Select Existing Translation</h3>

      <!-- Search -->
      <fieldset class="fieldset">
        <label for="translation-search" class="label">Search</label>
        <input
          id="translation-search"
          type="text"
          v-model="searchQuery"
          class="input"
          placeholder="Search translations..."
          @input="debouncedSearch"
        />
      </fieldset>

      <!-- Results -->
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="filteredTranslations.length === 0" class="text-center py-8">
        <p class="text-light">No translations found</p>
      </div>

      <div v-else class="grid gap-2 mt-4 max-h-96 overflow-y-auto">
        <button
          v-for="translation in filteredTranslations"
          :key="translation.id"
          @click="selectTranslation(translation.id)"
          class="btn btn-outline justify-start text-left h-auto py-2 px-4"
        >
          <div class="flex-1">
            <div class="font-bold">{{ translation.content }}</div>
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
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { TranslationData } from '@/entities/translations/TranslationData';

const props = defineProps<{
  show: boolean;
  excludeTranslationIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  'translation-selected': [string];
}>();

const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

const translations = ref<TranslationData[]>([]);
const searchQuery = ref('');
const loading = ref(false);

let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const filteredTranslations = computed(() => {
  return translations.value.filter(t => {
    // Exclude already attached translations
    if (props.excludeTranslationIds.includes(t.id)) {
      return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      return t.content.toLowerCase().includes(query);
    }

    return true;
  });
});

async function loadTranslations() {
  loading.value = true;
  try {
    translations.value = await translationRepo.getAllTranslations();
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

function selectTranslation(translationId: string) {
  emit('translation-selected', translationId);
  emit('close');
}

function close() {
  emit('close');
}

// Load translations when modal opens
watch(() => props.show, (isShown) => {
  if (isShown) {
    loadTranslations();
  }
});
</script>
