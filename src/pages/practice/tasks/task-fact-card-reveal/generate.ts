import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { Task } from '@/pages/practice/Task';

export function generateFactCardReveal(factCard: FactCardData): Task {
  const id = `fact-card-reveal-${factCard.id}-${Date.now()}`;
  
  return {
    id,
    language: factCard.language,
    taskType: 'fact-card-reveal',
    prompt: 'What does this mean?',
    associatedFactCards: [factCard.id]
  };
}