import type { GoalData } from './GoalData';

export interface GoalListFilters {
  searchQuery?: string;
  languages?: string[];
  origins?: string[];
}

export interface GoalRepoContract {
  getAll(): Promise<GoalData[]>;
  getById(id: string): Promise<GoalData | undefined>;
  create(goal: Omit<GoalData, "id" | 'tasks'>): Promise<GoalData>;
  update(id: string, updates: Omit<Partial<GoalData>, "id" | 'tasks'>): Promise<GoalData>;
  delete(id: string): Promise<void>;

  // Existence check operations
  getGoalByTitleAndLanguage(title: string, language: string): Promise<GoalData | undefined>;
  getIncompleteGoals(): Promise<GoalData[]>;
  getGoalsByLanguages(languages: string[]): Promise<GoalData[]>;
  getGoalsNeedingVocab(languages: string[]): Promise<GoalData[]>;
  getGoalsPaginated(offset: number, limit: number, filters?: GoalListFilters): Promise<GoalData[]>;
  getTotalGoalsCount(filters?: GoalListFilters): Promise<number>;
  getGoalsByOrigins(setIds: string[]): Promise<GoalData[]>;
}