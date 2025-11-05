/**
 * Gloss Merge Strategy
 *
 * Defines how to merge two gloss items property-by-property.
 * TypeScript ensures ALL properties of GlossData are handled.
 */

import type { GlossData } from './GlossData';
import type { MergeStrategyMap } from '@/features/merge/types';

/**
 * Complete merge strategy for GlossData
 *
 * IMPORTANT: TypeScript will error if any property is missing!
 */
export const glossMergeStrategy: MergeStrategyMap<GlossData> = {
  // Core identity field (should match - this is duplicate criterion)
  description: {
    strategy: 'keep-target',
    description: 'Description should match between duplicates'
  },

  // Multilingual descriptions array
  descriptions: {
    strategy: 'array-union',
    description: 'Merge all multilingual descriptions from both sources'
  },

  // Origin tracking
  origins: {
    strategy: 'array-union',
    description: 'Track all origins (sets) that contributed to this gloss'
  },

  // Internal merge tracking
  _mergeChecked: {
    strategy: 'keep-target',
    description: 'Keep target merge status'
  }
};
