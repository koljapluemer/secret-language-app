<template>
  <details class="collapse collapse-arrow bg-base-200">
    <summary class="collapse-title font-medium">
      {{ title || 'Languages' }} ({{ selectedLanguages.length }} selected)
    </summary>
    <div class="collapse-content">
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
}

defineProps<Props>();

defineEmits<{
  toggle: [languageCode: string];
}>();
</script>
