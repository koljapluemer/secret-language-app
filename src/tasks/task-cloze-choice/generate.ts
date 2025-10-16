import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/tasks/Task';

export function generateClozeChoiceFromFour(vocab: VocabData): Task {
  const id = `cloze-choose-from-four-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'cloze-choose-from-four',
    prompt: 'Complete the missing word',
    associatedVocab: [vocab.id]
  };
}

export function generateClozeChoiceFromTwo(vocab: VocabData): Task {
  const id = `cloze-choose-from-two-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'cloze-choose-from-two',
    prompt: 'Complete the missing word',
    associatedVocab: [vocab.id]
  };
}