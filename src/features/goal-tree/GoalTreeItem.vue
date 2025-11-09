<template>
  <div class="border-l border-base-300">
    <!-- Goal Level -->
    <details class="group" :open="openStates.goal" @toggle="handleToggle('goal', $event)">
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
        <details class="group/vocab" :open="openStates.vocab" @toggle="handleToggle('vocab', $event)">
          <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
            <ChevronRight :size="14" class="group-open/vocab:hidden" />
            <ChevronDown :size="14" class="hidden group-open/vocab:block" />
            <span>Vocab</span>
            <span class="text-light">({{ vocabItems.length }})</span>
            <button @click.stop="showSelectVocabModal = true" class="btn btn-xs btn-ghost ml-auto" aria-label="Add existing vocab">
              <ListPlus :size="14" />
            </button>
            <button @click.stop="showAddVocabModal = true" class="btn btn-xs btn-ghost" aria-label="Create new vocab">
              <Plus :size="14" />
            </button>
          </summary>
          <div class="ml-4">
            <div v-if="vocabItems.length === 0" class="py-1 px-3 text-sm text-light italic">
              (empty)
            </div>
            <div v-else>
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
                  <span class="text-xs text-light">
                    ({{ (vocabTranslationsMap.get(vocab.id)?.length || 0) + (vocabGlossesMap.get(vocab.id)?.length || 0) }})
                  </span>
                  <button @click.stop="openVocabModal(vocab)" class="btn btn-xs btn-ghost" aria-label="View vocab">
                    <Eye :size="12" />
                  </button>
                  <button @click.stop="disconnectVocab(vocab.id)" class="btn btn-xs btn-ghost" aria-label="Remove vocab">
                    <X :size="12" />
                  </button>
                </summary>

                <div class="ml-4">
                  <!-- Vocab Translations -->
                  <details
                    class="group/vocab-translations"
                    :open="getVocabItemState(vocab.id).translations"
                    @toggle="handleVocabItemToggle(vocab.id, 'translations', $event)"
                  >
                    <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-xs font-medium">
                      <ChevronRight :size="10" class="group-open/vocab-translations:hidden" />
                      <ChevronDown :size="10" class="hidden group-open/vocab-translations:block" />
                      <span>Translations</span>
                      <span class="text-light">({{ vocabTranslationsMap.get(vocab.id)?.length || 0 }})</span>
                    </summary>
                    <div class="ml-4">
                      <div v-if="!vocabTranslationsMap.get(vocab.id) || vocabTranslationsMap.get(vocab.id)!.length === 0" class="py-1 px-3 text-xs text-light italic">
                        (empty)
                      </div>
                      <div v-else>
                        <div
                          v-for="translation in vocabTranslationsMap.get(vocab.id)"
                          :key="translation.id"
                          class="flex items-center gap-2 py-1 px-3 text-xs font-normal hover:bg-base-200"
                        >
                          <span class="flex-1">{{ translation.content }}</span>
                        </div>
                      </div>
                    </div>
                  </details>

                  <!-- Vocab Glosses -->
                  <details
                    class="group/vocab-glosses"
                    :open="getVocabItemState(vocab.id).glosses"
                    @toggle="handleVocabItemToggle(vocab.id, 'glosses', $event)"
                  >
                    <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-xs font-medium">
                      <ChevronRight :size="10" class="group-open/vocab-glosses:hidden" />
                      <ChevronDown :size="10" class="hidden group-open/vocab-glosses:block" />
                      <span>Glosses</span>
                      <span class="text-light">({{ vocabGlossesMap.get(vocab.id)?.length || 0 }})</span>
                    </summary>
                    <div class="ml-4">
                      <div v-if="!vocabGlossesMap.get(vocab.id) || vocabGlossesMap.get(vocab.id)!.length === 0" class="py-1 px-3 text-xs text-light italic">
                        (empty)
                      </div>
                      <div v-else>
                        <div
                          v-for="gloss in vocabGlossesMap.get(vocab.id)"
                          :key="gloss.id"
                          class="flex items-center gap-2 py-1 px-3 text-xs font-normal hover:bg-base-200"
                        >
                          <span class="flex-1">{{ gloss.description }}</span>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </details>
            </div>
          </div>
        </details>

        <!-- Translations Category -->
        <details class="group/translations" :open="openStates.translations" @toggle="handleToggle('translations', $event)">
          <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
            <ChevronRight :size="14" class="group-open/translations:hidden" />
            <ChevronDown :size="14" class="hidden group-open/translations:block" />
            <span>Translations</span>
            <span class="text-light">({{ translationItems.length }})</span>
            <button @click.stop="showSelectTranslationModal = true" class="btn btn-xs btn-ghost ml-auto" aria-label="Add existing translation">
              <ListPlus :size="14" />
            </button>
            <button @click.stop="showAddTranslationModal = true" class="btn btn-xs btn-ghost" aria-label="Create new translation">
              <Plus :size="14" />
            </button>
          </summary>
          <div class="ml-4">
            <div v-if="translationItems.length === 0" class="py-1 px-3 text-sm text-light italic">
              (empty)
            </div>
            <div v-else>
              <div
                v-for="translation in translationItems"
                :key="translation.id"
                class="flex items-center gap-2 py-1 px-3 text-sm hover:bg-base-200"
              >
                <span class="flex-1">{{ translation.content }}</span>
                <button @click="disconnectTranslation(translation.id)" class="btn btn-xs btn-ghost" aria-label="Remove translation">
                  <X :size="12" />
                </button>
              </div>
            </div>
          </div>
        </details>

        <!-- Glosses Category -->
        <details class="group/glosses" :open="openStates.glosses" @toggle="handleToggle('glosses', $event)">
          <summary class="flex items-center gap-2 py-1 px-3 cursor-pointer hover:bg-base-200 list-none text-sm">
            <ChevronRight :size="14" class="group-open/glosses:hidden" />
            <ChevronDown :size="14" class="hidden group-open/glosses:block" />
            <span>Glosses</span>
            <span class="text-light">({{ glossItems.length }})</span>
            <button @click.stop="showSelectGlossModal = true" class="btn btn-xs btn-ghost ml-auto" aria-label="Add existing gloss">
              <ListPlus :size="14" />
            </button>
            <button @click.stop="showAddGlossModal = true" class="btn btn-xs btn-ghost" aria-label="Create new gloss">
              <Plus :size="14" />
            </button>
          </summary>
          <div class="ml-4">
            <div v-if="glossItems.length === 0" class="py-1 px-3 text-sm text-light italic">
              (empty)
            </div>
            <div v-else>
              <div
                v-for="gloss in glossItems"
                :key="gloss.id"
                class="flex items-center gap-2 py-1 px-3 text-sm hover:bg-base-200"
              >
                <span class="flex-1">{{ gloss.description }}</span>
                <button @click="disconnectGloss(gloss.id)" class="btn btn-xs btn-ghost" aria-label="Remove gloss">
                  <X :size="12" />
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </details>
  </div>

  <SelectVocabModal
    :show="showSelectVocabModal"
    :exclude-vocab-ids="goal.vocab"
    :language="goal.language"
    @close="showSelectVocabModal = false"
    @vocab-selected="handleVocabSelected"
  />

  <AddVocabModal
    :show="showAddVocabModal"
    :language="goal.language"
    @close="showAddVocabModal = false"
    @vocab-added="handleVocabAdded"
  />

  <SelectTranslationModal
    :show="showSelectTranslationModal"
    :exclude-translation-ids="goal.translations"
    @close="showSelectTranslationModal = false"
    @translation-selected="handleTranslationSelected"
  />

  <AddTranslationModal
    :show="showAddTranslationModal"
    @close="showAddTranslationModal = false"
    @translation-added="handleTranslationAdded"
  />

  <SelectGlossModal
    :show="showSelectGlossModal"
    :exclude-gloss-ids="goal.glosses"
    @close="showSelectGlossModal = false"
    @gloss-selected="handleGlossSelected"
  />

  <AddGlossModal
    :show="showAddGlossModal"
    @close="showAddGlossModal = false"
    @gloss-added="handleGlossAdded"
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
        :repos="{ languageRepo, translationRepo, glossRepo, noteRepo, vocabRepo }"
        showLanguage
        showDeepData
        showRelations
      />
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeVocabModal">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, watch } from 'vue';
import type { GoalData } from '@/entities/goals/GoalData';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { GlossData } from '@/entities/gloss/GlossData';
import type { LanguageData } from '@/entities/languages/LanguageData';
import { ChevronRight, ChevronDown, Trash2, X, Plus, ListPlus, Eye } from 'lucide-vue-next';
import SelectVocabModal from '@/features/vocab-select/SelectVocabModal.vue';
import AddVocabModal from '@/features/vocab-add/AddVocabModal.vue';
import SelectTranslationModal from '@/features/translation-select/SelectTranslationModal.vue';
import AddTranslationModal from '@/features/translation-add/AddTranslationModal.vue';
import SelectGlossModal from '@/features/gloss-select/SelectGlossModal.vue';
import AddGlossModal from '@/features/gloss-add/AddGlossModal.vue';
import VocabRenderer from '@/features/vocab-view/VocabRenderer.vue';
import { setTreeState, setVocabState, getVocabState, getDefaultTreeState } from './treeState';
import type { VocabItemState } from './treeState';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';

