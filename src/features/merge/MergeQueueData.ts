/**
 * Merge Queue Data Structure
 *
 * Represents work items for the background merge service.
 * Each item tracks merge processing for one entity type from one set.
 */

export type EntityType = 'vocab' | 'translations' | 'notes' | 'factCards' | 'resources'

export type MergeQueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface MergeQueueItem {
  id: string
  setId: string                    // The set UID (or "user-added")
  entityType: EntityType            // Which entity type to process
  status: MergeQueueStatus          // Current processing status
  createdAt: Date                   // When this work item was created
  updatedAt: Date                   // Last status update
  retryCount: number                // How many times this has been retried
  lastError?: string                // Error message from last failure
  priority?: number                 // Optional priority (lower = higher priority)
}
