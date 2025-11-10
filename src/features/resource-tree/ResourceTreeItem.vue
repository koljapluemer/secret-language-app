<template>
  <div class="border-l border-base-300">
    <!-- Resource Level -->
    <details class="group" :open="openStates.resource" @toggle="handleToggle('resource', $event)">
      <summary class="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-base-200 list-none">
        <ChevronRight :size="16" class="group-open:hidden" />
        <ChevronDown :size="16" class="hidden group-open:block" />
        <div class="flex-1 min-w-0 font-medium">
          <ResourceReference :resource="resource" />
        </div>
        <span class="text-sm text-light flex-shrink-0">{{ getLanguageName(resource.language) }}</span>
        <button
          @click.stop="$emit('remove')"
          class="btn btn-sm btn-ghost flex-shrink-0"
          aria-label="Remove resource"
        >
          <Trash2 :size="16" />
        </button>
      </summary>

      <div class="ml-4">

        <!-- Vocab Items (no category wrapper) -->
        <div v-if="vocabItems.length === 0" class="py-1 px-3 text-sm text-light italic flex items-center gap-2">
          <span>(no vocab)</span>
          <button @click.stop="showVocabModalDialog = true" class="btn btn-xs btn-ghost ml-auto" aria-label="Add vocab">
            <Plus :size="14" />
          </button>
        </div>
        <div v-else class="space-y-1">
          <div class="flex items-center gap-2 py-1 px-3">
            <button @click.stop="showVocabModalDialog = true" class="btn btn-xs btn-ghost ml-auto" aria-label="Add vocab">
              <Plus :size="14" />
            </button>
          </div>
          <details
            v-for="vocab in vocabItems"
            :key="vocab.id"
            class="group/vocab-item"
            :open="getVocabItemState(vocab.id).expanded"
            @toggle="handleVocabItemToggle(vocab.id, 'expanded', $event)"
          >
            <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
              <ChevronRight :size="12" class="group-open/vocab-item:hidden" />
              <ChevronDown :size="12" class="hidden group-open/vocab-item:block" />
              <span class="flex-1">{{ vocab.content }}</span>
              <button @click.stop="openVocabModal(vocab)" class="btn btn-xs btn-ghost" aria-label="View vocab">
                <Eye :size="12" />
              </button>
              <button @click.stop="disconnectVocab(vocab.id)" class="btn btn-xs btn-ghost" aria-label="Remove vocab">
                <X :size="12" />
              </button>
            </summary>

            <div class="ml-4">
              <!-- Vocab Translations -->
              <div v-if="!vocabTranslationsMap.get(vocab.id) || vocabTranslationsMap.get(vocab.id)!.length === 0" class="py-1 px-3 text-xs text-light italic">
                (no translations)
              </div>
              <div v-else class="space-y-1">
                <div
                  v-for="translation in vocabTranslationsMap.get(vocab.id)"
                  :key="translation.id"
                  class="flex items-center gap-2 py-1 px-3 text-xs hover:bg-base-200"
                >
                  <span class="flex-1">{{ translation.content }}</span>
                  <button @click.stop="openTranslationModal(translation)" class="btn btn-xs btn-ghost" aria-label="View translation">
                    <Eye :size="10" />
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </details>
  </div>

  <VocabModal
    :show="showVocabModalDialog"
    :exclude-vocab-ids="resource.vocab"
    :language="resource.language"
    @close="showVocabModalDialog = false"
    @vocab-added="handleVocabAdded"
  />

  <!-- Vocab Viewer Modal -->
  <dialog :class="['modal', { 'modal-open': showVocabModal }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="closeVocabModal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <VocabRenderer
        v-if="selectedVocab"
        :vocab="selectedVocab"
        :repos="{ languageRepo, translationRepo, noteRepo, vocabRepo }"
        showLanguage
        showDeepData
        showRelations
      />
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeVocabModal">close</button>
    </form>
  </dialog>

  <!-- Translation Viewer Modal -->
  <dialog :class="['modal', { 'modal-open': showTranslationModal }]">
    <div class="modal-box">
      <form method="dialog">
        <button @click="closeTranslationModal" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <TranslationRenderer
        v-if="selectedTranslation"
        :translation="selectedTranslation"
        :repos="{ languageRepo, translationRepo, noteRepo, vocabRepo }"
        showDeepData
      />
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeTranslationModal">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, watch } from 'vue';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import { ChevronRight, ChevronDown, Trash2, X, Plus, Eye } from 'lucide-vue-next';
import ResourceReference from '@/entities/resources/ResourceReference.vue';
import VocabModal from '@/features/vocab-modal/VocabModal.vue';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import TranslationRenderer from '@/features/translation-view/TranslationRenderer.vue';
import { setResourceTreeState, setResourceVocabState, getResourceVocabState, getDefaultResourceTreeState } from '../goal-tree/treeState';
import type { VocabItemState } from '../goal-tree/treeState';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';

