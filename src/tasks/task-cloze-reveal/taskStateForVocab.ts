import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getClozeRevealTaskState(
  vocab: VocabData,
  translations: TranslationData[] = []
): TaskStateResult {
  const level = vocab.progress.level;
  const isSentenceVocab = vocab.consideredSentence === true;
  const hasTranslations = translations.length > 0;

  if (!isSentenceVocab) {
    return { state: 'inactive', reason: 'Only for sentence vocab' };
  }

  if (!hasTranslations) {
    return { state: 'impossible', reason: 'No translations available' };
  }

  if (level < 0 || level > 5) {
    return { state: 'inactive', reason: 'Only for levels 0-5' };
  }

  return { state: 'active' };
}
