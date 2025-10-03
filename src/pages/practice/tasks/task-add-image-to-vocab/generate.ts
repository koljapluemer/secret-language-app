import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';

export function generateAddImageToVocab(vocab: VocabData): Task {
  const id = `add-image-to-vocab-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'add-image-to-vocab',
    prompt: 'Add a visual mnemonic',
    associatedVocab: [vocab.id]
  };
}