import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';

export function generateVocabChooseImageBySound(vocab: VocabData): Task {
  const id = `vocab-choose-image-by-sound-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-choose-image-by-sound',
    prompt: 'Choose the correct image based on what you hear',
    associatedVocab: [vocab.id]
  };
}