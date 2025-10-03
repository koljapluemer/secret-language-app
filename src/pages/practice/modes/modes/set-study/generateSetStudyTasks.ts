import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { Task } from '@/pages/practice/Task';
import { getRandomGeneratedTaskForVocab } from '@/pages/practice/modes/utils/getRandomGeneratedTaskForVocab';
import { randomFromArray } from '@/shared/utils/arrayUtils';

export interface SetStudyOptions {
  setId: string;
  maxNewVocab: number;
  currentNewVocabCount: number;
}

export async function generateSetStudyTask(
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract,
  options: SetStudyOptions,
  vocabBlockList?: string[]
): Promise<Task | null> {
  try {
    const { setId, maxNewVocab, currentNewVocabCount } = options;

    // First, try to get due vocab from the set
    const dueVocab = await vocabRepo.getRandomDueVocabFromSet(setId, 10, vocabBlockList);

    if (dueVocab.length > 0) {
      // Select random due vocab
      const selectedVocab = randomFromArray(dueVocab);
      if (selectedVocab) {
        const translations = await translationRepo.getTranslationsByIds(selectedVocab.translations || []);
        return await getRandomGeneratedTaskForVocab(selectedVocab, translations);
      }
    }

    // If no due vocab or we want to include new vocab
    if (currentNewVocabCount < maxNewVocab) {
      const unseenVocab = await vocabRepo.getRandomUnseenVocabFromSet(setId, 10, vocabBlockList);

      if (unseenVocab.length > 0) {
        // Select random unseen vocab
        const selectedVocab = randomFromArray(unseenVocab);
        if (selectedVocab) {
          const translations = await translationRepo.getTranslationsByIds(selectedVocab.translations || []);
          return await getRandomGeneratedTaskForVocab(selectedVocab, translations);
        }
      }
    }

    // No suitable vocab available
    return null;
  } catch {
    return null;
  }
}

export async function getSetStudyProgress(
  vocabRepo: VocabRepoContract,
  setId: string
): Promise<{ totalUnseen: number; totalDue: number }> {
  try {
    const totalUnseen = await vocabRepo.getUnseenVocabCountFromSet(setId);

    // Get due vocab count by fetching and counting
    const dueVocab = await vocabRepo.getRandomDueVocabFromSet(setId, 1000); // Large number to get all
    const totalDue = dueVocab.length;

    return { totalUnseen, totalDue };
  } catch {
    return { totalUnseen: 0, totalDue: 0 };
  }
}