import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateAddVocabToGoal } from '@/pages/practice/tasks/task-goal-add-vocab/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomAddVocabToGoalTask({
  goalRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!goalRepo) return null;
  try {
    // Get goals that need vocab (already filtered at repo level)
    const goals = await goalRepo.getGoalsNeedingVocab(languageCodes);
    
    if (goals.length === 0) return null;
    
    // Shuffle and return first valid goal
    const shuffled = [...goals].sort(() => Math.random() - 0.5);
    return generateAddVocabToGoal(shuffled[0]);
  } catch (error) {
    toast.error(`Error generating add vocab to goal task: ${String(error)}`);
    return null;
  }
}