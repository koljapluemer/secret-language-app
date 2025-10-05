/**
 * FactCard Merge Strategy
 *
 * Defines how to merge two fact card items property-by-property.
 * TypeScript ensures ALL properties of FactCardData are handled.
 */

import type { FactCardData } from './FactCardData'
import type { MergeStrategyMap } from '@/features/merge/types'
import type { Link } from '@/shared/links/Link'

/**
 * Complete merge strategy for FactCardData
 *
 * IMPORTANT: TypeScript will error if any property is missing!
 */
export const factCardMergeStrategy: MergeStrategyMap<FactCardData> = {
  // Core identity fields (should match - these are duplicate criteria)
  language: {
    strategy: 'keep-target',
    description: 'Language should match between duplicates'
  },

  front: {
    strategy: 'keep-target',
    description: 'Front content should match between duplicates'
  },

  back: {
    strategy: 'keep-target',
    description: 'Back content should match between duplicates'
  },

  // Reference arrays
  notes: {
    strategy: 'array-union',
    description: 'Merge all notes from both sources'
  },

  links: {
    strategy: 'custom',
    customMerge: (target: Link[], source: Link[]) => {
      // Deduplicate links by URL
      const seen = new Set<string>()
      const merged: Link[] = []

      for (const link of [...target, ...source]) {
        if (!seen.has(link.url)) {
          seen.add(link.url)
          merged.push(link)
        }
      }

      return merged
    },
    description: 'Merge links, deduplicate by URL'
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

  doNotPractice: {
    strategy: 'boolean-false-wins',
    description: 'If either says "do not practice", respect that'
  },

  // Learning progress
  progress: {
    strategy: 'keep-target',
    description: 'Keep target progress (user has been studying this item)'
  },

  // Origin tracking
  origins: {
    strategy: 'array-union',
    description: 'Track all origins (sets) that contributed to this fact card'
  },

  // Internal merge tracking
  _mergeChecked: {
    strategy: 'keep-target',
    description: 'Keep target merge status'
  }
}
