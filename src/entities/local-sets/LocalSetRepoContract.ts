import type { LocalSetData } from './LocalSetData';

export interface LocalSetRepoContract {
  getAllLocalSets(): Promise<LocalSetData[]>;
  getLocalSetById(id: string): Promise<LocalSetData | undefined>;
  getLocalSetByName(name: string): Promise<LocalSetData | undefined>;
  getLocalSetsByLanguage(language: string): Promise<LocalSetData[]>;
  saveLocalSet(localSet: Omit<LocalSetData, "id">): Promise<LocalSetData>;
  updateLocalSet(localSet: LocalSetData): Promise<void>;
  deleteLocalSet(id: string): Promise<void>;
  isRemoteSetDownloaded(name: string): Promise<boolean>;
}