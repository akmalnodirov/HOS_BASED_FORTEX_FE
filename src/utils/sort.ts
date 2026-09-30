/**
 * Generic sorting utility following SOLID principles
 * Single Responsibility: Handles only sorting logic
 * Open/Closed: Extensible through custom value transformers
 */

export type SortOrder = 'asc' | 'desc'

/**
 * Value transformer interface for custom sorting logic
 * Allows extending sort behavior without modifying core logic
 */
export interface ValueTransformer<T = any> {
  (value: T): any
}

/**
 * Configuration for field-specific transformers
 */
export type FieldTransformers<T> = {
  [K in keyof T]?: ValueTransformer
}

/**
 * Default transformers for common types
 */
const defaultTransformers: Record<string, ValueTransformer> = {
  number: (value: any) => Number(value),
  boolean: (value: any) => (value ? 1 : 0),
}

/**
 * Compares two values based on sort order
 * @param a First value
 * @param b Second value
 * @param order Sort order
 * @returns Comparison result
 */
function compareValues(a: any, b: any, order: SortOrder): number {
  if (a < b) return order === 'asc' ? -1 : 1
  if (a > b) return order === 'asc' ? 1 : -1
  return 0
}

/**
 * Transforms value using appropriate transformer
 * @param value Value to transform
 * @param transformer Custom transformer or transformer type
 * @returns Transformed value
 */
function transformValue(value: any, transformer?: ValueTransformer | string): any {
  if (!transformer) return value

  if (typeof transformer === 'function') {
    return transformer(value)
  }

  if (typeof transformer === 'string' && defaultTransformers[transformer]) {
    return defaultTransformers[transformer](value)
  }

  return value
}

/**
 * Creates a generic sort comparator function
 * @param sortKey Key to sort by
 * @param sortOrder Sort order (asc/desc)
 * @param fieldTransformers Optional transformers for specific fields
 * @returns Comparator function
 */
export function createSortComparator<T extends Record<string, any>>(
  sortKey: keyof T,
  sortOrder: SortOrder,
  fieldTransformers?: FieldTransformers<T>
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    let aVal: any = a[sortKey]
    let bVal: any = b[sortKey]

    // Apply field-specific transformer if exists
    const transformer = fieldTransformers?.[sortKey]
    if (transformer) {
      aVal = transformValue(aVal, transformer)
      bVal = transformValue(bVal, transformer)
    } else {
      // Auto-detect type and apply default transformer
      if (typeof aVal === 'boolean') {
        aVal = transformValue(aVal, 'boolean')
        bVal = transformValue(bVal, 'boolean')
      }
    }

    return compareValues(aVal, bVal, sortOrder)
  }
}

/**
 * Sorts array using the provided sort configuration
 * @param array Array to sort
 * @param sortKey Key to sort by
 * @param sortOrder Sort order
 * @param fieldTransformers Optional transformers for specific fields
 * @returns Sorted array (mutates original)
 */
export function sortArray<T extends Record<string, any>>(
  array: T[],
  sortKey: keyof T,
  sortOrder: SortOrder,
  fieldTransformers?: FieldTransformers<T>
): T[] {
  return array.sort(createSortComparator(sortKey, sortOrder, fieldTransformers))
}

/**
 * Common field transformers for convenience
 */
export const commonTransformers = {
  toNumber: (value: any) => Number(value),
  toBoolean: (value: any) => (value ? 1 : 0),
  toLowerCase: (value: any) => String(value).toLowerCase(),
  toDate: (value: any) => new Date(value).getTime(),
} as const
