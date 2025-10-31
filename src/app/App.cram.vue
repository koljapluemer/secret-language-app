<script setup lang="ts">
import { getCurrentInstance } from 'vue';
import { provideRepositories } from './injectRepositories';
import ToastContainer from '@/shared/toasts/ToastContainer.vue';

// Setup and provide repositories
const app = getCurrentInstance()?.appContext.app;
if (app) {
  provideRepositories(app);
}

// NOTE: Merge service is DISABLED in cram mode to prevent vocab deletion between lessons
// The merge service runs in the background and can delete "duplicate" vocab,
// causing goals to reference non-existent vocab IDs between lessons
</script>

<template>
  <main class="prose mx-auto flex-1 container flex flex-col gap-4 my-2">
    <router-view />
  </main>
  <ToastContainer />
</template>

<style>
@import "tailwindcss";

@plugin "daisyui" {
  themes: fantasy --default, /* you may list other themes */
  other-theme-name;
}

@plugin "daisyui/theme" {
  name: fantasy;
  default: true;
  /* override colors */
  --color-primary: #7A29E9;
  --color-secondary: #210B3F;
  /* you can override more variables if needed */
}


@layer base {
  h1 {
    @apply text-4xl font-bold leading-tight my-6 text-center;
  }

  h2 {
    @apply text-3xl font-semibold leading-snug;
  }

  h3 {
    @apply text-2xl font-semibold leading-snug;
  }

  h4 {
    @apply text-xl font-medium leading-snug;
  }

  h5 {
    @apply text-lg font-medium leading-snug;
  }

  h6 {
    @apply text-base font-medium leading-snug uppercase tracking-wide;
  }
}

@layer components {
  .text-light {
    @apply text-base-content/70;
  }
}
</style>
