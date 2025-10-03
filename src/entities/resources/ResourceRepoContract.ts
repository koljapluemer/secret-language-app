import type { ResourceData } from './ResourceData';

export interface ResourceListFilters {
  searchQuery?: string;
  languages?: string[];
  origins?: string[];
}

export interface ResourceRepoContract {
  getAllResources(): Promise<ResourceData[]>;
  getResourceById(id: string): Promise<ResourceData | undefined>;
  getResourceByTitleAndLanguage(title: string, language: string): Promise<ResourceData | undefined>;
  getRandomDueResource(languages?: string[], setsToAvoid?: string[]): Promise<ResourceData | null>;
  getValidImmersionResources(languages: string[]): Promise<ResourceData[]>;
  getResourcesPaginated(offset: number, limit: number, filters?: ResourceListFilters): Promise<ResourceData[]>;
  getTotalResourcesCount(filters?: ResourceListFilters): Promise<number>;
  saveResource(resource: Omit<ResourceData, "id" | 'tasks' | 'lastShownAt'>): Promise<ResourceData>;
  updateResource(resource: ResourceData): Promise<ResourceData>;
  deleteResource(id: string): Promise<void>;
  disconnectVocabFromResource(resourceId: string, vocabId: string): Promise<void>;

  // Merge operations
  getUncheckedResources(limit: number): Promise<ResourceData[]>;
  getResourcesByOrigins(setIds: string[]): Promise<ResourceData[]>;
}