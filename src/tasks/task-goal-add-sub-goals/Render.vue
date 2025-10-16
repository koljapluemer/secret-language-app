<template>
  <div v-if="goal">
    <h2>{{ goal.title }}</h2>

    <ManageSubGoalsWidget :goal="goal" @goal-updated="handleGoalUpdate" />

    <TaskSkipDisableDone 
      v-if="!showDoneSection"
      :done-disabled="!hasChanges"
      @skip="handleSkip"
      @skip-and-disable="handleSkipAndDisable"
      @done="handleDone"
    />

    <div v-if="showDoneSection" class="mt-6">
      <TaskDecideWhetherToDoAgain 
        question="Do you want to add more sub-goals in the future?"
        @decision="handleFinishDecision" 
      />
    </div>
  </div>

  <div v-else>
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Task } from '@/pages/practice/Task';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { GoalData } from '@/entities/goals/GoalData';
import ManageSubGoalsWidget from '@/features/goal-manage-its-sub-goals/ManageSubGoalsWidget.vue';
import TaskDecideWhetherToDoAgain from '@/tasks/ui/TaskDecideWhetherToDoAgain.vue';
import TaskSkipDisableDone from '@/tasks/ui/TaskSkipDisableDone.vue';
import { useToast } from '@/shared/toasts';

interface Props {
  task: Task;
  repositories: RepositoriesContext;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [];
}>();

const toast = useToast();

const goalRepo = props.repositories.goalRepo!;
const goal = ref<GoalData | null>(null);
const hasChanges = ref(false);
const showDoneSection = ref(false);

async function loadGoal() {
  const goalId = props.task.associatedGoals?.[0];
  if (!goalId) return;
  
  const loadedGoal = await goalRepo.getById(goalId);
  if (!loadedGoal) {
    toast.error('Goal not found');
    return;
  }
  goal.value = loadedGoal;
}

function handleGoalUpdate(updatedGoal: GoalData) {
  goal.value = updatedGoal;
  hasChanges.value = true;
}

const handleSkip = async () => {
  if (!goal.value) return;
  
  try {
    // Just update lastShownAt - no other changes
    await goalRepo.update(goal.value.id, {
      lastShownAt: new Date()
    });

    emit('finished');
  } catch {
    toast.error('Failed to skip goal');
    emit('finished');
  }
};

const handleSkipAndDisable = async () => {
  if (!goal.value) return;
  
  try {
    // Set finishedAddingSubGoals to true
    const updatedGoal = {
      ...JSON.parse(JSON.stringify(goal.value)),
      finishedAddingSubGoals: true,
      lastShownAt: new Date()
    };
    await goalRepo.update(goal.value.id, updatedGoal);

    emit('finished');
  } catch {
    toast.error('Failed to disable goal');
    emit('finished');
  }
};

const handleDone = () => {
  showDoneSection.value = true;
};

const handleFinishDecision = async (wantToDoAgain: boolean) => {
  if (!goal.value) return;
  
  try {
    const updatedGoal = {
      ...JSON.parse(JSON.stringify(goal.value)),
      finishedAddingSubGoals: !wantToDoAgain,
      lastShownAt: new Date()
    };
    await goalRepo.update(goal.value.id, updatedGoal);

    emit('finished');
  } catch {
    toast.error('Failed to complete goal task');
    emit('finished');
  }
};

onMounted(loadGoal);
</script>