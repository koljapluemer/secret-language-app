<template>
    <div class="bg-primary border-b-10 border-b-secondary p-4 mb-4 text-white flex flex-row gap-2 items-center">
        <div class="">
            <router-link :to="{ name: 'practice-overview' }" class="btn btn-ghost btn-sm text-white">
                <LogOut :size="24" />
            </router-link>
        </div>
        <h2 class="text-3xl font-bold ">{{ prompt }}</h2>
        <span class="border p-1 rounded"  v-if="languageData">
            <LanguageDisplay :language="languageData" />
        </span>
    </div>

</template>

<script setup lang="ts">
import { LogOut } from 'lucide-vue-next';
import type { LanguageData } from '@/entities/languages/LanguageData';
import LanguageDisplay from '@/entities/languages/LanguageDisplay.vue';


defineProps<{
    prompt: string;
    languageData: LanguageData | null;
}>();
</script>