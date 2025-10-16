import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';

export function generateAddTranslation(vocab: VocabData): Task {
  const id = `add-translation-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'add-translation',
    prompt: 'Add one or more translations',
    associatedVocab: [vocab.id]
  };
}