const props = defineProps<{
  goal: GoalData;
  situationId: string;
  initialOpenStates?: {
    goal: boolean;
    vocab: boolean;
    translations: boolean;
    glosses: boolean;
  };
}>();

const emit = defineEmits<{
  remove: [];
  'vocab-selected': [string, string];
  'vocab-added': [string, string];
  'vocab-disconnected': [string, string];
  'translation-selected': [string, string];
  'translation-added': [string, string];
  'translation-disconnected': [string, string];
  'gloss-selected': [string, string];
  'gloss-added': [string, string];
  'gloss-disconnected': [string, string];
}>();

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;
const translationRepo = inject<TranslationRepoContract>('translationRepo')!;
const glossRepo = inject<GlossRepoContract>('glossRepo')!;
const languageRepo = inject<LanguageRepoContract>('languageRepo')!;
const noteRepo = inject<NoteRepoContract>('noteRepo')!;

const vocabItems = ref<VocabData[]>([]);
const translationItems = ref<TranslationData[]>([]);
const glossItems = ref<GlossData[]>([]);
const allLanguages = ref<LanguageData[]>([]);

// Vocab-level translations and glosses
const vocabTranslationsMap = ref<Map<string, TranslationData[]>>(new Map());
const vocabGlossesMap = ref<Map<string, GlossData[]>>(new Map());

