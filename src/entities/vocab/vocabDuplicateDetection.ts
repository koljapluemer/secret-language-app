/**
 * Vocab Duplicate Detection
 *
 * Business logic for determining if two vocab items are duplicates.
 */

import type { VocabData } from './VocabData'
import type { VocabRepoContract } from './VocabRepoContract'

/**
 * Find an existing vocab item that is a duplicate of the given vocab
 *
 * Duplicate criteria (in order of precedence):
 * 1. Same language + same content
 * 2. Same language + all translations match
 *
 * @param vocab - The vocab to check for duplicates
 * @param vocabRepo - Repository for querying existing vocab
 * @returns The duplicate vocab if found, null otherwise
 */
export async function findDuplicateVocab(
  vocab: VocabData,
  vocabRepo: VocabRepoContract
): Promise<VocabData | null> {
  // Strategy 1: Match by content + language (most common case)
  if (vocab.content && vocab.content.trim() !== '') {
    const existing = await vocabRepo.getVocabByLanguageAndContent(
      vocab.language,
      vocab.content
    )

    // Make sure we don't match against ourselves
    if (existing && existing.id !== vocab.id) {
      return existing
    }
  }

  // Strategy 2: Match by translation UIDs (for vocab without content)
  if (vocab.translations && vocab.translations.length > 0) {
    const existing = await vocabRepo.findVocabByTranslationUids(
      vocab.language,
      vocab.translations
    )

    // Make sure we don't match against ourselves
    if (existing && existing.id !== vocab.id) {
      return existing
    }
  }

  // No duplicate found
  return null
}
