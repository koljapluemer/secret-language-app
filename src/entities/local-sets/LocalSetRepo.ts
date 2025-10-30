import type { LocalSetRepoContract } from './LocalSetRepoContract';
import type { LocalSetData } from './LocalSetData';
import { useToast } from '@/shared/toasts';
import { db } from '@/shared/database/db';
import { nanoid } from 'nanoid';

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
    const newLocalSet: LocalSetData = {
      id: nanoid(),
      name: localSet.name,
      language: localSet.language,
      description: localSet.description,
      lastDownloadedAt: localSet.lastDownloadedAt
    };

    console.log('LocalSetRepo - About to add:', newLocalSet);
    console.log('LocalSetRepo - ID:', newLocalSet.id, 'type:', typeof newLocalSet.id);
    console.log('LocalSetRepo - name:', newLocalSet.name, 'type:', typeof newLocalSet.name);
    console.log('LocalSetRepo - language:', newLocalSet.language, 'type:', typeof newLocalSet.language);
    console.log('LocalSetRepo - description:', newLocalSet.description, 'type:', typeof newLocalSet.description);
    console.log('LocalSetRepo - lastDownloadedAt:', newLocalSet.lastDownloadedAt, 'type:', typeof newLocalSet.lastDownloadedAt, 'instanceof Date:', newLocalSet.lastDownloadedAt instanceof Date);

    try {
      console.log('LocalSetRepo - Calling db.localSets.add()');
      await db.localSets.add(newLocalSet);
      console.log('LocalSetRepo - Add succeeded');
      return newLocalSet;
    } catch (error) {
      console.error('LocalSetRepo - Add failed with error:', error);
      console.error('LocalSetRepo - Error name:', (error as Error).name);
      console.error('LocalSetRepo - Error message:', (error as Error).message);
      console.error('LocalSetRepo - Full error object:', JSON.stringify(error, null, 2));
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