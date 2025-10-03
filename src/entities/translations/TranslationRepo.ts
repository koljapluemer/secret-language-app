import type { TranslationRepoContract } from './TranslationRepoContract';
import type { TranslationData } from './TranslationData';
import { levenshteinDistance, isLengthWithinRange } from '@/shared/utils/stringUtils';
import { shuffleArray } from '@/shared/utils/arrayUtils';
import { db } from '@/shared/database/db';

export class TranslationRepo implements TranslationRepoContract {

  async getTranslationsByIds(ids: string[]): Promise<TranslationData[]> {
    return await db.translations.where('id').anyOf(ids).toArray();
  }

  async getAllTranslations(): Promise<TranslationData[]> {
    return await db.translations.toArray();
  }

  async getTranslationByContent(content: string): Promise<TranslationData | undefined> {
    return await db.translations.where('content').equals(content).first();
  }

  async saveTranslation(translation: Omit<TranslationData, 'id' | 'origins'>): Promise<TranslationData> {
    const translationToSave: Omit<TranslationData, 'id'> = {
      content: translation.content,
      priority: translation.priority,
      notes: translation.notes,
      origins: []
    };

    const id = await db.translations.add(translationToSave as TranslationData);
    return { ...translationToSave, id: id as string };
  }

  async saveOrGetExistingTranslation(translation: Omit<TranslationData, 'id' | 'origins'>): Promise<TranslationData> {
    // Check if a translation with this content already exists
    const existing = await this.getTranslationByContent(translation.content);
    
    if (existing) {
      // Update the existing translation with new data if needed
      const updated: TranslationData = {
        ...existing,
        priority: translation.priority,
        notes: translation.notes
      };
      
      await this.updateTranslation(updated);
      return updated;
    } else {
      // Create new translation
      return await this.saveTranslation(translation);
    }
  }

  async updateTranslation(translation: TranslationData): Promise<void> {
    await db.translations.put(translation);
  }

  async deleteTranslations(ids: string[]): Promise<void> {
    await db.translations.where('id').anyOf(ids).delete();
  }

  async searchTranslationsByContent(content: string): Promise<TranslationData[]> {
    const allTranslations = await db.translations.toArray();
    return allTranslations.filter(translation => 
      translation.content.toLowerCase().includes(content.toLowerCase())
    );
  }

  private async findIdealWrongTranslation(correctTranslationContent: string): Promise<string | null> {
    const allTranslations = await db.translations.toArray();
    
    const idealCandidates = allTranslations.filter(translation => {
      if (translation.content === correctTranslationContent) return false;
      
      if (!isLengthWithinRange(translation.content, correctTranslationContent.length, 3)) {
        return false;
      }
      
      return levenshteinDistance(translation.content, correctTranslationContent) > 2;
    });
    
    if (idealCandidates.length > 0) {
      const shuffled = shuffleArray(idealCandidates);
      return shuffled[0].content;
    }
    
    return null;
  }

  private async getFallbackWrongTranslation(correctTranslationContent: string): Promise<string | null> {
    const allTranslations = await db.translations.toArray();
    
    const candidates = allTranslations.filter(translation => 
      translation.content !== correctTranslationContent
    );
    
    if (candidates.length > 0) {
      const shuffled = shuffleArray(candidates);
      return shuffled[0].content;
    }
    
    return null;
  }

  async generateWrongTranslations(correctTranslationContent: string, count: number): Promise<string[]> {
    const wrongAnswers: string[] = [];
    const usedAnswers = new Set([correctTranslationContent]);
    
    for (let i = 0; i < count; i++) {
      const idealWrong = await this.findIdealWrongTranslation(correctTranslationContent);
      if (idealWrong && !usedAnswers.has(idealWrong)) {
        wrongAnswers.push(idealWrong);
        usedAnswers.add(idealWrong);
      }
    }
    
    while (wrongAnswers.length < count) {
      const fallbackWrong = await this.getFallbackWrongTranslation(correctTranslationContent);
      if (fallbackWrong && !usedAnswers.has(fallbackWrong)) {
        wrongAnswers.push(fallbackWrong);
        usedAnswers.add(fallbackWrong);
      } else {
        break;
      }
    }
    
    return wrongAnswers;
  }

  async getUncheckedTranslations(limit: number): Promise<TranslationData[]> {
    const all = await this.getAllTranslations();
    return all
      .filter(t => !t._mergeChecked)
      .slice(0, limit);
  }

  async getTranslationsByOrigins(setIds: string[]): Promise<TranslationData[]> {
    const all = await this.getAllTranslations();
    return all.filter(t => t.origins.some(origin => setIds.includes(origin)));
  }
}