<template>
  <div class="flex justify-between items-center mb-6">
    <h1>Sets</h1>
  </div>

  <!-- Search -->
  <input v-model="searchQuery" @input="debouncedSearch" type="text" placeholder="Search sets..."
    class="input input-bordered w-full mb-2" />

  <!-- Filters -->
  <div class="grid gap-2 md:grid-cols-1 mb-2">
    <!-- Language Filter -->
    <details class="collapse collapse-arrow bg-base-200">
      <summary class="collapse-title font-medium">
        Languages ({{ selectedLanguages.length }} selected)
      </summary>
      <div class="collapse-content">
        <ul class="flex flex-col gap-2">
          <li v-for="language in availableLanguages" :key="language.code">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :checked="selectedLanguages.includes(language.code)"
                @change="toggleLanguage(language.code)" class="checkbox checkbox-sm" />
              <span class="flex items-center gap-2">
                <span v-if="language.emoji">{{ language.emoji }}</span>
                {{ language.name }}
              </span>
            </label>
          </li>
        </ul>
      </div>
    </details>
  </div>

  <div v-if="loading" class="text-center py-8">
    <span class="loading loading-spinner loading-lg"></span>
    <p class="mt-4">Loading...</p>
  </div>

  <div v-else-if="error" class="alert alert-error mb-6">
    <span>{{ error }}</span>
  </div>

  <div v-else>
    <!-- Results Summary -->
    <div class="flex justify-center items-center mb-4">
      <span class="text-light">{{ totalCount }} sets</span>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="table table-zebra">
        <thead>
          <tr>
            <th>Name</th>
            <th>Language</th>
            <th>Description</th>
            <th>Last Downloaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="set in setItems" :key="set.id">
            <td>
              <span class="font-bold">{{ set.name }}</span>
            </td>
            <td>
              <span class="flex items-center gap-2">
                <span v-if="getLanguageEmoji(set.language)">{{ getLanguageEmoji(set.language) }}</span>
                {{ getLanguageName(set.language) }}
              </span>
            </td>
            <td>
              <div v-if="set.description" class="text-sm max-w-xs truncate" :title="set.description">
                {{ set.description }}
              </div>
              <div v-else class="text-base-content/60 italic text-sm">
                No description
              </div>
            </td>
            <td>
              <span class="text-sm">{{ formatDate(set.lastDownloadedAt) }}</span>
            </td>
            <td>
              <button @click="initiateDelete(set)" class="btn btn-sm btn-ghost" aria-label="Delete set">
                <Trash2 :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > 0" class="mt-6">
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        v-model:page-size="pageSize"
        @go-to-page="goToPage"
        @update:page-size="handlePageSizeChange"
      />
    </div>

    <div v-if="setItems.length === 0" class="text-center py-8">
      <p class="text-light">No sets found</p>
      <router-link to="/downloads" class="btn btn-primary mt-4">
        Download Sets
      </router-link>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <dialog :class="['modal', { 'modal-open': showDeleteModal }]">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Delete Set "{{ setToDelete?.name }}"?</h3>

      <div v-if="deleteImpactLoading" class="flex justify-center py-4">
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <div v-else-if="deleteStats" class="space-y-3">
        <p class="text-sm">This action will:</p>

        <div class="bg-error/10 p-3 rounded-lg" v-if="hasItemsToDelete">
          <p class="font-semibold text-error mb-2">Delete permanently:</p>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li v-if="deleteStats.vocabToDelete > 0">{{ deleteStats.vocabToDelete }} vocab items</li>
            <li v-if="deleteStats.resourcesToDelete > 0">{{ deleteStats.resourcesToDelete }} resources</li>
            <li v-if="deleteStats.factCardsToDelete > 0">{{ deleteStats.factCardsToDelete }} fact cards</li>
            <li v-if="deleteStats.goalsToDelete > 0">{{ deleteStats.goalsToDelete }} goals</li>
          </ul>
        </div>

        <div class="bg-warning/10 p-3 rounded-lg" v-if="hasItemsToUpdate">
          <p class="font-semibold text-warning mb-2">Update (remove from this set):</p>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li v-if="deleteStats.vocabToUpdate > 0">{{ deleteStats.vocabToUpdate }} vocab items</li>
            <li v-if="deleteStats.resourcesToUpdate > 0">{{ deleteStats.resourcesToUpdate }} resources</li>
            <li v-if="deleteStats.factCardsToUpdate > 0">{{ deleteStats.factCardsToUpdate }} fact cards</li>
            <li v-if="deleteStats.goalsToUpdate > 0">{{ deleteStats.goalsToUpdate }} goals</li>
          </ul>
        </div>

        <div v-if="!hasItemsToDelete && !hasItemsToUpdate" class="bg-info/10 p-3 rounded-lg">
          <p class="text-sm">This set has no associated content. Only the set itself will be deleted.</p>
        </div>

        <p class="text-sm font-semibold text-error mt-4">This action cannot be undone!</p>
      </div>

      <div class="modal-action">
        <button @click="closeDeleteModal" class="btn btn-ghost" :disabled="deleting">Cancel</button>
        <button @click="confirmDelete" class="btn btn-error" :disabled="deleting || deleteImpactLoading">
          <span v-if="deleting" class="loading loading-spinner loading-sm"></span>
          <span v-else>Delete</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeDeleteModal">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import { LocalSetDeleteService, type DeleteSetStats } from '@/entities/local-sets/LocalSetDeleteService';
