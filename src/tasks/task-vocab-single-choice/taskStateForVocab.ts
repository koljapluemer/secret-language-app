import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getVocabChoiceFromTwoTargetToNativeTaskState(
  vocab: VocabData,
  translations: TranslationData[] = []
): TaskStateResult {
  const level = vocab.progress.level;
  const isSentenceVocab = vocab.consideredSentence === true;
  const hasTranslations = translations.length > 0;

  if (isSentenceVocab) {
    return { state: 'inactive', reason: 'Not for sentence vocab' };
  }

  if (!hasTranslations) {
    return { state: 'impossible', reason: 'No translations available' };
  }

  if (level !== 0 && level !== 1) {
    return { state: 'inactive', reason: 'Only for levels 0-1' };
  }

  return { state: 'active' };
}

export function getVocabChoiceFromFourTargetToNativeTaskState(
  vocab: VocabData,
  translations: TranslationData[] = []
): TaskStateResult {
  const level = vocab.progress.level;
  const isSentenceVocab = vocab.consideredSentence === true;
  const hasTranslations = translations.length > 0;

  if (isSentenceVocab) {
    return { state: 'inactive', reason: 'Not for sentence vocab' };
  }

  if (!hasTranslations) {
    return { state: 'impossible', reason: 'No translations available' };
  }

  if (level !== 1 && level !== 2) {
    return { state: 'inactive', reason: 'Only for levels 1-2' };
  }

  return { state: 'active' };
}

export function getVocabChoiceFromTwoNativeToTargetTaskState(
  vocab: VocabData,
  translations: TranslationData[] = []
): TaskStateResult {
  const level = vocab.progress.level;
  const isSentenceVocab = vocab.consideredSentence === true;
  const hasTranslations = translations.length > 0;

  if (isSentenceVocab) {
    return { state: 'inactive', reason: 'Not for sentence vocab' };
  }

  if (!hasTranslations) {
    return { state: 'impossible', reason: 'No translations available' };
  }

  if (level !== 1 && level !== 2) {
    return { state: 'inactive', reason: 'Only for levels 1-2' };
  }

  return { state: 'active' };
}

export function getVocabChoiceFromFourNativeToTargetTaskState(
  vocab: VocabData,
  translations: TranslationData[] = []
): TaskStateResult {
  const level = vocab.progress.level;
  const isSentenceVocab = vocab.consideredSentence === true;
  const hasTranslations = translations.length > 0;

  if (isSentenceVocab) {
    return { state: 'inactive', reason: 'Not for sentence vocab' };
  }

  if (!hasTranslations) {
    return { state: 'impossible', reason: 'No translations available' };
  }

  if (level !== 2 && level !== 3) {
    return { state: 'inactive', reason: 'Only for levels 2-3' };
  }

  return { state: 'active' };
}
