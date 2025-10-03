/**
 * Merge Strategy Type System
 *
 * Defines type-safe merge strategies for entity properties.
 * Forces explicit handling of every entity property during merge operations.
 */

/**
 * Available merge strategies for entity properties
 */
export type MergeStrategy =
  | 'keep-target'           // Always keep target's value, discard source
  | 'keep-source'           // Always keep source's value, discard target
  | 'prefer-target'         // Keep target if defined, else use source
  | 'prefer-source'         // Keep source if defined, else use source
  | 'array-union'           // Merge arrays, remove duplicates
  | 'array-concat'          // Merge arrays, keep duplicates
  | 'numeric-add'           // Add numbers together
  | 'numeric-max'           // Take maximum value
  | 'numeric-min'           // Take minimum value
  | 'date-earliest'         // Take earliest date
  | 'date-latest'           // Take latest date
  | 'boolean-true-wins'     // true if either is true
  | 'boolean-false-wins'    // false if either is false
  | 'custom'                // Custom merge function

/**
 * Merge strategy definition for a single property
 */
export interface PropertyMergeStrategy<T = unknown> {
  strategy: MergeStrategy
  customMerge?: (target: T, source: T) => T
  description?: string
}

/**
 * Type-safe merge strategy map
 *
 * Ensures every property of T is handled with a merge strategy.
 * Excludes 'id' which should never be merged.
 */
export type MergeStrategyMap<T> = {
  [K in keyof Omit<T, "id">]-?: PropertyMergeStrategy<T[K]>
}
