import type { VocabData } from '@/entities/vocab/VocabData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getVocabChooseImageBySoundTaskState(
  vocab: VocabData
): TaskStateResult {
  // Check if vocab has playable sounds
  const hasPlayableSound = vocab.sounds && vocab.sounds.length > 0 &&
    vocab.sounds.some(sound => !sound.disableForPractice);

  if (!hasPlayableSound) {
    return { state: 'impossible', reason: 'No playable sounds available' };
  }

  // Check if vocab has images
  const hasImages = vocab.images && vocab.images.length > 0 &&
    vocab.images.some(image => !image.disableForPractice);

  if (!hasImages) {
    return { state: 'impossible', reason: 'No images available' };
  }

  return { state: 'active' };
}
