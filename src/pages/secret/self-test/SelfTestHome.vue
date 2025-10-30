<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { modes } from '@/modes/modes';
import SetSelectionModal from '@/widgets/test/SetSelectionModal.vue';
import ResourceSelectionModal from '@/widgets/test/ResourceSelectionModal.vue';
import type { TestResultRepoContract } from '@/entities/test-results/TestResultRepoContract';
import type { TestResultData } from '@/entities/test-results/TestResultData';
import { useToast } from '@/shared/toasts';

// Inject repositories
const testResultRepo = inject<TestResultRepoContract>('testResultRepo');
const router = useRouter();
const toast = useToast();

if (!testResultRepo) {
  throw new Error('TestResultRepo not available');
}

// Filter modes that have the "test" property
const testModes = computed(() =>
  modes.filter((mode): mode is typeof mode & { test: NonNullable<typeof mode.test> } =>
    mode.test !== undefined
  )
);

// Modal state
const showSetModal = ref(false);
const showResourceModal = ref(false);
const selectedMode = ref<string>('');
const selectedTestType = ref<'seen' | 'all'>('all');

function openSetModal(modeName: string, testType: 'seen' | 'all') {
  selectedMode.value = modeName;
  selectedTestType.value = testType;
  showSetModal.value = true;
}

function openResourceModal(modeName: string) {
  selectedMode.value = modeName;
  showResourceModal.value = true;
}

function closeSetModal() {
  showSetModal.value = false;
}

function closeResourceModal() {
  showResourceModal.value = false;
}

function isResourceBasedTest(modeName: string): boolean {
  return modeName === 'Consume Resource';
}

// Test history state
const testHistory = ref<TestResultData[]>([]);
const currentPage = ref(1);
const pageSize = 10;
const totalResults = ref(0);
const isLoadingHistory = ref(false);

const totalPages = computed(() => Math.ceil(totalResults.value / pageSize));
const showPagination = computed(() => totalPages.value > 1);

// Load test history
async function loadTestHistory() {
  if (!testResultRepo) return;

  try {
    isLoadingHistory.value = true;
    const offset = (currentPage.value - 1) * pageSize;

    const [results, total] = await Promise.all([
      testResultRepo.getTestResultsPaginated(offset, pageSize),
      testResultRepo.getTotalTestResultsCount()
    ]);

    testHistory.value = results;
    totalResults.value = total;
  } catch (err) {
    toast.error(`Failed to load test history: ${String(err)}`);
  } finally {
    isLoadingHistory.value = false;
  }
}

// Pagination handlers
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadTestHistory();
  }
}

function nextPage() {
  goToPage(currentPage.value + 1);
}

function prevPage() {
  goToPage(currentPage.value - 1);
}

// Rerun test with same conditions
function rerunTest(result: TestResultData) {
  const config = result.testConfig;

  if (config.type === 'vocab-based') {
    router.push({
      name: `test-mode-${config.mode}`,
      query: {
        set: config.setId,
        type: config.testType
      }
    });
  } else if (config.type === 'resource-based') {
    router.push({
      name: `test-mode-${config.mode}`,
      query: {
        resource: config.resourceId
      }
    });
  }
}

// Delete test result
async function deleteTestResult(id: string) {
  if (!testResultRepo) return;

  try {
    await testResultRepo.deleteTestResult(id);
    toast.success('Test result deleted');
    await loadTestHistory();
  } catch (err) {
    toast.error(`Failed to delete test result: ${String(err)}`);
  }
}

// Format date
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format duration
function formatDuration(ms?: number): string {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

// Get score from results
function getScore(result: TestResultData): string {
  if (result.testConfig.type === 'vocab-based' && Array.isArray(result.results)) {
    const correct = result.results.filter(r => r.correct).length;
    const total = result.results.length;
    return `${correct}/${total}`;
  }
  return '-';
}

// Load history on mount
onMounted(() => {
  loadTestHistory();
});
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

          <!-- Resource-based test (single button) -->
          <div v-if="isResourceBasedTest(option.name)" class="flex flex-col gap-2">
            <button
              class="btn btn-sm"
              @click="openResourceModal(option.test.name.replace('test-mode-', ''))"
            >
              {{ $t('selfTest.startTest') }}
            </button>
          </div>

          <!-- Vocab-based test (two buttons) -->
          <div v-else class="flex flex-col gap-2">
            <button
              class="btn btn-sm"
              @click="openSetModal(option.test.name.replace('test-mode-', ''), 'seen')"
            >
              {{ $t('selfTest.testSeenVocab') }}
            </button>
            <button
              class="btn btn-sm"
              @click="openSetModal(option.test.name.replace('test-mode-', ''), 'all')"
            >
              {{ $t('selfTest.testAllVocab') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Set Selection Modal -->
    <SetSelectionModal
      :show="showSetModal"
      :mode-id="selectedMode"
      :test-type="selectedTestType"
      @close="closeSetModal"
    />

    <!-- Resource Selection Modal -->
    <ResourceSelectionModal
      :show="showResourceModal"
      :mode-id="selectedMode"
      @close="closeResourceModal"
    />

    <!-- Test History Section -->
    <div class="mt-12 max-w-6xl mx-auto">
      <h2 class="text-2xl font-bold mb-6">{{ $t('selfTest.history.title') }}</h2>

      <!-- Loading -->
      <div v-if="isLoadingHistory" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Empty state -->
      <div v-else-if="testHistory.length === 0" class="text-center py-8 text-base-content/70">
        <p>{{ $t('selfTest.history.empty') }}</p>
      </div>

      <!-- Test history table -->
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>{{ $t('selfTest.history.date') }}</th>
              <th>{{ $t('selfTest.history.mode') }}</th>
              <th>{{ $t('selfTest.history.score') }}</th>
              <th>{{ $t('selfTest.history.duration') }}</th>
              <th>{{ $t('selfTest.history.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in testHistory" :key="result.id">
              <td>{{ formatDate(result.completedAt) }}</td>
              <td class="capitalize">{{ result.testMode.replace('-', ' ') }}</td>
              <td>{{ getScore(result) }}</td>
              <td>{{ formatDuration(result.durationMs) }}</td>
              <td>
                <div class="flex gap-2">
                  <button
                    class="btn btn-xs btn-primary"
                    @click="rerunTest(result)"
                    :title="$t('selfTest.history.rerun')"
                  >
                    {{ $t('selfTest.history.rerun') }}
                  </button>
                  <button
                    class="btn btn-xs btn-error"
                    @click="deleteTestResult(result.id)"
                    :title="$t('selfTest.history.delete')"
                  >
                    {{ $t('selfTest.history.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="showPagination" class="flex justify-center gap-2 mt-6">
          <button
            class="btn btn-sm"
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            {{ $t('selfTest.history.previous') }}
          </button>

          <span class="flex items-center px-4">
            {{ $t('selfTest.history.pageInfo', { current: currentPage, total: totalPages }) }}
          </span>

          <button
            class="btn btn-sm"
            :disabled="currentPage === totalPages"
            @click="nextPage"
          >
            {{ $t('selfTest.history.next') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
