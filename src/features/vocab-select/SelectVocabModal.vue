<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Select Existing Vocab</h3>

      <!-- Search -->
      <fieldset class="fieldset">
        <label for="vocab-search" class="label">Search</label>
        <input
          id="vocab-search"
          type="text"
          v-model="searchQuery"
          class="input"
          placeholder="Search vocab..."
          @input="debouncedSearch"
        />
      </fieldset>

      <!-- Results -->
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="filteredVocab.length === 0" class="text-center py-8">
        <p class="text-light">No vocab found</p>
      </div>

      <div v-else class="grid gap-2 mt-4 max-h-96 overflow-y-auto">
        <button
          v-for="vocab in filteredVocab"
          :key="vocab.id"
          @click="selectVocab(vocab.id)"
          class="btn btn-outline justify-start text-left h-auto py-2 px-4"
        >
          <div class="flex-1">
            <div class="font-bold">{{ vocab.content }}</div>
          </div>
        </button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button @click="close">close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { VocabData } from '@/entities/vocab/VocabData';

const props = defineProps<{
  show: boolean;
  excludeVocabIds: string[];
  language: string;
}>();

const emit = defineEmits<{
  close: [];
  'vocab-selected': [string];
}>();

const vocabRepo = inject<VocabRepoContract>('vocabRepo')!;

const vocab = ref<VocabData[]>([]);
const searchQuery = ref('');
const loading = ref(false);

let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const filteredVocab = computed(() => {
  return vocab.value.filter(v => {
    // Exclude already attached vocab
    if (props.excludeVocabIds.includes(v.id)) {
      return false;
    }

    // Filter by language
    if (v.language !== props.language) {
      return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      return v.content?.toLowerCase().includes(query);
    }

    return true;
  });
});

async function loadVocab() {
  loading.value = true;
  try {
    vocab.value = await vocabRepo.getVocab();
  } finally {
    loading.value = false;
  }
}

function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // Search happens via computed property
  }, 300);
}

function selectVocab(vocabId: string) {
  emit('vocab-selected', vocabId);
  emit('close');
}

function close() {
  emit('close');
}

// Load vocab when modal opens
watch(() => props.show, (isShown) => {
  if (isShown) {
    loadVocab();
  }
});
</script>
