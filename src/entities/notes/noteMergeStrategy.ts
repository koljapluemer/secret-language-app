/**
 * Note Merge Strategy
 *
 * Notes do NOT deduplicate - identical content can exist multiple times.
 * This file exists for completeness but notes won't be merged.
 */

import type { NoteData } from './NoteData'
import type { MergeStrategyMap } from '@/shared/merge/types'

/**
 * Complete merge strategy for NoteData
 *
 * NOTE: This strategy is defined for type safety, but notes never merge.
 * Each note is unique even if content is identical.
 */
export const noteMergeStrategy: MergeStrategyMap<NoteData> = {
  content: {
    strategy: 'keep-target',
    description: 'Notes do not merge - each is unique'
  },

  showBeforeExercise: {
    strategy: 'keep-target',
    description: 'Notes do not merge - each is unique'
  },

  noteType: {
    strategy: 'keep-target',
    description: 'Notes do not merge - each is unique'
  },

  // Internal merge tracking
  _mergeChecked: {
    strategy: 'keep-target',
    description: 'Mark as checked (but never actually merged)'
  }
}

/**
 * Notes do not have duplicate detection
 *
 * Always returns null because notes with identical content
 * are intentionally kept separate.
 */
export async function findDuplicateNote(): Promise<null> {
  return null
}
