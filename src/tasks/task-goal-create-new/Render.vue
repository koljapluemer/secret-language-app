<template>
  <div class="flex flex-col h-full w-full">
    <Instruction :prompt="task.prompt" />

    <div class="flex-1 overflow-auto min-h-0">
      <div class="container mx-auto p-4">
        <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Language Selection -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ $t('goals.form.language') }}</span>
        </label>
        <LanguageDropdown
          v-model="formData.language"
          :required="true"
        />
      </div>

      <!-- Goal Title -->
      <div class="form-control">
        <label class="label">
          <span class="label-text font-medium">{{ $t('goals.form.goalTitle') }}</span>
        </label>
        <input
          v-model="formData.title"
          type="text"
          placeholder="What do you want to achieve?"
          class="input input-bordered input-lg w-full"
          required
        />
        <div class="label">
          <span class="label-text-alt">
            {{ $t('goals.form.beSpecific') }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-6 border-t">
        <button
          type="button"
          @click="handleSkip"
          :disabled="isSaving"
          class="btn btn-outline flex-1"
        >
          {{ $t('common.skip') }}
        </button>
        <button
          type="submit"
          :disabled="!isFormValid || isSaving"
          class="btn btn-primary flex-1"
        >
          <span v-if="isSaving" class="loading loading-spinner loading-sm mr-2"></span>
          {{ $t('goals.form.save') }}
        </button>
      </div>
    </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Task } from '@/tasks/Task';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import LanguageDropdown from '@/entities/languages/LanguageDropdown.vue';
import Instruction from '@/tasks/ui/Instruction.vue';
import { useToast } from '@/shared/toasts';

interface GoalFormData {
  language: string;
  title: string;
}

interface Props {
  task: Task;
  repositories: RepositoriesContext;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  finished: [];
}>();

const goalRepo = props.repositories.goalRepo!;
const toast = useToast();

const formData = ref<GoalFormData>({
  language: props.task.language || '',
  title: ''
});

const isSaving = ref(false);

const isFormValid = computed(() => {
  return formData.value.language.trim() !== '' && formData.value.title.trim() !== '';
});

async function handleSubmit() {
  if (!isFormValid.value || isSaving.value) return;

  isSaving.value = true;

  try {
    await goalRepo.create({
      title: formData.value.title.trim(),
      language: formData.value.language,
      subGoals: [],
      vocab: [],
      notes: [],
      factCards: [],
      origins: ['user-added'],
      finishedAddingSubGoals: false,
      finishedAddingMilestones: false,
      finishedAddingKnowledge: false,
      milestones: {},
      isAchieved: false
    });

    toast.success('Goal created successfully!');
    emit('finished');
  } catch {
    toast.error('Failed to create goal');
  } finally {
    isSaving.value = false;
  }
}

function handleSkip() {
  emit('finished');
}
</script>
