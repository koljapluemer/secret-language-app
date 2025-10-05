/**
 * Translation Merge Strategy
 *
 * Defines how to merge two translation items property-by-property.
 * TypeScript ensures ALL properties of TranslationData are handled.
 */

import type { TranslationData } from './TranslationData'
import type { MergeStrategyMap } from '@/features/merge/types'

/**
 * Complete merge strategy for TranslationData
 *
 * IMPORTANT: TypeScript will error if any property is missing!
 */
export const translationMergeStrategy: MergeStrategyMap<TranslationData> = {
  // Core identity field (should match - this is duplicate criterion)
  content: {
    strategy: 'keep-target',
    description: 'Content should match between duplicates'
  },

  // Metadata
  priority: {
    strategy: 'custom',
    customMerge: (target, source) => {
      // Add priorities when merging from different origins
      return (target ?? 1) + (source ?? 1)
    },
    description: 'Sum priorities (more origins = higher priority)'
  },

  // Reference arrays
  notes: {
    strategy: 'array-union',
    description: 'Merge all notes from both sources'
  },

  // Origin tracking
  origins: {
    strategy: 'array-union',
    description: 'Track all origins (sets) that contributed to this translation'
  },

  // Internal merge tracking
  _mergeChecked: {
    strategy: 'keep-target',
    description: 'Keep target merge status'
  }
}
