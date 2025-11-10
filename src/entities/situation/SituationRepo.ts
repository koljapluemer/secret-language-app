import type { SituationRepoContract } from './SituationRepoContract';
import type { SituationData } from './SituationData';
import { db } from '@/shared/database/db';
import { nanoid } from 'nanoid';
import { toRaw } from 'vue';

export class SituationRepo implements SituationRepoContract {

  async getSituationsByIds(ids: string[]): Promise<SituationData[]> {
    return await db.situations.where('id').anyOf(ids).toArray();
  }

  async getAllSituations(): Promise<SituationData[]> {
    return await db.situations.toArray();
  }

  async getSituationByDescription(description: string): Promise<SituationData | undefined> {
    return await db.situations.where('description').equals(description).first();
  }

  async saveSituation(situation: Omit<SituationData, 'id'>): Promise<SituationData> {
    const situationToSave: SituationData = {
      id: nanoid(),
      description: situation.description,
      goals: situation.goals,
      immersionResources: situation.immersionResources,
      relevantForLanguages: situation.relevantForLanguages
    };

    await db.situations.add(situationToSave);
    return situationToSave;
  }

  async updateSituation(situation: SituationData): Promise<void> {
    await db.situations.put(toRaw(situation));
  }

  async deleteSituations(ids: string[]): Promise<void> {
    await db.situations.where('id').anyOf(ids).delete();
  }

  async bulkCreateSituations(situations: Omit<SituationData, 'id'>[]): Promise<SituationData[]> {
    if (situations.length === 0) {
      return [];
    }

    // Prepare situations with generated UUIDs
    const situationsWithIds: SituationData[] = situations.map(s => ({
      id: nanoid(),
      description: s.description,
      goals: s.goals,
      immersionResources: s.immersionResources,
      relevantForLanguages: s.relevantForLanguages
    }));

    // Bulk insert
    await db.situations.bulkAdd(situationsWithIds);

    return situationsWithIds;
  }

  async searchSituationsByDescription(description: string): Promise<SituationData[]> {
    const allSituations = await db.situations.toArray();
    return allSituations.filter(situation =>
      situation.description.toLowerCase().includes(description.toLowerCase())
    );
  }

  async getSituationsByLanguages(languages: string[]): Promise<SituationData[]> {
    const allSituations = await db.situations.toArray();
    return allSituations.filter(situation =>
      situation.relevantForLanguages.some(lang => languages.includes(lang))
    );
  }
}
