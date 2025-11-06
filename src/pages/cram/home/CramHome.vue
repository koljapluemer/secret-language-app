<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { DownloadAndPracticeService } from '@/features/download/DownloadAndPracticeService';
import LanguageDisplay from '@/entities/languages/LanguageDisplay.vue';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LanguageData } from '@/entities/languages/LanguageData';
import { remoteSetMetaDataSchema } from '@/features/download/remoteSetMetaData';
import { useToast } from '@/shared/toasts';
import type { z } from 'zod';
import type { RemoteSetInfo } from '@/features/download/types';
import { RemoteSetService } from '@/features/download/RemoteSetService';

interface ExtendedSetInfo extends RemoteSetInfo {
  language: string;
  languageData?: LanguageData;
  metadata?: z.infer<typeof remoteSetMetaDataSchema>;
}

// Inject repositories
const localSetRepo = inject<LocalSetRepoContract>('localSetRepo')!;
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const glossRepo = inject<GlossRepoContract>('glossRepo')!;
const noteRepo = inject<NoteRepoContract>('noteRepo')!;
const resourceRepo = inject<ResourceRepoContract>('resourceRepo')!;
const goalRepo = inject<GoalRepoContract>('goalRepo')!;
const factCardRepo = inject<FactCardRepoContract>('factCardRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;

const router = useRouter();
const toast = useToast();

// Initialize services
const remoteSetService = new RemoteSetService(
  localSetRepo,
  vocabRepo,
  translationRepo,
  glossRepo,
  noteRepo,
  resourceRepo,
  goalRepo,
  factCardRepo,
  languageRepo
);

const downloadAndPracticeService = new DownloadAndPracticeService(
  remoteSetService,
  localSetRepo,
  router
);

// Component state
const cramSets = ref<ExtendedSetInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const downloadingSetId = ref<string | null>(null);

// Load cram sets from remote
async function loadCramSets() {
  try {
    loading.value = true;
    error.value = null;
    const allSets: ExtendedSetInfo[] = [];

    // Get all available languages
    const languages = await remoteSetService.getAvailableLanguages();

    // For each language, get sets and check for cram mode
    for (const languageCode of languages) {
      const sets = await remoteSetService.getAvailableSets(languageCode);

      for (const set of sets) {
        const metadata = await remoteSetService.getSetMetadata(languageCode, set.name);

        // Only include sets with preferredMode: "cram"
        if (metadata?.preferredMode === 'cram') {
          // Get language data for display
          const languageData = (await languageRepo.getAll())
            .find((lang: LanguageData) => lang.code === languageCode);

          allSets.push({
            ...set,
            language: languageCode,
            languageData,
            metadata
          });
        }
      }
    }

    cramSets.value = allSets;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load cram sets';
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

// Handle start button click
async function handleStart(set: ExtendedSetInfo) {
  try {
    downloadingSetId.value = `${set.language}-${set.name}`;
    error.value = null;

    await downloadAndPracticeService.downloadAndStartPractice({
      language: set.language,
      setName: set.name,
      onError: (errorMessage) => {
        error.value = errorMessage;
        toast.error(errorMessage);
        downloadingSetId.value = null;
      }
    });

    // Navigation is handled by the service
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to start practice';
    error.value = errorMessage;
    toast.error(errorMessage);
    downloadingSetId.value = null;
  }
}

// Load sets on mount
onMounted(() => {
  loadCramSets();
});
</script>

<template>
  <div class="container mx-auto p-4">
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center items-center min-h-[200px]">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-error">
      <span>{{ error }}</span>
      <button class="btn btn-sm" @click="loadCramSets">Retry</button>
    </div>

    <!-- Empty state -->
    <div v-else-if="cramSets.length === 0" class="alert alert-info">
      <span>No cram sets available. Check back later!</span>
    </div>

    <!-- Sets grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="set in cramSets"
        :key="`${set.language}-${set.name}`"
        class="card bg-base-200 shadow-xl"
      >
        <div class="card-body">
          <!-- Set title -->
          <h2 class="card-title">
            {{ set.metadata?.title || set.title || set.name }}
          </h2>

          <!-- Language display -->
          <div v-if="set.languageData" class="mb-2">
            <LanguageDisplay :language="set.languageData" variant="short" />
          </div>

          <!-- Description -->
          <p v-if="set.metadata?.description" class="text-sm text-light">
            {{ set.metadata.description }}
          </p>

          <!-- Actions -->
          <div class="card-actions justify-end mt-4">
            <button
              class="btn btn-primary"
              :disabled="downloadingSetId === `${set.language}-${set.name}`"
              @click="handleStart(set)"
            >
              <span v-if="downloadingSetId === `${set.language}-${set.name}`" class="loading loading-spinner loading-sm"></span>
              <span v-else>Start</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
