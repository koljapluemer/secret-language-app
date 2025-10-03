/**
 * Translation Duplicate Detection
 *
 * Business logic for determining if two translation items are duplicates.
 */

import type { TranslationData } from './TranslationData'
import type { TranslationRepoContract } from './TranslationRepoContract'

/**
 * Find an existing translation item that is a duplicate of the given translation
 *
 * Duplicate criteria:
 * - Same content (exact match)
 *
 * @param translation - The translation to check for duplicates
 * @param translationRepo - Repository for querying existing translations
 * @returns The duplicate translation if found, null otherwise
 */
export async function findDuplicateTranslation(
  translation: TranslationData,
  translationRepo: TranslationRepoContract
): Promise<TranslationData | null> {
  // Match by exact content
  if (translation.content && translation.content.trim() !== '') {
    const existing = await translationRepo.getTranslationByContent(translation.content)

    // Make sure we don't match against ourselves
    if (existing && existing.id !== translation.id) {
      return existing
    }
  }

  // No duplicate found
  return null
}
