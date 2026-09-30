// Composable for debounced search functionality
// Single Responsibility: Only handles debounced search logic

import { ref, watch } from 'vue'

export interface UseDebounceSearchOptions {
  delay?: number
  onDebounced?: (value: string) => void
}

export function useDebounceSearch(options: UseDebounceSearchOptions = {}) {
  const { delay = 300, onDebounced } = options

  const searchQuery = ref('')
  const debouncedSearchQuery = ref('')
  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  // Watch search query and debounce
  watch(searchQuery, (newValue) => {
    if (searchTimeout) clearTimeout(searchTimeout)

    searchTimeout = setTimeout(() => {
      debouncedSearchQuery.value = newValue
      onDebounced?.(newValue)
    }, delay)
  })

  // Cleanup on unmount
  const cleanup = () => {
    if (searchTimeout) clearTimeout(searchTimeout)
  }

  return {
    searchQuery,
    debouncedSearchQuery,
    cleanup,
  }
}
