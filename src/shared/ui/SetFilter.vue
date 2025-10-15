<template>
  <details class="collapse collapse-arrow bg-base-200" :open="open">
    <summary class="collapse-title font-medium">
      {{ title || 'Sets' }} ({{ selectedSets.length }} selected)
    </summary>
    <div class="collapse-content">
      <div class="mb-3 flex gap-2">
        <button @click="selectAll" class="btn btn-xs btn-ghost">
          Select All
        </button>
        <button @click="deselectAll" class="btn btn-xs btn-ghost">
          Deselect All
        </button>
      </div>
      <ul class="flex flex-col gap-2">
        <li>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="selectedSets.includes('user-added')"
              @change="$emit('toggle', 'user-added')"
              class="checkbox checkbox-sm"
            />
            User Added
          </label>
        </li>
        <li v-for="set in availableSets" :key="set.id">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="selectedSets.includes(set.id)"
              @change="$emit('toggle', set.id)"
              class="checkbox checkbox-sm"
            />
            {{ set.name }}
          </label>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';

interface Props {
  availableSets: LocalSetData[];
  selectedSets: string[];
  title?: string;
  open?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [setId: string];
  'select-all': [];
  'deselect-all': [];
}>();

function selectAll() {
  emit('select-all');
}

function deselectAll() {
  emit('deselect-all');
}
</script>
