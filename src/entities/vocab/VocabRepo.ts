import type { VocabRepoContract, VocabPaginationResult, VocabListFilters } from './VocabRepoContract';
import type { VocabData, VocabImage, VocabSound } from './VocabData';
import { fsrs, createEmptyCard, Rating } from 'ts-fsrs';
import { pickRandom, shuffleArray } from '@/shared/utils/arrayUtils';
import { levenshteinDistance, isLengthWithinRange } from '@/shared/utils/stringUtils';
import { compressImage, compressImageFromUrl } from '@/shared/utils/imageUtils';
import { validateAudioFile, getAudioDuration, fetchAudioAsBlob } from '@/shared/utils/audioUtils';
import { useToast } from '@/shared/toasts';
import { toRaw } from 'vue';
import { db } from '@/shared/database/db';

// Utility functions
function isUnseen(vocab: VocabData): boolean {
  return vocab.progress.level === -1;
}

export class VocabRepo implements VocabRepoContract {
  private toast = useToast();

  private ensureVocabFields(vocab: VocabData): VocabData {
    return {
      ...vocab,
      content: vocab.content || '',
      consideredCharacter: vocab.consideredCharacter,
      consideredSentence: vocab.consideredSentence,
      consideredWord: vocab.consideredWord, // Keep original value (undefined means true per VocabData comments)
      notes: vocab.notes || [],
      links: vocab.links || [],
      translations: vocab.translations || [],
      relatedVocab: vocab.relatedVocab || [],
      notRelatedVocab: vocab.notRelatedVocab || [],
      contains: vocab.contains || [],
      similarSoundingButNotTheSame: vocab.similarSoundingButNotTheSame || [],
      images: vocab.images || [],
      sounds: vocab.sounds || []
    };
  }


