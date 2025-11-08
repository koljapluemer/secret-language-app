<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Create New Goal</h3>

      <div v-if="error" class="alert alert-error mb-4">
        <span>{{ error }}</span>
      </div>

      <fieldset class="fieldset">
        <label for="goal-language" class="label">Language *</label>
        <LanguageDropdown
          id="goal-language"
          v-model="formData.language"
          :disabled="saving"
        />
      </fieldset>

      <fieldset class="fieldset">
        <label for="goal-title" class="label">Goal Title *</label>
        <input
          id="goal-title"
          name="goal-title"
          type="text"
          v-model="formData.title"
          class="input"
          placeholder="I want to be able to..."
          :disabled="saving"
        />
      </fieldset>

      <div class="modal-action">
        <button @click="close" class="btn" :disabled="saving">Cancel</button>
        <button
          @click="handleSave"
          class="btn btn-primary"
          :disabled="!isValid || saving"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="close">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import { toRaw } from 'vue';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import LanguageDropdown from '@/entities/languages/LanguageDropdown.vue';
import { useToast } from '@/shared/toasts';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'goal-added': [string];
}>();

const goalRepo = inject<GoalRepoContract>('goalRepo')!;
const toast = useToast();

const formData = ref({
  language: '',
  title: ''
});
const saving = ref(false);
const error = ref('');

const isValid = computed(() => {
  return formData.value.language.trim() !== '' && formData.value.title.trim() !== '';
});

function close() {
  if (saving.value) return;
  emit('close');
}

async function handleSave() {
  if (!isValid.value || saving.value) return;

  error.value = '';
  saving.value = true;

  try {
    const goalData = toRaw({
      title: formData.value.title.trim(),
      language: formData.value.language,
      vocab: [],
      glosses: [],
      translations: '',
      notes: [],
      factCards: [],
      origins: ['user-added'],
      isAchieved: false
    });

    console.log('AddGoalModal: About to create goal with data:', goalData);
    const newGoal = await goalRepo.create(goalData);
    console.log('AddGoalModal: Goal created successfully, ID:', newGoal.id);

    toast.success('Goal created successfully');
    console.log('AddGoalModal: Emitting goal-added with ID:', newGoal.id);
    emit('goal-added', newGoal.id);
    emit('close');

    // Reset form
    formData.value.language = '';
    formData.value.title = '';
  } catch (err) {
    console.error('AddGoalModal: Error during goal creation:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to create goal: ${errorMessage}`;
    toast.error(`Failed to create goal: ${errorMessage}`);
  } finally {
    saving.value = false;
  }
}

// Reset form when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    formData.value.language = '';
    formData.value.title = '';
    error.value = '';
    saving.value = false;
  }
});
</script>
