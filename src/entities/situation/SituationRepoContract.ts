import type { SituationData } from './SituationData';

export interface SituationRepoContract {
  // Basic CRUD operations
  getSituationsByIds(ids: string[]): Promise<SituationData[]>;
  getAllSituations(): Promise<SituationData[]>;
  getSituationByDescription(description: string): Promise<SituationData | undefined>;
  saveSituation(situation: Omit<SituationData, 'id'>): Promise<SituationData>;
  updateSituation(situation: SituationData): Promise<void>;
  deleteSituations(ids: string[]): Promise<void>;

  // Batch operations
  bulkCreateSituations(situations: Omit<SituationData, 'id'>[]): Promise<SituationData[]>;

  // Query operations
  searchSituationsByDescription(description: string): Promise<SituationData[]>;
}
