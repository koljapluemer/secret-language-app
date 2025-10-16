import type { ResourceData } from '@/entities/resources/ResourceData';
import type { Task } from '@/tasks/Task';

export function generateExtractKnowledgeFromResource(resource: ResourceData): Task {
  const id = `extract-knowledge-from-resource-${resource.id}-${Date.now()}`;
  
  return {
    id,
    language: resource.language,
    taskType: 'extract-knowledge-from-resource',
    prompt: `Extract useful knowledge from this resource.`,
    associatedResources: [resource.id]
  };
}