<script setup lang="ts">
import { computed } from 'vue';
import { modes } from '@/modes/modes';

// Filter to only show modes with a practice route (exclude test-only modes)
const practiceModes = computed(() =>
  modes.filter((mode): mode is typeof mode & { route: NonNullable<typeof mode.route> } =>
    mode.route !== undefined
  )
);
</script>

<template>
  <div class="practice-overview">
    <h1>{{ $t('practice.title') }}</h1>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
      <router-link v-for="option in practiceModes" :key="option.name" :to="option.route"
        class="card shadow transition-hover hover:shadow-md">
        <div class="card-body text-center">
          <div class="flex justify-center mb-4">
            <component :is="option.icon" :size="48" />
          </div>
          <h2>{{ option.name }}</h2>
          <p class="text-light">{{ option.description }}</p>
        </div>
      </router-link>
    </div>
  </div>
</template>