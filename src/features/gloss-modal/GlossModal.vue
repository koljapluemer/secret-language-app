<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3>Add Gloss</h3>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Gloss Description Input -->
        <fieldset class="fieldset">
          <label for="gloss-description" class="label">Gloss Description *</label>
          <input
            id="gloss-description"
            v-model="formData.description"
            type="text"
            name="gloss-description"
            class="input"
            placeholder="Enter gloss..."
            @input="handleDescriptionInput"
            required
          />
        </fieldset>

        <!-- Suggestions List -->
        <div v-if="suggestions.length > 0" class="flex flex-col gap-2">
          <div class="text-light">Similar glosses:</div>
          <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
            <button
              v-for="gloss in suggestions"
              :key="gloss.id"
              type="button"
              @click="attachExisting(gloss.id)"
              class="btn btn-ghost justify-start"
            >
              {{ gloss.description }}
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
            :disabled="loading || !formData.description.trim()"
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
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import type { GlossData } from '@/entities/gloss/GlossData';
import { useToast } from '@/shared/toasts';
import { toRaw } from 'vue';

const props = defineProps<{
  show: boolean;
  excludeGlossIds?: string[];
}>();

const emit = defineEmits<{
  close: [];
  'gloss-added': [string];
}>();

const glossRepo = inject<GlossRepoContract>('glossRepo')!;
const toast = useToast();

const formData = ref({
  description: ''
});

const loading = ref(false);
const error = ref<string | null>(null);
const suggestions = ref<GlossData[]>([]);
const exactMatch = ref<GlossData | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const buttonText = computed(() => {
  if (exactMatch.value) {
    return `Attach Existing "${exactMatch.value.description}"`;
  }
  return 'Add New Gloss';
});

async function handleDescriptionInput() {
  error.value = null;
  exactMatch.value = null;
  suggestions.value = [];

  const description = formData.value.description.trim();
  if (!description) return;

  if (searchTimeout) clearTimeout(searchTimeout);

  searchTimeout = setTimeout(async () => {
    try {
      // Check for exact match
      const existing = await glossRepo.getGlossByDescription(description);
      if (existing) {
        exactMatch.value = existing;
      }

      // Get suggestions (excluding exact match and already attached)
      const excludeIds = [...(props.excludeGlossIds || [])];
      if (existing) excludeIds.push(existing.id);

      const results = await glossRepo.searchGlossesByDescription(description, excludeIds, 10);
      suggestions.value = results;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search glosses';
    }
  }, 300);
}

async function attachExisting(glossId: string) {
  emit('gloss-added', glossId);
  emit('close');
  toast.success('Gloss attached');
}

async function handleSubmit() {
  error.value = null;

  if (!formData.value.description.trim()) {
    error.value = 'Gloss description is required';
    return;
  }

  loading.value = true;

  try {
    // If exact match exists, attach it
    if (exactMatch.value) {
      emit('gloss-added', exactMatch.value.id);
      emit('close');
      toast.success('Existing gloss attached');
      return;
    }

    // Create new gloss
    const glossData = toRaw({
      description: formData.value.description.trim(),
      descriptions: []
    });

    const newGloss = await glossRepo.saveOrGetExistingGloss(glossData);
    emit('gloss-added', newGloss.id);
    emit('close');
    toast.success('Gloss created and added');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to add gloss: ${errorMessage}`;
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  formData.value = { description: '' };
  suggestions.value = [];
  exactMatch.value = null;
  error.value = null;
  emit('close');
}
</script>
