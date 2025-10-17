<script setup lang="ts">
import { inject, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { Task } from '@/tasks/Task';
import { generateConsumeImmersionContent } from '@/tasks/task-consume-immersion-content/generate';
import TaskRenderer from '@/tasks/ui/TaskRenderer.vue';
import { useRouter } from 'vue-router';

// Inject repositories
const resourceRepo = inject<ResourceRepoContract>('resourceRepo');

if (!resourceRepo) {
  throw new Error('Required repositories not available');
}

const route = useRoute();
const router = useRouter();

// Get query param
const resourceId = computed(() => route.query.resource as string);

// Simple state
const resource = ref<ResourceData | null>(null);
const task = ref<Task | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);
const isComplete = ref(false);

// Load resource and generate task
async function loadTask() {
  try {
    isLoading.value = true;
    error.value = null;

    if (!resourceId.value) {
      error.value = 'No resource ID provided';
      isLoading.value = false;
      return;
    }

    if (!resourceRepo) {
      error.value = 'Repository not available';
      isLoading.value = false;
      return;
    }

    // Fetch resource
    const resourceData = await resourceRepo.getResourceById(resourceId.value);

    if (!resourceData) {
      error.value = 'Resource not found';
      isLoading.value = false;
      return;
    }

    if (!resourceData.isImmersionContent) {
      error.value = 'This resource is not immersion content';
      isLoading.value = false;
      return;
    }

    resource.value = resourceData;

    // Generate task
    task.value = generateConsumeImmersionContent(resourceData);
    isLoading.value = false;
  } catch {
    error.value = 'Failed to load resource. Please try again.';
    isLoading.value = false;
  }
}

// Load on mount
onMounted(loadTask);

// Handle task completion
function handleTaskFinished() {
  isComplete.value = true;
}

// Return to self-test home
function returnToSelfTest() {
  router.push({ name: 'self-test' });
}
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="flex justify-center items-center min-h-96">
    <div class="text-center">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4 text-lg">{{ $t('selfTest.loadingTest') }}</p>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="alert alert-error">
    <span>{{ error }}</span>
    <button class="btn btn-sm" @click="returnToSelfTest">
      {{ $t('selfTest.returnToTests') }}
    </button>
  </div>

  <!-- Completed -->
  <div v-else-if="isComplete" class="hero min-h-96">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">{{ $t('selfTest.consumeResourceComplete') }}</h1>
        <p class="py-6">{{ $t('selfTest.consumeResourceCompleteMessage') }}</p>
        <button class="btn btn-primary" @click="returnToSelfTest">
          {{ $t('selfTest.returnToTests') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Task -->
  <div v-else-if="task">
    <div class="mb-4">
      <h2 class="text-2xl font-bold">{{ resource?.title }}</h2>
      <p class="text-sm text-base-content/70">{{ $t('selfTest.consumeResourceInstructions') }}</p>
    </div>
    <TaskRenderer
      :key="task.id"
      :task="task"
      :practice-context="{ practiceMode: 'consume-resource', isTest: true }"
      @finished="handleTaskFinished"
    />
  </div>
</template>
