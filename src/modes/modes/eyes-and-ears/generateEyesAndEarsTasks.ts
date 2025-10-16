import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { Task } from '@/tasks/Task';
import type { VocabData } from '@/entities/vocab/VocabData';
import { generateVocabChooseImageBySound } from '@/tasks/task-vocab-choose-image-by-sound/generate';
import { generateRecordSentenceTaskFromTwoVocab, generateRecordSentenceTaskFromSingleVocab } from '@/tasks/task-vocab-form-sentence/generate';
import { randomFromArray, pickRandom } from '@/shared/utils/arrayUtils';
import { useToast } from '@/shared/toasts';

export interface EyesAndEarsOptions {
  includeGenerationExercises?: boolean;
}

export async function generateEyesAndEars(
  vocabRepo: VocabRepoContract,
  languageCodes: string[],
  vocabBlockList?: string[],
  setsToAvoid?: string[],
  options: EyesAndEarsOptions = {}
): Promise<Task | null> {
  const toast = useToast();
  try {
    // Choose task type based on user preferences
    let taskType: 'choose-image' | 'form-sentence';
    
    if (options.includeGenerationExercises === false) {
      // Recall exercises only - always choose image by sound
      taskType = 'choose-image';
    } else {
      // Include generation exercises - randomly choose: 60% choose image by sound, 40% form sentence
      taskType = Math.random() < 0.6 ? 'choose-image' : 'form-sentence';
    }
    
    if (taskType === 'choose-image') {
      // Original choose-image-by-sound task
      // 70% chance to prefer due vocab (if available), 30% chance for unseen vocab
      const preferDueVocab = Math.random() < 0.7;
      
      if (preferDueVocab) {
        // Try to get a due vocab with sound and images
        const dueVocab = await vocabRepo.getRandomDueVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
        if (dueVocab) {
          return generateVocabChooseImageBySound(dueVocab);
        }
      }

      // Try to get an unseen vocab with sound and images
      const unseenVocab = await vocabRepo.getRandomUnseenVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
      if (unseenVocab) {
        return generateVocabChooseImageBySound(unseenVocab);
      }

      // Fallback: if we wanted unseen but none available, try due vocab
      if (!preferDueVocab) {
        const dueVocab = await vocabRepo.getRandomDueVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
        if (dueVocab) {
          return generateVocabChooseImageBySound(dueVocab);
        }
      }
      
      console.warn('Eyes and Ears: No vocab found with both sound and images for choose-image task', {
        languageCodes,
        vocabBlockListSize: vocabBlockList?.length || 0
      });
    } else {
      // Form sentence task with vocab that has sound and images
      // 70% chance to prefer due vocab, 30% unseen
      const preferDueVocab = Math.random() < 0.7;

      // Get eligible vocab using repository methods
      let eligibleVocab: VocabData[] = [];
      if (preferDueVocab) {
        eligibleVocab = await vocabRepo.getDueVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
        // If no due vocab available, try unseen
        if (eligibleVocab.length === 0) {
          eligibleVocab = await vocabRepo.getUnseenVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
        }
      } else {
        eligibleVocab = await vocabRepo.getUnseenVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
        // If no unseen vocab available, try due
        if (eligibleVocab.length === 0) {
          eligibleVocab = await vocabRepo.getDueVocabWithSoundAndImages(languageCodes, vocabBlockList, setsToAvoid);
        }
      }

      if (eligibleVocab.length >= 2) {
        // Try to create a two-vocab sentence task
        // Group by language for better sentence formation
        const languageGroups: { [language: string]: VocabData[] } = {};
        for (const vocab of eligibleVocab) {
          if (!languageGroups[vocab.language]) {
            languageGroups[vocab.language] = [];
          }
          languageGroups[vocab.language].push(vocab);
        }

        // Find a language with at least 2 vocab items
        const languagesWithPairs = Object.entries(languageGroups)
          .filter(([, vocabs]) => vocabs.length >= 2);

        if (languagesWithPairs.length > 0) {
          const [, vocabsInLanguage] = randomFromArray(languagesWithPairs)!;
          const selectedPair = pickRandom(vocabsInLanguage, 2);
          return generateRecordSentenceTaskFromTwoVocab(selectedPair[0], selectedPair[1]);
        }
      }

      if (eligibleVocab.length >= 1) {
        // Create single-vocab record sentence task
        const selectedVocab = randomFromArray(eligibleVocab)!;
        return generateRecordSentenceTaskFromSingleVocab(selectedVocab);
      }

      console.warn('Eyes and Ears: No vocab found with both sound and images for form-sentence task', {
        languageCodes,
        vocabBlockListSize: vocabBlockList?.length || 0,
        eligibleVocabCount: eligibleVocab.length
      });
    }

    // No suitable vocab available
    
    return null;
  } catch (error) {
    toast.error(`Error generating eyes and ears task: ${String(error)}`);
    return null;
  }
}