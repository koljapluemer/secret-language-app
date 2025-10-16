import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { Task } from '@/tasks/Task';

export function generateFactCardTryToRemember(factCard: FactCardData): Task {
  const id = `fact-card-try-to-remember-${factCard.id}-${Date.now()}`;
  
  return {
    id,
    language: factCard.language,
    taskType: 'fact-card-try-to-remember',
    prompt: 'Try to memorize',
    associatedFactCards: [factCard.id]
  };
}