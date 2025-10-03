/**
 * Generic Entity Merge Algorithm
 *
 * Provides a type-safe way to merge two entities using a property-by-property
 * merge strategy map.
 */

import type { PropertyMergeStrategy, MergeStrategyMap } from './types'

/**
 * Execute a merge strategy for a single property
 */
export function executeMergeStrategy<T>(
  strategy: PropertyMergeStrategy<T>,
  targetValue: T,
  sourceValue: T
): T {
  switch (strategy.strategy) {
    case 'keep-target':
      return targetValue

    case 'keep-source':
      return sourceValue

    case 'prefer-target':
      return targetValue !== undefined && targetValue !== null ? targetValue : sourceValue

    case 'prefer-source':
      return sourceValue !== undefined && sourceValue !== null ? sourceValue : targetValue

    case 'array-union':
      if (!Array.isArray(targetValue) || !Array.isArray(sourceValue)) {
        throw new Error('array-union strategy requires array values')
      }
      return [...new Set([...targetValue, ...sourceValue])] as T

    case 'array-concat':
      if (!Array.isArray(targetValue) || !Array.isArray(sourceValue)) {
        throw new Error('array-concat strategy requires array values')
      }
      return [...targetValue, ...sourceValue] as T

    case 'numeric-add':
      if (typeof targetValue !== 'number' || typeof sourceValue !== 'number') {
        throw new Error('numeric-add strategy requires numeric values')
      }
      return (targetValue + sourceValue) as T

    case 'numeric-max':
      if (typeof targetValue !== 'number' || typeof sourceValue !== 'number') {
        throw new Error('numeric-max strategy requires numeric values')
      }
      return Math.max(targetValue, sourceValue) as T

    case 'numeric-min':
      if (typeof targetValue !== 'number' || typeof sourceValue !== 'number') {
        throw new Error('numeric-min strategy requires numeric values')
      }
      return Math.min(targetValue, sourceValue) as T

    case 'date-earliest':
      if (!(targetValue instanceof Date) || !(sourceValue instanceof Date)) {
        throw new Error('date-earliest strategy requires Date values')
      }
      return (targetValue < sourceValue ? targetValue : sourceValue) as T

    case 'date-latest':
      if (!(targetValue instanceof Date) || !(sourceValue instanceof Date)) {
        throw new Error('date-latest strategy requires Date values')
      }
      return (targetValue > sourceValue ? targetValue : sourceValue) as T

    case 'boolean-true-wins': {
      // Handle optional booleans - treat undefined as false
      return ((targetValue === true) || (sourceValue === true)) as T
    }

    case 'boolean-false-wins': {
      // Handle optional booleans - treat undefined as false
      return ((targetValue === true) && (sourceValue === true)) as T
    }

    case 'custom':
      if (!strategy.customMerge) {
        throw new Error('custom strategy requires customMerge function')
      }
      return strategy.customMerge(targetValue, sourceValue)

    default: {
      const exhaustive: never = strategy.strategy
      throw new Error(`Unknown merge strategy: ${exhaustive}`)
    }
  }
}

/**
 * Merge two entities using a strategy map
 *
 * @param target - The entity to merge into (will serve as base)
 * @param source - The entity to merge from
 * @param strategies - Merge strategy for each property
 * @returns The merged entity (new object)
 */
export function mergeEntities<T extends { id: string }>(
  target: T,
  source: T,
  strategies: MergeStrategyMap<T>
): T {
  const result = { ...target }

  // Process each property according to its strategy
  for (const key in strategies) {
    const strategy = strategies[key as keyof typeof strategies]
    const targetValue = target[key as keyof T]
    const sourceValue = source[key as keyof T]

    // @ts-expect-error - Complex type manipulation, but type-safe at runtime
    result[key] = executeMergeStrategy(strategy, targetValue, sourceValue)
  }

  return result
}
