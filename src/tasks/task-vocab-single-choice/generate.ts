import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';

export function generateVocabChoiceFromFourNativeToTarget(vocab: VocabData): Task {
  const id = `vocab-choose-from-four-native-to-target-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-choose-from-four-native-to-target',
    prompt: 'Choose the correct option',
    associatedVocab: [vocab.id]
  };
}

export function generateVocabChoiceFromTwoTargetToNative(vocab: VocabData): Task {
  const id = `vocab-choose-from-two-target-to-native-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-choose-from-two-target-to-native',
    prompt: 'Choose the correct option',
    associatedVocab: [vocab.id]
  };
}

export function generateVocabChoiceFromTwoNativeToTarget(vocab: VocabData): Task {
  const id = `vocab-choose-from-two-native-to-target-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-choose-from-two-native-to-target',
    prompt: 'Choose the correct option',
    associatedVocab: [vocab.id]
  };
}

export function generateVocabChoiceFromFourTargetToNative(vocab: VocabData): Task {
  const id = `vocab-choose-from-four-target-to-native-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-choose-from-four-target-to-native',
    prompt: 'Choose the correct option',
    associatedVocab: [vocab.id]
  };
}