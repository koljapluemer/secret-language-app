<script setup lang="ts">
import { ref, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';

interface Props {
  show: boolean;
  modeId: string;
  testType: 'seen' | 'all';
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const router = useRouter();
const localSetRepo = inject<LocalSetRepoContract>('localSetRepo');

if (!localSetRepo) {
  throw new Error('LocalSetRepo not available');
}

const sets = ref<LocalSetData[]>([]);
const loading = ref(false);

async function loadSets() {
  if (!localSetRepo) return;

  loading.value = true;
  try {
    sets.value = await localSetRepo.getAllLocalSets();
  } catch {
    // Failed to load sets - sets will remain empty
  } finally {
    loading.value = false;
  }
}

function selectSet(setId: string) {
  // Navigate to test page with set and type params
  router.push({
    name: `test-mode-${props.modeId}`,
    query: {
      set: setId,
      type: props.testType
    }
  });
  emit('close');
}

function close() {
  emit('close');
}

// Load sets when modal opens
watch(() => props.show, (isShown) => {
  if (isShown) {
    loadSets();
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg">{{ $t('selfTest.selectSet') }}</h3>
        <p class="py-2 text-sm">
          {{ testType === 'seen' ? $t('selfTest.testingSeenVocab') : $t('selfTest.testingAllVocab') }}
        </p>

        <div v-if="loading" class="flex justify-center items-center min-h-48">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="sets.length === 0" class="alert alert-info">
          <span>{{ $t('selfTest.noSetsAvailable') }}</span>
        </div>

        <div v-else class="max-h-96 overflow-y-auto my-4">
          <div class="grid gap-2">
            <button
              v-for="set in sets"
              :key="set.id"
              class="btn btn-outline justify-start text-left h-auto py-3"
              @click="selectSet(set.id)"
            >
              <div class="flex flex-col items-start w-full">
                <div class="font-semibold">{{ set.name }}</div>
                <div class="text-xs opacity-70">{{ set.language }}</div>
                <div v-if="set.description" class="text-sm mt-1">{{ set.description }}</div>
              </div>
            </button>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="close">{{ $t('common.cancel') }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
