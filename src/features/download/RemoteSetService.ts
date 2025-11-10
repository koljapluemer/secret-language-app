import type { LocalSetRepoContract } from '@/entities/local-sets/LocalSetRepoContract';
import type { LocalSetData } from '@/entities/local-sets/LocalSetData';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract';
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { LanguageRepoContract } from '@/entities/languages/LanguageRepoContract';
import { useToast } from '@/shared/toasts';

import { vocabSchema } from '@/features/download/validation/vocabSchema';
import { translationSchema } from '@/features/download/validation/translationSchema';
import { noteSchema } from '@/features/download/validation/noteSchema';
import { linkSchema } from '@/features/download/validation/linkSchema';
import { resourceSchema } from '@/features/download/validation/resourceSchema';
import { goalSchema } from '@/features/download/validation/goalSchema';
import { factCardSchema } from '@/features/download/validation/factCardSchema';

import type { VocabData, VocabImage, VocabSound } from '@/entities/vocab/VocabData';
import type { TranslationData } from '@/entities/translations/TranslationData';
import type { ResourceData } from '@/entities/resources/ResourceData';
import type { GoalData } from '@/entities/goals/GoalData';
import type { FactCardData } from '@/entities/fact-cards/FactCardData';
import type { NoteData } from '@/entities/notes/NoteData';
import type { Link } from '@/shared/links/Link';

import { z } from 'zod';
import { remoteSetMetaDataSchema } from '@/features/download/remoteSetMetaData';
import type { RemoteSetInfo, DownloadOptions } from './types';

// Re-export types for convenience
export type { RemoteSetInfo, DownloadProgress, DownloadOptions } from './types';

interface RemoteSetFiles {
  vocab?: z.infer<typeof vocabSchema>[];
  translations?: z.infer<typeof translationSchema>[];
  notes?: z.infer<typeof noteSchema>[];
  links?: z.infer<typeof linkSchema>[];
  resources?: z.infer<typeof resourceSchema>[];
  goals?: z.infer<typeof goalSchema>[];
  factCards?: z.infer<typeof factCardSchema>[];
}

export class RemoteSetService {
  private toast = useToast();
  private readonly baseUrl: string;

  constructor(
    private localSetRepo: LocalSetRepoContract,
    private vocabRepo: VocabRepoContract,
    private translationRepo: TranslationRepoContract,
    private noteRepo: NoteRepoContract,
    private resourceRepo: ResourceRepoContract,
    private goalRepo: GoalRepoContract,
    private factCardRepo: FactCardRepoContract,
    private languageRepo: LanguageRepoContract
  ) {
    this.baseUrl = import.meta.env.VITE_SETS_BASE_URL || '/sets';
  }

  async getAvailableLanguages(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/index.json`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      this.toast.error(`Failed to fetch available languages: ${String(error)}`);
      return [];
    }
  }

  async getAvailableSets(languageCode: string): Promise<RemoteSetInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${languageCode}/index.json`);
      if (!response.ok) return [];
      const setsDict: Record<string, z.infer<typeof remoteSetMetaDataSchema>> = await response.json();

      // Convert dict to array of RemoteSetInfo
      const setsWithMetadata = Object.entries(setsDict).map(([setName, metadata]) => ({
        name: setName,
        title: metadata.title
      }));