import Pagination from '@/shared/ui/Pagination.vue';
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router';
import { useToast } from '@/shared/toasts';
import { Trash2 } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const localSetRepo = inject<LocalSetRepoContract>('localSetRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const resourceRepo = inject<ResourceRepoContract>('resourceRepo')!;
const factCardRepo = inject<FactCardRepoContract>('factCardRepo')!;
const goalRepo = inject<GoalRepoContract>('goalRepo')!;

// Create delete service
const deleteService = new LocalSetDeleteService(
  localSetRepo,
  vocabRepo,
  resourceRepo,
  factCardRepo,
  goalRepo
);

// Data
const setItems = ref<LocalSetData[]>([]);
const totalCount = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

// Delete modal state
const showDeleteModal = ref(false);
const setToDelete = ref<LocalSetData | null>(null);
const deleteStats = ref<DeleteSetStats | null>(null);
const deleteImpactLoading = ref(false);
const deleting = ref(false);

// URL parameter initialization
function parseArrayParam(value: LocationQueryValue | LocationQueryValue[]): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => v !== null);
  }
  return value.split(',').filter(v => v.length > 0);
}

// Filters and search - initialized from URL parameters
const searchQuery = ref(route.query.search as string || '');
const selectedLanguages = ref<string[]>(parseArrayParam(route.query.languages));

// Pagination - initialized from URL parameters
const currentPage = ref(parseInt(route.query.page as string) || 1);
const pageSize = ref(parseInt(route.query.pageSize as string) || 25);

// Available options for filters
const availableLanguages = ref<LanguageData[]>([]);

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value));

const hasItemsToDelete = computed(() => {
  if (!deleteStats.value) return false;
  return (
    deleteStats.value.vocabToDelete > 0 ||
    deleteStats.value.resourcesToDelete > 0 ||
    deleteStats.value.factCardsToDelete > 0 ||
    deleteStats.value.goalsToDelete > 0
  );
});

const hasItemsToUpdate = computed(() => {
  if (!deleteStats.value) return false;
  return (
    deleteStats.value.vocabToUpdate > 0 ||
    deleteStats.value.resourcesToUpdate > 0 ||
    deleteStats.value.factCardsToUpdate > 0 ||
    deleteStats.value.goalsToUpdate > 0
  );
});

// URL parameter synchronization
function updateUrlParams() {
  const query: Record<string, string | undefined> = {};

  if (searchQuery.value.trim()) {
    query.search = searchQuery.value.trim();
  }
  if (selectedLanguages.value.length > 0) {
    query.languages = selectedLanguages.value.join(',');
  }
  if (currentPage.value > 1) {
    query.page = currentPage.value.toString();
  }
  if (pageSize.value !== 25) {
    query.pageSize = pageSize.value.toString();
  }

  router.replace({ query });
}

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | undefined;
function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    updateUrlParams();
    loadSets();
  }, 300);
}

