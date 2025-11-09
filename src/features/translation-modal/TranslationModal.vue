<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Add Translation</h3>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Translation Content Input -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Translation Content *</span>
          </label>
          <input
            v-model="formData.content"
            type="text"
            class="input input-bordered"
            placeholder="Enter translation..."
            @input="handleContentInput"
            required
          />
        </div>

        <!-- Suggestions List -->
        <div v-if="suggestions.length > 0" class="flex flex-col gap-2">
          <div class="text-sm font-medium text-base-content/70">Similar translations:</div>
          <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
            <button
              v-for="translation in suggestions"
              :key="translation.id"
              type="button"
              @click="attachExisting(translation.id)"
              class="btn btn-sm btn-ghost justify-start"
            >
              {{ translation.content }}
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
            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
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
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { TranslationData } from '@/entities/translations/TranslationData';
import { useToast } from '@/shared/toasts';
import { toRaw } from 'vue';

const props = defineProps<{
  show: boolean;
  excludeTranslationIds?: string[];
}>();

const emit = defineEmits<{
  close: [];
  'translation-added': [string];
}>();

const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const toast = useToast();

const formData = ref({
  content: ''
});

const loading = ref(false);
const error = ref<string | null>(null);
const suggestions = ref<TranslationData[]>([]);
const exactMatch = ref<TranslationData | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const buttonText = computed(() => {
  if (exactMatch.value) {
    return `Attach Existing "${exactMatch.value.content}"`;
  }
  return 'Add New Translation';
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
      const existing = await translationRepo.getTranslationByContent(content);
      if (existing) {
        exactMatch.value = existing;
      }

      // Get suggestions (excluding exact match and already attached)
      const excludeIds = [...(props.excludeTranslationIds || [])];
      if (existing) excludeIds.push(existing.id);

      const results = await translationRepo.searchTranslationsByContent(content, excludeIds, 10);
      suggestions.value = results;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search translations';
    }
  }, 300);
}

async function attachExisting(translationId: string) {
  emit('translation-added', translationId);
  emit('close');
  toast.success('Translation attached');
}

async function handleSubmit() {
  error.value = null;

  if (!formData.value.content.trim()) {
    error.value = 'Translation content is required';
    return;
  }

  loading.value = true;

  try {
    // If exact match exists, attach it
    if (exactMatch.value) {
      emit('translation-added', exactMatch.value.id);
      emit('close');
      toast.success('Existing translation attached');
      return;
    }

    // Create new translation
    const translationData = toRaw({
      content: formData.value.content.trim(),
      priority: 1,
      notes: []
    });

    const newTranslation = await translationRepo.saveOrGetExistingTranslation(translationData);
    emit('translation-added', newTranslation.id);
    emit('close');
    toast.success('Translation created and added');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to add translation: ${errorMessage}`;
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  formData.value = { content: '' };
  suggestions.value = [];
  exactMatch.value = null;
  error.value = null;
  emit('close');
}
</script>
