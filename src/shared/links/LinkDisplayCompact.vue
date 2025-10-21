<template>
  <div v-if="link" class="flex flex-wrap items-center gap-1 text-xs bg-base-200 rounded px-2 py-1 border border-base-300">
    <ExternalLink class="w-3 h-3 text-primary flex-shrink-0" />
    <a
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      class="link link-primary font-medium hover:link-hover break-words"
      :title="link.label || link.url"
    >
      {{ link.label || link.url }}
    </a>
    <span v-if="link.owner || link.license" class="text-[10px] text-base-content/60 flex flex-wrap items-center gap-1">
      <span v-if="link.owner" class="flex flex-wrap items-center gap-0.5">
        <span>{{ t('common.by') }}</span>
        <a
          v-if="link.ownerLink"
          :href="link.ownerLink"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary break-words"
        >
          {{ link.owner }}
        </a>
        <span v-else class="break-words">{{ link.owner }}</span>
      </span>
      <span v-if="link.license" class="text-base-content/50 break-words">
        {{ link.license }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Link } from './Link';
import { ExternalLink } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  link: Link | null | undefined;
}

defineProps<Props>();
</script>
