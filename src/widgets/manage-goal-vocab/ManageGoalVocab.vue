<template>
  <div class="alert alert-info">
    <p>Goals no longer track vocabulary directly. Vocab is now managed through resources in situations.</p>
  </div>
</template>

<script setup lang="ts">
import type { GoalData } from '@/entities/goals/GoalData';

defineProps<{
  goal: GoalData;
}>();

defineEmits<{
  'goal-updated': [GoalData];
}>();
</script>