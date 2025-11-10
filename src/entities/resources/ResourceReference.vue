<template>
  <LinkDisplayCompact v-if="resource.link" :link="resource.link" :showBigLink="false" :deactivateLink="deactivateLink" />
  <span v-else-if="resource.content" class="line-clamp-1">{{ resource.content }}</span>
  <span v-else class="text-base-content/60">Untitled Resource</span>
</template>

<script setup lang="ts">
import type { ResourceData } from './ResourceData';
import LinkDisplayCompact from '@/shared/links/LinkDisplayCompact.vue';

withDefaults(defineProps<{
  resource: ResourceData;
  deactivateLink?: boolean;
}>(), {
  deactivateLink: false
});
</script>
