<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Add New Situation</h3>

      <div v-if="error" class="alert alert-error mb-4">
        <span>{{ error }}</span>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Description *</span>
        </label>
        <textarea
          v-model="description"
          class="textarea textarea-bordered h-24"
          placeholder="Describe the situation..."
          :disabled="saving"
        ></textarea>
      </div>

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
import type { SituationRepoContract } from '@/entities/situation/SituationRepoContract';
import { useToast } from '@/shared/toasts';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'situation-added': [string];
}>();

const situationRepo = inject<SituationRepoContract>('situationRepo')!;
const toast = useToast();

const description = ref('');
const saving = ref(false);
const error = ref('');

const isValid = computed(() => {
  return description.value.trim().length > 0;
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
    const situationData = toRaw({
      description: description.value.trim(),
      goals: [],
      relevantForLanguages: []
    });

    const newSituation = await situationRepo.saveSituation(situationData);

    toast.success('Situation created successfully');
    emit('situation-added', newSituation.id);
    emit('close');

    // Reset form
    description.value = '';
  } catch {
    error.value = 'Failed to create situation';
    toast.error('Failed to create situation');
  } finally {
    saving.value = false;
  }
}

// Reset form when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    description.value = '';
    error.value = '';
    saving.value = false;
  }
});
</script>
