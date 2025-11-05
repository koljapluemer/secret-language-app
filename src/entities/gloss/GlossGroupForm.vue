<template>
  <div class="space-y-4">
    <h4>{{ $t('glosses.title') }}</h4>

    <!-- Existing glosses -->
    <div v-for="(gloss, index) in glosses" :key="gloss.id" class="space-y-2">
      <GlossRowRender
        :gloss="gloss"
        :allow-edit-on-click="allowEditOnClick"
        :show-delete-button="showDeleteButton"
        @save="saveGloss(index, $event)"
        @delete="deleteGloss(index)"
      />
    </div>

    <!-- Add new gloss row -->
    <GlossRowEdit
      v-if="allowAddingNew !== false"
      :gloss="newGloss"
      :is-new="true"
      @save="addNewGloss"
      @cancel="resetNewGloss"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GlossData } from './GlossData';
import GlossRowRender from './GlossRowRender.vue';
import GlossRowEdit from './GlossRowEdit.vue';

const props = defineProps<{
  modelValue: GlossData[];
  allowEditOnClick?: boolean;
  showDeleteButton?: boolean;
  allowAddingNew?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [GlossData[]];
}>();

const glosses = ref<GlossData[]>([...props.modelValue]);
const newGloss = ref<Pick<GlossData, 'description' | 'descriptions'>>({
  description: '',
  descriptions: []
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  glosses.value = [...newValue];
}, { deep: true });

// Emit changes when glosses are modified
watch(glosses, (newGlosses) => {
  emit('update:modelValue', [...newGlosses]);
}, { deep: true });

function saveGloss(index: number, updatedGloss: GlossData) {
  glosses.value[index] = updatedGloss;
}

function deleteGloss(index: number) {
  glosses.value.splice(index, 1);
}

function addNewGloss(glossData: Omit<GlossData, 'id' | 'origins'>) {
  const newGloss: Omit<GlossData, 'id'> = {
    ...glossData,
    origins: []
  };
  glosses.value.push(newGloss as GlossData);
  resetNewGloss();
}

function resetNewGloss() {
  newGloss.value = {
    description: '',
    descriptions: []
  };
}
</script>
