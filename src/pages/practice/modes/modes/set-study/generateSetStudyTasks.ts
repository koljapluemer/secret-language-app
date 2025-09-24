import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { Task } from '@/pages/practice/Task';
import { getRandomGeneratedTaskForVocab } from '@/pages/practice/modes/utils/getRandomGeneratedTaskForVocab';
import { randomFromArray } from '@/shared/utils/arrayUtils';

export interface SetStudyOptions {
  setUid: string;
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
    const { setUid, maxNewVocab, currentNewVocabCount } = options;

    // First, try to get due vocab from the set
    const dueVocab = await vocabRepo.getRandomDueVocabFromSet(setUid, 10, vocabBlockList);
    console.log(`[SET-STUDY DEBUG] Found ${dueVocab.length} due vocab items for set ${setUid}`);
    if (dueVocab.length > 0) {
      console.log('[SET-STUDY DEBUG] Due vocab details:', dueVocab.map(v => ({
        uid: v.uid,
        content: v.content,
        level: v.progress.level,
        due: v.progress.due,
        now: new Date(),
        isDue: v.progress.due <= new Date()
      })));
    }

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
      const unseenVocab = await vocabRepo.getRandomUnseenVocabFromSet(setUid, 10, vocabBlockList);

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
  } catch (error) {
    console.error('Error generating Set Study task:', error);
    return null;
  }
}

export async function getSetStudyProgress(
  vocabRepo: VocabRepoContract,
  setUid: string
): Promise<{ totalUnseen: number; totalDue: number }> {
  try {
    const totalUnseen = await vocabRepo.getUnseenVocabCountFromSet(setUid);

    // Get due vocab count by fetching and counting
    const dueVocab = await vocabRepo.getRandomDueVocabFromSet(setUid, 1000); // Large number to get all
    const totalDue = dueVocab.length;

    console.log(`[SET-STUDY DEBUG] Progress for set ${setUid}: ${totalUnseen} unseen, ${totalDue} due`);

    return { totalUnseen, totalDue };
  } catch (error) {
    console.error('Error getting Set Study progress:', error);
    return { totalUnseen: 0, totalDue: 0 };
  }
}