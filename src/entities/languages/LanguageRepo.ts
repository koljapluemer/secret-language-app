import type { LanguageRepoContract } from './LanguageRepoContract';
import type { LanguageData } from './LanguageData';

const HARDCODED_LANGUAGES: LanguageData[] = [
  { id: '1', code: 'deu', name: 'German', emoji: '🇩🇪' },
  { id: '2', code: 'arz', name: 'Egyptian Arabic', emoji: '🇪🇬' },
  { id: '3', code: 'arb', name: 'Standard Arabic' },
  { id: '4', code: 'apc', name: 'Levantine Arabic', emoji: '🇱🇧' },
  { id: '5', code: 'cmn', name: 'Mandarin Chinese', emoji: '🇨🇳' },
  { id: '6', code: 'fra', name: 'French', emoji: '🇫🇷' },
  { id: '7', code: 'spa', name: 'Spanish', emoji: '🇪🇸' },
  { id: '8', code: 'uzb', name: 'Uzbek', emoji: '🇺🇿' }
];

export class LanguageRepo implements LanguageRepoContract {
  async getAll(): Promise<LanguageData[]> {
    return HARDCODED_LANGUAGES;
  }

  async getActiveTargetLanguages(): Promise<LanguageData[]> {
    // All languages are always active
    return HARDCODED_LANGUAGES;
  }

  async getByCode(code: string): Promise<LanguageData | undefined> {
    return HARDCODED_LANGUAGES.find(lang => lang.code === code);
  }

  async ensureLanguageExists(code: string): Promise<LanguageData> {
    const language = await this.getByCode(code);
    if (!language) {
      throw new Error(`Unsupported language code: ${code}. Supported languages: ${HARDCODED_LANGUAGES.map(l => l.code).join(', ')}`);
    }
    return language;
  }
}
