<script setup lang="ts">
import { inject, ref, computed, onMounted } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { generateSetStudyTask, type SetStudyOptions } from './generateSetStudyTasks';
import { useUsedVocabTracker } from '@/features/track/useUsedVocabTracker';
import { BookOpen } from 'lucide-vue-next';
import { useToast } from '@/shared/toasts';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const translationRepo = inject<TranslationRepoContract>('translationRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');
const localSetRepo = inject<LocalSetRepoContract>('localSetRepo');
const toast = useToast();

if (!vocabRepo || !translationRepo || !languageRepo || !localSetRepo) {
  throw new Error('Required repositories not available');
}

const { addUsedVocab, getLastUsedVocabId } = useUsedVocabTracker();

// Settings
const showSettings = ref(true);
const availableSets = ref<LocalSetData[]>([]);
const selectedSetId = ref<string>('');
const maxNewVocab = ref<number>(10);
const currentNewVocabCount = ref<number>(0);
const loadingSets = ref(false);

const selectedSet = computed(() => {
  return availableSets.value.find(set => set.id === selectedSetId.value);
});

const canStartStudy = computed(() => {
  return selectedSetId.value && selectedSet.value;
});

// Load available sets
async function loadAvailableSets() {
  loadingSets.value = true;
  try {
    const sets = await localSetRepo!.getAllLocalSets();
    availableSets.value = sets;

    if (sets.length > 0) {
      const latestSet = sets.reduce((latest, current) => {
        return current.lastDownloadedAt > latest.lastDownloadedAt ? current : latest;
      });
      selectedSetId.value = latestSet.id;
    }
  } catch {
    toast.error('Failed to load available sets');
  } finally {
    loadingSets.value = false;
  }
}

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'set-study',
  generateTask: async () => {
    if (!selectedSetId.value) return null;

    const options: SetStudyOptions = {
      setId: selectedSetId.value,
      maxNewVocab: maxNewVocab.value,
      currentNewVocabCount: currentNewVocabCount.value
    };

    const lastVocabId = getLastUsedVocabId();
    const blockList = lastVocabId ? [lastVocabId] : undefined;

    return await generateSetStudyTask(
      vocabRepo,
      translationRepo,
      options,
      blockList
    );
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    if (!vocabId) return;

    addUsedVocab(vocabId);

    void (async () => {
      try {
        const vocab = await vocabRepo.getVocabByUID(vocabId);
        if (vocab && vocab.progress.level === -1) {
          currentNewVocabCount.value++;
        }
      } catch {
        toast.error('Error tracking new vocab count');
      }
    })();
  },
  messages: {
    loading: 'Loading set study exercises...',
    empty: selectedSet.value
      ? `No vocabulary available for practice in "${selectedSet.value.name}".`
      : 'No set selected for study.',
    error: 'Failed to initialize set study session. Please try again.'
  }
});

async function startSetStudy() {
  if (!canStartStudy.value) return;

  currentNewVocabCount.value = 0;
  showSettings.value = false;
  await mode.initialize();
}

onMounted(() => {
  loadAvailableSets();
});
</script>

<template>
  <!-- Settings Screen -->
  <div v-if="showSettings" class="hero min-h-96">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <div class="flex justify-center mb-4">
          <BookOpen :size="48" />
        </div>
        <h1 class="text-2xl font-bold mb-4">{{ $t('practice.modes.setStudy.setup.title') }}</h1>
        <p class="mb-6">{{ $t('practice.modes.setStudy.setup.description') }}</p>

        <!-- Set Selection -->
        <div class="form-control w-full mb-4">
          <label class="label">
            <span class="label-text">{{ $t('practice.modes.setStudy.setup.selectSet') }}</span>
          </label>
          <select v-model="selectedSetId" class="select select-bordered w-full" :disabled="loadingSets">
            <option value="" disabled>
              {{ loadingSets ? $t('common.loading') : $t('practice.modes.setStudy.setup.chooseSet') }}
            </option>
            <option v-for="set in availableSets" :key="set.id" :value="set.id">
              {{ set.name }} {{ $t('practice.modes.setStudy.setup.setLanguagePrefix') }}{{ set.language }}{{ $t('practice.modes.setStudy.setup.setLanguageSuffix') }}
            </option>
          </select>
          <label class="label" v-if="availableSets.length === 0 && !loadingSets">
            <span class="label-text-alt text-warning">{{ $t('practice.modes.setStudy.setup.noSetsAvailable') }}</span>
          </label>
        </div>

        <!-- Max New Vocab -->
        <div class="form-control w-full mb-6">
          <label class="label">
            <span class="label-text">{{ $t('practice.modes.setStudy.setup.maxNewVocab') }}</span>
          </label>
          <input v-model.number="maxNewVocab" type="number" min="0" max="100" class="input input-bordered w-full"
            :placeholder="$t('practice.modes.setStudy.setup.maxNewVocabPlaceholder')" />
        </div>

        <button @click="startSetStudy" class="btn btn-primary btn-lg w-full"
          :disabled="!canStartStudy || loadingSets">
          {{ $t('practice.modes.setStudy.setup.startStudying') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Practice Mode Layout with Progress Info -->
  <template v-if="!showSettings">
    <!-- Progress Info -->
    <div v-if="mode.state.value.status === 'task'" class="mb-4 text-center">
      <div class="stats stats-horizontal shadow">
        <div class="stat">
          <div class="stat-title">{{ $t('common.currentSet') }}</div>
          <div class="stat-value text-sm">{{ selectedSet?.name }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">{{ $t('common.newVocabProgress') }}</div>
          <div class="stat-value text-sm">{{ currentNewVocabCount }} {{ $t('common.of') }} {{ maxNewVocab }}</div>
        </div>
      </div>
    </div>

    <PracticeModeLayout
      :state="mode.state.value"
      :showLoadingUI="mode.showLoadingUI.value"
      modeId="set-study"
      :retry="mode.retry"
      :initialize="mode.initialize"
      :onTaskFinished="mode.handleTaskFinished"
    />
  </template>
</template>
