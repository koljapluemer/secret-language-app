<template>
  <div class="flex justify-between items-center mb-6">
    <h1>{{ $t('goals.edit') }}</h1>
    <router-link to="/goals" class="btn btn-outline">
      {{ $t('goals.backToList') }}
    </router-link>
  </div>

  <div v-if="loading" class="flex justify-center py-12">
    <span class="loading loading-spinner loading-lg"></span>
  </div>

  <div v-else-if="goal" class="space-y-8">
    <!-- Basic Goal Information -->
    <section>
      <h2>{{ $t('goals.details') }}</h2>
      <GoalEditFormRenderer :goal="goal" @goal-updated="handleGoalUpdate" />
    </section>

    <!-- Knowledge Section -->
    <section>
      <h2>{{ $t('goals.knowledgeAndVocab') }}</h2>
      <ManageGoalVocab :goal="goal" @goal-updated="handleGoalUpdate" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { GoalData } from '@/entities/goals/GoalData';
import GoalEditFormRenderer from './ui/GoalEditFormRenderer.vue';
import ManageGoalVocab from '@/widgets/manage-goal-vocab/ManageGoalVocab.vue';

const route = useRoute();
const router = useRouter();
const goalRepo = inject<GoalRepoContract>('goalRepo')!;

const goal = ref<GoalData | null>(null);
const loading = ref(true);

async function loadGoal() {
  loading.value = true;
  
  const goalId = route.params.id as string;
  const loadedGoal = await goalRepo.getById(goalId);
  if (!loadedGoal) {
    router.push('/goals');
    return;
  }
  goal.value = loadedGoal;
  
  loading.value = false;
}

async function handleGoalUpdate(updatedGoal: GoalData) {
  goal.value = updatedGoal;
}


onMounted(loadGoal);
</script>