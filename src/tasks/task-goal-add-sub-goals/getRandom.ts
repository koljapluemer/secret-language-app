import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateAddSubGoals } from '@/tasks/task-goal-add-sub-goals/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomAddSubGoalsTask({
  goalRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!goalRepo) return null;
  try {
    // Get goals that need sub-goals (already filtered at repo level)
    const goals = await goalRepo.getGoalsNeedingSubGoals(languageCodes);
    
    if (goals.length === 0) return null;
    
    // Shuffle and return first valid goal
    const shuffled = [...goals].sort(() => Math.random() - 0.5);
    return generateAddSubGoals(shuffled[0]);
  } catch (error) {
    toast.error(`Error generating add sub goals task: ${String(error)}`);
    return null;
  }
}