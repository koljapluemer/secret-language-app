import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { Task } from '@/pages/practice/Task';
import { generateExtractKnowledgeFromResource } from '@/tasks/task-resource-extract-knowledge/generate';
import { useToast } from '@/shared/toasts';
import { randomFromArray } from '@/shared/utils/arrayUtils';

export async function generateResourceRotationTask(
  resourceRepo: ResourceRepoContract,
  languageCodes: string[]
): Promise<Task | null> {
  const toast = useToast();

  try {
    // Get all resources for the selected languages
    const allResources = await resourceRepo.getAllResources();
    const filteredResources = allResources.filter(r => languageCodes.includes(r.language));

    if (filteredResources.length === 0) {
      return null;
    }

    // Pick a random resource
    const randomResource = randomFromArray(filteredResources);

    if (!randomResource) {
      return null;
    }

    return generateExtractKnowledgeFromResource(randomResource);
  } catch (error) {
    toast.error(`Error generating resource rotation task: ${String(error)}`);
    return null;
  }
}
