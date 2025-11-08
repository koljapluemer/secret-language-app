<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1>Situations</h1>
      <button @click="showAddModal = true" class="btn btn-primary">Add New Situation</button>
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
        <span class="text-light">{{ totalCount }} situations</span>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>Description</th>
              <th>Goals Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="situation in situationItems" :key="situation.id">
              <td class="max-w-md">
                <router-link :to="`/situations/${situation.id}/edit`" class="link link-hover">
                  <div class="truncate" :title="situation.description">
                    {{ situation.description }}
                  </div>
                </router-link>
              </td>
              <td>{{ situation.goals.length }}</td>
              <td>
                <button @click="deleteSituation(situation.id)" class="btn btn-sm btn-ghost" aria-label="Delete situation">
                  <Trash2 :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="situationItems.length === 0" class="text-center py-8">
        <p class="text-light">No situations found</p>
      </div>
    </div>

    <AddSituationModal
      :show="showAddModal"
      @close="showAddModal = false"
      @situation-added="handleSituationAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import type { SituationRepoContract } from '@/entities/situation/SituationRepoContract';
import type { SituationData } from '@/entities/situation/SituationData';
import { useToast } from '@/shared/toasts';
import { Trash2 } from 'lucide-vue-next';
import AddSituationModal from '@/features/situation-add/AddSituationModal.vue';

const situationRepo = inject<SituationRepoContract>('situationRepo')!;
const toast = useToast();

// Data
const situationItems = ref<SituationData[]>([]);
const totalCount = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const showAddModal = ref(false);

// Main load function
async function loadSituations() {
  loading.value = true;
  error.value = null;

  try {
    const situations = await situationRepo.getAllSituations();
    situationItems.value = situations;
    totalCount.value = situations.length;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load situations';
  } finally {
    loading.value = false;
  }
}

async function deleteSituation(id: string) {
  const situationToDelete = situationItems.value.find(s => s.id === id);
  if (!situationToDelete || !confirm(`Are you sure you want to delete this situation?`)) {
    return;
  }

  try {
    await situationRepo.deleteSituations([id]);
    await loadSituations(); // Reload list
    toast.success('Situation deleted successfully');
  } catch {
    toast.error('Failed to delete situation');
    error.value = 'Failed to delete situation';
  }
}

async function handleSituationAdded() {
  showAddModal.value = false;
  await loadSituations();
}

onMounted(async () => {
  await loadSituations();
});
</script>
