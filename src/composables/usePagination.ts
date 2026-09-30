/**
 * Reusable pagination composable following SOLID principles
 * Single Responsibility: Handles only pagination logic
 * Open/Closed: Extensible through configuration options
 */

import { computed, ref, type Ref, type ComputedRef } from 'vue'

export interface PaginationOptions {
  /**
   * Number of items per page
   * @default 10
   */
  itemsPerPage?: number

  /**
   * Initial page number
   * @default 1
   */
  initialPage?: number

  /**
   * Maximum number of visible page numbers
   * @default 5
   */
  maxVisible?: number
}

export interface PaginationResult {
  /**
   * Current page number (reactive)
   */
  currentPage: Ref<number>

  /**
   * Items per page (reactive)
   */
  itemsPerPage: Ref<number>

  /**
   * Total number of pages (computed)
   */
  totalPages: ComputedRef<number>

  /**
   * Total number of entries (computed)
   */
  totalEntries: ComputedRef<number>

  /**
   * Page numbers for pagination UI (computed)
   * Includes ellipsis ('...') for long ranges
   */
  pageNumbers: ComputedRef<(number | string)[]>

  /**
   * Navigate to specific page
   */
  goToPage: (page: number) => void

  /**
   * Navigate to next page
   */
  nextPage: () => void

  /**
   * Navigate to previous page
   */
  previousPage: () => void

  /**
   * Get paginated slice of data
   */
  paginateData: <T>(data: T[]) => T[]

  /**
   * Reset pagination to first page
   */
  resetPage: () => void
}

/**
 * Composable for handling pagination logic
 * @param totalItems - Total number of items (can be ref or computed)
 * @param options - Pagination configuration options
 * @returns Pagination utilities and reactive state
 */
export function usePagination(
  totalItems: Ref<number> | ComputedRef<number>,
  options: PaginationOptions = {}
): PaginationResult {
  const { itemsPerPage: itemsPerPageOption = 10, initialPage = 1, maxVisible = 5 } = options

  // Reactive state
  const currentPage = ref(initialPage)
  const itemsPerPage = ref(itemsPerPageOption)

  // Computed values
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const totalEntries = computed(() => totalItems.value)

  const pageNumbers = computed(() => {
    const pages: (number | string)[] = []

    if (totalPages.value <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages.value; i++) {
        pages.push(i)
      }
    } else {
      // Show first page
      pages.push(1)

      // Show ellipsis if needed
      if (currentPage.value > 3) {
        pages.push('...')
      }

      // Show pages around current page
      for (
        let i = Math.max(2, currentPage.value - 1);
        i <= Math.min(totalPages.value - 1, currentPage.value + 1);
        i++
      ) {
        pages.push(i)
      }

      // Show ellipsis if needed
      if (currentPage.value < totalPages.value - 2) {
        pages.push('...')
      }

      // Show last page
      pages.push(totalPages.value)
    }

    return pages
  })

  // Methods
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const nextPage = () => {
    goToPage(currentPage.value + 1)
  }

  const previousPage = () => {
    goToPage(currentPage.value - 1)
  }

  const paginateData = <T>(data: T[]): T[] => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return data.slice(start, end)
  }

  const resetPage = () => {
    currentPage.value = 1
  }

  return {
    // State
    currentPage,
    itemsPerPage,

    // Computed
    totalPages,
    totalEntries,
    pageNumbers,

    // Methods
    goToPage,
    nextPage,
    previousPage,
    paginateData,
    resetPage,
  }
}
