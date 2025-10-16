import type { VocabData } from '@/entities/vocab/VocabData';
import type { Task } from '@/pages/practice/Task';

export function generateTaskFormSentenceFromTwoVocab(vocab1: VocabData, vocab2: VocabData): Task {
  const id = `vocab-form-sentence-${vocab1.id}-${vocab2.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab1.language,
    taskType: 'vocab-form-sentence',
    prompt: 'Form a sentence using both of these words',
    associatedVocab: [vocab1.id, vocab2.id]
  };
}

export function generateFormSentenceTaskFromSingleVocab(vocab: VocabData): Task {
  const id = `vocab-form-sentence-single-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-form-sentence-single',
    prompt: 'Form a sentence using this word',
    associatedVocab: [vocab.id]
  };
}

export function generateRecordSentenceTaskFromTwoVocab(vocab1: VocabData, vocab2: VocabData): Task {
  const id = `vocab-record-sentence-${vocab1.id}-${vocab2.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab1.language,
    taskType: 'vocab-record-sentence',
    prompt: 'Record a sentence using both of these words',
    associatedVocab: [vocab1.id, vocab2.id]
  };
}

export function generateRecordSentenceTaskFromSingleVocab(vocab: VocabData): Task {
  const id = `vocab-record-sentence-single-${vocab.id}-${Date.now()}`;
  
  return {
    id,
    language: vocab.language,
    taskType: 'vocab-record-sentence-single',
    prompt: 'Record a sentence using this word',
    associatedVocab: [vocab.id]
  };
}