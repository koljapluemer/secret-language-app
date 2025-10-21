<template>
    <div class="flex flex-row gap-1 w-full flex-wrap">
        <div class="card card-sm shadow-sm flex-1">
            <div class="card-body">
                <div class="flex-1 flex flex-col gap-2">
                    <div v-if="vocab.content" class="font-bold text-center w-full" :class="{
                        'text-8xl': vocab.consideredCharacter,
                        'text-5xl': !vocab.consideredCharacter && !vocab.consideredSentence,
                        'text-3xl': vocab.consideredSentence
                    }">
                        {{ vocab.content }}
                    </div>
                    <!-- Images -->
                    <div v-if="vocab.images && vocab.images.length > 0" class="">
                        <div class="grid gap-2"
                            :class="vocab.images.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : vocab.images.length === 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-2 md:grid-cols-3 max-w-lg mx-auto'">
                            <VocabImage v-for="image in vocab.images.slice(0, 6)" :key="image.id" :image="image"
                                class="rounded-lg" />
                        </div>
                        <div v-if="vocab.images.length > 6" class=" text-base-content/50 mt-2">
                            {{ $t('common.add') }}{{ vocab.images.length - 6 }} {{ $t('practice.tasks.moreImages') }}
                        </div>
                    </div>
                    <!-- Sound -->
                    <div v-if="vocab.sounds && vocab.sounds.length > 0" class="flex flex-wrap gap-2 justify-center">
                        <SoundPlayer
                            v-for="sound in vocab.sounds.filter(s => !s.disableForPractice)"
                            :key="sound.id"
                            :sound="sound"
                        />
                    </div>
                </div>
                <div class="flex flex-col gap-1 items-start">
                    <div v-if="languageData && showLanguage" class="border rounded-md border-base-200 p-1">{{
                        renderLanguage(languageData) }}
                    </div>
                    <div v-if="props.showAllNotesImmediately || vocabNotes.filter(note => note.showBeforeExercise).length > 0"
                        class="flex flex-row gap-1 flex-wrap">
                        <NoteDisplayMini
                            v-for="note in vocabNotes.filter(note => note.showBeforeExercise || props.showAllNotesImmediately)"
                            :key="note.id" :note="note" />
                    </div>
                </div>
                <div v-if="vocab.links && vocab.links.length > 0" class="flex flex-wrap gap-2 w-full">
                    <LinkDisplayCompact v-for="(link, index) in vocab.links" :key="index" :link="link" class="w-full" />
                </div>
            </div>

        </div>
        <div class="flex flex-col gap-2 flex-1">
            <div class="card card-sm shadow-sm" v-for="translation in translations">
                <div class="card-body">
                    <div class="flex flex-row gap-1">
                        <div class="card-title text-xl flex-1 ">{{ translation.content }}</div>
                        <div class="flex flex-col gap-1 flex-1">
                            <NoteDisplayMini
                                v-for="note in translationNotes.filter(note => props.showAllNotesImmediately || note.showBeforeExercise && translation.notes?.includes(note.id))"
                                :key="note.id" :note="note" />
                        </div>
                    </div>

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
import type { NoteData } from '@/entities/notes/NoteData';
import NoteDisplayMini from '@/entities/notes/NoteDisplayMini.vue';
import VocabImage from '@/shared/ui/VocabImage.vue';
import SoundPlayer from '@/shared/ui/SoundPlayer.vue';

const props = defineProps<{
    vocab: VocabData
    repos: RepositoriesContext
    showLanguage?: boolean
    showAllNotesImmediately?: boolean
}>();

const languageRepo = props.repos.languageRepo || undefined
const translationRepo = props.repos.translationRepo || undefined
const noteRepo = props.repos.noteRepo || undefined

const languageData = ref<LanguageData | null>(null);
const translations = ref<TranslationData[]>([]);
const vocabNotes = ref<NoteData[]>([]);
const translationNotes = ref<NoteData[]>([]);



onMounted(async () => {
    const lang = await languageRepo?.getByCode(props.vocab.language);
    languageData.value = lang ?? null;

    // Load translations
    if (props.vocab.translations && props.vocab.translations.length > 0) {
        translations.value = await translationRepo?.getTranslationsByIds(props.vocab.translations) || [];
    }

    // Load vocab notes
    if (props.vocab.notes && props.vocab.notes.length > 0) {
        vocabNotes.value = await noteRepo?.getNotesByUIDs(props.vocab.notes) || [];
    }

    // Load translation notes
    const allTranslationNoteIds: string[] = [];
    translations.value.forEach(translation => {
        if (translation.notes && translation.notes.length > 0) {
            allTranslationNoteIds.push(...translation.notes);
        }
    });
    if (allTranslationNoteIds.length > 0) {
        translationNotes.value = await noteRepo?.getNotesByUIDs(allTranslationNoteIds) || [];
    }
});
</script>