<template>
  <div class="flex items-center gap-2 p-2 border rounded">
    <div v-if="!isEditing" class="flex-1 cursor-pointer" @click="startEditing">
      <div class="text-lg">{{ gloss.description }}</div>
      <div v-if="gloss.descriptions.length > 0" class="text-sm text-base-content/60 mt-1">
        <span v-for="(desc, idx) in gloss.descriptions" :key="idx" class="mr-2">
          [{{ desc.languageCode }}] {{ desc.description }}
        </span>
      </div>
    </div>

    <div v-else class="flex-1">
      <div class="flex flex-col space-y-1">
        <label class="font-medium">{{ $t('vocabulary.gloss') }}</label>
        <input
          v-model="editGloss.description"
          class="input input-bordered input-lg w-full"
          placeholder="Gloss description"
          @keyup.enter="save"
          @keyup.escape="cancel"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <button
        v-if="isEditing"
        class="btn btn-sm btn-primary"
        @click="save"
      >
        {{ $t('common.save') }}
      </button>
      <button
        v-if="isEditing"
        class="btn btn-sm btn-ghost"
        @click="cancel"
      >
        {{ $t('common.cancel') }}
      </button>
      <button
        v-if="showDeleteButton && !isEditing"
        class="btn btn-sm btn-error"
        @click="$emit('delete')"
      >
        {{ $t('common.delete') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { GlossData } from './GlossData';

const props = defineProps<{
  gloss: GlossData;
  allowEditOnClick?: boolean;
  showDeleteButton?: boolean;
}>();

const emit = defineEmits<{
  'save': [GlossData];
  'delete': [];
}>();

const isEditing = ref(false);
const editGloss = ref<GlossData>({ ...props.gloss });

function startEditing() {
  if (!props.allowEditOnClick) return;

  isEditing.value = true;
  editGloss.value = { ...props.gloss };
}

function save() {
  emit('save', { ...editGloss.value });
  isEditing.value = false;
}

function cancel() {
  isEditing.value = false;
  editGloss.value = { ...props.gloss };
}
</script>
