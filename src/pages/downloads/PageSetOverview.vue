<template>
  <div class="mb-6">
    <router-link to="/downloads" class="btn btn-ghost btn-sm mb-4">
      {{ $t('downloads.backToDownloads') }}
    </router-link>
  </div>

  <div v-if="loading" class="flex items-center justify-center py-16">
    <span class="loading loading-spinner loading-lg"></span>
    <span class="ml-4">{{ $t('downloads.loadingSetInfo') }}</span>
  </div>

  <div v-else-if="error" class="alert alert-error">
    {{ error }}
  </div>

  <div v-else class="max-w-2xl mx-auto">
    <div class="card shadow">
      <div class="card-body">
        <h1>{{ metadata?.title || setName }}</h1>
        <p class="text-base-content/60 mb-4">
          <span class=" ">{{ language.toUpperCase() }}</span>
        </p>

        <p v-if="metadata?.description" class="text-base-content/80 mb-6">
          {{ metadata.description }}
        </p>

        <div class="divider"></div>

        <div v-if="isDownloaded && !downloading" class="alert alert-success mb-6">
          <CheckCircle class="w-5 h-5" />
          <span>{{ $t('downloads.alreadyDownloaded') }}</span>
        </div>

        <!-- Download progress -->
        <div v-if="downloading && downloadProgress" class="flex flex-col gap-2 mb-6">
          <div class="text-sm text-base-content/70 text-center">{{ downloadProgress.phase }}</div>
          <div class="flex items-center gap-2">
            <progress
              class="progress progress-primary flex-1"
              :value="downloadProgress.percentage"
              max="100"
            ></progress>
            <span class="text-sm font-mono w-12 text-right">{{ downloadProgress.percentage }}%</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div v-else class="card-actions justify-center flex-col gap-3 mx-auto items-center">
          <button @click="downloadOnly"
            :class="metadata?.preferredMode ? 'btn btn-outline' : 'btn btn-primary'">
            <Download class="w-5 h-5 mr-2" />
            {{ isDownloaded ? $t('downloads.redownload') : $t('downloads.download') }}
          </button>
          <button v-if="metadata?.preferredMode" @click="downloadAndStart" class="btn btn-primary btn-xl">
            <Play v-if="!isDownloaded" class="w-5 h-5 mr-2" />
            Start Practice
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Download, CheckCircle, Play } from 'lucide-vue-next';
import { UnifiedRemoteSetService, type DownloadProgress } from '@/pages/downloads/UnifiedRemoteSetService';
import { DownloadAndPracticeService } from '@/pages/downloads/DownloadAndPracticeService';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import { remoteSetMetaDataSchema } from '@/entities/remote-sets/remoteSetMetaData';
import { z } from 'zod';

const route = useRoute();
const router = useRouter();

const language = computed(() => route.params.language as string);
const setName = computed(() => route.params.setName as string);

const metadata = ref<z.infer<typeof remoteSetMetaDataSchema> | null>(null);
const loading = ref(true);
const downloading = ref(false);
const downloadProgress = ref<DownloadProgress | null>(null);
const error = ref<string | null>(null);
const isDownloaded = ref(false);

const localSetRepo = inject<LocalSetRepoContract>('localSetRepo')!;
const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const noteRepo = inject<NoteRepoContract>('noteRepo')!;
const resourceRepo = inject<ResourceRepoContract>('resourceRepo')!;
const goalRepo = inject<GoalRepoContract>('goalRepo')!;
const factCardRepo = inject<FactCardRepoContract>('factCardRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;

const remoteSetService = new UnifiedRemoteSetService(
  localSetRepo,
  vocabRepo,
  translationRepo,
  noteRepo,
  resourceRepo,
  goalRepo,
  factCardRepo,
  languageRepo
);

const downloadAndPracticeService = new DownloadAndPracticeService(remoteSetService, localSetRepo, router);

async function loadSetInfo() {
  loading.value = true;
  error.value = null;

  try {
    // Load metadata
    metadata.value = await remoteSetService.getSetMetadata(language.value, setName.value);

    // Check if downloaded
    isDownloaded.value = await remoteSetService.isSetDownloaded(setName.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load set information';
  } finally {
    loading.value = false;
  }
}

async function downloadAndStart() {
  await downloadAndPracticeService.downloadAndStartPractice({
    language: language.value,
    setName: setName.value,
    onDownloadStart: () => {
      downloading.value = true;
      downloadProgress.value = null;
      error.value = null;
    },
    onDownloadProgress: (progress) => {
      downloadProgress.value = progress;
    },
    onDownloadComplete: () => {
      isDownloaded.value = true;
      downloading.value = false;
      downloadProgress.value = null;
    },
    onError: (errorMessage) => {
      error.value = errorMessage;
      downloading.value = false;
      downloadProgress.value = null;
    }
  });
}

async function downloadOnly() {
  await downloadAndPracticeService.downloadOnly({
    language: language.value,
    setName: setName.value,
    onDownloadStart: () => {
      downloading.value = true;
      downloadProgress.value = null;
      error.value = null;
    },
    onDownloadProgress: (progress) => {
      downloadProgress.value = progress;
    },
    onDownloadComplete: () => {
      isDownloaded.value = true;
      downloading.value = false;
      downloadProgress.value = null;
    },
    onError: (errorMessage) => {
      error.value = errorMessage;
      downloading.value = false;
      downloadProgress.value = null;
    }
  });
}

onMounted(loadSetInfo);
</script>