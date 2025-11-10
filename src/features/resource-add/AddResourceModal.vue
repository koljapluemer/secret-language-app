<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Create New Resource</h3>

      <div v-if="error" class="alert alert-error mb-4">
        <span>{{ error }}</span>
      </div>

      <fieldset class="fieldset">
        <label for="resource-language" class="label">Language *</label>
        <LanguageDropdown
          id="resource-language"
          v-model="formData.language"
          :disabled="saving"
        />
      </fieldset>

      <fieldset class="fieldset">
        <label for="resource-title" class="label">Resource Title *</label>
        <input
          id="resource-title"
          name="resource-title"
          type="text"
          v-model="formData.title"
          class="input"
          placeholder="Enter resource title..."
          :disabled="saving"
        />
      </fieldset>

      <fieldset class="fieldset">
        <label for="resource-url" class="label">URL (optional)</label>
        <input
          id="resource-url"
          name="resource-url"
          type="url"
          v-model="formData.url"
          class="input"
          placeholder="https://..."
          :disabled="saving"
        />
      </fieldset>

      <fieldset class="fieldset">
        <label for="resource-content" class="label">Content (optional)</label>
        <textarea
          id="resource-content"
          name="resource-content"
          v-model="formData.content"
          class="textarea"
          placeholder="Enter content here..."
          :disabled="saving"
          rows="5"
        />
      </fieldset>

      <p class="text-sm text-light mb-4">* Either URL or content is required</p>

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
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import LanguageDropdown from '@/entities/languages/LanguageDropdown.vue';
import { useToast } from '@/shared/toasts';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'resource-added': [string];
}>();

const resourceRepo = inject<ResourceRepoContract>('resourceRepo')!;
const toast = useToast();

const formData = ref({
  language: '',
  title: '',
  url: '',
  content: ''
});
const saving = ref(false);
const error = ref('');

const isValid = computed(() => {
  return formData.value.language.trim() !== '' &&
    formData.value.title.trim() !== '' &&
    (formData.value.url.trim() !== '' || formData.value.content.trim() !== '');
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
    const resourceData = toRaw({
      title: formData.value.title.trim(),
      language: formData.value.language,
      isImmersionContent: true,
      content: formData.value.content.trim() || undefined,
      link: formData.value.url.trim() ? {
        label: formData.value.title.trim(),
        url: formData.value.url.trim()
      } : undefined,
      finishedExtracting: false,
      priority: 0,
      vocab: [],
      factCards: [],
      notes: [],
      origins: ['user-added']
    });

    const newResource = await resourceRepo.saveResource(resourceData);

    toast.success('Resource created successfully');
    emit('resource-added', newResource.id);
    emit('close');

    // Reset form
    formData.value.language = '';
    formData.value.title = '';
    formData.value.url = '';
    formData.value.content = '';
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    error.value = `Failed to create resource: ${errorMessage}`;
    toast.error(`Failed to create resource: ${errorMessage}`);
  } finally {
    saving.value = false;
  }
}

// Reset form when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    formData.value.language = '';
    formData.value.title = '';
    formData.value.url = '';
    formData.value.content = '';
    error.value = '';
    saving.value = false;
  }
});
</script>
