import type { VocabData } from '@/entities/vocab/VocabData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getVocabChooseFromSoundTaskState(
  vocab: VocabData
): TaskStateResult {
  // Must be a character
  if (!vocab.consideredCharacter) {
    return { state: 'inactive', reason: 'Only for character vocab' };
  }

  // Must have content
  if (!vocab.content) {
    return { state: 'impossible', reason: 'No content available' };
  }

  // Check if vocab has playable sounds
  const hasPlayableSound = vocab.sounds && vocab.sounds.length > 0 &&
    vocab.sounds.some(sound => !sound.disableForPractice);

  if (!hasPlayableSound) {
    return { state: 'impossible', reason: 'No playable sounds available' };
  }

  // Must have similar sounding vocab for minimal pairs
  const hasSimilarSounding = vocab.similarSoundingButNotTheSame &&
    vocab.similarSoundingButNotTheSame.length > 0;

  if (!hasSimilarSounding) {
    return { state: 'impossible', reason: 'No similar-sounding vocab for minimal pairs' };
  }

  return { state: 'active' };
}
