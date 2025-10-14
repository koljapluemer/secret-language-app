<template>
  <details class="collapse collapse-arrow bg-base-200">
    <summary class="collapse-title font-medium">
      {{ title || 'Sets' }} ({{ selectedSets.length }} selected)
    </summary>
    <div class="collapse-content">
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
}

defineProps<Props>();

defineEmits<{
  toggle: [setId: string];
}>();
</script>
