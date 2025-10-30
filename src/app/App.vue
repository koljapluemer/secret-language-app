<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

const DEPLOY_FLAG = import.meta.env.VITE_DEPLOY_FLAG || 'secret';

const variants = {
  'secret': defineAsyncComponent(() => import('./App.secret.vue')),
  'cram': defineAsyncComponent(() => import('./App.cram.vue')),
};

const AppVariant = variants[DEPLOY_FLAG];
</script>

<template>
  <AppVariant />
</template>