const props = defineProps<{
  resource: ResourceData;
  situationId: string;
  initialOpenStates?: {
    resource: boolean;
  };
}>();

const emit = defineEmits<{
  remove: [];
  'vocab-added': [string, string];
  'vocab-disconnected': [string, string];
}>();

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;
const noteRepo = inject<NoteRepoContract>('noteRepo')!;

const vocabItems = ref<VocabData[]>([]);
const allLanguages = ref<LanguageData[]>([]);

// Vocab-level translations
const vocabTranslationsMap = ref<Map<string, TranslationData[]>>(new Map());

const showVocabModalDialog = ref(false);

// Vocab viewer modal state
const showVocabModal = ref(false);
const selectedVocab = ref<VocabData | null>(null);

// Translation viewer modal state
const showTranslationModal = ref(false);
const selectedTranslation = ref<TranslationData | null>(null);

// Open/closed states with initial values from props or defaults
const openStates = ref(props.initialOpenStates || getDefaultResourceTreeState());

async function loadData() {
  allLanguages.value = await languageRepo.getAll();

  // Load vocab
  if (props.resource.vocab.length > 0) {
    vocabItems.value = await vocabRepo.getVocabByUIDs(props.resource.vocab);

    // Pre-load translations for each vocab item
    for (const vocab of vocabItems.value) {
      if (vocab.translations && vocab.translations.length > 0) {
        const translations = await translationRepo.getTranslationsByIds(vocab.translations);
        vocabTranslationsMap.value.set(vocab.id, translations);
      }
    }
  }
}

function getLanguageName(code: string): string {
  const lang = allLanguages.value.find(l => l.code === code);
  return lang ? `${lang.emoji} ${lang.name}` : code;
}

// Event handlers
function handleVocabAdded(vocabId: string) {
  emit('vocab-added', props.resource.id, vocabId);
}

function disconnectVocab(vocabId: string) {
  emit('vocab-disconnected', props.resource.id, vocabId);
}

// Handle toggle events to persist state
function handleToggle(path: 'resource', event: Event) {
  const target = event.target as HTMLDetailsElement;
  openStates.value[path] = target.open;
  setResourceTreeState(props.situationId, props.resource.id, path, target.open);
}

// Get vocab item state with defaults
function getVocabItemState(vocabId: string): VocabItemState {
  return getResourceVocabState(props.situationId, props.resource.id, vocabId) || {
    expanded: false,
    translations: false,
    glosses: false
  };
}

// Handle vocab item toggle events
function handleVocabItemToggle(vocabId: string, path: keyof VocabItemState, event: Event) {
  const target = event.target as HTMLDetailsElement;
  setResourceVocabState(props.situationId, props.resource.id, vocabId, path, target.open);
}

// Vocab viewer modal functions
function openVocabModal(vocab: VocabData) {
  selectedVocab.value = vocab;
  showVocabModal.value = true;
}

function closeVocabModal() {
  showVocabModal.value = false;
  selectedVocab.value = null;
}

// Translation viewer modal functions
function openTranslationModal(translation: TranslationData) {
  selectedTranslation.value = translation;
  showTranslationModal.value = true;
}

function closeTranslationModal() {
  showTranslationModal.value = false;
  selectedTranslation.value = null;
}

onMounted(async () => {
  await loadData();
});

// Watch for resource changes and reload data
watch(() => props.resource, async () => {
  await loadData();
}, { deep: true });
</script>
