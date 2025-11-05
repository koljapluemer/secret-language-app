<template>
  <div class="flex flex-wrap gap-4">
    <div class="flex flex-col space-y-1 flex-1">
      <label class="font-medium">{{ $t('vocabulary.gloss') }}</label>
      <input
        v-model="editGloss.description"
        class="input input-bordered input-lg w-full"
        placeholder="Add new gloss description..."
        @keyup.enter="save"
        @keyup.escape="cancel"
      />
    </div>

    <div class="flex gap-2 items-end">
      <button
        class="btn btn-sm btn-primary"
        :disabled="!editGloss.description?.trim()"
        @click="save"
      >
        {{ $t('common.add') }}
      </button>
      <button
        v-if="!isNew"
        class="btn btn-sm btn-ghost"
        @click="cancel"
      >
        {{ $t('common.cancel') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { GlossData } from './GlossData';

const props = defineProps<{
  gloss?: Pick<GlossData, 'description' | 'descriptions'> & { id?: string };
  isNew?: boolean;
}>();

const emit = defineEmits<{
  'save': [Omit<GlossData, 'id' | 'origins'>];
  'cancel': [];
}>();

const editGloss = ref<Pick<GlossData, 'description' | 'descriptions'>>({
  description: '',
  descriptions: [],
  ...props.gloss
});

function save() {
  if (!editGloss.value.description?.trim()) return;

  const glossToSave: Omit<GlossData, 'id' | 'origins'> = {
    description: editGloss.value.description.trim(),
    descriptions: editGloss.value.descriptions || []
  };

  emit('save', glossToSave);

  // Reset for new glosses
  if (props.isNew) {
    editGloss.value = {
      description: '',
      descriptions: []
    };
  }
}

function cancel() {
  if (props.isNew) {
    editGloss.value = {
      description: '',
      descriptions: []
    };
  }
  emit('cancel');
}
</script>
