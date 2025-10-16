import type { GoalData } from '@/entities/goals/GoalData';
import type { Task } from '@/tasks/Task';

export function generateAddSubGoals(goal: GoalData): Task {
  const id = `add-sub-goals-${goal.id}-${Date.now()}`;
  
  return {
    id,
    language: goal.language,
    taskType: 'add-sub-goals',
    prompt: `Break down this goal into smaller, achievable sub-goals.`,
    associatedGoals: [goal.id]
  };
}