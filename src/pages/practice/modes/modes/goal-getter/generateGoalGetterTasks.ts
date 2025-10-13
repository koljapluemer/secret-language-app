import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';

import type { Task } from '@/pages/practice/Task';
import { generateAddVocabToGoal } from '@/pages/practice/tasks/task-goal-add-vocab/generate';
import { generateAddSubGoals } from '@/pages/practice/tasks/task-goal-add-sub-goals/generate';
import { generateCreateNewGoal } from '@/pages/practice/tasks/task-goal-create-new/generate';
import { randomFromArray } from '@/shared/utils/arrayUtils';
import { useToast } from '@/shared/toasts';

// Define goal task generators using repo-level filtering
const goalTaskGenerators = [
  {
    name: 'add-vocab-to-goal',
    generator: generateAddVocabToGoal,
    getGoals: (goalRepo: GoalRepoContract, languageCodes: string[]) => 
      goalRepo.getGoalsNeedingVocab(languageCodes)
  },
  {
    name: 'add-sub-goals',
    generator: generateAddSubGoals,
    getGoals: (goalRepo: GoalRepoContract, languageCodes: string[]) => 
      goalRepo.getGoalsNeedingSubGoals(languageCodes)
  }
];

export async function generateGoalTask(
  goalRepo: GoalRepoContract,
  languageCodes: string[],
  excludeTaskType?: string
): Promise<Task | null> {
  const toast = useToast();
  try {
    // Filter out the excluded task type to prevent duplicates
    const availableGenerators = excludeTaskType
      ? goalTaskGenerators.filter(gen => gen.name !== excludeTaskType)
      : goalTaskGenerators;

    // Shuffle the goal task generators for random cycling
    const shuffledGenerators = [...availableGenerators].sort(() => Math.random() - 0.5);

    // Try each task type until we find one that works
    for (const taskType of shuffledGenerators) {
      try {
        // Get filtered goals for this task type
        const goals = await taskType.getGoals(goalRepo, languageCodes);

        if (goals.length > 0) {
          // Get a random goal and generate the task
          const randomGoal = randomFromArray(goals);
          if (randomGoal) {
            const task = taskType.generator(randomGoal);
            return task;
          }
        }
      } catch (error) {
        toast.error(`Error generating ${taskType.name} task: ${String(error)}`);
        // Continue to next task type
      }
    }

    // If we get here, no other tasks are available
    // Allow creating a new goal if we didn't just create one
    if (excludeTaskType !== 'create-new-goal') {
      const randomLanguage = randomFromArray(languageCodes);
      if (randomLanguage) {
        return generateCreateNewGoal(randomLanguage);
      }
    }

    // Just created a goal, no other tasks available yet
    return null;
  } catch (error) {
    toast.error(`Error generating goal task: ${String(error)}`);
    return null;
  }
}