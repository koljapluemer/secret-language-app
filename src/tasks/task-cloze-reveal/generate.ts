import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/tasks/Task';

export function generateClozeReveal(vocab: VocabData): Task {
  const id = `cloze-reveal-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'cloze-reveal',
    prompt: 'Think of the missing word, then reveal',
    associatedVocab: [vocab.id]
  };
}