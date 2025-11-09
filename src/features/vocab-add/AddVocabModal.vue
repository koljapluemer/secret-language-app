<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Create New Vocab</h3>

      <div v-if="error" class="alert alert-error mb-4">
        <span>{{ error }}</span>
      </div>

      <fieldset class="fieldset">
        <label for="vocab-content" class="label">Content *</label>
        <input
          id="vocab-content"
          name="vocab-content"
          type="text"
          v-model="formData.content"
          class="input"
          placeholder="Enter vocab word/phrase"
          :disabled="saving"
        />
      </fieldset>

      <fieldset class="fieldset">
        <label for="vocab-translation" class="label">Translation (optional)</label>
        <input
          id="vocab-translation"
          name="vocab-translation"
          type="text"
          v-model="formData.translation"
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
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import { useToast } from '@/shared/toasts';

const props = defineProps<{
  show: boolean;
  language: string;
}>();

const emit = defineEmits<{
  close: [];
  'vocab-added': [string];
}>();

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const toast = useToast();

const formData = ref({
  content: '',
  translation: ''
});
const saving = ref(false);
const error = ref('');

const isValid = computed(() => {
  return formData.value.content.trim() !== '';
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
    // Check if vocab already exists
    const existing = await vocabRepo.getVocabByLanguageAndContent(
      props.language,
      formData.value.content.trim()
    );

    if (existing) {
      emit('vocab-added', existing.id);
      emit('close');
      toast.success('Existing vocab added');
      formData.value.content = '';
      formData.value.translation = '';
      return;
    }

    // Create translation if provided
    let translationIds: string[] = [];
    if (formData.value.translation.trim()) {
      const translation = await translationRepo.saveOrGetExistingTranslation(toRaw({
        content: formData.value.translation.trim(),
        priority: 1,
        notes: []
      }));
      translationIds = [translation.id];
    }

    // Create new vocab
    const vocabData = toRaw({
      content: formData.value.content.trim(),
      language: props.language,
      translations: translationIds,
      glosses: [],
      notes: [],
      links: [],
      origins: ['user-added'],
      relatedVocab: [],
      notRelatedVocab: [],
      contains: []
    });

    const newVocab = await vocabRepo.saveVocab(vocabData);

    toast.success('Vocab created successfully');
    emit('vocab-added', newVocab.id);
    emit('close');

    // Reset form
    formData.value.content = '';
    formData.value.translation = '';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to create vocab: ${errorMessage}`;
    toast.error(`Failed to create vocab: ${errorMessage}`);
  } finally {
    saving.value = false;
  }
}

// Reset form when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    formData.value.content = '';
    formData.value.translation = '';
    error.value = '';
    saving.value = false;
  }
});
</script>
