import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { Task } from '@/tasks/Task';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import { randomFromArray } from '@/shared/utils/arrayUtils';
import { useToast } from '@/shared/toasts';

// Import all task generators
import { generateAddTranslation } from '@/tasks/task-vocab-add-translation/generate';
import { generateVocabTryToRemember } from '@/tasks/task-vocab-try-to-remember/generate';
import { generateGuessWhatSentenceMeans } from '@/tasks/task-guess-what-sentence-means/generate';
import { generateVocabRevealTargetToNative } from '@/tasks/task-vocab-reveal/generate';
import { generateVocabRevealNativeToTarget } from '@/tasks/task-vocab-reveal/generate';
import { generateVocabChoiceFromTwoTargetToNative } from '@/tasks/task-vocab-single-choice/generate';
import { generateVocabChoiceFromTwoNativeToTarget } from '@/tasks/task-vocab-single-choice/generate';
import { generateVocabChoiceFromFourTargetToNative } from '@/tasks/task-vocab-single-choice/generate';
import { generateVocabChoiceFromFourNativeToTarget } from '@/tasks/task-vocab-single-choice/generate';
import { generateClozeChoiceFromTwo } from '@/tasks/task-cloze-choice/generate';
import { generateClozeChoiceFromFour } from '@/tasks/task-cloze-choice/generate';
import { generateClozeReveal } from '@/tasks/task-cloze-reveal/generate';
import { generateTaskFormSentenceFromTwoVocab, generateFormSentenceTaskFromSingleVocab } from '@/tasks/task-vocab-form-sentence/generate';

// Import all task state checkers
import { getAddTranslationTaskState } from '@/tasks/task-vocab-add-translation/taskStateForVocab';
import { getVocabTryToRememberTaskState } from '@/tasks/task-vocab-try-to-remember/taskStateForVocab';
import { getGuessWhatSentenceMeansTaskState } from '@/tasks/task-guess-what-sentence-means/taskStateForVocab';
import { getVocabRevealTargetToNativeTaskState, getVocabRevealNativeToTargetTaskState } from '@/tasks/task-vocab-reveal/taskStateForVocab';
import {
  getVocabChoiceFromTwoTargetToNativeTaskState,
  getVocabChoiceFromTwoNativeToTargetTaskState,
  getVocabChoiceFromFourTargetToNativeTaskState,
  getVocabChoiceFromFourNativeToTargetTaskState
} from '@/tasks/task-vocab-single-choice/taskStateForVocab';
import { getClozeChoiceFromTwoTaskState, getClozeChoiceFromFourTaskState } from '@/tasks/task-cloze-choice/taskStateForVocab';
import { getClozeRevealTaskState } from '@/tasks/task-cloze-reveal/taskStateForVocab';
import { getFormSentenceTaskState } from '@/tasks/task-vocab-form-sentence/taskStateForVocab';

type TaskGenerator = () => Task | Promise<Task>;


export async function getRandomGeneratedTaskForVocab(
  vocab: VocabData,
  translations: TranslationData[] = [],
  vocabRepo?: VocabRepoContract
): Promise<Task | null> {
  const toast = useToast();

  const eligibleTasks: TaskGenerator[] = [];

  // Check all task types and add active ones to eligible tasks

  // Unseen vocab tasks
  if (getVocabTryToRememberTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabTryToRemember(vocab));
  }
  if (getGuessWhatSentenceMeansTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateGuessWhatSentenceMeans(vocab));
  }

  // Word/unspecified choice tasks
  if (getVocabChoiceFromTwoTargetToNativeTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabChoiceFromTwoTargetToNative(vocab));
  }
  if (getVocabChoiceFromFourTargetToNativeTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabChoiceFromFourTargetToNative(vocab));
  }
  if (getVocabChoiceFromTwoNativeToTargetTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabChoiceFromTwoNativeToTarget(vocab));
  }
  if (getVocabChoiceFromFourNativeToTargetTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabChoiceFromFourNativeToTarget(vocab));
  }

  // Word/unspecified reveal tasks
  if (getVocabRevealTargetToNativeTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabRevealTargetToNative(vocab));
  }
  if (getVocabRevealNativeToTargetTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateVocabRevealNativeToTarget(vocab));
  }

  // Sentence cloze tasks
  if (getClozeChoiceFromTwoTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateClozeChoiceFromTwo(vocab));
  }
  if (getClozeChoiceFromFourTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateClozeChoiceFromFour(vocab));
  }
  if (getClozeRevealTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateClozeReveal(vocab));
  }

  // Form sentence tasks for non-sentence vocab (requires vocabRepo)
  if (vocabRepo && getFormSentenceTaskState(vocab).state === 'active') {
    // Single vocab form sentence task
    eligibleTasks.push(() => generateFormSentenceTaskFromSingleVocab(vocab));

    // Two vocab form sentence task (async - find another vocab)
    eligibleTasks.push(async () => {
      try {
        const otherVocabs = await vocabRepo.getDueNonSentenceVocabInLanguage(vocab.language);
        const otherVocab = otherVocabs.find(v => v.id !== vocab.id);
        if (otherVocab) {
          return generateTaskFormSentenceFromTwoVocab(vocab, otherVocab);
        }
        // Fallback to single vocab if no other vocab found
        return generateFormSentenceTaskFromSingleVocab(vocab);
      } catch (error) {
        toast.error(`Error finding second vocab for form sentence task: ${String(error)}`);
        return generateFormSentenceTaskFromSingleVocab(vocab);
      }
    });
  }

  // Content enhancement tasks
  if (getAddTranslationTaskState(vocab, translations).state === 'active') {
    eligibleTasks.push(() => generateAddTranslation(vocab));
  }

  if (eligibleTasks.length === 0) {
    return null;
  }

  // Randomly pick one task from all eligible tasks
  const selectedTaskGenerator = randomFromArray(eligibleTasks);
  return selectedTaskGenerator ? await selectedTaskGenerator() : null;
}