// Filter methods
function toggleLanguage(languageCode: string) {
  const index = selectedLanguages.value.indexOf(languageCode);
  if (index > -1) {
    selectedLanguages.value.splice(index, 1);
  } else {
    selectedLanguages.value.push(languageCode);
  }
  currentPage.value = 1;
  updateUrlParams();
  loadSets();
}

// Pagination
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    updateUrlParams();
    loadSets();
  }
}

function handlePageSizeChange(newSize: number) {
  pageSize.value = newSize;
  currentPage.value = 1;
  updateUrlParams();
  loadSets();
}

// Helper methods
function getLanguageName(code: string): string {
  const language = availableLanguages.value.find(l => l.code === code);
  return language?.name || code.toUpperCase();
}

function getLanguageEmoji(code: string): string | undefined {
  const language = availableLanguages.value.find(l => l.code === code);
  return language?.emoji;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

// Main load function
async function loadSets() {
  loading.value = true;
  error.value = null;

  try {
    let allSets = await localSetRepo.getAllLocalSets();

    // Apply search filter
    if (searchQuery.value?.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      allSets = allSets.filter(set => {
        return (
          set.name.toLowerCase().includes(query) ||
          set.description?.toLowerCase().includes(query)
        );
      });
    }

    // Apply language filter
    if (selectedLanguages.value.length > 0) {
      allSets = allSets.filter(set => selectedLanguages.value.includes(set.language));
    }

    // Sort by lastDownloadedAt descending
    allSets.sort((a, b) => {
      return new Date(b.lastDownloadedAt).getTime() - new Date(a.lastDownloadedAt).getTime();
    });

    totalCount.value = allSets.length;

    // Apply pagination
    const offset = (currentPage.value - 1) * pageSize.value;
    setItems.value = allSets.slice(offset, offset + pageSize.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load sets';
  } finally {
    loading.value = false;
  }
}

// Delete operations
async function initiateDelete(set: LocalSetData) {
  setToDelete.value = set;
  showDeleteModal.value = true;
  deleteImpactLoading.value = true;
  deleteStats.value = null;

  try {
    deleteStats.value = await deleteService.calculateDeleteImpact(set.id);
  } catch (err) {
    console.error('Delete impact calculation error:', err);
    toast.error(`Failed to calculate delete impact: ${err instanceof Error ? err.message : String(err)}`);
    closeDeleteModal();
  } finally {
    deleteImpactLoading.value = false;
  }
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  setToDelete.value = null;
  deleteStats.value = null;
  deleteImpactLoading.value = false;
}

async function confirmDelete() {
  if (!setToDelete.value) return;

  deleting.value = true;
  try {
    await deleteService.deleteSetAndAssociatedEntities(setToDelete.value.id);
    toast.success(`Successfully deleted ${setToDelete.value.name}`);
    closeDeleteModal();
    await loadSets(); // Reload to update the list
  } catch (err) {
    toast.error('Failed to delete set');
    error.value = err instanceof Error ? err.message : 'Failed to delete set';
  } finally {
    deleting.value = false;
  }
}

async function loadFilterOptions() {
  try {
    availableLanguages.value = await languageRepo.getAll();

    // If no URL filters are set, initialize with all languages selected
    if (selectedLanguages.value.length === 0) {
      selectedLanguages.value = availableLanguages.value.map(l => l.code);
    }
  } catch {
    toast.error('Failed to load filter options');
  }
}

// Watch for URL parameter changes from browser navigation
watch(
  () => route.query,
  (newQuery) => {
    searchQuery.value = newQuery.search as string || '';
    selectedLanguages.value = parseArrayParam(newQuery.languages);
    currentPage.value = parseInt(newQuery.page as string) || 1;
    pageSize.value = parseInt(newQuery.pageSize as string) || 25;
    loadSets();
  }
);

onMounted(async () => {
  await loadFilterOptions();
  await loadSets();
});
</script>
