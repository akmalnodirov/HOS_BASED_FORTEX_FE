// Composable for sorting state management
// Single Responsibility: Only handles sorting state and toggle logic

import { ref } from 'vue'
import { type SortOrder } from '@/utils/sort'

export interface UseSortingOptions<T extends string> {
  defaultKey: T
  defaultOrder?: SortOrder
  onSort?: (key: T, order: SortOrder) => void
}

export function useSorting<T extends string>(options: UseSortingOptions<T>) {
  const { defaultKey, defaultOrder = 'asc', onSort } = options

  const sortKey = ref<T>(defaultKey)
  const sortOrder = ref<SortOrder>(defaultOrder)

  const handleSort = (key: T) => {
    if (sortKey.value === key) {
      // Toggle order if same key
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      // New key, reset to ascending
      sortKey.value = key
      sortOrder.value = 'asc'
    }

    // Notify parent if callback provided
    onSort?.(sortKey.value, sortOrder.value)
  }

  return {
    sortKey,
    sortOrder,
    handleSort,
  }
}
