import type { GoalData } from '@/entities/goals/GoalData';
import type { Task } from '@/tasks/Task';

export function generateAddVocabToGoal(goal: GoalData): Task {
  const id = `add-vocab-to-goal-${goal.id}-${Date.now()}`;
  
  return {
    id,
    language: goal.language,
    taskType: 'add-vocab-to-goal',
    prompt: `Add more vocabulary that helps you achieve this goal.`,
    associatedGoals: [goal.id]
  };
}