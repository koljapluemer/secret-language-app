<template>
    <div class="flex flex-row gap-1 w-full">
        <div class="card card-xs shadow-sm flex-1">
            <div class="card-body">
                <div v-if="languageData && showLanguage" class="border rounded-md border-base-200 p-1 mb-2">{{
                    renderLanguage(languageData) }}
                </div>
                <div class="card-title text-3xl" v-if="vocab.content">{{ vocab.content }}</div>
            </div>
            <div v-if="vocab.links && vocab.links.length > 0" class="flex flex-wrap gap-2 mt-4 w-full">
                <LinkDisplayCompact v-for="(link, index) in vocab.links" :key="index" :link="link" class="w-full" />
            </div>
        </div>
        <div class="flex flex-col gap-2 flex-1">
            <div class="card card-xs shadow-sm" v-for="translation in translations">
                <div class="card-body">
                    <div class="card-title text-xl">{{ translation.content }}</div>

                </div>
            </div>
        </div>
    </div>

</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { VocabData } from '../../entities/vocab/VocabData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import { renderLanguage } from '@/entities/languages/renderLanguage';
import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import LinkDisplayCompact from '@/shared/links/LinkDisplayCompact.vue';

const props = defineProps<{
    vocab: VocabData
    repos: RepositoriesContext
    showLanguage?: boolean
}>();

const languageRepo = props.repos.languageRepo || undefined
const translationRepo = props.repos.translationRepo || undefined

const languageData = ref<LanguageData | null>(null);
const translations = ref<TranslationData[]>([]);

onMounted(async () => {
    const lang = await languageRepo?.getByCode(props.vocab.language);
    languageData.value = lang ?? null;

    // Load translations
    if (props.vocab.translations && props.vocab.translations.length > 0) {
        translations.value = await translationRepo?.getTranslationsByIds(props.vocab.translations) || [];
    }
});
</script>