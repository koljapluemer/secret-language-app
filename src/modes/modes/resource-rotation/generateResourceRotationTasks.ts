import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { Task } from '@/pages/practice/Task';
import { getRandomExtractKnowledgeTask } from '@/tasks/task-resource-extract-knowledge/getRandom';
import { useToast } from '@/shared/toasts';

export async function generateResourceRotationTask(
  resourceRepo: ResourceRepoContract,
  languageCodes: string[]
): Promise<Task | null> {
  try {
    return await getRandomExtractKnowledgeTask({
      resourceRepo,
      languageCodes
    });
  } catch (error) {
    const toast = useToast();
    toast.error(`Error generating resource rotation task: ${String(error)}`);
    return null;
  }
}
