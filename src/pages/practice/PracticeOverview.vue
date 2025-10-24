<script setup lang="ts">
import { onMounted } from 'vue';
import { usePracticeFilters } from '@/features/filter-practice-sets-and-languages/usePracticeFilters';

const { loadOptions } = usePracticeFilters();

onMounted(() => {
  loadOptions();
});
</script>

<template>
  <div>
    <router-view />
  </div>
</template>