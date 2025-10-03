/**
 * Resource Duplicate Detection
 *
 * Business logic for determining if two resource items are duplicates.
 */

import type { ResourceData } from './ResourceData'
import type { ResourceRepoContract } from './ResourceRepoContract'

/**
 * Find an existing resource that is a duplicate of the given resource
 *
 * Duplicate criteria:
 * - Same title + same language
 *
 * @param resource - The resource to check for duplicates
 * @param resourceRepo - Repository for querying existing resources
 * @returns The duplicate resource if found, null otherwise
 */
export async function findDuplicateResource(
  resource: ResourceData,
  resourceRepo: ResourceRepoContract
): Promise<ResourceData | null> {
  // Match by title + language
  const existing = await resourceRepo.getResourceByTitleAndLanguage(
    resource.title,
    resource.language
  )

  // Make sure we don't match against ourselves
  if (existing && existing.id !== resource.id) {
    return existing
  }

  // No duplicate found
  return null
}
