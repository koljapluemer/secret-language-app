import type { VocabData } from '@/entities/vocab/VocabData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getFormSentenceTaskState(
  vocab: VocabData
): TaskStateResult {
  const level = vocab.progress.level;
  const isSentenceVocab = vocab.consideredSentence === true;
  const hasContent = !!vocab.content;

  if (isSentenceVocab) {
    return { state: 'inactive', reason: 'Not for sentence vocab' };
  }

  if (!hasContent) {
    return { state: 'impossible', reason: 'No content available' };
  }

  if (level < 0) {
    return { state: 'inactive', reason: 'Only for level 0+' };
  }

  return { state: 'active' };
}
