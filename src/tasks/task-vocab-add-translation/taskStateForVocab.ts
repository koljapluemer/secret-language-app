import type { VocabData } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getAddTranslationTaskState(
  vocab: VocabData,
  translations: TranslationData[] = []
): TaskStateResult {
  const hasContent = !!vocab.content;
  const hasTranslations = translations.length > 0;

  if (!hasContent) {
    return { state: 'impossible', reason: 'No content available' };
  }

  if (hasTranslations) {
    return { state: 'inactive', reason: 'Already has translations' };
  }

  if (vocab.notInterestedInAddingTranslations) {
    return { state: 'disabled', reason: 'User disabled translation additions' };
  }

  return { state: 'active' };
}
