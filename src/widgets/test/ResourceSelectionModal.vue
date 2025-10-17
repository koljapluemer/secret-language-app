<script setup lang="ts">
import { ref, inject, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';

interface Props {
  show: boolean;
  modeId: string;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const router = useRouter();
const { t } = useI18n();

const resourceRepo = inject<ResourceRepoContract>('resourceRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const localSetRepo = inject<LocalSetRepoContract>('localSetRepo');

if (!resourceRepo || !languageRepo || !localSetRepo) {
  throw new Error('Required repositories not available');
}

const resources = ref<ResourceData[]>([]);
const availableLanguages = ref<LanguageData[]>([]);
const availableSets = ref<LocalSetData[]>([]);
const loading = ref(false);

// Filters
const selectedLanguages = ref<string[]>([]);
const selectedSets = ref<string[]>([]);
const searchQuery = ref('');

// Computed
const filteredResources = computed(() => {
  return resources.value.filter(resource => {
    // Language filter
    if (selectedLanguages.value.length > 0 && !selectedLanguages.value.includes(resource.language)) {
      return false;
    }

    // Set filter
    if (selectedSets.value.length > 0) {
      const hasMatchingSet = resource.origins.some(origin => selectedSets.value.includes(origin));
      if (!hasMatchingSet) return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      return resource.title.toLowerCase().includes(query) ||
             (resource.content && resource.content.toLowerCase().includes(query));
    }

    return true;
  });
});

const languageFilterTitle = computed(() =>
  `${t('common.languages')} (${selectedLanguages.value.length} ${t('common.selected')})`
);

const setFilterTitle = computed(() =>
  `${t('common.sets')} (${selectedSets.value.length} ${t('common.selected')})`
);

async function loadResources() {
  loading.value = true;
  try {
    if (!resourceRepo || !languageRepo || !localSetRepo) {
      loading.value = false;
      return;
    }

    const allResources = await resourceRepo.getAllResources();
    // Filter to only immersion content
    resources.value = allResources.filter(r => r.isImmersionContent);

    // Load filter options
    [availableLanguages.value, availableSets.value] = await Promise.all([
      languageRepo.getAll(),
      localSetRepo.getAllLocalSets()
    ]);

    // Initialize with all languages and sets selected
    selectedLanguages.value = availableLanguages.value.map(l => l.code);
    selectedSets.value = ['user-added', ...availableSets.value.map(s => s.id)];
  } catch {
    // Failed to load resources
  } finally {
    loading.value = false;
  }
}

function selectResource(resourceId: string) {
  // Navigate to test page with resource param
  router.push({
    name: `test-mode-${props.modeId}`,
    query: {
      resource: resourceId
    }
  });
  emit('close');
}

function toggleLanguage(languageCode: string) {
  const index = selectedLanguages.value.indexOf(languageCode);
  if (index > -1) {
    selectedLanguages.value.splice(index, 1);
  } else {
    selectedLanguages.value.push(languageCode);
  }
}

function toggleSet(setId: string) {
  const index = selectedSets.value.indexOf(setId);
  if (index > -1) {
    selectedSets.value.splice(index, 1);
  } else {
    selectedSets.value.push(setId);
  }
}

function getOriginDisplayName(origin: string): string {
  if (origin === 'user-added') return 'User Added';
  const set = availableSets.value.find(s => s.id === origin);
  return set?.name || origin;
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

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="modal modal-open">
      <div class="modal-box max-w-4xl max-h-[90vh]">
        <h3 class="font-bold text-lg">{{ $t('selfTest.selectResource') }}</h3>
        <p class="py-2 text-sm">{{ $t('selfTest.onlyImmersionContent') }}</p>

        <div v-if="loading" class="flex justify-center items-center min-h-48">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else>
          <!-- Search -->
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$t('resources.search')"
            class="input input-bordered w-full mb-4"
          />

          <!-- Filters -->
          <div class="grid gap-2 md:grid-cols-2 mb-4">
            <!-- Language Filter -->
            <details class="collapse collapse-arrow bg-base-200">
              <summary class="collapse-title font-medium text-sm">
                {{ languageFilterTitle }}
              </summary>
              <div class="collapse-content">
                <ul class="flex flex-col gap-2">
                  <li v-for="language in availableLanguages" :key="language.code">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="selectedLanguages.includes(language.code)"
                        @change="toggleLanguage(language.code)"
                        class="checkbox checkbox-sm"
                      />
                      <span class="flex items-center gap-2 text-sm">
                        <span v-if="language.emoji">{{ language.emoji }}</span>
                        {{ language.name }}
                      </span>
                    </label>
                  </li>
                </ul>
              </div>
            </details>

            <!-- Set Filter -->
            <details class="collapse collapse-arrow bg-base-200">
              <summary class="collapse-title font-medium text-sm">
                {{ setFilterTitle }}
              </summary>
              <div class="collapse-content">
                <ul class="flex flex-col gap-2">
                  <li>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="selectedSets.includes('user-added')"
                        @change="toggleSet('user-added')"
                        class="checkbox checkbox-sm"
                      />
                      <span class="text-sm">{{ $t('common.userAdded') }}</span>
                    </label>
                  </li>
                  <li v-for="set in availableSets" :key="set.id">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="selectedSets.includes(set.id)"
                        @change="toggleSet(set.id)"
                        class="checkbox checkbox-sm"
                      />
                      <span class="text-sm">{{ set.name }}</span>
                    </label>
                  </li>
                </ul>
              </div>
            </details>
          </div>

          <!-- Resources List -->
          <div v-if="filteredResources.length === 0" class="alert alert-info">
            <span>{{ $t('selfTest.noResourcesAvailable') }}</span>
          </div>

          <div v-else class="max-h-96 overflow-y-auto">
            <div class="grid gap-2">
              <button
                v-for="resource in filteredResources"
                :key="resource.id"
                class="btn btn-outline justify-start text-left h-auto py-3"
                @click="selectResource(resource.id)"
              >
                <div class="flex flex-col items-start w-full">
                  <div class="font-semibold">{{ resource.title }}</div>
                  <div class="text-xs opacity-70">{{ resource.language }}</div>
                  <div v-if="resource.content" class="text-sm mt-1 line-clamp-2">
                    {{ resource.content }}
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="origin in resource.origins"
                      :key="origin"
                      class="badge badge-sm badge-ghost"
                    >
                      {{ getOriginDisplayName(origin) }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="close">{{ $t('common.cancel') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
