/**
 * Gloss Duplicate Detection
 *
 * Business logic for determining if two gloss items are duplicates.
 */

import type { GlossData } from './GlossData';
import type { GlossRepoContract } from './GlossRepoContract';

/**
 * Find an existing gloss item that is a duplicate of the given gloss
 *
 * Duplicate criteria:
 * - Same description (exact match)
 *
 * @param gloss - The gloss to check for duplicates
 * @param glossRepo - Repository for querying existing glosses
 * @returns The duplicate gloss if found, null otherwise
 */
export async function findDuplicateGloss(
  gloss: GlossData,
  glossRepo: GlossRepoContract
): Promise<GlossData | null> {
  // Match by exact description
  if (gloss.description && gloss.description.trim() !== '') {
    const existing = await glossRepo.getGlossByDescription(gloss.description);

    // Make sure we don't match against ourselves
    if (existing && existing.id !== gloss.id) {
      return existing;
    }
  }

  // No duplicate found
  return null;
}
