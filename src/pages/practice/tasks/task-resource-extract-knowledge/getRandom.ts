import type { RepositoriesContext } from '@/shared/types/RepositoriesContext';
import type { Task } from '@/pages/practice/Task';
import { generateExtractKnowledgeFromResource } from '@/pages/practice/tasks/task-resource-extract-knowledge/generate';
import { useToast } from '@/shared/toasts';

export async function getRandomExtractKnowledgeTask({
  resourceRepo,
  languageCodes
}: RepositoriesContext & { languageCodes: string[] }): Promise<Task | null> {
  const toast = useToast();
  if (!resourceRepo) return null;
  try {
    // Use the targeted method to get a due resource that needs extraction
    const resource = await resourceRepo.getRandomDueResource(languageCodes);
    
    if (resource) {
      return generateExtractKnowledgeFromResource(resource);
    }
    
    return null;
  } catch (error) {
    toast.error(`Error generating extract knowledge task: ${String(error)}`);
    return null;
  }
}