import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/tasks/Task';

export function generateGuessWhatSentenceMeans(vocab: VocabData): Task {
  const id = `guess-what-sentence-means-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'guess-what-sentence-means',
    prompt: 'Guess what this sentence means',
    associatedVocab: [vocab.id]
  };
}