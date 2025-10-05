/**
 * Merge Queue Repository
 *
 * Persists merge queue items in IndexedDB.
 * Provides operations for queue management.
 */

import type { MergeQueueItem, EntityType } from './MergeQueueData'
import { db } from '@/shared/database/db'

export class MergeQueueRepo {
  /**
   * Add a new merge work item to the queue
   */
  async enqueue(setId: string, entityType: EntityType, priority?: number): Promise<string> {
    const now = new Date()

    const item: Omit<MergeQueueItem, 'id'> = {
      setId,
      entityType,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      priority: priority ?? 10
    }

    const id = await db.mergeQueue.add(item as MergeQueueItem)
    return id as string
  }

  /**
   * Get the next pending work item (highest priority, oldest first)
   */
  async getNextPending(): Promise<MergeQueueItem | null> {
    const items = await db.mergeQueue
      .where('status')
      .equals('pending')
      .sortBy('priority')

    if (items.length === 0) {
      return null
    }

    // Among same priority, take oldest first
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority ?? 10) - (b.priority ?? 10)
      }
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    return items[0]
  }

  /**
   * Mark a work item as processing
   */
  async markProcessing(id: string): Promise<void> {
    const item = await db.mergeQueue.get(id)
    if (!item) return

    item.status = 'processing'
    item.updatedAt = new Date()

    await db.mergeQueue.put(item)
  }

  /**
   * Mark a work item as completed
   */
  async markComplete(id: string): Promise<void> {
    const item = await db.mergeQueue.get(id)
    if (!item) return

    item.status = 'completed'
    item.updatedAt = new Date()

    await db.mergeQueue.put(item)
  }

  /**
   * Mark a work item as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    const item = await db.mergeQueue.get(id)
    if (!item) return

    item.status = 'failed'
    item.lastError = error
    item.retryCount += 1
    item.updatedAt = new Date()

    await db.mergeQueue.put(item)
  }

  /**
   * Reset a failed item to pending for retry
   */
  async resetForRetry(id: string): Promise<void> {
    const item = await db.mergeQueue.get(id)
    if (!item) return

    item.status = 'pending'
    item.updatedAt = new Date()

    await db.mergeQueue.put(item)
  }

  /**
   * Get all queue items (for debugging/monitoring)
   */
  async getAll(): Promise<MergeQueueItem[]> {
    return await db.mergeQueue.toArray()
  }

  /**
   * Get count of pending items
   */
  async getPendingCount(): Promise<number> {
    return await db.mergeQueue.where('status').equals('pending').count()
  }

  /**
   * Clear all completed items (cleanup)
   */
  async clearCompleted(): Promise<void> {
    const completed = await db.mergeQueue
      .where('status')
      .equals('completed')
      .toArray()

    const ids = completed.map(item => item.id)
    await db.mergeQueue.bulkDelete(ids)
  }

  /**
   * Check if a specific set/entityType combination is already queued
   */
  async isQueued(setId: string, entityType: EntityType): Promise<boolean> {
    const count = await db.mergeQueue
      .where(['setId', 'entityType'])
      .equals([setId, entityType])
      .and(item => item.status === 'pending' || item.status === 'processing')
      .count()

    return count > 0
  }
}
