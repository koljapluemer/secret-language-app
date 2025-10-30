<script setup lang="ts">
import { ref, inject, onMounted } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;

interface VocabWithTranslations {
  vocab: VocabData;
  translations: TranslationData[];
}

const vocabList = ref<VocabWithTranslations[]>([]);
const loading = ref(true);
const allTranslations = ref<TranslationData[]>([]);

async function loadVocabWithTranslations() {
  loading.value = true;

  // Get all vocab
  const allVocab = await vocabRepo.getVocab();

  // Get ALL translations to check what's in the database
  allTranslations.value = await translationRepo.getAllTranslations();

  // For each vocab, load its translations
  const vocabWithTranslations: VocabWithTranslations[] = [];

  for (const vocab of allVocab) {
    const translations = await translationRepo.getTranslationsByIds(vocab.translations || []);

    vocabWithTranslations.push({
      vocab,
      translations
    });
  }

  vocabList.value = vocabWithTranslations;
  loading.value = false;
}

onMounted(() => {
  loadVocabWithTranslations();
});
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-4xl font-bold mb-6">Cram Debug - Vocab & Translations</h1>

    <button @click="loadVocabWithTranslations" class="btn btn-primary mb-4">
      Reload Data
    </button>

    <div v-if="loading" class="flex justify-center items-center min-h-[200px]">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else>
      <div class="alert alert-info mb-4">
        <div>
          <p>Total vocab items: {{ vocabList.length }}</p>
          <p>Total translations in database: {{ allTranslations.length }}</p>
          <p>Translation IDs in DB: {{ allTranslations.map(t => t.id).join(', ') }}</p>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="(item, index) in vocabList"
          :key="item.vocab.id"
          class="card bg-base-200 shadow-xl"
        >
          <div class="card-body">
            <h2 class="card-title">
              #{{ index + 1 }}: {{ item.vocab.content || '(no content)' }}
            </h2>

            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><strong>ID:</strong> {{ item.vocab.id }}</div>
              <div><strong>Language:</strong> {{ item.vocab.language }}</div>
              <div><strong>Translation IDs:</strong> {{ item.vocab.translations?.join(', ') || 'none' }}</div>
              <div><strong>Translations count:</strong> {{ item.translations.length }}</div>
            </div>

            <div v-if="item.vocab.translations && item.vocab.translations.length > 0" class="mt-2">
              <strong>Translation ID array:</strong>
              <pre class="bg-base-300 p-2 rounded text-xs">{{ JSON.stringify(item.vocab.translations, null, 2) }}</pre>
            </div>

            <div v-if="item.translations.length > 0" class="mt-2">
              <strong>Loaded Translations:</strong>
              <ul class="list-disc list-inside">
                <li v-for="trans in item.translations" :key="trans.id">
                  [{{ trans.id }}] {{ trans.content }}
                </li>
              </ul>
            </div>
            <div v-else class="alert alert-warning mt-2">
              <span>⚠️ No translations loaded despite IDs: {{ item.vocab.translations }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
