/**
 * Entity Merge Service
 *
 * Background service that processes the merge queue and deduplicates entities.
 * Runs continuously in the background, processing one chunk at a time.
 */

import { mergeEntities } from '@/features/merge/mergeEntities'
import { deduplicateNoteIds } from './deduplicateEntityNotes'
import { toRaw } from 'vue'

// Entity repos
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract'
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract'
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract'
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract'
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract'
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract'

// Entity data types
import type { VocabData } from '@/entities/vocab/VocabData'
import type { TranslationData } from '@/entities/translations/TranslationData'
import type { FactCardData } from '@/entities/fact-cards/FactCardData'
import type { ResourceData } from '@/entities/resources/ResourceData'

// Duplicate detection
import { findDuplicateVocab } from '@/entities/vocab/vocabDuplicateDetection'
import { findDuplicateTranslation } from '@/entities/translations/translationDuplicateDetection'
import { findDuplicateFactCard } from '@/entities/fact-cards/factCardDuplicateDetection'
import { findDuplicateResource } from '@/entities/resources/resourceDuplicateDetection'

// Merge strategies
import { vocabMergeStrategy } from '@/entities/vocab/vocabMergeStrategy'
import { translationMergeStrategy } from '@/entities/translations/translationMergeStrategy'
import { factCardMergeStrategy } from '@/entities/fact-cards/factCardMergeStrategy'
import { resourceMergeStrategy } from '@/entities/resources/resourceMergeStrategy'

export class EntityMergeService {
  private intervalId: number | null = null
  private isProcessing = false

  constructor(
    private vocabRepo: VocabRepoContract,
    private translationRepo: TranslationRepoContract,
    private noteRepo: NoteRepoContract,
    private factCardRepo: FactCardRepoContract,
    private resourceRepo: ResourceRepoContract,
    private goalRepo: GoalRepoContract,
    private tickInterval: number = 2000 // Check every 2 seconds
  ) {}

  /**
   * Remap translation references in vocab before deleting a translation
   * This prevents broken references when merging duplicate translations
   */
  private async remapTranslationReferences(
    oldTranslationId: string,
    newTranslationId: string
  ): Promise<void> {
    // Find all vocab that reference the old translation
    const affectedVocab = await this.vocabRepo.getVocabByTranslationId(oldTranslationId);

    if (affectedVocab.length === 0) {
      return;
    }

    // Update each vocab to point to the new translation
    for (const vocab of affectedVocab) {
      const updatedTranslations = vocab.translations.map(id =>
        id === oldTranslationId ? newTranslationId : id
      );

      // Remove duplicates
      const uniqueTranslations = [...new Set(updatedTranslations)];

      await this.vocabRepo.updateVocab({
        ...vocab,
        translations: uniqueTranslations
      });
    }
  }


  /**
   * Start the background merge service
   */
  start(): void {
    if (this.intervalId !== null) {
      console.warn('EntityMergeService already started')
      return
    }

    console.log('EntityMergeService started')
    this.intervalId = window.setInterval(() => {
      this.tick()
    }, this.tickInterval)
  }

  /**
   * Stop the background merge service
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('EntityMergeService stopped')
    }
  }

  /**
   * Process one tick - check for work and process a chunk
   */
  private async tick(): Promise<void> {
    if (this.isProcessing) {
      return // Skip this tick if still processing previous one
    }

    this.isProcessing = true

    try {
      // Try to process each entity type in priority order
      // Process vocab first (highest priority for learning)
      let processed = await this.processVocabChunk()
      if (processed) return

      // Then fact cards
      processed = await this.processFactCardChunk()
      if (processed) return

      // Then translations
      processed = await this.processTranslationChunk()
      if (processed) return

      // Then resources
      await this.processResourceChunk()
    } catch (error) {
      console.error('Error in EntityMergeService tick:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a chunk of vocab
   * @returns true if processed something, false if no work
   */
  private async processVocabChunk(): Promise<boolean> {
    const CHUNK_SIZE = 50
    const unchecked = await this.vocabRepo.getUncheckedVocab(CHUNK_SIZE)

    if (unchecked.length === 0) {
      return false // No more work
    }

    console.log(`[Merge] Processing ${unchecked.length} vocab items`)

    const toUpdate: VocabData[] = []
    const toDelete: string[] = []
    const vocabIdRemapping = new Map<string, string>() // Map of deleted ID -> surviving ID

    for (const vocab of unchecked) {
      const duplicate = await findDuplicateVocab(vocab, this.vocabRepo)

      if (duplicate && duplicate.id !== vocab.id) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, vocab, vocabMergeStrategy)

        // Deduplicate notes
        merged.notes = await deduplicateNoteIds(merged.notes, this.noteRepo)

        toUpdate.push(merged)
        toDelete.push(vocab.id)
        vocabIdRemapping.set(vocab.id, duplicate.id) // Track ID remapping
      } else {
        // No duplicate - just mark as checked and deduplicate notes
        const deduplicatedNotes = await deduplicateNoteIds(vocab.notes, this.noteRepo)

        toUpdate.push({
          ...vocab,
          notes: deduplicatedNotes,
          _mergeChecked: true
        })
      }
    }

    // Bulk update
    if (toUpdate.length > 0) {
      for (const vocab of toUpdate) {
        await this.vocabRepo.updateVocab(vocab)
      }
    }

    // Update goals that reference deleted vocab before deletion
    if (vocabIdRemapping.size > 0) {
      const allGoals = await this.goalRepo.getAll()
      for (const goal of allGoals) {
        let updated = false
        const newVocabIds = goal.vocab.map(vocabId => {
          if (vocabIdRemapping.has(vocabId)) {
            updated = true
            return vocabIdRemapping.get(vocabId)!
          }
          return vocabId
        })

        if (updated) {
          await this.goalRepo.update(goal.id, { vocab: newVocabIds })
        }
      }
    }

    // Bulk delete duplicates
    for (const id of toDelete) {
      await this.vocabRepo.deleteVocab(id)
    }

    if (toDelete.length > 0) {
      console.log(`[Merge] Deleted ${toDelete.length} duplicate vocab items`)
    }

    return true // Processed something
  }

  /**
   * Process a chunk of translations
   * @returns true if processed something, false if no work
   */
  private async processTranslationChunk(): Promise<boolean> {
    const CHUNK_SIZE = 50
    const unchecked = await this.translationRepo.getUncheckedTranslations(CHUNK_SIZE)

    if (unchecked.length === 0) {
      return false // No more work
    }

    const toUpdate: TranslationData[] = []
    const toDelete: string[] = []
    const remapOperations: Array<{ oldId: string; newId: string }> = []

    for (const translation of unchecked) {
      const duplicate = await findDuplicateTranslation(translation, this.translationRepo)

      if (duplicate && duplicate.id !== translation.id) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, translation, translationMergeStrategy)

        // Deduplicate notes
        merged.notes = await deduplicateNoteIds(merged.notes, this.noteRepo)

        toUpdate.push(merged)
        toDelete.push(translation.id)

        // Track that we need to remap vocab references
        remapOperations.push({
          oldId: translation.id,
          newId: duplicate.id
        })
      } else {
        // No duplicate - just mark as checked and deduplicate notes
        const deduplicatedNotes = await deduplicateNoteIds(translation.notes, this.noteRepo)

        toUpdate.push({
          ...translation,
          notes: deduplicatedNotes,
          _mergeChecked: true
        })
      }
    }

