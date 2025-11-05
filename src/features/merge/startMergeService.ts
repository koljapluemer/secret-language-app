/**
 * Start Merge Service
 *
 * Initializes and starts the background merge service.
 * Should be called once during app initialization.
 */

import { EntityMergeService } from './EntityMergeService'
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract'
import type { TranslationRepoContract } from '@/entities/translations/TranslationRepoContract'
import type { GlossRepoContract } from '@/entities/gloss/GlossRepoContract'
import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract'
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract'
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract'
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract'

let mergeServiceInstance: EntityMergeService | null = null

export function startMergeService(
  vocabRepo: VocabRepoContract,
  translationRepo: TranslationRepoContract,
  glossRepo: GlossRepoContract,
  noteRepo: NoteRepoContract,
  factCardRepo: FactCardRepoContract,
  resourceRepo: ResourceRepoContract,
  goalRepo: GoalRepoContract
): EntityMergeService {
  if (mergeServiceInstance) {
    console.warn('Merge service already started')
    return mergeServiceInstance
  }

  mergeServiceInstance = new EntityMergeService(
    vocabRepo,
    translationRepo,
    glossRepo,
    noteRepo,
    factCardRepo,
    resourceRepo,
    goalRepo
  )

  mergeServiceInstance.start()

  return mergeServiceInstance
}

export function getMergeService(): EntityMergeService | null {
  return mergeServiceInstance
}

export function stopMergeService(): void {
  if (mergeServiceInstance) {
    mergeServiceInstance.stop()
    mergeServiceInstance = null
  }
}