const showSelectVocabModal = ref(false);
const showAddVocabModal = ref(false);
const showSelectTranslationModal = ref(false);
const showAddTranslationModal = ref(false);
const showSelectGlossModal = ref(false);
const showAddGlossModal = ref(false);

// Vocab viewer modal state
const showVocabModal = ref(false);
const selectedVocab = ref<VocabData | null>(null);

// Open/closed states with initial values from props or defaults
const openStates = ref(props.initialOpenStates || getDefaultTreeState());

async function loadData() {
  allLanguages.value = await languageRepo.getAll();

  // Load vocab
  if (props.goal.vocab.length > 0) {
    vocabItems.value = await vocabRepo.getVocabByUIDs(props.goal.vocab);

    // Pre-load translations and glosses for each vocab item
    for (const vocab of vocabItems.value) {
      if (vocab.translations && vocab.translations.length > 0) {
        const translations = await translationRepo.getTranslationsByIds(vocab.translations);
        vocabTranslationsMap.value.set(vocab.id, translations);
      }
      if (vocab.glosses && vocab.glosses.length > 0) {
        const glosses = await glossRepo.getGlossesByIds(vocab.glosses);
        vocabGlossesMap.value.set(vocab.id, glosses);
      }
    }
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

// Event handlers
function handleVocabSelected(vocabId: string) {
  emit('vocab-selected', props.goal.id, vocabId);
}

function handleVocabAdded(vocabId: string) {
  emit('vocab-added', props.goal.id, vocabId);
}

function disconnectVocab(vocabId: string) {
  emit('vocab-disconnected', props.goal.id, vocabId);
}

function handleTranslationSelected(translationId: string) {
  emit('translation-selected', props.goal.id, translationId);
}

function handleTranslationAdded(translationId: string) {
  emit('translation-added', props.goal.id, translationId);
}

function disconnectTranslation(translationId: string) {
  emit('translation-disconnected', props.goal.id, translationId);
}

function handleGlossSelected(glossId: string) {
  emit('gloss-selected', props.goal.id, glossId);
}

function handleGlossAdded(glossId: string) {
  emit('gloss-added', props.goal.id, glossId);
}

function disconnectGloss(glossId: string) {
  emit('gloss-disconnected', props.goal.id, glossId);
}

// Handle toggle events to persist state
function handleToggle(path: 'goal' | 'vocab' | 'translations' | 'glosses', event: Event) {
  const target = event.target as HTMLDetailsElement;
  openStates.value[path] = target.open;
  setTreeState(props.situationId, props.goal.id, path, target.open);
}

// Get vocab item state with defaults
function getVocabItemState(vocabId: string): VocabItemState {
  return getVocabState(props.situationId, props.goal.id, vocabId) || {
    expanded: false,
    translations: false,
    glosses: false
  };
}

// Handle vocab item toggle events
function handleVocabItemToggle(vocabId: string, path: keyof VocabItemState, event: Event) {
  const target = event.target as HTMLDetailsElement;
  setVocabState(props.situationId, props.goal.id, vocabId, path, target.open);
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

onMounted(async () => {
  await loadData();
});

// Watch for goal changes and reload data
watch(() => props.goal, async () => {
  await loadData();
}, { deep: true });
</script>
