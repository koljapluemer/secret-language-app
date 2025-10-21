/**
 * Represents the availability state of a task for a specific vocab item
 */
export type TaskState =
  | 'active'      // Task can be generated and shown to user
  | 'inactive'    // Task not appropriate for current level/conditions
  | 'disabled'    // Task disabled by user preferences
  | 'impossible'  // Missing required data to generate task

/**
 * Result of checking task state for a vocab item
 */
export interface TaskStateResult {
  state: TaskState;
  reason?: string; // Optional explanation for non-active states
}
