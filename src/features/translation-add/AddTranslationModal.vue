<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Create New Translation</h3>

      <div v-if="error" class="alert alert-error mb-4">
        <span>{{ error }}</span>
      </div>

      <fieldset class="fieldset">
        <label for="translation-content" class="label">Content *</label>
        <input
          id="translation-content"
          name="translation-content"
          type="text"
          v-model="content"
          class="input"
          placeholder="Enter translation"
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
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import { useToast } from '@/shared/toasts';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'translation-added': [string];
}>();

const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const toast = useToast();

const content = ref('');
const saving = ref(false);
const error = ref('');

const isValid = computed(() => {
  return content.value.trim() !== '';
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
    const translationData = toRaw({
      content: content.value.trim(),
      priority: 1,
      notes: []
    });

    const newTranslation = await translationRepo.saveOrGetExistingTranslation(translationData);

    toast.success('Translation added successfully');
    emit('translation-added', newTranslation.id);
    emit('close');

    // Reset form
    content.value = '';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to create translation: ${errorMessage}`;
    toast.error(`Failed to create translation: ${errorMessage}`);
  } finally {
    saving.value = false;
  }
}

// Reset form when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    content.value = '';
    error.value = '';
    saving.value = false;
  }
});
</script>
