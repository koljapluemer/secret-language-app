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
    // Simple add - no duplicate checking (handled by RemoteSetService)
    const newLocalSet: Omit<LocalSetData, 'id'> = {
      name: localSet.name,
      language: localSet.language,
      description: localSet.description,
      lastDownloadedAt: localSet.lastDownloadedAt
    };

    try {
      const id = await db.localSets.add(newLocalSet as LocalSetData);
      return { ...newLocalSet, id: id as string };
    } catch (error) {
      this.toast.error(`LocalSetRepo: Failed to save local set: ${String(error)}`);
      throw error;
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