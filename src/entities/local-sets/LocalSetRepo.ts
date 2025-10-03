import type { LocalSetRepoContract } from './LocalSetRepoContract';
import type { LocalSetData } from './LocalSetData';
import { useToast } from '@/shared/toasts';
import { db } from '@/shared/database/db';

export class LocalSetRepo implements LocalSetRepoContract {
  private toast = useToast();

  async getAllLocalSets(): Promise<LocalSetData[]> {
    return await db.localSets.toArray();
  }

  async getLocalSetById(id: string): Promise<LocalSetData | undefined> {
    return await db.localSets.get(id);
  }

  async getLocalSetByName(name: string): Promise<LocalSetData | undefined> {
    return await db.localSets.where('name').equals(name).first();
  }

  async getLocalSetsByLanguage(language: string): Promise<LocalSetData[]> {
    return await db.localSets.where('language').equals(language).toArray();
  }

  async saveLocalSet(localSet: Omit<LocalSetData, 'id'>): Promise<LocalSetData> {
    // Check if set already exists with this name+language combination
    const existing = await db.localSets
      .where('[name+language]')
      .equals([localSet.name, localSet.language])
      .first();

    if (existing) {
      // Update existing set
      const updated: LocalSetData = {
        ...existing,
        description: localSet.description,
        lastDownloadedAt: localSet.lastDownloadedAt
      };
      await db.localSets.put(updated);
      return updated;
    } else {
      // Create new set
      const localSetData: Omit<LocalSetData, 'id'> = {
        name: localSet.name,
        language: localSet.language,
        description: localSet.description,
        lastDownloadedAt: localSet.lastDownloadedAt
      };

      try {
        const id = await db.localSets.add(localSetData as LocalSetData);
        return { ...localSetData, id } as LocalSetData;
      } catch (error) {
        this.toast.error(`LocalSetRepo: Failed to save local set: ${String(error)}`);
        throw error;
      }
    }
  }

  async updateLocalSet(localSet: LocalSetData): Promise<void> {
    await db.localSets.put(localSet);
  }

  async deleteLocalSet(id: string): Promise<void> {
    await db.localSets.delete(id);
  }

  async isRemoteSetDownloaded(name: string): Promise<boolean> {
    const localSet = await db.localSets.where('name').equals(name).first();
    return localSet !== undefined;
  }
}