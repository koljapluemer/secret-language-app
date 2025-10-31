import type { GoalData } from '@/entities/goals/GoalData';
import type { TaskStateResult } from '@/tasks/utils/TaskState';

export function getGoalAttemptTaskState(
  goal: GoalData
): TaskStateResult {
  const hasTitle = !!goal.title;
  const isAchieved = goal.isAchieved === true;

  if (isAchieved) {
    return { state: 'inactive', reason: 'Goal already achieved' };
  }

  if (!hasTitle) {
    return { state: 'impossible', reason: 'No title available' };
  }

  return { state: 'active' };
}