  async getVocab(): Promise<VocabData[]> {
    const vocab = await db.vocab.toArray();
    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getVocabByUID(id: string): Promise<VocabData | undefined> {
    const vocab = await db.vocab.get(id);
    if (vocab) {
      return this.ensureVocabFields(vocab);
    }
    return undefined;
  }

  async getVocabByUIDs(Ids: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab.where('id').anyOf(Ids).toArray();
    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getVocabByLanguageAndContent(language: string, content: string): Promise<VocabData | undefined> {
    const vocab = await db.vocab.where({ language, content }).first();
    return vocab ? this.ensureVocabFields(vocab) : undefined;
  }

  async getRandomAlreadySeenDueVocab(count: number, languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        vocab.progress.level >= 0 &&
        vocab.progress.due && new Date(vocab.progress.due) <= new Date() &&
        !vocab.doNotPractice &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)))
      )
      .toArray();

    return pickRandom(vocab, count).map(v => this.ensureVocabFields(v));
  }

  async getRandomUnseenVocab(count: number, languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab => {
        // Check if unseen
        const unseenCheck = !vocab.progress ? true : isUnseen(vocab);

        return unseenCheck &&
          !vocab.doNotPractice &&
          (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
          (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)));
      })
      .toArray();

    return pickRandom(vocab, count).map(v => this.ensureVocabFields(v));
  }

  async getRandomUnseenSentenceVocab(count: number, languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab => {
        // Must be sentence type
        if (vocab.consideredSentence !== true) {
          return false;
        }

        // Must have content and at least one translation
        if (!vocab.content || !vocab.translations || vocab.translations.length === 0) {
          return false;
        }

        // Check if unseen
        const unseenCheck = !vocab.progress ? true : isUnseen(vocab);

        return unseenCheck &&
          !vocab.doNotPractice &&
          (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
          (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)));
      })
      .toArray();

    return pickRandom(vocab, count).map(v => this.ensureVocabFields(v));
  }

  async getDueOrUnseenVocabFromIds(Ids: string[]): Promise<VocabData[]> {
    const vocabList = await this.getVocabByUIDs(Ids);

    return vocabList.filter(vocab => {
      // Must not be excluded from practice
      if (vocab.doNotPractice) {
        return false;
      }

      // Check for null/undefined progress (shouldn't happen but handle gracefully)
      if (!vocab.progress) {
        
        return true; // Consider unseen if no progress
      }

      // Unseen: never seen before (level === -1)
      const vocabIsUnseen = isUnseen(vocab);

      // Due: has been seen and is due now
      const isDue = vocab.progress.level >= 0 && vocab.progress.due && new Date(vocab.progress.due) <= new Date();

      return vocabIsUnseen || isDue;
    });
  }

  async scoreVocab(vocabId: string, rating: Rating, setWrongVocabDueAgainImmediately?: boolean): Promise<void> {
    const vocab = await db.vocab.get(vocabId);
    if (!vocab) {
      return;
    }

    const scheduler = fsrs();
    const fsrsRating = rating;

    // Handle level -1 (new vocab)
    if (vocab.progress.level === -1) {
      vocab.progress = {
        ...createEmptyCard(),
        streak: 0,
        level: 0
      };
    }

    // Apply FSRS algorithm
    const now = new Date();
    const scheduling_cards = scheduler.repeat(vocab.progress, now);

    // Get the appropriate card based on rating using Rating enum (exclude Manual rating)
    const updatedCard = scheduling_cards[fsrsRating as Exclude<Rating, Rating.Manual>].card;

    // Update streak and level based on rating
    if (fsrsRating === Rating.Again || fsrsRating === Rating.Hard) {
      // Negative ratings: decrease streak (go negative) or reset positive streak to 0
      if (vocab.progress.streak > 0) {
        vocab.progress.streak = 0;
      } else {
        vocab.progress.streak--;
      }
    } else {
      // Positive ratings (Doable/Easy): reset negative streak to 0, then increment positive
      if (vocab.progress.streak < 0) {
        vocab.progress.streak = 0;
      } else {
        vocab.progress.streak++;
        // Level up at streak 1, reset streak
        if (vocab.progress.streak === 1 && vocab.progress.level < 4) {
          vocab.progress.level++;
          vocab.progress.streak = 0;
        }
      }
    }

    // Apply FSRS card updates
    vocab.progress = {
      ...vocab.progress,
      ...updatedCard
    };

    // If immediateDue is true and rating was low (Again/Hard), make it due now
    if (setWrongVocabDueAgainImmediately && (fsrsRating === Rating.Again || fsrsRating === Rating.Hard)) {
      vocab.progress.due = new Date();
    }


    await db.vocab.put(vocab);
  }

  async updateLastReview(vocabId: string): Promise<void> {
    const vocab = await db.vocab.get(vocabId);
    if (!vocab) {
      return;
    }

    // Initialize FSRS card for new vocab
    if (vocab.progress.level === -1) {
      vocab.progress = {
        ...createEmptyCard(),
        streak: 0,
        level: 0
      };
    }

    // Always update last review time
    const newLastReview = new Date();
    vocab.progress.last_review = newLastReview;
    await db.vocab.put(vocab);
  }

  async addPronunciationToVocab(_Id: string, _pronunciation: string): Promise<void> {
    // Pronunciation is now handled as notes - this method will be deprecated
    // The pronunciation task should create a note instead
    // Suppress unused parameter warnings with void operator
    void _Id;
    void _pronunciation;
  }

  async hasPronunciation(_Id: string): Promise<boolean> {
    // Since pronunciation is now handled as notes, we'll check if there are pronunciation notes
    // For now, return false to indicate no direct pronunciation field
    void _Id; // Suppress unused parameter warning
    return false;
  }

  async getRandomVocabWithMissingPronunciation(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        vocab.consideredSentence !== true &&
        !vocab.doNotPractice &&
        (vocab.priority ?? 1) >= 2 &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)))
      )
      .toArray();

    // Since pronunciation is now handled as notes, we'll check for pronunciation notes
    // For now, assume all vocab needs pronunciation (to be refined later)
    if (vocab.length === 0) return null;
    return pickRandom(vocab, 1)[0];
  }

  async getVocabPaginated(cursor?: string, limit: number = 20, filters?: VocabListFilters): Promise<VocabPaginationResult> {
    const allVocab = await db.vocab.toArray();

    // Apply filters
    let filteredVocab = allVocab;
    
    // Search filter (OR logic: vocab content OR translation match)
    if (filters?.searchQuery || (filters?.translationIds && filters.translationIds.length > 0)) {
      filteredVocab = filteredVocab.filter(vocab => {
        // Check vocab content match
        let contentMatch = false;
        if (filters?.searchQuery) {
          const query = filters.searchQuery.toLowerCase().trim();
          contentMatch = vocab.content?.toLowerCase().includes(query) || false;
        }

        // Check translation match
        let translationMatch = false;
        if (filters?.translationIds && filters.translationIds.length > 0) {
          translationMatch = vocab.translations.some(translationId => 
            filters.translationIds!.includes(translationId)
          );
        }

        // Return true if EITHER content matches OR translation matches
        return contentMatch || translationMatch;
      });
    }

    // Language filter
    if (filters?.languages && filters.languages.length > 0) {
      filteredVocab = filteredVocab.filter(vocab =>
        filters.languages!.includes(vocab.language)
      );
    }

    // Origins filter
    if (filters?.origins && filters.origins.length > 0) {
      filteredVocab = filteredVocab.filter(vocab =>
        vocab.origins.some(origin => filters.origins!.includes(origin))
      );
    }

    // Sort by content for consistent cursor-based pagination
    filteredVocab.sort((a, b) => (a.content || '').localeCompare(b.content || ''));

    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = parseInt(cursor, 10);
      if (!isNaN(cursorIndex)) {
        startIndex = cursorIndex;
      }
    }

    const endIndex = startIndex + limit;
    const paginatedVocab = filteredVocab.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredVocab.length;
    const nextCursor = hasMore ? endIndex.toString() : undefined;

    return {
      vocab: paginatedVocab.map(v => this.ensureVocabFields(v)),
      nextCursor,
      hasMore
    };
  }

  async getTotalVocabCount(filters?: VocabListFilters): Promise<number> {
    if (!filters || (!filters.searchQuery && !filters.translationIds && !filters.languages && !filters.origins)) {
      return await db.vocab.count();
    }

    const allVocab = await db.vocab.toArray();
    let filteredVocab = allVocab;

    // Search filter (OR logic: vocab content OR translation match)
    if (filters.searchQuery || (filters.translationIds && filters.translationIds.length > 0)) {
      filteredVocab = filteredVocab.filter(vocab => {
        // Check vocab content match
        let contentMatch = false;
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase().trim();
          contentMatch = vocab.content?.toLowerCase().includes(query) || false;
        }

        // Check translation match
        let translationMatch = false;
        if (filters.translationIds && filters.translationIds.length > 0) {
          translationMatch = vocab.translations.some(translationId => 
            filters.translationIds!.includes(translationId)
          );
        }

        // Return true if EITHER content matches OR translation matches
        return contentMatch || translationMatch;
      });
    }

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      filteredVocab = filteredVocab.filter(vocab =>
        filters.languages!.includes(vocab.language)
      );
    }

    // Origins filter
    if (filters.origins && filters.origins.length > 0) {
      filteredVocab = filteredVocab.filter(vocab =>
        vocab.origins.some(origin => filters.origins!.includes(origin))
      );
    }

    return filteredVocab.length;
  }

  async saveVocab(vocab: Omit<VocabData, 'id' | 'progress'>): Promise<VocabData> {

    const newVocab: Omit<VocabData, 'id'> = {
      language: vocab.language,
      content: vocab.content,
      consideredCharacter: vocab.consideredCharacter,
      consideredSentence: vocab.consideredSentence,
      consideredWord: vocab.consideredWord,
      priority: vocab.priority,
      doNotPractice: vocab.doNotPractice,
      notes: vocab.notes,
      translations: vocab.translations,
      links: vocab.links,
      origins: vocab.origins,
      relatedVocab: vocab.relatedVocab || [],
      notRelatedVocab: vocab.notRelatedVocab || [],
      contains: vocab.contains || [],
      isPicturable: vocab.isPicturable,
      images: vocab.images || [],
      hasImage: (vocab.images && vocab.images.length > 0) || false,
      sounds: vocab.sounds || [],
      hasSound: (vocab.sounds && vocab.sounds.some(sound => !sound.disableForPractice)) || false,
      progress: {
        ...createEmptyCard(),
        streak: 0,
        level: -1
      }
    };

    const id = await db.vocab.add(newVocab as VocabData);
    return { ...newVocab, id: id as string };
  }

  async updateVocab(vocab: VocabData): Promise<void> {
    
    // Set hasImage and hasSound based on actual data
    vocab.hasImage = vocab.images && vocab.images.length > 0;
    vocab.hasSound = vocab.sounds && vocab.sounds.some(sound => !sound.disableForPractice);
    
    await db.vocab.put(vocab);
  }

  async deleteVocab(id: string): Promise<void> {
    await db.vocab.delete(id);
  }

  async bulkCreateVocab(vocab: Omit<VocabData, 'id' | 'progress'>[]): Promise<VocabData[]> {
    if (vocab.length === 0) {
      return [];
    }

    // Prepare vocab with progress field
    const vocabWithProgress: Omit<VocabData, 'id'>[] = vocab.map(v => ({
      language: v.language,
      content: v.content,
      consideredCharacter: v.consideredCharacter,
      consideredSentence: v.consideredSentence,
      consideredWord: v.consideredWord,
      priority: v.priority,
      doNotPractice: v.doNotPractice,
      notes: v.notes,
      translations: v.translations,
      links: v.links,
      origins: v.origins,
      relatedVocab: v.relatedVocab || [],
      notRelatedVocab: v.notRelatedVocab || [],
      contains: v.contains || [],
      isPicturable: v.isPicturable,
      images: v.images || [],
      hasImage: (v.images && v.images.length > 0) || false,
      sounds: v.sounds || [],
      hasSound: (v.sounds && v.sounds.some(sound => !sound.disableForPractice)) || false,
      similarSoundingButNotTheSame: v.similarSoundingButNotTheSame,
      progress: {
        ...createEmptyCard(),
        streak: 0,
        level: -1
      }
    }));

    // Bulk insert and get generated IDs
    const generatedIds = await db.vocab.bulkAdd(
      vocabWithProgress as VocabData[],
      { allKeys: true }
    );

    // Map generated IDs to vocab
    return vocabWithProgress.map((v, index) => ({
      ...v,
      id: String(generatedIds[index])
    }));
  }

  async getDueVocabInLanguage(language: string, vocabBlockList?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .equals(language)
      .filter(vocab =>
        vocab.progress.level >= 0 &&
        vocab.progress.due && new Date(vocab.progress.due) <= new Date() &&
        !vocab.doNotPractice &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id))
      )
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getDueNonSentenceVocabInLanguage(language: string, vocabBlockList?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .equals(language)
      .filter(vocab =>
        vocab.progress.level >= 0 &&
        vocab.progress.due && new Date(vocab.progress.due) <= new Date() &&
        !vocab.doNotPractice &&
        vocab.consideredSentence !== true && // Exclude sentence vocab
        !!vocab.content &&
        Array.isArray(vocab.translations) &&
        vocab.translations.length > 0 &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id))
      )
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getDueNonSentenceVocabPairsInLanguage(language: string, minPairs: number = 2, vocabBlockList?: string[]): Promise<VocabData[]> {
    const vocab = await this.getDueNonSentenceVocabInLanguage(language, vocabBlockList);
    
    // Return at least enough vocab to form the minimum number of pairs
    // For form-sentence tasks, we need at least 2 vocab items
    return vocab.length >= minPairs ? vocab : [];
  }

  async getDueVocabInLanguages(languages: string[], setsToAvoid?: string[], vocabBlockList?: string[]): Promise<VocabData[]> {
    let query = db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        vocab.progress.level >= 0 &&
        vocab.progress.due && new Date(vocab.progress.due) <= new Date() &&
        !vocab.doNotPractice &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id))
      );

    // Database-level filtering for set avoidance
    if (setsToAvoid && setsToAvoid.length > 0) {
      query = query.filter(vocab =>
        !vocab.origins.some(origin => setsToAvoid.includes(origin))
      );
    }

    const vocab = await query.toArray();
    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getRandomUnseenVocabInLanguages(languages: string[], count: number, setsToAvoid?: string[], vocabBlockList?: string[]): Promise<VocabData[]> {
    let query = db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        isUnseen(vocab) &&
        !vocab.doNotPractice &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id))
      );

    // Database-level filtering for set avoidance
    if (setsToAvoid && setsToAvoid.length > 0) {
      query = query.filter(vocab =>
        !vocab.origins.some(origin => setsToAvoid.includes(origin))
      );
    }

    const vocab = await query.toArray();
    const ensuredVocab = vocab.map(v => this.ensureVocabFields(v));

    // Shuffle and return requested count
    const shuffled = ensuredVocab.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async getRandomUnseenVocabWithContentAndTranslations(languages: string[], count: number, setsToAvoid?: string[], vocabBlockList?: string[]): Promise<VocabData[]> {
    let query = db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        isUnseen(vocab) &&
        !vocab.doNotPractice &&
        !!vocab.content && // Must have content
        vocab.content.trim() !== '' && // Content must not be empty
        !!vocab.translations && // Must have translations array
        vocab.translations.length > 0 && // Must have at least one translation
        (!vocabBlockList || !vocabBlockList.includes(vocab.id))
      );

    // Database-level filtering for set avoidance
    if (setsToAvoid && setsToAvoid.length > 0) {
      query = query.filter(vocab =>
        !vocab.origins.some(origin => setsToAvoid.includes(origin))
      );
    }

    const vocab = await query.toArray();
    const ensuredVocab = vocab.map(v => this.ensureVocabFields(v));

    // Shuffle and return requested count
    const shuffled = ensuredVocab.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async addRelatedVocab(id: string, relatedVocabId: string): Promise<void> {
    const vocab = await db.vocab.get(id);
    if (!vocab) return;

    const relatedVocab = vocab.relatedVocab || [];
    if (!relatedVocab.includes(relatedVocabId)) {
      relatedVocab.push(relatedVocabId);
      vocab.relatedVocab = relatedVocab;
      await db.vocab.put(vocab);
    }
  }

  async removeRelatedVocab(id: string, relatedVocabId: string): Promise<void> {
    const vocab = await db.vocab.get(id);
    if (!vocab) return;

    const relatedVocab = vocab.relatedVocab || [];
    const index = relatedVocab.indexOf(relatedVocabId);
    if (index > -1) {
      relatedVocab.splice(index, 1);
      vocab.relatedVocab = relatedVocab;
      await db.vocab.put(vocab);
    }
  }

  async addNotRelatedVocab(id: string, notRelatedVocabId: string): Promise<void> {
    const vocab = await db.vocab.get(id);
    if (!vocab) return;

    const notRelatedVocab = vocab.notRelatedVocab || [];
    if (!notRelatedVocab.includes(notRelatedVocabId)) {
      notRelatedVocab.push(notRelatedVocabId);
      vocab.notRelatedVocab = notRelatedVocab;
      await db.vocab.put(vocab);
    }
  }

  async removeNotRelatedVocab(id: string, notRelatedVocabId: string): Promise<void> {
    const vocab = await db.vocab.get(id);
    if (!vocab) return;

    const notRelatedVocab = vocab.notRelatedVocab || [];
    const index = notRelatedVocab.indexOf(notRelatedVocabId);
    if (index > -1) {
      notRelatedVocab.splice(index, 1);
      vocab.notRelatedVocab = notRelatedVocab;
      await db.vocab.put(vocab);
    }
  }

  async getVocabContainingVocabId(vocabId: string): Promise<VocabData[]> {
    const vocab = await db.vocab
      .filter(v => v.contains && v.contains.includes(vocabId))
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async findVocabByTranslationIds(language: string, translationIds: string[]): Promise<VocabData | undefined> {
    if (translationIds.length === 0) return undefined;

    const vocab = await db.vocab
      .where('language')
      .equals(language)
      .filter(vocab => {
        // Check if ALL translation UIDs are present in this vocab's translations
        return translationIds.every(id => vocab.translations.includes(id));
      })
      .first();

    return vocab ? this.ensureVocabFields(vocab) : undefined;
  }

  private async findIdealWrongVocab(targetLanguage: string, correctVocabContent: string): Promise<string | null> {
    const now = new Date();
    const dueVocab = await db.vocab
      .where('language').equals(targetLanguage)
      .and(vocab => vocab.consideredSentence !== true)
      .and(vocab => vocab.content !== correctVocabContent)
      .and(vocab => vocab.progress && vocab.progress.level >= 0)
      .and(vocab => vocab.progress.due && new Date(vocab.progress.due) <= now)
      .toArray();

    const idealCandidates = dueVocab.filter(vocab => {
      if (!vocab.content) return false;

      if (!isLengthWithinRange(vocab.content, correctVocabContent.length, 3)) {
        return false;
      }

      return levenshteinDistance(vocab.content, correctVocabContent) > 2;
    });

    if (idealCandidates.length > 0) {
      const shuffled = shuffleArray(idealCandidates);
      return shuffled[0].content!;
    }

    return null;
  }

  private async getFallbackWrongVocab(targetLanguage: string, correctVocabContent: string): Promise<string | null> {
    // Query all vocab excluding sentences and the correct answer
    const candidates = await db.vocab
      .where('language').equals(targetLanguage)
      .and(vocab => vocab.consideredSentence !== true)
      .and(vocab => vocab.content !== correctVocabContent)
      .and(vocab => !!vocab.content)
      .toArray();

    if (candidates.length > 0) {
      const shuffled = shuffleArray(candidates);
      return shuffled[0].content!;
    }

    return null;
  }

  async generateWrongVocabs(targetLanguage: string, correctVocabContent: string, count: number): Promise<string[]> {
    const wrongAnswers: string[] = [];
    const usedAnswers = new Set([correctVocabContent]);

    for (let i = 0; i < count; i++) {
      const idealWrong = await this.findIdealWrongVocab(targetLanguage, correctVocabContent);
      if (idealWrong && !usedAnswers.has(idealWrong)) {
        wrongAnswers.push(idealWrong);
        usedAnswers.add(idealWrong);
      }
    }

    while (wrongAnswers.length < count) {
      const fallbackWrong = await this.getFallbackWrongVocab(targetLanguage, correctVocabContent);
      if (fallbackWrong && !usedAnswers.has(fallbackWrong)) {
        wrongAnswers.push(fallbackWrong);
        usedAnswers.add(fallbackWrong);
      } else {
        break;
      }
    }

    return wrongAnswers;
  }

  async getUnseenVocabByIds(vocabIds: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('id')
      .anyOf(vocabIds)
      .toArray();

    return vocab
      .map(v => this.ensureVocabFields(v))
      .filter(v => isUnseen(v));
  }

  async getDueVocabByIds(vocabIds: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('id')
      .anyOf(vocabIds)
      .toArray();

    return vocab
      .map(v => this.ensureVocabFields(v))
      .filter(v => v.progress.level >= 0 && v.progress.due && v.progress.due <= new Date());
  }

  async getRandomVocabWithNoTranslationsInLanguages(languages: string[], vocabBlockList?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(v =>
        !v.doNotPractice &&
        !v.notInterestedInAddingTranslations &&
        (!!v.content && (v.translations?.length ?? 0) === 0) &&
        (!vocabBlockList || !vocabBlockList.includes(v.id))
      )
      .toArray();
    if (vocab.length === 0) return null;
    const ensured = vocab.map(v => this.ensureVocabFields(v));
    const shuffled = ensured.sort(() => Math.random() - 0.5);
    return shuffled[0];
  }

  async getVocabWithLowestDueDate(count: number, languages: string[], vocabBlockList?: string[]): Promise<VocabData[]> {
    // Use the indexed progress.due field for efficient sorting
    const vocab = await db.vocab
      .orderBy('progress.due')
      .filter(v =>
        languages.includes(v.language) &&
        !v.doNotPractice &&
        !!v.content &&
        v.translations &&
        v.translations.length > 0 &&
        v.progress.level >= 0 &&
        (!vocabBlockList || !vocabBlockList.includes(v.id))
      )
      .limit(count)
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async updateVocabLastSeenAndDueDate(vocabIds: string[], dueDate: Date): Promise<void> {
    const now = new Date();

    for (const vocabId of vocabIds) {
      const vocab = await db.vocab.get(vocabId);
      if (!vocab) continue;

      // Update last_review to now and due date to specified time
      vocab.progress.last_review = now;
      vocab.progress.due = dueDate;

      await db.vocab.put(vocab);
    }
  }

  async getDueSentenceVocabWithMaxLevel(languages: string[], maxLevel: number, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const now = new Date();
    const results = await db.vocab
      .where('language').anyOf(languages)
      .filter(vocab =>
        vocab.consideredSentence === true &&
        vocab.progress.level >= 0 &&
        vocab.progress.level <= maxLevel &&
        vocab.progress.due && new Date(vocab.progress.due) <= now &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)))
      )
      .toArray();

    return results.map(vocab => this.ensureVocabFields(vocab));
  }

  // Image operations
  async addImageFromUrl(vocabId: string, imageUrl: string, alt?: string): Promise<void> {
    try {
      // Fetch and compress the image
      const compressedBlob = await compressImageFromUrl(imageUrl, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'jpeg'
      });

      const vocab = await db.vocab.get(vocabId);
      if (!vocab) throw new Error('Vocab not found');

      // Check for duplicates before adding
      vocab.images = vocab.images || [];
      const isDuplicate = vocab.images.some(existing => 
        // URL-based comparison (for remote images)
        (imageUrl && existing.url && imageUrl === existing.url) ||
        // Size + mimeType comparison (for all images)
        (existing.fileSize === compressedBlob.size && existing.mimeType === compressedBlob.type)
      );

      if (isDuplicate) {
        
        return;
      }

      const vocabImage: VocabImage = {
        id: crypto.randomUUID(),
        url: imageUrl,
        blob: compressedBlob,
        alt: alt,
        addedAt: new Date(),
        fileSize: compressedBlob.size,
        mimeType: compressedBlob.type,
        compressed: true
      };

      vocab.images.push(vocabImage);
      vocab.hasImage = true;

      await db.vocab.put(toRaw(vocab));
    } catch {
      // Don't throw - gracefully handle missing/invalid images
    }
  }

  async addImageFromFile(vocabId: string, file: File, alt?: string): Promise<void> {
    try {
      // Compress the uploaded file
      const compressedBlob = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'jpeg'
      });

      const vocab = await db.vocab.get(vocabId);
      if (!vocab) throw new Error('Vocab not found');

      const vocabImage: VocabImage = {
        id: crypto.randomUUID(),
        blob: compressedBlob,
        alt: alt || file.name,
        addedAt: new Date(),
        fileSize: compressedBlob.size,
        mimeType: compressedBlob.type,
        originalFileName: file.name,
        compressed: true
      };

      vocab.images = vocab.images || [];
      vocab.images.push(vocabImage);
      vocab.hasImage = true;

      await db.vocab.put(toRaw(vocab));
    } catch (error) {
      this.toast.error(`Failed to add image from file: ${String(error)}`);
      throw error;
    }
  }

  async removeImageFromVocab(vocabId: string, imageId: string): Promise<void> {
    const vocab = await db.vocab.get(vocabId);
    if (!vocab) return;

    vocab.images = vocab.images?.filter(img => img.id !== imageId) || [];
    vocab.hasImage = vocab.images.length > 0;
    await db.vocab.put(toRaw(vocab));
  }

  async getVocabNeedingImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        !!(vocab.content && vocab.content.trim() !== '' &&
        !vocab.doNotPractice &&
        vocab.isPicturable !== false &&
        (!vocab.images || vocab.images.length === 0) &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin))))
      )
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async markVocabNotPicturable(vocabId: string): Promise<void> {
    const vocab = await db.vocab.get(vocabId);
    if (!vocab) return;

    vocab.isPicturable = false;
    await db.vocab.put(toRaw(vocab));
  }

  // Sound operations
  async addSoundFromFile(vocabId: string, file: File): Promise<void> {
    // Validate the audio file
    const validationError = validateAudioFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const vocab = await db.vocab.get(vocabId);
    if (!vocab) throw new Error('Vocab not found');

    try {
      // Check for duplicates before adding
      vocab.sounds = vocab.sounds || [];
      const isDuplicate = vocab.sounds.some(existing => 
        // Size + mimeType + filename comparison (for all sounds)
        (existing.fileSize === file.size && 
         existing.mimeType === file.type && 
         existing.originalFileName === file.name)
      );

      if (isDuplicate) {
        
        return;
      }

      // Get audio duration
      const duration = await getAudioDuration(file);

      const vocabSound: VocabSound = {
        id: crypto.randomUUID(),
        blob: file, // Store the file as a blob directly
        addedAt: new Date(),
        fileSize: file.size,
        mimeType: file.type,
        duration: duration,
        originalFileName: file.name
      };

      vocab.sounds.push(vocabSound);
      vocab.hasSound = vocab.sounds.some(sound => !sound.disableForPractice);
      await db.vocab.put(toRaw(vocab));
    } catch {
      // Don't throw - gracefully handle missing/invalid sounds
    }
  }

  async addSoundFromUrl(vocabId: string, url: string): Promise<void> {
    const vocab = await db.vocab.get(vocabId);
    if (!vocab) throw new Error('Vocab not found');

    try {
      // Fetch audio as blob
      const blob = await fetchAudioAsBlob(url);
      
      // Validate the fetched blob
      const file = new File([blob], 'audio', { type: blob.type });
      const validationError = validateAudioFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Get audio duration
      const duration = await getAudioDuration(blob);

      const vocabSound: VocabSound = {
        id: crypto.randomUUID(),
        blob: blob,
        addedAt: new Date(),
        fileSize: blob.size,
        mimeType: blob.type,
        duration: duration,
        originalFileName: undefined
      };

      vocab.sounds = vocab.sounds || [];
      vocab.sounds.push(vocabSound);
      vocab.hasSound = vocab.sounds.some(sound => !sound.disableForPractice);
      await db.vocab.put(toRaw(vocab));
    } catch (error) {
      this.toast.error(`Failed to add sound from URL: ${String(error)}`);
      throw error;
    }
  }

  async removeSoundFromVocab(vocabId: string, soundId: string): Promise<void> {
    const vocab = await db.vocab.get(vocabId);
    if (!vocab) return;

    vocab.sounds = vocab.sounds?.filter(sound => sound.id !== soundId) || [];
    vocab.hasSound = vocab.sounds.length > 0;
    await db.vocab.put(toRaw(vocab));
  }

  // Eyes and Ears operations
  async getRandomUnseenVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        vocab.hasSound === true &&
        vocab.hasImage === true &&
        vocab.progress.level === -1 &&
        !vocab.doNotPractice &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)))
      )
      .toArray();

    if (vocab.length === 0) return null;
    const ensured = vocab.map(v => this.ensureVocabFields(v));
    return pickRandom(ensured, 1)[0];
  }

  async getRandomDueVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab =>
        vocab.hasSound === true &&
        vocab.hasImage === true &&
        vocab.progress.level >= 0 &&
        vocab.progress.due && new Date(vocab.progress.due) <= new Date() &&
        !vocab.doNotPractice &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)))
      )
      .toArray();

    if (vocab.length === 0) return null;
    const ensured = vocab.map(v => this.ensureVocabFields(v));
    return pickRandom(ensured, 1)[0];
  }

  async getDueVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab => {
        // Must have valid sound and images
        const hasPlayableSound = vocab.sounds && vocab.sounds.some(sound => !sound.disableForPractice);
        const hasImages = vocab.images && vocab.images.length > 0;

        return !!(hasPlayableSound && hasImages &&
          !vocab.doNotPractice &&
          (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
          vocab.progress.level >= 0 && vocab.progress.due && vocab.progress.due <= new Date() &&
          (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin))));
      })
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getUnseenVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab => {
        // Must have valid sound and images
        const hasPlayableSound = vocab.sounds && vocab.sounds.some(sound => !sound.disableForPractice);
        const hasImages = vocab.images && vocab.images.length > 0;

        return !!(hasPlayableSound && hasImages &&
          !vocab.doNotPractice &&
          (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
          vocab.progress.level === -1 &&
          (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin))));
      })
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getRandomVocabWithImages(language: string, excludeVocabId: string, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('language')
      .equals(language)
      .filter(vocab =>
        vocab.hasImage === true &&
        vocab.id !== excludeVocabId &&
        (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
        (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)))
      )
      .toArray();

    if (vocab.length === 0) return null;
    const ensured = vocab.map(v => this.ensureVocabFields(v));
    return pickRandom(ensured, 1)[0];
  }

  async getRandomSentenceVocabWithContains(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const now = new Date();
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab => {
        const isDue = vocab.progress.due && vocab.progress.due <= now;
        const isUnseen = vocab.progress.level === -1;

        return vocab.consideredSentence === true &&
          vocab.contains && vocab.contains.length > 0 &&
          (isDue || isUnseen) &&
          !vocab.doNotPractice &&
          (!vocabBlockList || !vocabBlockList.includes(vocab.id)) &&
          (!setsToAvoid || !vocab.origins.some(origin => setsToAvoid.includes(origin)));
      })
      .toArray();

    if (vocab.length === 0) return null;
    const ensured = vocab.map(v => this.ensureVocabFields(v));
    return pickRandom(ensured, 1)[0];
  }

  async getRandomDueOrUnseenVocabForMinimalPairs(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .filter(vocab => {
        // Must not be excluded from practice
        if (vocab.doNotPractice) return false;

        // Must not be in block list
        if (vocabBlockList && vocabBlockList.includes(vocab.id)) return false;

        // Must have content set
        if (!vocab.content) return false;

        // Must have sounds that are not disabled for practice
        if (!vocab.sounds || vocab.sounds.length === 0) return false;
        if (!vocab.sounds.some(sound => !sound.disableForPractice)) return false;

        // Must have similarSoundingButNotTheSame length > 0
        if (!vocab.similarSoundingButNotTheSame || vocab.similarSoundingButNotTheSame.length === 0) return false;

        // Filter by sets
        if (setsToAvoid && vocab.origins.some(origin => setsToAvoid.includes(origin))) return false;

        // Must be either due or unseen
        if (!vocab.progress) return true; // Consider unseen if no progress

        // Unseen: never seen before (level === -1)
        const vocabIsUnseen = vocab.progress.level === -1;

        // Due: has been seen and is due now
        const isDue = vocab.progress.level >= 0 && vocab.progress.due && new Date(vocab.progress.due) <= new Date();

        return vocabIsUnseen || isDue;
      })
      .toArray();

    if (vocab.length === 0) return null;

    // Additional validation: ensure the selected vocab has at least one valid related vocab
    // that is also a character with sound and content
    for (const candidate of vocab) {
      const ensuredCandidate = this.ensureVocabFields(candidate);
      
      // Get similar sounding vocab and check if at least one meets criteria
      const relatedVocabList = await db.vocab.where('id').anyOf(ensuredCandidate.similarSoundingButNotTheSame!).toArray();
      const validRelatedVocab = relatedVocabList.filter(v =>
        v.content &&
        v.sounds && v.sounds.some(s => !s.disableForPractice)
      );
      
      if (validRelatedVocab.length > 0) {
        return ensuredCandidate;
      }
    }

    return null;
  }

  async getRandomVocabForMinimalPairsFromSet(setId: string, includeOnlySeen: boolean, vocabBlockList?: string[]): Promise<VocabData | null> {
    const vocab = await db.vocab
      .where('origins')
      .equals(setId)
      .filter(vocab => {
        // Must not be excluded from practice
        if (vocab.doNotPractice) return false;

        // Must not be in block list
        if (vocabBlockList && vocabBlockList.includes(vocab.id)) return false;

        // Must be in this set
        if (!vocab.origins.includes(setId)) return false;

        // Must have content set
        if (!vocab.content) return false;

        // Must have sounds that are not disabled for practice
        if (!vocab.sounds || vocab.sounds.length === 0) return false;
        if (!vocab.sounds.some(sound => !sound.disableForPractice)) return false;

        // Must have similarSoundingButNotTheSame length > 0
        if (!vocab.similarSoundingButNotTheSame || vocab.similarSoundingButNotTheSame.length === 0) return false;

        // Filter by seen/unseen if required
        if (includeOnlySeen) {
          // Only seen vocab (level >= 0)
          return vocab.progress && vocab.progress.level >= 0;
        }

        // Include all vocab (both seen and unseen)
        return true;
      })
      .toArray();

    if (vocab.length === 0) return null;

    // Additional validation: ensure the selected vocab has at least one valid related vocab
    // that is also a character with sound and content
    for (const candidate of vocab) {
      const ensuredCandidate = this.ensureVocabFields(candidate);

      // Get similar sounding vocab and check if at least one meets criteria
      const relatedVocabList = await db.vocab.where('id').anyOf(ensuredCandidate.similarSoundingButNotTheSame!).toArray();
      const validRelatedVocab = relatedVocabList.filter(v =>
        v.content &&
        v.sounds && v.sounds.some(s => !s.disableForPractice)
      );

      if (validRelatedVocab.length > 0) {
        return ensuredCandidate;
      }
    }

    return null;
  }

  async getShuffledVocabForMinimalPairsFromSet(setId: string, count: number, includeOnlySeen: boolean): Promise<VocabData[]> {
    // Get all eligible vocab from set
    const vocab = await db.vocab
      .where('origins')
      .equals(setId)
      .filter(vocab => {
        // Must not be excluded from practice
        if (vocab.doNotPractice) return false;

        // Must be in this set
        if (!vocab.origins.includes(setId)) return false;

        // Must have content set
        if (!vocab.content) return false;

        // Must have sounds that are not disabled for practice
        if (!vocab.sounds || vocab.sounds.length === 0) return false;
        if (!vocab.sounds.some(sound => !sound.disableForPractice)) return false;

        // Must have similarSoundingButNotTheSame length > 0
        if (!vocab.similarSoundingButNotTheSame || vocab.similarSoundingButNotTheSame.length === 0) return false;

        // Filter by seen/unseen if required
        if (includeOnlySeen) {
          // Only seen vocab (level >= 0)
          return vocab.progress && vocab.progress.level >= 0;
        }

        // Include all vocab (both seen and unseen)
        return true;
      })
      .toArray();

    if (vocab.length === 0) return [];

    // Validate each vocab has at least one valid related vocab
    const validVocab: VocabData[] = [];

    for (const candidate of vocab) {
      // Get similar sounding vocab and check if at least one meets criteria
      const relatedVocabList = await db.vocab.where('id').anyOf(candidate.similarSoundingButNotTheSame!).toArray();
      const validRelatedVocab = relatedVocabList.filter(v =>
        v.content &&
        v.sounds && v.sounds.some(s => !s.disableForPractice)
      );

      if (validRelatedVocab.length > 0) {
        validVocab.push(this.ensureVocabFields(candidate));
      }
    }

    // Use pickRandom to shuffle and return requested count
    return pickRandom(validVocab, count);
  }

  // Set Study operations
  async getRandomDueVocabFromSet(setId: string, count: number, vocabBlockList?: string[]): Promise<VocabData[]> {
    const now = new Date();

    const vocab = await db.vocab
      .where('origins')
      .equals(setId)
      .filter(vocab => {
        const levelOk = vocab.progress.level >= 0;
        const dueOk = vocab.progress.due && new Date(vocab.progress.due) <= now;
        const practiceOk = !vocab.doNotPractice;
        const originOk = vocab.origins.includes(setId);
        const notBlockedOk = !vocabBlockList || !vocabBlockList.includes(vocab.id);

        return levelOk && dueOk && practiceOk && originOk && notBlockedOk;
      })
      .toArray();

    const ensuredVocab = vocab.map(v => this.ensureVocabFields(v));
    return pickRandom(ensuredVocab, count);
  }

  async getRandomUnseenVocabFromSet(setId: string, count: number, vocabBlockList?: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('origins')
      .equals(setId)
      .filter(vocab => {
        if (!vocab.progress) {
          
          return !vocab.doNotPractice &&
                 vocab.origins.includes(setId) &&
                 (!vocabBlockList || !vocabBlockList.includes(vocab.id));
        }
        return isUnseen(vocab) &&
               !vocab.doNotPractice &&
               vocab.origins.includes(setId) &&
               (!vocabBlockList || !vocabBlockList.includes(vocab.id));
      })
      .toArray();

    const ensuredVocab = vocab.map(v => this.ensureVocabFields(v));
    return pickRandom(ensuredVocab, count);
  }

  async getUnseenVocabCountFromSet(setId: string): Promise<number> {
    const count = await db.vocab
      .where('origins')
      .equals(setId)
      .filter(vocab => {
        if (!vocab.progress) {
          return !vocab.doNotPractice && vocab.origins.includes(setId);
        }
        return isUnseen(vocab) &&
               !vocab.doNotPractice &&
               vocab.origins.includes(setId);
      })
      .count();

    return count;
  }


  async getUncheckedVocab(limit: number): Promise<VocabData[]> {
    const vocab = await db.vocab
      .filter(v => !v._mergeChecked)
      .limit(limit)
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getVocabByOrigins(setIds: string[]): Promise<VocabData[]> {
    const vocab = await db.vocab
      .where('origins')
      .anyOf(setIds)
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  // Component Clusters operations
  async getRandomDueOrUnseenVocabContainedInMultiple(languages: string[], minContainers: number, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null> {
    const now = new Date();

    // Get all vocab in the specified languages
    const allVocab = await db.vocab
      .where('language')
      .anyOf(languages)
      .toArray();

    // Find vocab that are contained in at least minContainers other vocab
    const potentialComponents: VocabData[] = [];

    for (const vocab of allVocab) {
      // Skip if in block list
      if (vocabBlockList && vocabBlockList.includes(vocab.id)) {
        continue;
      }

      // Skip if marked as doNotPractice
      if (vocab.doNotPractice) {
        continue;
      }

      // Filter by sets
      if (setsToAvoid && vocab.origins.some(origin => setsToAvoid.includes(origin))) {
        continue;
      }

      // Check if due or unseen
      const isUnseen = vocab.progress.level === -1;
      const isDue = vocab.progress.level >= 0 && vocab.progress.due && new Date(vocab.progress.due) <= now;

      if (!isUnseen && !isDue) {
        continue;
      }

      // Count how many vocab contain this vocab
      const containingCount = allVocab.filter(v =>
        v.contains && v.contains.includes(vocab.id)
      ).length;

      if (containingCount >= minContainers) {
        potentialComponents.push(vocab);
      }
    }

    if (potentialComponents.length === 0) {
      return null;
    }

    // Return a random component
    const randomIndex = Math.floor(Math.random() * potentialComponents.length);
    return this.ensureVocabFields(potentialComponents[randomIndex]);
  }

  async getDueOrUnseenVocabContainingVocabId(vocabId: string, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]> {
    const now = new Date();

    const vocab = await db.vocab
      .filter(v => {
        // Must contain the specified vocab ID
        if (!v.contains || !v.contains.includes(vocabId)) {
          return false;
        }

        // Must not be in block list
        if (vocabBlockList && vocabBlockList.includes(v.id)) {
          return false;
        }

        // Must not be marked as doNotPractice
        if (v.doNotPractice) {
          return false;
        }

        // Filter by sets
        if (setsToAvoid && v.origins.some(origin => setsToAvoid.includes(origin))) {
          return false;
        }

        // Check if due or unseen
        const isUnseen = v.progress.level === -1;
        const isDue = v.progress.level >= 0 && v.progress.due && new Date(v.progress.due) <= now;

        return isUnseen || isDue;
      })
      .toArray();

    return vocab.map(v => this.ensureVocabFields(v));
  }

  async getVocabByTranslationId(translationId: string): Promise<VocabData[]> {
    const allVocab = await db.vocab.toArray();
    const matching = allVocab.filter(v =>
      v.translations && v.translations.includes(translationId)
    );

    return matching.map(v => this.ensureVocabFields(v));
  }
}
