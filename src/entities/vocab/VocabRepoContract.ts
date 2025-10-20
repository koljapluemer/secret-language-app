import type { VocabData } from './VocabData';
import type { Rating } from 'ts-fsrs';

export interface VocabPaginationResult {
  vocab: VocabData[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface VocabListFilters {
  searchQuery?: string;
  translationIds?: string[];  // IDs of translations that match search
  languages?: string[];
  origins?: string[];
}

export interface VocabRepoContract {
  // Vocab operations
  getVocab(): Promise<VocabData[]>;
  getVocabByUID(id: string): Promise<VocabData | undefined>;
  getVocabByUIDs(Ids: string[]): Promise<VocabData[]>;
  getVocabByLanguageAndContent(language: string, content: string): Promise<VocabData | undefined>;
  getRandomAlreadySeenDueVocab(count: number, languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;
  getRandomUnseenVocab(count: number, languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;
  getRandomUnseenSentenceVocab(count: number, languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;
  getDueSentenceVocabWithMaxLevel(languages: string[], maxLevel: number, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;
  getDueOrUnseenVocabFromIds(Ids: string[]): Promise<VocabData[]>;
  
  // Pagination operations
  getVocabPaginated(cursor?: string, limit?: number, filters?: VocabListFilters): Promise<VocabPaginationResult>;
  getTotalVocabCount(filters?: VocabListFilters): Promise<number>;
  
  // CRUD operations
  saveVocab(vocab: Omit<VocabData, "id" | 'progress' | 'tasks'>): Promise<VocabData>;
  updateVocab(vocab: VocabData): Promise<void>;
  deleteVocab(id: string): Promise<void>;

  // Batch operations
  bulkCreateVocab(vocab: Omit<VocabData, 'id' | 'progress'>[]): Promise<VocabData[]>;
  
  // Progress operations
  scoreVocab(vocabId: string, rating: Rating, setWrongVocabDueAgainImmediately?: boolean): Promise<void>;
  updateLastReview(vocabId: string): Promise<void>;
  
  // Pronunciation operations
  addPronunciationToVocab(id: string, pronunciation: string): Promise<void>;
  hasPronunciation(id: string): Promise<boolean>;
  getRandomVocabWithMissingPronunciation(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;
  
  // Related vocab operations
  addRelatedVocab(id: string, relatedVocabId: string): Promise<void>;
  removeRelatedVocab(id: string, relatedVocabId: string): Promise<void>;
  addNotRelatedVocab(id: string, notRelatedVocabId: string): Promise<void>;
  removeNotRelatedVocab(id: string, notRelatedVocabId: string): Promise<void>;
  getVocabContainingVocabId(vocabId: string): Promise<VocabData[]>;

  // Query operations for distractor generation
  getDueVocabInLanguage(language: string, vocabBlockList?: string[]): Promise<VocabData[]>;
  getDueNonSentenceVocabInLanguage(language: string, vocabBlockList?: string[]): Promise<VocabData[]>;
  getDueNonSentenceVocabPairsInLanguage(language: string, minPairs?: number, vocabBlockList?: string[]): Promise<VocabData[]>;
  getDueVocabInLanguages(languages: string[], setsToAvoid?: string[], vocabBlockList?: string[]): Promise<VocabData[]>;
  getRandomUnseenVocabInLanguages(languages: string[], count: number, setsToAvoid?: string[], vocabBlockList?: string[]): Promise<VocabData[]>;
  getRandomUnseenVocabWithContentAndTranslations(languages: string[], count: number, setsToAvoid?: string[], vocabBlockList?: string[]): Promise<VocabData[]>;
  findVocabByTranslationIds(language: string, translationIds: string[]): Promise<VocabData | undefined>;
  getRandomVocabWithNoTranslationsInLanguages(languages: string[], vocabBlockList?: string[]): Promise<VocabData | null>;
  
  // Distractor generation operations
  generateWrongVocabs(targetLanguage: string, correctVocabContent: string, count: number): Promise<string[]>;
  
  // Goal-based vocab operations
  getUnseenVocabByIds(vocabIds: string[]): Promise<VocabData[]>;
  getDueVocabByIds(vocabIds: string[]): Promise<VocabData[]>;
  
  // Backup task operations
  getVocabWithLowestDueDate(count: number, languages: string[], vocabBlockList?: string[]): Promise<VocabData[]>;
  updateVocabLastSeenAndDueDate(vocabIds: string[], dueDate: Date): Promise<void>;
  
  // Image operations
  addImageFromUrl(vocabId: string, imageUrl: string, alt?: string): Promise<void>;
  addImageFromFile(vocabId: string, file: File, alt?: string): Promise<void>;
  removeImageFromVocab(vocabId: string, imageId: string): Promise<void>;
  getVocabNeedingImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;
  markVocabNotPicturable(vocabId: string): Promise<void>;

  // Sound operations
  addSoundFromFile(vocabId: string, file: File): Promise<void>;
  addSoundFromUrl(vocabId: string, url: string): Promise<void>;
  removeSoundFromVocab(vocabId: string, soundId: string): Promise<void>;

  // Eyes and Ears operations
  getRandomUnseenVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;
  getRandomDueVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;
  getRandomVocabWithImages(language: string, excludeVocabId: string, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;
  getDueVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;
  getUnseenVocabWithSoundAndImages(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;

  // Sentence Slide operations
  getRandomSentenceVocabWithContains(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;

  // Minimal Pairs operations
  getRandomDueOrUnseenVocabForMinimalPairs(languages: string[], vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;
  getRandomVocabForMinimalPairsFromSet(setId: string, includeOnlySeen: boolean, vocabBlockList?: string[]): Promise<VocabData | null>;
  getShuffledVocabForMinimalPairsFromSet(setId: string, count: number, includeOnlySeen: boolean): Promise<VocabData[]>;

  // Set Study operations
  getRandomDueVocabFromSet(setId: string, count: number, vocabBlockList?: string[]): Promise<VocabData[]>;
  getRandomUnseenVocabFromSet(setId: string, count: number, vocabBlockList?: string[]): Promise<VocabData[]>;
  getUnseenVocabCountFromSet(setId: string): Promise<number>;

  // Component Clusters operations
  getRandomDueOrUnseenVocabContainedInMultiple(languages: string[], minContainers: number, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData | null>;
  getDueOrUnseenVocabContainingVocabId(vocabId: string, vocabBlockList?: string[], setsToAvoid?: string[]): Promise<VocabData[]>;

  // Merge operations
  getUncheckedVocab(limit: number): Promise<VocabData[]>;
  getVocabByOrigins(setIds: string[]): Promise<VocabData[]>;
  getVocabByTranslationId(translationId: string): Promise<VocabData[]>;
}