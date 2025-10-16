import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/tasks/Task';

export function generateVocabTryToRemember(vocab: VocabData): Task {
  const id = `vocab-try-to-remember-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-try-to-remember',
    prompt: 'Try to memorize',
    associatedVocab: [vocab.id]
  };
}