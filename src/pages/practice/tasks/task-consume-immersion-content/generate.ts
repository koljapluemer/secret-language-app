import type { ResourceData } from '@/entities/resources/ResourceData';
import type { Task } from '@/pages/practice/Task';

export function generateConsumeImmersionContent(resource: ResourceData): Task {
  const id = `consume-immersion-content-${resource.id}-${Date.now()}`;
  
  return {
    id,
    language: resource.language,
    taskType: 'consume-immersion-content',
    prompt: `Watch/read this content and see how much you understand`,
    associatedResources: [resource.id]
  };
}
