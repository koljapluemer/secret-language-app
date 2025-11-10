<template>
  <div v-if="link" class="flex flex-col gap-2">
    <!-- Big button link (if showBigLink is true) -->
    <a
      v-if="showBigLink"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      class="btn btn-primary btn-lg"
    >
      {{ link.label || link.url }}
      <ExternalLink :size="14" />
    </a>

    <!-- Compact info box -->
    <div class="flex flex-wrap items-center gap-1 text-xs bg-base-200 rounded px-2 py-1 border border-base-300">
      <!-- Only show link in compact box if NOT showing big link -->
      <template v-if="!showBigLink">
        <ExternalLink class="w-3 h-3 text-primary flex-shrink-0" />
        <a
          v-if="!deactivateLink"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="link link-primary font-medium hover:link-hover break-words"
          :title="link.label || link.url"
        >
          {{ link.label || link.url }}
        </a>
        <span
          v-else
          class="font-medium break-words"
          :title="link.label || link.url"
        >
          {{ link.label || link.url }}
        </span>
      </template>

      <!-- Owner and license info (always shown if present) -->
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
  </div>
</template>

<script setup lang="ts">
import type { Link } from './Link';
import { ExternalLink } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  link: Link | null | undefined;
  showBigLink?: boolean;
  deactivateLink?: boolean;
}

withDefaults(defineProps<Props>(), {
  showBigLink: false,
  deactivateLink: false
});
</script>
