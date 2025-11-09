<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Create New Gloss</h3>

      <div v-if="error" class="alert alert-error mb-4">
        <span>{{ error }}</span>
      </div>

      <fieldset class="fieldset">
        <label for="gloss-description" class="label">Description *</label>
        <input
          id="gloss-description"
          name="gloss-description"
          type="text"
          v-model="description"
          class="input"
          placeholder="Enter gloss description"
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
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import { useToast } from '@/shared/toasts';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'gloss-added': [string];
}>();

const glossRepo = inject<GlossRepoContract>('glossRepo')!;
const toast = useToast();

const description = ref('');
const saving = ref(false);
const error = ref('');

const isValid = computed(() => {
  return description.value.trim() !== '';
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
    const glossData = toRaw({
      description: description.value.trim(),
      descriptions: []
    });

    const newGloss = await glossRepo.saveOrGetExistingGloss(glossData);

    toast.success('Gloss added successfully');
    emit('gloss-added', newGloss.id);
    emit('close');

    // Reset form
    description.value = '';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to create gloss: ${errorMessage}`;
    toast.error(`Failed to create gloss: ${errorMessage}`);
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
