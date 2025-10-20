<template>
    <div class="bg-primary border-b-10 border-b-secondary p-4 mb-4 text-white">
        <h2 class="text-3xl font-bold ">{{ prompt }}</h2>
        <span class="border p-1 rounded">
            <LanguageDisplay v-if="languageData" :language="languageData" />
        </span>
    </div>

</template>

<script setup lang="ts">
import type { LanguageData } from '@/entities/languages/LanguageData';
import LanguageDisplay from '@/entities/languages/LanguageDisplay.vue';


defineProps<{
    prompt: string;
    languageData: LanguageData | null;
}>();
</script>