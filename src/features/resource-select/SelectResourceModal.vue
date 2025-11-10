<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Select Existing Resource</h3>

      <!-- Search -->
      <fieldset class="fieldset">
        <label for="resource-search" class="label">Search</label>
        <input
          id="resource-search"
          type="text"
          v-model="searchQuery"
          class="input"
          placeholder="Search resources..."
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

      <div v-else-if="filteredResources.length === 0" class="text-center py-8">
        <p class="text-light">No immersion resources found</p>
      </div>

      <div v-else class="grid gap-2 mt-4 max-h-96 overflow-y-auto">
        <button
          v-for="resource in filteredResources"
          :key="resource.id"
          @click="selectResource(resource.id)"
          class="btn btn-outline justify-start text-left h-auto py-2 px-4"
        >
          <div class="flex-1">
            <div class="font-bold"><ResourceReference :resource="resource" :deactivateLink="true" /></div>
            <div class="text-sm text-light">{{ getLanguageName(resource.language) }}</div>
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
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import LanguageFilter from '@/shared/ui/LanguageFilter.vue';
import ResourceReference from '@/entities/resources/ResourceReference.vue';

const props = defineProps<{
  show: boolean;
  excludeResourceIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  'resource-selected': [string];
}>();

const resourceRepo = inject<ResourceRepoContract>('resourceRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;

const resources = ref<ResourceData[]>([]);
const availableLanguages = ref<LanguageData[]>([]);
const selectedLanguages = ref<string[]>([]);
const searchQuery = ref('');
const loading = ref(false);

let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const filteredResources = computed(() => {
  return resources.value.filter(resource => {
    // Exclude already attached resources
    if (props.excludeResourceIds.includes(resource.id)) {
      return false;
    }

    // Language filter
    if (selectedLanguages.value.length > 0 && !selectedLanguages.value.includes(resource.language)) {
      return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      return (resource.content && resource.content.toLowerCase().includes(query)) ||
        (resource.link && (resource.link.url.toLowerCase().includes(query) || resource.link.label.toLowerCase().includes(query)));
    }

    return true;
  });
});

async function loadResources() {
  loading.value = true;
  try {
    // Get all resources and filter for immersion content
    const allResources = await resourceRepo.getAllResources();
    resources.value = allResources.filter(r => r.isImmersionContent);

    // Get unique languages from resources and fetch their data
    const uniqueLangCodes = new Set(resources.value.map(r => r.language));
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

function selectResource(resourceId: string) {
  emit('resource-selected', resourceId);
  emit('close');
}

function close() {
  emit('close');
}

// Load resources when modal opens
watch(() => props.show, (isShown) => {
  if (isShown) {
    loadResources();
  }
});
</script>