    // Bulk update
    if (toUpdate.length > 0) {
      for (const translation of toUpdate) {
        await this.translationRepo.updateTranslation(translation)
      }
    }

    // Remap translation references in vocab BEFORE deleting translations
    for (const { oldId, newId } of remapOperations) {
      await this.remapTranslationReferences(oldId, newId)
    }

    // Bulk delete duplicates (now safe because references are remapped)
    for (const id of toDelete) {
      await this.translationRepo.deleteTranslations([id])
    }

    return true // Processed something
  }


  /**
   * Process a chunk of fact cards
   * @returns true if processed something, false if no work
   */
  private async processFactCardChunk(): Promise<boolean> {
    const CHUNK_SIZE = 50
    const unchecked = await this.factCardRepo.getUncheckedFactCards(CHUNK_SIZE)

    if (unchecked.length === 0) {
      return false // No more work
    }

    console.log(`[Merge] Processing ${unchecked.length} fact cards`)

    const toUpdate: FactCardData[] = []
    const toDelete: string[] = []

    for (const factCard of unchecked) {
      const duplicate = await findDuplicateFactCard(factCard, this.factCardRepo)

      if (duplicate && duplicate.id !== factCard.id) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, factCard, factCardMergeStrategy)

        // Deduplicate notes
        merged.notes = await deduplicateNoteIds(merged.notes, this.noteRepo)

        toUpdate.push(toRaw(merged))
        toDelete.push(factCard.id)
      } else {
        // No duplicate - just mark as checked and deduplicate notes
        const deduplicatedNotes = await deduplicateNoteIds(factCard.notes, this.noteRepo)

        toUpdate.push(toRaw({
          ...factCard,
          notes: deduplicatedNotes,
          _mergeChecked: true
        }))
      }
    }

    // Update
    for (const factCard of toUpdate) {
      await this.factCardRepo.updateFactCard(factCard)
    }

    // Delete duplicates
    for (const id of toDelete) {
      await this.factCardRepo.deleteFactCard(id)
    }

    if (toDelete.length > 0) {
      console.log(`[Merge] Deleted ${toDelete.length} duplicate fact cards`)
    }

    return true // Processed something
  }

  /**
   * Process a chunk of resources
   * @returns true if processed something, false if no work
   */
  private async processResourceChunk(): Promise<boolean> {
    const CHUNK_SIZE = 50
    const unchecked = await this.resourceRepo.getUncheckedResources(CHUNK_SIZE)

    if (unchecked.length === 0) {
      return false // No more work
    }

    const toUpdate: ResourceData[] = []
    const toDelete: string[] = []

    for (const resource of unchecked) {
      const duplicate = await findDuplicateResource(resource, this.resourceRepo)

      if (duplicate && duplicate.id !== resource.id) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, resource, resourceMergeStrategy)

        // Deduplicate notes
        merged.notes = await deduplicateNoteIds(merged.notes, this.noteRepo)

        toUpdate.push(toRaw(merged))
        toDelete.push(resource.id)
      } else {
        // No duplicate - just mark as checked and deduplicate notes
        const deduplicatedNotes = await deduplicateNoteIds(resource.notes, this.noteRepo)

        toUpdate.push(toRaw({
          ...resource,
          notes: deduplicatedNotes,
          _mergeChecked: true
        }))
      }
    }

    // Update
    for (const resource of toUpdate) {
      await this.resourceRepo.updateResource(resource)
    }

    // Delete duplicates
    for (const id of toDelete) {
      await this.resourceRepo.deleteResource(id)
    }

    if (toDelete.length > 0) {
      console.log(`[Merge] Deleted ${toDelete.length} duplicate resources`)
    }

    return true // Processed something
  }
}
