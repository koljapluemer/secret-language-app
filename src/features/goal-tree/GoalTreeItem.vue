<template>
  <div class="border-l border-base-300">
    <!-- Goal Level -->
    <details class="group">
      <summary class="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-base-200 list-none">
        <ChevronRight :size="16" class="group-open:hidden" />
        <ChevronDown :size="16" class="hidden group-open:block" />
        <span class="font-medium">{{ goal.title }}</span>
        <span class="text-sm text-light">{{ getLanguageName(goal.language) }}</span>
        <button
          @click.stop="$emit('remove')"
          class="btn btn-sm btn-ghost ml-auto"
          aria-label="Remove goal"
        >
          <Trash2 :size="16" />
        </button>
      </summary>

      <div class="ml-4">
        <!-- Vocab Category -->
        <details class="group/vocab">
          <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
            <ChevronRight :size="14" class="group-open/vocab:hidden" />
            <ChevronDown :size="14" class="hidden group-open/vocab:block" />
            <span>Vocab</span>
            <span class="text-light">({{ vocabItems.length }})</span>
          </summary>
          <div class="ml-4">
            <div v-if="vocabItems.length === 0" class="py-1 px-3 text-sm text-light italic">
              (empty)
            </div>
            <div v-else>
              <div
                v-for="vocab in vocabItems"
                :key="vocab.id"
                class="py-1 px-3 text-sm hover:bg-base-200"
              >
                {{ vocab.content }}
              </div>
            </div>
          </div>
        </details>

        <!-- Translations Category -->
        <details class="group/translations">
          <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
            <ChevronRight :size="14" class="group-open/translations:hidden" />
            <ChevronDown :size="14" class="hidden group-open/translations:block" />
            <span>Translations</span>
            <span class="text-light">({{ translationItems.length }})</span>
          </summary>
          <div class="ml-4">
            <div v-if="translationItems.length === 0" class="py-1 px-3 text-sm text-light italic">
              (empty)
            </div>
            <div v-else>
              <div
                v-for="translation in translationItems"
                :key="translation.id"
                class="py-1 px-3 text-sm hover:bg-base-200"
              >
                {{ translation.content }}
              </div>
            </div>
          </div>
        </details>

        <!-- Glosses Category -->
        <details class="group/glosses">
          <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
            <ChevronRight :size="14" class="group-open/glosses:hidden" />
            <ChevronDown :size="14" class="hidden group-open/glosses:block" />
            <span>Glosses</span>
            <span class="text-light">({{ glossItems.length }})</span>
          </summary>
          <div class="ml-4">
            <div v-if="glossItems.length === 0" class="py-1 px-3 text-sm text-light italic">
              (empty)
            </div>
            <div v-else>
              <div
                v-for="gloss in glossItems"
                :key="gloss.id"
                class="py-1 px-3 text-sm hover:bg-base-200"
              >
                {{ gloss.description }}
              </div>
            </div>
          </div>
        </details>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import type { GoalData } from '@/entities/goals/GoalData';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { GlossData } from '@/entities/gloss/GlossData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  goal: GoalData;
}>();

defineEmits<{
  remove: [];
}>();

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const glossRepo = inject<GlossRepoContract>('glossRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;

const vocabItems = ref<VocabData[]>([]);
const translationItems = ref<TranslationData[]>([]);
const glossItems = ref<GlossData[]>([]);
const allLanguages = ref<LanguageData[]>([]);

async function loadData() {
  allLanguages.value = await languageRepo.getAll();

  // Load vocab
  if (props.goal.vocab.length > 0) {
    vocabItems.value = await vocabRepo.getVocabByUIDs(props.goal.vocab);
  }

  // Load translations
  if (props.goal.translations.length > 0) {
    translationItems.value = await translationRepo.getTranslationsByIds(props.goal.translations);
  }

  // Load glosses
  if (props.goal.glosses.length > 0) {
    glossItems.value = await glossRepo.getGlossesByIds(props.goal.glosses);
  }
}

function getLanguageName(code: string): string {
  const lang = allLanguages.value.find(l => l.code === code);
  return lang ? `${lang.emoji} ${lang.name}` : code;
}

onMounted(async () => {
  await loadData();
});
</script>
