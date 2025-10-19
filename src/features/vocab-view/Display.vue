<template>
    <div class="flex flex-row gap-1">
        <div class="card card-xs shadow-sm">
            <div class="card-body">
                <div v-if="languageData && showLanguage" class="border rounded-md border-base-200 p-1 mb-2">{{ renderLanguage(languageData) }}
                </div>
                <div class="card-title text-xl" v-if="vocab.content">{{ vocab.content }}</div>
            </div>
        </div>
        <div class="flex flex-col gap-2">
            <div class="card card-xs shadow-sm" v-for="translation in translations">
                <div class="card-body">
                    <div class="card-title text-xl">{{ translation.content }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import type { VocabData } from '../../entities/vocab/VocabData';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { TranslationData } from '@/entities/translations/TranslationData';
import { renderLanguage } from '@/entities/languages/renderLanguage';

const props = defineProps<{
    vocab: VocabData
    showLanguage?: boolean;
}>();

const languageRepo = inject<LanguageRepoContract>('languageRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

const languageData = ref<LanguageData | null>(null);
const translations = ref<TranslationData[]>([]);

onMounted(async () => {
    const lang = await languageRepo.getByCode(props.vocab.language);
    languageData.value = lang ?? null;

    // Load translations
    if (props.vocab.translations && props.vocab.translations.length > 0) {
        translations.value = await translationRepo.getTranslationsByIds(props.vocab.translations);
    }
});
</script>