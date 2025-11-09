<template>
  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-2xl">
      <form method="dialog">
        <button @click="close" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>

      <h3 class="font-bold text-lg mb-4">Select Existing Gloss</h3>

      <!-- Search -->
      <fieldset class="fieldset">
        <label for="gloss-search" class="label">Search</label>
        <input
          id="gloss-search"
          type="text"
          v-model="searchQuery"
          class="input"
          placeholder="Search glosses..."
          @input="debouncedSearch"
        />
      </fieldset>

      <!-- Results -->
      <div v-if="loading" class="text-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="filteredGlosses.length === 0" class="text-center py-8">
        <p class="text-light">No glosses found</p>
      </div>

      <div v-else class="grid gap-2 mt-4 max-h-96 overflow-y-auto">
        <button
          v-for="gloss in filteredGlosses"
          :key="gloss.id"
          @click="selectGloss(gloss.id)"
          class="btn btn-outline justify-start text-left h-auto py-2 px-4"
        >
          <div class="flex-1">
            <div class="font-bold">{{ gloss.description }}</div>
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
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract';
import type { GlossData } from '@/entities/gloss/GlossData';

const props = defineProps<{
  show: boolean;
  excludeGlossIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  'gloss-selected': [string];
}>();

const glossRepo = inject<GlossRepoContract>('glossRepo')!;

const glosses = ref<GlossData[]>([]);
const searchQuery = ref('');
const loading = ref(false);

let searchTimeout: ReturnType<typeof setTimeout> | undefined;

const filteredGlosses = computed(() => {
  return glosses.value.filter(g => {
    // Exclude already attached glosses
    if (props.excludeGlossIds.includes(g.id)) {
      return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      return g.description.toLowerCase().includes(query);
    }

    return true;
  });
});

async function loadGlosses() {
  loading.value = true;
  try {
    glosses.value = await glossRepo.getAllGlosses();
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

function selectGloss(glossId: string) {
  emit('gloss-selected', glossId);
  emit('close');
}

function close() {
  emit('close');
}

// Load glosses when modal opens
watch(() => props.show, (isShown) => {
  if (isShown) {
    loadGlosses();
  }
});
</script>
