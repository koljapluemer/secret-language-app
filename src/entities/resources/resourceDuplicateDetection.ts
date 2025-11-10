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
 * - Same link URL + same language (for link-based resources)
 * - Same content + same language (for content-based resources)
 *
 * @param resource - The resource to check for duplicates
 * @param resourceRepo - Repository for querying existing resources
 * @returns The duplicate resource if found, null otherwise
 */
export async function findDuplicateResource(
  resource: ResourceData,
  resourceRepo: ResourceRepoContract
): Promise<ResourceData | null> {
  // Get all resources for same language
  const allResources = await resourceRepo.getAllResources();
  const sameLanguage = allResources.filter(r => r.language === resource.language && r.id !== resource.id);

  // Match by link URL if both have links
  if (resource.link) {
    const existing = sameLanguage.find(r => r.link?.url === resource.link?.url);
    if (existing) return existing;
  }

  // Match by content if both have content (exact match)
  if (resource.content) {
    const existing = sameLanguage.find(r => r.content === resource.content);
    if (existing) return existing;
  }

  // No duplicate found
  return null
}