      return setsWithMetadata;
    } catch (error) {
      this.toast.error(`Failed to fetch sets for ${languageCode}: ${String(error)}`);
      return [];
    }
  }

  async getSetMetadata(languageCode: string, setName: string): Promise<z.infer<typeof remoteSetMetaDataSchema> | null> {
    try {
      // Fetch from the language index (metadata is embedded there now)
      const indexResponse = await fetch(`${this.baseUrl}/${languageCode}/index.json`);
      if (!indexResponse.ok) return null;

      const setsDict: Record<string, z.infer<typeof remoteSetMetaDataSchema>> = await indexResponse.json();
      if (!setsDict[setName]) return null;

      const result = remoteSetMetaDataSchema.safeParse(setsDict[setName]);
      if (result.success) {
        return result.data;
      }

      return null;
    } catch (error) {
      this.toast.error(`Failed to fetch metadata for ${languageCode}/${setName}: ${String(error)}`);
      return null;
    }
  }

  async downloadSet(languageCode: string, setName: string, options?: DownloadOptions): Promise<void> {
    const reportProgress = (phase: string, current: number, total: number) => {
      if (options?.onProgress) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        options.onProgress({ phase, current, total, percentage });
      }
    };

    reportProgress('Loading and validating files', 0, 100);

    // First validate all files before writing anything
    const setFiles = await this.loadAndValidateSetFiles(languageCode, setName);
    if (!setFiles) {
      throw new Error('Failed to validate set files');
    }

    reportProgress('Loading and validating files', 100, 100);

    reportProgress('Setting up language and local set', 0, 100);

    // Fetch metadata to get the title and description
    const metadata = await this.getSetMetadata(languageCode, setName);
    const setTitle = metadata?.title || setName; // Fallback to setName if no title
    const setDescription = metadata?.description;

    // Ensure language exists in the database
    await this.languageRepo.ensureLanguageExists(languageCode);

    console.log('RemoteSetService DEBUG - About to check for existing local set');
    // Check if local set already exists
    console.log('RemoteSetService DEBUG - Checking for existing sets with language:', languageCode);
    const existingSets = await this.localSetRepo.getLocalSetsByLanguage(languageCode);
    console.log('RemoteSetService DEBUG - Existing sets found:', existingSets);
    let localSet = existingSets.find(s => s.name === setTitle);
    console.log('RemoteSetService DEBUG - Found matching set:', localSet);

    // Only save if it doesn't exist yet - avoids Dexie Cloud DataError
    if (!localSet) {
      console.log('RemoteSetService DEBUG - No existing set, attempting to save');
      localSet = await this.localSetRepo.saveLocalSet({
        name: setTitle,
        language: languageCode,
        description: setDescription,
        lastDownloadedAt: new Date()
      });
      console.log('RemoteSetService DEBUG - Save successful, got localSet:', localSet);
    } else {
      console.log('RemoteSetService DEBUG - Using existing localSet, skipping entire download');
      // Set already exists, don't re-download anything
      reportProgress('Set already downloaded', 100, 100);
      return;
    }

    reportProgress('Setting up language and local set', 100, 100);

    // Process notes
    const noteMap = new Map<string, string>();
    if (setFiles.notes) {
      reportProgress('Processing notes', 0, setFiles.notes.length);

      // Prepare all notes for bulk insert
      const notesToCreate: Omit<NoteData, 'id'>[] = setFiles.notes.map(remoteNote => ({
        content: remoteNote.content,
        showBeforeExercise: remoteNote.showBeforeExercice ?? false,
        noteType: remoteNote.noteType
      }));

      // Bulk insert all notes
      const savedNotes = await this.noteRepo.bulkCreateNotes(notesToCreate);

      // Map remote IDs to saved IDs
      for (let i = 0; i < setFiles.notes.length; i++) {
        if (setFiles.notes[i].id && savedNotes[i]) {
          noteMap.set(setFiles.notes[i].id!, savedNotes[i].id);
        }
      }

      reportProgress('Processing notes', setFiles.notes.length, setFiles.notes.length);
    } else {
      reportProgress('Processing notes', 0, 0);
    }

    // Create lookup maps for resolving references
    const linkMap = new Map<string, Link>();
    const translationMap = new Map<string, string>(); // remote ID -> local UID
    const vocabMap = new Map<string, string>(); // remote ID -> local UID
    const resourceMap = new Map<string, string>(); // remote ID -> local UID
    const goalMap = new Map<string, string>(); // remote ID -> local UID
    const factCardMap = new Map<string, string>(); // remote ID -> local UID

    // Track newly created entities for task generation
    const newVocabIds: string[] = [];
    const newResourceIds: string[] = [];
    const newGoalIds: string[] = [];

    reportProgress('Processing links', 0, 100);

    // Process links first (they're embedded, not stored as entities)
    if (setFiles.links) {
      for (let i = 0; i < setFiles.links.length; i++) {
        const linkData = setFiles.links[i];
        reportProgress('Processing links', i, setFiles.links.length);
        if (linkData.id) {
          linkMap.set(linkData.id, {
            label: linkData.label,
            url: linkData.url,
            owner: linkData.owner,
            ownerLink: linkData.ownerLink,
            license: linkData.license
          });
        }
      }
    }

    reportProgress('Processing links', 100, 100);

    // Process translations in batch for performance
    if (setFiles.translations) {
      console.log('RemoteSetService DEBUG - Processing translations, count:', setFiles.translations.length);
      const translationIdMap = await this.processTranslationsInBatch(
        setFiles.translations,
        localSet.id,
        noteMap,
        (current, total) => reportProgress('Processing translations', current, total)
      );

      console.log('RemoteSetService DEBUG - Translation ID map size:', translationIdMap.size);
      console.log('RemoteSetService DEBUG - First 5 translation mappings:', Array.from(translationIdMap.entries()).slice(0, 5));

      // Merge the translation ID mappings
      translationIdMap.forEach((localId, remoteId) => {
        translationMap.set(remoteId, localId);
      });

      console.log('RemoteSetService DEBUG - Final translationMap size:', translationMap.size);
    }

    // Process vocab - FAST INSERT (no merge logic, background service will handle deduplication)
    if (setFiles.vocab) {
      reportProgress('Processing vocabulary', 0, setFiles.vocab.length);

      const vocabToCreate: Omit<VocabData, "id" | 'progress'>[] = [];

      // First pass: Create all vocab items
      for (let i = 0; i < setFiles.vocab.length; i++) {
        const vocabData = setFiles.vocab[i];
        reportProgress('Processing vocabulary', i, setFiles.vocab.length);
        if (!vocabData.language) continue;

        const noteIds = this.resolveReferences(vocabData.notes || [], noteMap);
        const transcriptionIds = this.resolveReferences(vocabData.transcriptions || [], noteMap);
        const translationIds = this.resolveReferences(vocabData.translations || [], translationMap);

        if (i === 0) {
          console.log('RemoteSetService DEBUG - First vocab remote translation IDs:', vocabData.translations);
          console.log('RemoteSetService DEBUG - First vocab resolved translation IDs:', translationIds);
        }
        const links = this.resolveLinks(vocabData.links || [], linkMap);

        const localVocab: Omit<VocabData, "id" | 'progress'> = {
          language: vocabData.language,
          content: vocabData.content,
          consideredCharacter: vocabData.consideredCharacter,
          consideredSentence: vocabData.consideredSentence,
          consideredWord: vocabData.consideredWord,
          priority: vocabData.priority || 1,
          doNotPractice: false,
          notes: noteIds,
          transcriptions: transcriptionIds,
          translations: translationIds,
          glosses: [],
          links: links,
          relatedVocab: [], // Will resolve in second pass
          notRelatedVocab: [], // Will resolve in second pass
          contains: [], // Will resolve in second pass
          similarSoundingButNotTheSame: [], // Will resolve in second pass
          origins: [localSet.id],
          isPicturable: vocabData.isPicturable,
          images: [],
          hasImage: false,
          sounds: [],
          hasSound: false,
          notInterestedInPronunciationOrAlreadyAdded: vocabData.notInterestedInPronunciationOrAlreadyAdded,
          notInterestedInAddingTranslations: false,
          _mergeChecked: false // Mark for background merge
        };

        vocabToCreate.push(localVocab);
      }

      // Create all vocab in batches
      const createdVocab: VocabData[] = [];
      const BATCH_SIZE = 100;

      for (let i = 0; i < vocabToCreate.length; i += BATCH_SIZE) {
        const batch = vocabToCreate.slice(i, i + BATCH_SIZE);
        const savedBatch = await this.vocabRepo.bulkCreateVocab(batch);
        createdVocab.push(...savedBatch);
        reportProgress('Processing vocabulary', i + batch.length, vocabToCreate.length);
      }

      // Build ID mapping for cross-references
      for (let i = 0; i < setFiles.vocab.length; i++) {
        const vocabData = setFiles.vocab[i];
        if (vocabData.id && createdVocab[i]) {
          vocabMap.set(vocabData.id, createdVocab[i].id);
          newVocabIds.push(createdVocab[i].id);
        }
      }

      // Second pass: Update vocab-to-vocab relationships
      const vocabToUpdate: VocabData[] = [];
      for (let i = 0; i < setFiles.vocab.length; i++) {
        const vocabData = setFiles.vocab[i];
        const vocab = createdVocab[i];
        if (!vocab) continue;

        const relatedVocabIds = this.resolveReferences(vocabData.relatedVocab || [], vocabMap);
        const notRelatedVocabIds = this.resolveReferences(vocabData.notRelatedVocab || [], vocabMap);
        const containsIds = this.resolveReferences(vocabData.contains || [], vocabMap);
        const similarSoundingIds = this.resolveReferences(vocabData.similarSoundingButNotTheSame || [], vocabMap);

        if (relatedVocabIds.length > 0 || notRelatedVocabIds.length > 0 || containsIds.length > 0 || similarSoundingIds.length > 0) {
          vocabToUpdate.push({
            ...vocab,
            relatedVocab: relatedVocabIds,
            notRelatedVocab: notRelatedVocabIds,
            contains: containsIds,
            similarSoundingButNotTheSame: similarSoundingIds
          });
        }
      }

      if (vocabToUpdate.length > 0) {
        reportProgress('Finalizing vocabulary relationships', 0, vocabToUpdate.length);

        // Batch update all vocab with relationships in one transaction
        await this.vocabRepo.bulkUpdateVocab(vocabToUpdate);

        reportProgress('Finalizing vocabulary relationships', vocabToUpdate.length, vocabToUpdate.length);
      }

      reportProgress('Processing vocabulary', setFiles.vocab.length, setFiles.vocab.length);
    }

    // Process media files for vocab that was just created
    if (setFiles.vocab) {
      await this.processVocabMedia(
        languageCode,
        setName,
        setFiles.vocab,
        vocabMap,
        (current, total) => reportProgress('Processing media files', current, total)
      );
    }

    // Task generation is now handled ad-hoc during lessons

    // Process fact cards - FAST INSERT (no merge logic)
    if (setFiles.factCards) {
      reportProgress('Processing fact cards', 0, setFiles.factCards.length);

      for (let i = 0; i < setFiles.factCards.length; i++) {
        const factCardData = setFiles.factCards[i];
        reportProgress('Processing fact cards', i, setFiles.factCards.length);

        const noteIds = this.resolveReferences(factCardData.notes || [], noteMap);
        const links = this.resolveLinks(factCardData.links || [], linkMap);

        const localFactCard: Omit<FactCardData, "id" | 'progress'> = {
          language: factCardData.language,
          front: factCardData.front,
          back: factCardData.back,
          priority: factCardData.priority || 1,
          doNotPractice: false,
          notes: noteIds,
          links: links,
          origins: [localSet.id],
          _mergeChecked: false // Mark for background merge
        };

        const savedFactCard = await this.factCardRepo.saveFactCard(localFactCard);
        if (factCardData.id) {
          factCardMap.set(factCardData.id, savedFactCard.id);
        }
      }

      reportProgress('Processing fact cards', setFiles.factCards.length, setFiles.factCards.length);
    }

    // Process resources - FAST INSERT (no merge logic)
    if (setFiles.resources) {
      reportProgress('Processing resources', 0, setFiles.resources.length);

      for (let i = 0; i < setFiles.resources.length; i++) {
        const resourceData = setFiles.resources[i];
        reportProgress('Processing resources', i, setFiles.resources.length);

        const noteIds = this.resolveReferences(resourceData.notes || [], noteMap);
        const vocabIds = this.resolveReferences(resourceData.vocab || [], vocabMap);
        const factCardIds = this.resolveReferences(resourceData.factCards || [], factCardMap);
        const link = resourceData.link ? linkMap.get(resourceData.link) : undefined;

        const localResource: Omit<ResourceData, "id" | 'lastShownAt'> = {
          language: resourceData.language,
          isImmersionContent: resourceData.isImmersionContent,
          content: resourceData.content,
          priority: resourceData.priority || 1,
          link: link,
          notes: noteIds,
          vocab: vocabIds,
          factCards: factCardIds,
          origins: [localSet.id],
          finishedExtracting: false,
          _mergeChecked: false // Mark for background merge
        };

        const savedResource = await this.resourceRepo.saveResource(localResource);
        newResourceIds.push(savedResource.id);
        if (resourceData.id) {
          resourceMap.set(resourceData.id, savedResource.id);
        }
      }

      reportProgress('Processing resources', setFiles.resources.length, setFiles.resources.length);
    }

    // Task generation is now handled ad-hoc during lessons

    // Process goals - FAST INSERT (no merge logic)
    // Note: Goals don't currently have background merge support, but we add _mergeChecked for future support
    if (setFiles.goals) {
      reportProgress('Processing goals', 0, setFiles.goals.length);

      for (let i = 0; i < setFiles.goals.length; i++) {
        const goalData = setFiles.goals[i];
        reportProgress('Processing goals', i, setFiles.goals.length);

        const noteIds = this.resolveReferences(goalData.notes || [], noteMap);
        const factCardIds = this.resolveReferences(goalData.factCards || [], factCardMap);

        // Handle translations - ensure it's an array
        let translationIds: string[] = [];
        if (goalData.translations) {
          translationIds = Array.isArray(goalData.translations)
            ? goalData.translations
            : [goalData.translations];
        }

        const localGoal: Omit<GoalData, "id"> = {
          language: goalData.language,
          title: goalData.title,
          notes: noteIds,
          translations: translationIds,
          factCards: factCardIds,
          origins: [localSet.id],
          isAchieved: false
        };

        const savedGoal = await this.goalRepo.create(localGoal);
        newGoalIds.push(savedGoal.id);
        if (goalData.id) {
          goalMap.set(goalData.id, savedGoal.id);
        }
      }

      reportProgress('Processing goals', setFiles.goals.length, setFiles.goals.length);
    }

    reportProgress('Download complete', 100, 100);

    this.toast.success(`Successfully downloaded ${setTitle}`);

    // Task generation is now handled ad-hoc during lessons
  }

  private async loadAndValidateSetFiles(languageCode: string, setName: string): Promise<RemoteSetFiles | null> {
    const possibleFiles = ['vocab', 'translations', 'notes', 'links', 'resources', 'goals', 'factCards'];
    const setFiles: RemoteSetFiles = {};

    for (const fileName of possibleFiles) {
      try {
        const response = await fetch(`${this.baseUrl}/${languageCode}/${setName}/${fileName}.jsonl`, {
          cache: 'no-store'
        });
        if (!response.ok) {
          if (response.status === 404) {
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check content type - should be text/plain or application/json for JSONL
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          continue;
        }
        
        if (response.ok) {
          const text = await response.text();
          const lines = text.trim().split('\n').filter(line => line.trim());
          
          // Skip empty files
          if (lines.length === 0) {
            continue;
          }
          
          // Get the appropriate schema for validation
          const schema = this.getSchemaForFile(fileName);
          if (!schema) {
            
            continue;
          }

          const data = lines.map(line => {
            try {
              const parsed: unknown = JSON.parse(line);
              const result = schema.safeParse(parsed);
              if (result.success) {
                return result.data;
              } else {
                
                return null;
              }
            } catch {
              
              return null;
            }
          }).filter(item => item !== null);

          // Type assertion is safe here because we validate with schemas above
          if (fileName === 'vocab') setFiles.vocab = data as z.infer<typeof vocabSchema>[];
          else if (fileName === 'translations') setFiles.translations = data as z.infer<typeof translationSchema>[];
          else if (fileName === 'notes') setFiles.notes = data as z.infer<typeof noteSchema>[];
          else if (fileName === 'links') setFiles.links = data as z.infer<typeof linkSchema>[];
          else if (fileName === 'resources') setFiles.resources = data as z.infer<typeof resourceSchema>[];
          else if (fileName === 'goals') setFiles.goals = data as z.infer<typeof goalSchema>[];
          else if (fileName === 'factCards') setFiles.factCards = data as z.infer<typeof factCardSchema>[];
        }
      } catch (error) {
        this.toast.error(`Failed to load ${fileName}.jsonl: ${String(error)}`);
        return null;
      }
    }

    return setFiles;
  }

  private getSchemaForFile(fileName: string) {
    const schemaMap = {
      vocab: vocabSchema,
      translations: translationSchema,
      notes: noteSchema,
      links: linkSchema,
      resources: resourceSchema,
      goals: goalSchema,
      factCards: factCardSchema
    };
    return schemaMap[fileName as keyof typeof schemaMap];
  }

  private resolveReferences(remoteIds: string[], referenceMap: Map<string, string>): string[] {
    const resolvedIds: string[] = [];
    for (const remoteId of remoteIds) {
      const localId = referenceMap.get(remoteId);
      if (localId) {
        resolvedIds.push(localId);
      }
    }
    return [...new Set(resolvedIds)]; // Remove duplicates
  }

  private resolveLinks(remoteIds: string[], linkMap: Map<string, Link>): Link[] {
    const resolvedLinks: Link[] = [];
    for (const remoteId of remoteIds) {
      const link = linkMap.get(remoteId);
      if (link) {
        resolvedLinks.push(link);
      }
    }
    return resolvedLinks;
  }

  private isImageDuplicate(imageUrl: string, fileSize: number, mimeType: string, existingImages: VocabImage[]): boolean {
    return existingImages.some(existing => 
      // URL-based comparison (for remote images)
      (imageUrl && existing.url && imageUrl === existing.url) ||
      // Size + mimeType comparison (for all images)
      (existing.fileSize === fileSize && existing.mimeType === mimeType)
    );
  }

  private isSoundDuplicate(fileSize: number, mimeType: string, originalFileName: string | undefined, existingSounds: VocabSound[]): boolean {
    return existingSounds.some(existing => 
      // Size + mimeType + filename comparison (for all sounds)
      (existing.fileSize === fileSize && 
       existing.mimeType === mimeType && 
       existing.originalFileName === originalFileName)
    );
  }

  async isSetDownloaded(setName: string): Promise<boolean> {
    return await this.localSetRepo.isRemoteSetDownloaded(setName);
  }

  async getDownloadedSets(): Promise<LocalSetData[]> {
    return await this.localSetRepo.getAllLocalSets();
  }

  private async processVocabMedia(
    languageCode: string,
    setName: string,
    vocabData: z.infer<typeof vocabSchema>[],
    vocabMap: Map<string, string>,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const BATCH_SIZE = 10; // Download 10 files at a time
    const downloads: Array<() => Promise<void>> = [];

    // Collect all download tasks
    for (const vocab of vocabData) {
      if (!vocab.id) continue;
      const localVocabId = vocabMap.get(vocab.id);
      if (!localVocabId) continue;

      // Queue image downloads
      if (vocab.images && vocab.images.length > 0) {
        for (const imageData of vocab.images) {
          downloads.push(() =>
            this.downloadAndAddImage(languageCode, setName, localVocabId, imageData).catch(() => {})
          );
        }
      }

      // Queue sound downloads
      if (vocab.sounds && vocab.sounds.length > 0) {
        for (const soundData of vocab.sounds) {
          downloads.push(() =>
            this.downloadAndAddSound(languageCode, setName, localVocabId, soundData).catch(() => {})
          );
        }
      }
    }

    const total = downloads.length;
    let completed = 0;

    onProgress?.(0, total);

    // Process downloads in batches
    for (let i = 0; i < downloads.length; i += BATCH_SIZE) {
      const batch = downloads.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (download) => {
        await download();
        completed++;
        onProgress?.(completed, total);
      }));
    }
  }

  private async downloadAndAddImage(
    languageCode: string,
    setName: string,
    vocabId: string,
    imageData: { filename: string; alt?: string; tags?: string[] }
  ): Promise<void> {
    const imageUrl = `${this.baseUrl}/${languageCode}/${setName}/images/${imageData.filename}`;
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        
        return; // Skip this image and continue
      }

      // Check if this image already exists in the vocab
      const existingVocab = await this.vocabRepo.getVocabByUID(vocabId);
      if (existingVocab && existingVocab.images) {
        const blob = await response.blob();
        if (this.isImageDuplicate(imageUrl, blob.size, blob.type, existingVocab.images)) {
          
          return; // Skip duplicate image
        }
      }

      // Use addImageFromUrl instead of addImageFromFile to avoid compression issues
      await this.vocabRepo.addImageFromUrl(vocabId, imageUrl, imageData.alt);
    } catch {
      // Don't rethrow - continue processing other images
    }
  }

  private async downloadAndAddSound(
    languageCode: string,
    setName: string,
    vocabId: string,
    soundData: { filename: string }
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${languageCode}/${setName}/audio/${soundData.filename}`);
      if (!response.ok) {
        
        return; // Skip this sound and continue
      }

      const blob = await response.blob();

      // Check if this sound already exists in the vocab
      const existingVocab = await this.vocabRepo.getVocabByUID(vocabId);
      if (existingVocab && existingVocab.sounds) {
        if (this.isSoundDuplicate(blob.size, blob.type, soundData.filename, existingVocab.sounds)) {
          
          return; // Skip duplicate sound
        }
      }

      const file = new File([blob], soundData.filename, { type: blob.type });
      
      await this.vocabRepo.addSoundFromFile(vocabId, file);
    } catch {
      // Don't rethrow - continue processing other sounds
    }
  }

  private async processTranslationsInBatch(
    remoteTranslations: z.infer<typeof translationSchema>[],
    _localSetId: string,
    noteMap: Map<string, string>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    if (remoteTranslations.length === 0) {
      onProgress?.(0, 0);
      return new Map();
    }

    const BATCH_SIZE = 50;
    const total = remoteTranslations.length;
    let completed = 0;
    const remoteIdToLocalId = new Map<string, string>();

    onProgress?.(0, total);

    for (let i = 0; i < remoteTranslations.length; i += BATCH_SIZE) {
      const batch = remoteTranslations.slice(i, i + BATCH_SIZE);

      // Filter out translations without content
      const validTranslations = batch.filter(t => t.content);

      // Prepare translations for bulk insert
      const translationsToCreate: Omit<TranslationData, 'id' | 'origins'>[] = validTranslations.map(t => ({
        content: t.content,
        priority: t.priority || 1,
        notes: this.resolveReferences(t.notes || [], noteMap)
      }));

      // Bulk insert all translations in this batch
      const savedTranslations = await this.translationRepo.bulkCreateTranslations(translationsToCreate);

      // Map remote IDs to saved IDs
      for (let j = 0; j < validTranslations.length; j++) {
        if (validTranslations[j].id && savedTranslations[j]) {
          remoteIdToLocalId.set(validTranslations[j].id!, savedTranslations[j].id);
        }
      }

      // Update progress
      completed += batch.length;
      onProgress?.(completed, total);
    }

    return remoteIdToLocalId;
  }

}