/**
 * FactCard Duplicate Detection
 *
 * Business logic for determining if two fact card items are duplicates.
 */

import type { FactCardData } from './FactCardData'
import type { FactCardRepoContract } from './FactCardRepoContract'

/**
 * Find an existing fact card that is a duplicate of the given fact card
 *
 * Duplicate criteria:
 * - Same front + same back + same language
 *
 * @param factCard - The fact card to check for duplicates
 * @param factCardRepo - Repository for querying existing fact cards
 * @returns The duplicate fact card if found, null otherwise
 */
export async function findDuplicateFactCard(
  factCard: FactCardData,
  factCardRepo: FactCardRepoContract
): Promise<FactCardData | null> {
  // Match by front + back + language
  const existing = await factCardRepo.getFactCardByFrontBackLanguage(
    factCard.front,
    factCard.back,
    factCard.language
  )

  // Make sure we don't match against ourselves
  if (existing && existing.id !== factCard.id) {
    return existing
  }

  // No duplicate found
  return null
}
