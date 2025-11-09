<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3>Add Vocab</h3>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Vocab Content Input -->
        <fieldset class="fieldset">
          <label for="vocab-content" class="label">Vocab Content *</label>
          <input
            id="vocab-content"
            v-model="formData.content"
            type="text"
            name="vocab-content"
            class="input"
            placeholder="Enter vocab..."
            @input="handleContentInput"
            required
          />
        </fieldset>

        <!-- Translation Input (Optional) -->
        <fieldset class="fieldset">
          <label for="vocab-translation" class="label">Translation (optional)</label>
          <input
            id="vocab-translation"
            v-model="formData.translation"
            type="text"
            name="vocab-translation"
            class="input"
            placeholder="Enter translation..."
          />
        </fieldset>

        <!-- Suggestions List -->
        <div v-if="suggestions.length > 0" class="flex flex-col gap-2">
          <div class="text-light">Similar vocab:</div>
          <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
            <button
              v-for="vocab in suggestions"
              :key="vocab.id"
              type="button"
              @click="attachExisting(vocab.id)"
              class="btn btn-ghost justify-start"
            >
              {{ vocab.content }}
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="alert alert-error">
          <span>{{ error }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 justify-end">
          <button type="button" @click="closeModal" class="btn btn-ghost">Cancel</button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !formData.content.trim()"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ buttonText }}
          </button>
        </div>
      </form>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="closeModal">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import { useToast } from '@/shared/toasts';
import { toRaw } from 'vue';

const props = defineProps<{
  show: boolean;
  language: string;
  excludeVocabIds?: string[];
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

const loading = ref(false);
const error = ref<string | null>(null);
const suggestions = ref<VocabData[]>([]);
const exactMatch = ref<VocabData | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const buttonText = computed(() => {
  if (exactMatch.value) {
    return `Attach Existing "${exactMatch.value.content}"`;
  }
  return 'Add New Vocab';
});

async function handleContentInput() {
  error.value = null;
  exactMatch.value = null;
  suggestions.value = [];

  const content = formData.value.content.trim();
  if (!content) return;

  if (searchTimeout) clearTimeout(searchTimeout);

  searchTimeout = setTimeout(async () => {
    try {
      // Check for exact match
      const existing = await vocabRepo.getVocabByLanguageAndContent(props.language, content);
      if (existing) {
        exactMatch.value = existing;
      }

      // Get suggestions (excluding exact match and already attached)
      const excludeIds = [...(props.excludeVocabIds || [])];
      if (existing) excludeIds.push(existing.id);

      const results = await vocabRepo.searchVocabByContent(props.language, content, excludeIds, 10);
      suggestions.value = results;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search vocab';
    }
  }, 300);
}

async function attachExisting(vocabId: string) {
  emit('vocab-added', vocabId);
  emit('close');
  toast.success('Vocab attached');
}

async function handleSubmit() {
  error.value = null;

  if (!formData.value.content.trim()) {
    error.value = 'Vocab content is required';
    return;
  }

  loading.value = true;

  try {
    // If exact match exists, attach it
    if (exactMatch.value) {
      emit('vocab-added', exactMatch.value.id);
      emit('close');
      toast.success('Existing vocab attached');
      return;
    }

    // Create translation if provided
    let translationIds: string[] = [];
    if (formData.value.translation.trim()) {
      const translationData = toRaw({
        content: formData.value.translation.trim(),
        priority: 1,
        notes: []
      });
      const translation = await translationRepo.saveOrGetExistingTranslation(translationData);
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
    emit('vocab-added', newVocab.id);
    emit('close');
    toast.success('Vocab created and added');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to add vocab: ${errorMessage}`;
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  formData.value = { content: '', translation: '' };
  suggestions.value = [];
  exactMatch.value = null;
  error.value = null;
  emit('close');
}
</script>
