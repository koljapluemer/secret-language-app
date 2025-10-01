/**
 * Merge Queue Repository
 *
 * Persists merge queue items in IndexedDB.
 * Provides operations for queue management.
 */

import Dexie, { type Table } from 'dexie'
import type { MergeQueueItem, EntityType } from './MergeQueueData'

class MergeQueueDatabase extends Dexie {
  queue!: Table<MergeQueueItem>

  constructor() {
    super('MergeQueueDatabase')
    this.version(1).stores({
      queue: 'id, setUid, entityType, status, createdAt, priority'
    })
  }
}

const mergeQueueDb = new MergeQueueDatabase()

export class MergeQueueRepo {
  /**
   * Add a new merge work item to the queue
   */
  async enqueue(setUid: string, entityType: EntityType, priority?: number): Promise<string> {
    const id = crypto.randomUUID()
    const now = new Date()

    const item: MergeQueueItem = {
      id,
      setUid,
      entityType,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      priority: priority ?? 10
    }

    await mergeQueueDb.queue.add(item)
    return id
  }

  /**
   * Get the next pending work item (highest priority, oldest first)
   */
  async getNextPending(): Promise<MergeQueueItem | null> {
    const items = await mergeQueueDb.queue
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
    const item = await mergeQueueDb.queue.get(id)
    if (!item) return

    item.status = 'processing'
    item.updatedAt = new Date()

    await mergeQueueDb.queue.put(item)
  }

  /**
   * Mark a work item as completed
   */
  async markComplete(id: string): Promise<void> {
    const item = await mergeQueueDb.queue.get(id)
    if (!item) return

    item.status = 'completed'
    item.updatedAt = new Date()

    await mergeQueueDb.queue.put(item)
  }

  /**
   * Mark a work item as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    const item = await mergeQueueDb.queue.get(id)
    if (!item) return

    item.status = 'failed'
    item.lastError = error
    item.retryCount += 1
    item.updatedAt = new Date()

    await mergeQueueDb.queue.put(item)
  }

  /**
   * Reset a failed item to pending for retry
   */
  async resetForRetry(id: string): Promise<void> {
    const item = await mergeQueueDb.queue.get(id)
    if (!item) return

    item.status = 'pending'
    item.updatedAt = new Date()

    await mergeQueueDb.queue.put(item)
  }

  /**
   * Get all queue items (for debugging/monitoring)
   */
  async getAll(): Promise<MergeQueueItem[]> {
    return await mergeQueueDb.queue.toArray()
  }

  /**
   * Get count of pending items
   */
  async getPendingCount(): Promise<number> {
    return await mergeQueueDb.queue.where('status').equals('pending').count()
  }

  /**
   * Clear all completed items (cleanup)
   */
  async clearCompleted(): Promise<void> {
    const completed = await mergeQueueDb.queue
      .where('status')
      .equals('completed')
      .toArray()

    const ids = completed.map(item => item.id)
    await mergeQueueDb.queue.bulkDelete(ids)
  }

  /**
   * Check if a specific set/entityType combination is already queued
   */
  async isQueued(setUid: string, entityType: EntityType): Promise<boolean> {
    const count = await mergeQueueDb.queue
      .where(['setUid', 'entityType'])
      .equals([setUid, entityType])
      .and(item => item.status === 'pending' || item.status === 'processing')
      .count()

    return count > 0
  }
}
