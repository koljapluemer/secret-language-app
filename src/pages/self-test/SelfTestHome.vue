<script setup lang="ts">
import { computed } from 'vue';
import { modes } from '@/modes/modes';

// Filter modes that have the "test" property
const testModes = computed(() =>
  modes.filter((mode): mode is typeof mode & { test: NonNullable<typeof mode.test> } =>
    mode.test !== undefined
  )
);
</script>

<template>
  <div class="practice-overview">
    <h1>{{ $t('selfTest.title') }}</h1>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
      <div v-for="option in testModes" :key="option.name" :to="option.test"
        class="card shadow transition-hover hover:shadow-md">
        <div class="card-body text-center">
          <div class="flex justify-center mb-4">
            <component :is="option.icon" :size="48" />
          </div>
          <h2>{{ option.name }}</h2>
          <p class="text-light">{{ option.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
