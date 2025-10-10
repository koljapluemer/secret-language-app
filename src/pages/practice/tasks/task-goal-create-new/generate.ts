import type { Task } from '@/pages/practice/Task';

export function generateCreateNewGoal(language: string): Task {
  const id = `create-new-goal-${language}-${Date.now()}`;

  return {
    id,
    language,
    taskType: 'create-new-goal',
    prompt: 'Create a new goal to start working towards.'
  };
}
