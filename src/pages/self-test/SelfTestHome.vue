<script setup lang="ts">
import { ref, computed } from 'vue';
import { modes } from '@/modes/modes';
import SetSelectionModal from '@/widgets/test/SetSelectionModal.vue';

// Filter modes that have the "test" property
const testModes = computed(() =>
  modes.filter((mode): mode is typeof mode & { test: NonNullable<typeof mode.test> } =>
    mode.test !== undefined
  )
);

// Modal state
const showModal = ref(false);
const selectedMode = ref<string>('');
const selectedTestType = ref<'seen' | 'all'>('all');

function openModal(modeName: string, testType: 'seen' | 'all') {
  selectedMode.value = modeName;
  selectedTestType.value = testType;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}
</script>

<template>
  <div class="practice-overview">
    <h1>{{ $t('selfTest.title') }}</h1>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
      <div v-for="option in testModes" :key="option.name"
        class="card shadow transition-hover hover:shadow-md">
        <div class="card-body text-center">
          <div class="flex justify-center mb-4">
            <component :is="option.icon" :size="48" />
          </div>
          <h2>{{ option.name }}</h2>
          <p class="text-light mb-4">{{ option.description }}</p>

          <div class="flex flex-col gap-2">
            <button
              class="btn btn-sm"
              @click="openModal(option.test.name.replace('test-mode-', ''), 'seen')"
            >
              {{ $t('selfTest.testSeenVocab') }}
            </button>
            <button
              class="btn btn-sm"
              @click="openModal(option.test.name.replace('test-mode-', ''), 'all')"
            >
              {{ $t('selfTest.testAllVocab') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Set Selection Modal -->
    <SetSelectionModal
      :show="showModal"
      :mode-id="selectedMode"
      :test-type="selectedTestType"
      @close="closeModal"
    />
  </div>
</template>
