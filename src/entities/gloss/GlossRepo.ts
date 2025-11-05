import type { GlossRepoContract } from './GlossRepoContract';
import type { GlossData } from './GlossData';
import { db } from '@/shared/database/db';
import { nanoid } from 'nanoid';

export class GlossRepo implements GlossRepoContract {

  async getGlossesByIds(ids: string[]): Promise<GlossData[]> {
    return await db.glosses.where('id').anyOf(ids).toArray();
  }

  async getAllGlosses(): Promise<GlossData[]> {
    return await db.glosses.toArray();
  }

  async getGlossByDescription(description: string): Promise<GlossData | undefined> {
    return await db.glosses.where('description').equals(description).first();
  }

  async saveGloss(gloss: Omit<GlossData, 'id' | 'origins'>): Promise<GlossData> {
    const glossToSave: GlossData = {
      id: nanoid(),
      description: gloss.description,
      descriptions: gloss.descriptions,
      origins: []
    };

    await db.glosses.add(glossToSave);
    return glossToSave;
  }

  async saveOrGetExistingGloss(gloss: Omit<GlossData, 'id' | 'origins'>): Promise<GlossData> {
    // Check if a gloss with this description already exists
    const existing = await this.getGlossByDescription(gloss.description);

    if (existing) {
      // Update the existing gloss with new data if needed
      const updated: GlossData = {
        ...existing,
        descriptions: gloss.descriptions
      };

      await this.updateGloss(updated);
      return updated;
    } else {
      // Create new gloss
      return await this.saveGloss(gloss);
    }
  }

  async updateGloss(gloss: GlossData): Promise<void> {
    await db.glosses.put(gloss);
  }

  async deleteGlosses(ids: string[]): Promise<void> {
    await db.glosses.where('id').anyOf(ids).delete();
  }

  async bulkCreateGlosses(glosses: Omit<GlossData, 'id' | 'origins'>[]): Promise<GlossData[]> {
    if (glosses.length === 0) {
      return [];
    }

    // Prepare glosses with generated UUIDs and origins field
    const glossesWithIds: GlossData[] = glosses.map(g => ({
      id: nanoid(),
      description: g.description,
      descriptions: g.descriptions,
      origins: []
    }));

    // Bulk insert
    await db.glosses.bulkAdd(glossesWithIds);

    return glossesWithIds;
  }

  async searchGlossesByDescription(description: string): Promise<GlossData[]> {
    const allGlosses = await db.glosses.toArray();
    return allGlosses.filter(gloss =>
      gloss.description.toLowerCase().includes(description.toLowerCase())
    );
  }

  async getUncheckedGlosses(limit: number): Promise<GlossData[]> {
    const all = await this.getAllGlosses();
    return all
      .filter(g => !g._mergeChecked)
      .slice(0, limit);
  }

  async getGlossesByOrigins(setIds: string[]): Promise<GlossData[]> {
    const all = await this.getAllGlosses();
    return all.filter(g => g.origins.some(origin => setIds.includes(origin)));
  }
}
