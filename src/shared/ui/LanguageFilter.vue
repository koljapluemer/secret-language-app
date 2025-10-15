<template>
  <details class="collapse collapse-arrow bg-base-200" :open="open">
    <summary class="collapse-title font-medium">
      {{ title || 'Languages' }} ({{ selectedLanguages.length }} selected)
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
        <li v-for="language in availableLanguages" :key="language.code">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="selectedLanguages.includes(language.code)"
              @change="$emit('toggle', language.code)"
              class="checkbox checkbox-sm"
            />
            <span class="flex items-center gap-2">
              <span v-if="language.emoji">{{ language.emoji }}</span>
              {{ language.name }}
            </span>
          </label>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import type { LanguageData } from '@/entities/languages/LanguageData';

interface Props {
  availableLanguages: LanguageData[];
  selectedLanguages: string[];
  title?: string;
  open?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [languageCode: string];
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
