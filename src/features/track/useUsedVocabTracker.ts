import { ref } from 'vue';

const usedVocabIds = ref<string[]>([]);

export function useUsedVocabTracker() {
  const addUsedVocab = (id: string) => {
    usedVocabIds.value.push(id);
  };

  const getLastUsedVocabId = (): string | null => {
    return usedVocabIds.value.length > 0 ? usedVocabIds.value[usedVocabIds.value.length - 1] : null;
  };

  return {
    addUsedVocab,
    getLastUsedVocabId
  };
}
