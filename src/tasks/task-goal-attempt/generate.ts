import type { GoalData } from '@/entities/goals/GoalData';
import type { Task } from '@/tasks/Task';

export function generateGoalAttemptTask(goal: GoalData): Task {
  const id = `goal-attempt-${goal.id}-${Date.now()}`;

  return {
    id,
    language: goal.language,
    taskType: 'goal-attempt',
    prompt: 'Give it your best',
    associatedGoals: [goal.id]
  };
}
