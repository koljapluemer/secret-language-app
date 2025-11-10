/**
 * Resource Merge Strategy
 *
 * Defines how to merge two resource items property-by-property.
 * TypeScript ensures ALL properties of ResourceData are handled.
 */

import type { ResourceData } from './ResourceData'
import type { MergeStrategyMap } from '@/features/merge/types'

/**
 * Complete merge strategy for ResourceData
 *
 * IMPORTANT: TypeScript will error if any property is missing!
 */
export const resourceMergeStrategy: MergeStrategyMap<ResourceData> = {
  // Core identity fields (should match - these are duplicate criteria)
  language: {
    strategy: 'keep-target',
    description: 'Language should match between duplicates'
  },

  // Content type
  isImmersionContent: {
    strategy: 'keep-target',
    description: 'Keep target classification'
  },

  // Content
  content: {
    strategy: 'prefer-target',
    description: 'Keep target content if set'
  },

  link: {
    strategy: 'prefer-target',
    description: 'Keep target link if set'
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

  finishedExtracting: {
    strategy: 'boolean-true-wins',
    description: 'If either finished extracting, mark as finished'
  },

  // Reference arrays
  vocab: {
    strategy: 'array-union',
    description: 'Merge all vocab from both sources'
  },

  factCards: {
    strategy: 'array-union',
    description: 'Merge all fact cards from both sources'
  },

  notes: {
    strategy: 'array-union',
    description: 'Merge all notes from both sources'
  },

  // Timestamps
  lastShownAt: {
    strategy: 'date-latest',
    description: 'Keep most recent shown date'
  },

  // Origin tracking
  origins: {
    strategy: 'array-union',
    description: 'Track all origins (sets) that contributed to this resource'
  },

  // Internal merge tracking
  _mergeChecked: {
    strategy: 'keep-target',
    description: 'Keep target merge status'
  }
}
