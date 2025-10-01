/**
 * Entity Merge Service
 *
 * Background service that processes the merge queue and deduplicates entities.
 * Runs continuously in the background, processing one chunk at a time.
 */

import { mergeEntities } from '@/shared/merge/mergeEntities'
import { toRaw } from 'vue'

// Entity repos
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract'
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract'
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract'
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract'
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract'

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
    private tickInterval: number = 2000 // Check every 2 seconds
  ) {}

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
      processed = await this.processResourceChunk()
      if (processed) return

      // Finally notes (lowest priority)
      await this.processNoteChunk()
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

    for (const vocab of unchecked) {
      const duplicate = await findDuplicateVocab(vocab, this.vocabRepo)

      if (duplicate && duplicate.uid !== vocab.uid) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, vocab, vocabMergeStrategy)
        toUpdate.push(merged)
        toDelete.push(vocab.uid)
        console.log(`[Merge] Merging vocab "${vocab.content}" (${vocab.uid} → ${duplicate.uid})`)
      } else {
        // No duplicate - just mark as checked
        toUpdate.push({
          ...vocab,
          _mergeChecked: true
        })
      }
    }

    // Bulk update
    if (toUpdate.length > 0) {
      await this.vocabRepo.bulkProcessVocab(toUpdate, [])
    }

    // Bulk delete duplicates
    for (const uid of toDelete) {
      await this.vocabRepo.deleteVocab(uid)
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

    for (const translation of unchecked) {
      const duplicate = await findDuplicateTranslation(translation, this.translationRepo)

      if (duplicate && duplicate.uid !== translation.uid) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, translation, translationMergeStrategy)
        toUpdate.push(merged)
        toDelete.push(translation.uid)
      } else {
        // No duplicate - just mark as checked
        toUpdate.push({
          ...translation,
          _mergeChecked: true
        })
      }
    }

    // Bulk update
    if (toUpdate.length > 0) {
      await this.translationRepo.bulkProcessTranslations(toUpdate, [])
    }

    // Bulk delete duplicates
    for (const uid of toDelete) {
      await this.translationRepo.deleteTranslations([uid])
    }

    return true // Processed something
  }

  /**
   * Process notes (no deduplication, just mark as checked)
   * @returns true if processed something, false if no work
   */
  private async processNoteChunk(): Promise<boolean> {
    const CHUNK_SIZE = 50
    const unchecked = await this.noteRepo.getUncheckedNotes(CHUNK_SIZE)

    if (unchecked.length === 0) {
      return false
    }

    const uids = unchecked.map(n => n.uid)
    await this.noteRepo.bulkMarkNotesAsChecked(uids)

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

      if (duplicate && duplicate.uid !== factCard.uid) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, factCard, factCardMergeStrategy)
        toUpdate.push(toRaw(merged))
        toDelete.push(factCard.uid)
        console.log(`[Merge] Merging fact card "${factCard.front}" (${factCard.uid} → ${duplicate.uid})`)
      } else {
        // No duplicate - just mark as checked
        toUpdate.push(toRaw({
          ...factCard,
          _mergeChecked: true
        }))
      }
    }

    // Update
    for (const factCard of toUpdate) {
      await this.factCardRepo.updateFactCard(factCard)
    }

    // Delete duplicates
    for (const uid of toDelete) {
      await this.factCardRepo.deleteFactCard(uid)
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

      if (duplicate && duplicate.uid !== resource.uid) {
        // Found a duplicate - merge them
        const merged = mergeEntities(duplicate, resource, resourceMergeStrategy)
        toUpdate.push(toRaw(merged))
        toDelete.push(resource.uid)
      } else {
        // No duplicate - just mark as checked
        toUpdate.push(toRaw({
          ...resource,
          _mergeChecked: true
        }))
      }
    }

    // Update
    for (const resource of toUpdate) {
      await this.resourceRepo.updateResource(resource)
    }

    // Delete duplicates
    for (const uid of toDelete) {
      await this.resourceRepo.deleteResource(uid)
    }

    if (toDelete.length > 0) {
      console.log(`[Merge] Deleted ${toDelete.length} duplicate resources`)
    }

    return true // Processed something
  }
}
