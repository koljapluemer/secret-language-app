import type { GlossData } from './GlossData';

export interface GlossRepoContract {
  // Basic CRUD operations
  getGlossesByIds(ids: string[]): Promise<GlossData[]>;
  getAllGlosses(): Promise<GlossData[]>;
  getGlossByDescription(description: string): Promise<GlossData | undefined>;
  saveGloss(gloss: Omit<GlossData, 'id' | 'origins'>): Promise<GlossData>;
  saveOrGetExistingGloss(gloss: Omit<GlossData, 'id' | 'origins'>): Promise<GlossData>;
  updateGloss(gloss: GlossData): Promise<void>;
  deleteGlosses(ids: string[]): Promise<void>;

  // Batch operations
  bulkCreateGlosses(glosses: Omit<GlossData, 'id' | 'origins'>[]): Promise<GlossData[]>;

  // Query operations
  searchGlossesByDescription(description: string): Promise<GlossData[]>;

  // Merge operations
  getUncheckedGlosses(limit: number): Promise<GlossData[]>;
  getGlossesByOrigins(setIds: string[]): Promise<GlossData[]>;
}
