/**
 * Vocab Merge Strategy
 *
 * Defines how to merge two vocab items property-by-property.
 * TypeScript ensures ALL properties of VocabData are handled.
 */

import type { VocabData, VocabImage, VocabSound } from './VocabData'
import type { MergeStrategyMap } from '@/shared/merge/types'
import type { Link } from '@/shared/links/Link'

/**
 * Complete merge strategy for VocabData
 *
 * IMPORTANT: TypeScript will error if any property is missing!
 */
export const vocabMergeStrategy: MergeStrategyMap<VocabData> = {
  // Core identity fields (should match - these are duplicate criteria)
  language: {
    strategy: 'keep-target',
    description: 'Language should match between duplicates'
  },

  content: {
    strategy: 'keep-target',
    description: 'Content should match between duplicates'
  },

  // Type classification flags
  consideredCharacter: {
    strategy: 'prefer-target',
    description: 'Keep target classification if set'
  },

  consideredSentence: {
    strategy: 'prefer-target',
    description: 'Keep target classification if set'
  },

  consideredWord: {
    strategy: 'prefer-target',
    description: 'Keep target classification if set'
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

  // Reference arrays (merge all)
  notes: {
    strategy: 'array-union',
    description: 'Merge all notes from both sources'
  },

  translations: {
    strategy: 'array-union',
    description: 'Merge all translations from both sources'
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

  // Learning progress (keep target's progress)
  progress: {
    strategy: 'keep-target',
    description: 'Keep target progress (user has been studying this item)'
  },

  // Origin tracking
  origins: {
    strategy: 'array-union',
    description: 'Track all origins (sets) that contributed to this vocab'
  },

  // Vocab relationships
  relatedVocab: {
    strategy: 'array-union',
    description: 'Merge related vocab from both sources'
  },

  notRelatedVocab: {
    strategy: 'array-union',
    description: 'Merge not-related vocab from both sources'
  },

  similarSoundingButNotTheSame: {
    strategy: 'array-union',
    description: 'Merge minimal pairs from both sources'
  },

  notInterestedInPronunciationOrAlreadyAdded: {
    strategy: 'boolean-true-wins',
    description: 'If either marked as not interested, respect that'
  },

  // Media metadata
  isPicturable: {
    strategy: 'prefer-target',
    description: 'Keep target value (user may have manually set this)'
  },

  images: {
    strategy: 'custom',
    customMerge: (target: VocabImage[] | undefined, source: VocabImage[] | undefined) => {
      const targetImages = target ?? []
      const sourceImages = source ?? []

      // Deduplicate images by fileSize + mimeType + url
      const seen = new Set<string>()
      const merged: VocabImage[] = []

      for (const img of [...targetImages, ...sourceImages]) {
        const key = `${img.fileSize}-${img.mimeType}-${img.url || ''}`
        if (!seen.has(key)) {
          seen.add(key)
          merged.push(img)
        }
      }

      return merged
    },
    description: 'Merge images, deduplicate by size+type+url'
  },

  hasImage: {
    strategy: 'boolean-true-wins',
    description: 'True if either has images'
  },

  sounds: {
    strategy: 'custom',
    customMerge: (target: VocabSound[] | undefined, source: VocabSound[] | undefined) => {
      const targetSounds = target ?? []
      const sourceSounds = source ?? []

      // Deduplicate sounds by fileSize + mimeType + originalFileName
      const seen = new Set<string>()
      const merged: VocabSound[] = []

      for (const sound of [...targetSounds, ...sourceSounds]) {
        const key = `${sound.fileSize}-${sound.mimeType}-${sound.originalFileName || ''}`
        if (!seen.has(key)) {
          seen.add(key)
          merged.push(sound)
        }
      }

      return merged
    },
    description: 'Merge sounds, deduplicate by size+type+filename'
  },

  hasSound: {
    strategy: 'boolean-true-wins',
    description: 'True if either has sounds'
  },

  // Internal merge tracking (always keep target's state)
  _mergeChecked: {
    strategy: 'keep-target',
    description: 'Keep target merge status'
  }
}
