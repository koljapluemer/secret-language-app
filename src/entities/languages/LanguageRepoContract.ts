import type { LanguageData } from './LanguageData';

export interface LanguageRepoContract {
  // Get operations
  getAll(): Promise<LanguageData[]>;
  getActiveTargetLanguages(): Promise<LanguageData[]>;
  getByCode(code: string): Promise<LanguageData | undefined>;

  /**
   * Ensures a language exists in the supported language list.
   * Throws an error if the language code is not supported.
   * Returns the language if it exists.
   */
  ensureLanguageExists(code: string): Promise<LanguageData>;
}