<script setup lang="ts">
import { inject, ref } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { Task } from '@/pages/practice/Task';
import { usePracticeMode } from '@/pages/practice/modes/composables/usePracticeMode';
import PracticeModeLayout from '@/pages/practice/modes/components/PracticeModeLayout.vue';
import { generateEyesAndEars, type EyesAndEarsOptions } from './generateEyesAndEarsTasks';

// Inject repositories
const vocabRepo = inject<VocabRepoContract>('vocabRepo');
const languageRepo = inject<LanguageRepoContract>('languageRepo');

if (!vocabRepo || !languageRepo) {
  throw new Error('Required repositories not available');
}

const lastUsedVocabId = ref<string | null>(null);
const showSettings = ref(true);
const exerciseOptions = ref<EyesAndEarsOptions>({
  includeGenerationExercises: true
});

// Practice mode configuration
const mode = usePracticeMode({
  modeId: 'eyes-and-ears',
  generateTask: async () => {
    const languages = await languageRepo.getActiveTargetLanguages();
    const languageCodes = languages.map(lang => lang.code);

    if (languageCodes.length === 0) return null;

    const blockList = lastUsedVocabId.value ? [lastUsedVocabId.value] : undefined;

    return await generateEyesAndEars(vocabRepo, languageCodes, blockList, exerciseOptions.value);
  },
  onTaskTransition: (newCurrentTask: Task) => {
    const vocabId = newCurrentTask.associatedVocab?.[0];
    if (vocabId) {
      lastUsedVocabId.value = vocabId;
    }
  },
  messages: {
    loading: 'Preparing next exercise...',
    empty: 'No vocabulary with both sound and images is currently available for practice.',
    error: 'Failed to initialize Eyes and Ears queue. Please try again.'
  }
});

function startWithGenerationExercises() {
  exerciseOptions.value.includeGenerationExercises = true;
  showSettings.value = false;
  mode.initialize();
}

function startRecallExercisesOnly() {
  exerciseOptions.value.includeGenerationExercises = false;
  showSettings.value = false;
  mode.initialize();
}
</script>

<template>
  <!-- Settings Screen -->
  <div v-if="showSettings" class="hero min-h-96">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-2xl font-bold mb-4">{{ $t('practice.modes.eyesAndEars.setup.title') }}</h1>
        <p class="mb-6">{{ $t('practice.modes.eyesAndEars.setup.description') }}</p>

        <div class="flex flex-col gap-3">
          <button @click="startWithGenerationExercises" class="btn btn-primary btn-lg">
            {{ $t('practice.modes.eyesAndEars.setup.includeGeneration') }}
          </button>
          <button @click="startRecallExercisesOnly" class="btn btn-outline btn-lg">
            {{ $t('practice.modes.eyesAndEars.setup.recallOnly') }}
          </button>
        </div>

        <p class="text-sm text-base-content/70 mt-4">{{ $t('practice.modes.eyesAndEars.setup.hint') }}</p>
      </div>
    </div>
  </div>

  <!-- Practice Mode Layout -->
  <PracticeModeLayout
    v-if="!showSettings"
    :state="mode.state.value"
    :showLoadingUI="mode.showLoadingUI.value"
    modeId="eyes-and-ears"
    :retry="mode.retry"
    :initialize="mode.initialize"
    :onTaskFinished="mode.handleTaskFinished"
    :loadingFallback="$t('practice.widgets.loadingEyesAndEars')"
  />
</template>
