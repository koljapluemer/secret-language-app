<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1>{{ situation?.description || 'Loading...' }}</h1>
      <router-link to="/situations" class="btn btn-outline">Back to List</router-link>
    </div>

    <div v-if="loading" class="text-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="mt-4">Loading...</p>
    </div>

    <div v-else-if="error" class="alert alert-error mb-6">
      <span>{{ error }}</span>
    </div>

    <div v-else-if="situation">
      <div class="flex gap-2 mb-4">
        <button @click="showSelectModal = true" class="btn btn-outline">Add Existing Goal</button>
        <button @click="showCreateModal = true" class="btn btn-primary">Create New Goal</button>
      </div>

      <!-- Goals Table -->
      <div v-if="goalsList.length === 0" class="text-center py-8">
        <p class="text-light">No goals attached to this situation yet</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table table-zebra">
          <thead>
            <tr>
              <th>Title</th>
              <th>Language</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="goal in goalsList" :key="goal.id">
              <td>
                <router-link :to="`/goals/${goal.id}/edit`" class="link link-hover">
                  {{ goal.title }}
                </router-link>
              </td>
              <td>{{ getLanguageName(goal.language) }}</td>
              <td>
                <button @click="removeGoal(goal.id)" class="btn btn-sm btn-ghost" aria-label="Remove goal">
                  <Trash2 :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <SelectGoalModal
      :show="showSelectModal"
      :exclude-goal-ids="situation?.goals || []"
      @close="showSelectModal = false"
      @goal-selected="handleGoalSelected"
    />

    <AddGoalModal
      :show="showCreateModal"
      @close="showCreateModal = false"
      @goal-added="handleGoalAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, toRaw } from 'vue';
import { useRoute } from 'vue-router';
import type { SituationRepoContract } from '@/entities/situation/SituationRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { SituationData } from '@/entities/situation/SituationData';
import type { GoalData } from '@/entities/goals/GoalData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import { useToast } from '@/shared/toasts';
import { Trash2 } from 'lucide-vue-next';
import SelectGoalModal from '@/features/goal-select/SelectGoalModal.vue';
import AddGoalModal from '@/features/goal-add/AddGoalModal.vue';

const route = useRoute();
const situationRepo = inject<SituationRepoContract>('situationRepo')!;
const goalRepo = inject<GoalRepoContract>('goalRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;
const toast = useToast();

const situation = ref<SituationData | null>(null);
const goalsList = ref<GoalData[]>([]);
const allLanguages = ref<LanguageData[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showSelectModal = ref(false);
const showCreateModal = ref(false);

async function loadSituation() {
  loading.value = true;
  error.value = null;

  try {
    const situationId = route.params.id as string;
    const loadedSituation = await situationRepo.getSituationsByIds([situationId]);

    if (loadedSituation.length === 0) {
      error.value = 'Situation not found';
      return;
    }

    situation.value = loadedSituation[0];
    allLanguages.value = await languageRepo.getAll();
    await loadGoals();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load situation';
  } finally {
    loading.value = false;
  }
}

async function loadGoals() {
  if (!situation.value) return;

  try {
    const goalsPromises = situation.value.goals.map(id => goalRepo.getById(id));
    const goalsResults = await Promise.all(goalsPromises);
    goalsList.value = goalsResults.filter((g): g is GoalData => g !== undefined);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.error(`Failed to load goals: ${errorMessage}`);
  }
}

async function handleGoalSelected(goalId: string) {
  if (!situation.value) return;

  try {
    console.log('PageSituationEdit: handleGoalSelected called with goalId:', goalId);
    const updatedSituation = {
      id: situation.value.id,
      description: situation.value.description,
      goals: [...toRaw(situation.value.goals), goalId],
      relevantForLanguages: [...toRaw(situation.value.relevantForLanguages)]
    };
    console.log('PageSituationEdit: updatedSituation prepared:', updatedSituation);

    await situationRepo.updateSituation(updatedSituation);
    console.log('PageSituationEdit: Situation updated successfully');
    situation.value = updatedSituation;
    await loadGoals();
    toast.success('Goal added to situation');
  } catch (err) {
    console.error('PageSituationEdit: Error in handleGoalSelected:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.error(`Failed to add goal: ${errorMessage}`);
  }
}

async function handleGoalAdded(goalId: string) {
  console.log('PageSituationEdit: handleGoalAdded called with goalId:', goalId);
  await handleGoalSelected(goalId);
}

async function removeGoal(goalId: string) {
  if (!situation.value) return;
  if (!confirm('Remove this goal from the situation?')) return;

  try {
    const updatedSituation = {
      id: situation.value.id,
      description: situation.value.description,
      goals: toRaw(situation.value.goals).filter(id => id !== goalId),
      relevantForLanguages: [...toRaw(situation.value.relevantForLanguages)]
    };

    await situationRepo.updateSituation(updatedSituation);
    situation.value = updatedSituation;
    await loadGoals();
    toast.success('Goal removed from situation');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.error(`Failed to remove goal: ${errorMessage}`);
  }
}

function getLanguageName(code: string): string {
  const lang = allLanguages.value.find(l => l.code === code);
  return lang ? `${lang.emoji} ${lang.name}` : code;
}

onMounted(async () => {
  await loadSituation();
});
</script>
