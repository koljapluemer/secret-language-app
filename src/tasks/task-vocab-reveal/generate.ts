import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/tasks/Task';

export function generateVocabRevealNativeToTarget(vocab: VocabData): Task {
  const id = `vocab-reveal-native-to-target-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-reveal-native-to-target',
    prompt: 'What vocab has this translation?',
    associatedVocab: [vocab.id]
  };
}

export function generateVocabRevealTargetToNative(vocab: VocabData): Task {
  const id = `vocab-reveal-target-to-native-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-reveal-target-to-native',
    prompt: 'What does this mean?',
    associatedVocab: [vocab.id]
  };
}