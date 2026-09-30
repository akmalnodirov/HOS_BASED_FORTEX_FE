// src/composables/useAlerts.ts
import { ref, computed } from 'vue'
import { Alert, SortKey } from '@/modules/Alerts/types'
import { useDebounce } from '@/composables/useDebounce.ts'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'

export function useAlerts() {
  // State
  const alerts = ref<Alert[]>([
    {
      id: 1,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Sleep',
    },
    {
      id: 2,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Driving',
    },
    {
      id: 3,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Off duty (OFF)',
    },
    {
      id: 4,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Off duty (PC)',
    },
    {
      id: 5,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'On duty',
    },
    {
      id: 6,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Off duty (YM)',
    },
    {
      id: 7,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Driving',
    },
    {
      id: 8,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Driving',
    },
    {
      id: 9,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Driving',
    },
    {
      id: 10,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Driving',
    },
    {
      id: 11,
      driverName: 'Jenny Wilson',
      unit: '094421',
      odometer: '297735 mi',
      updatedTime: 'Jan 07, 10:09 PM',
      event: 'Driving',
    },
  ])

  const searchQuery = ref('')
  
  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'id',
    defaultOrder: 'asc',
  })

  // Setup pagination
  const pagination = usePagination(computed(() => filteredAlerts.value.length), { itemsPerPage: 10 })

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    pagination.resetPage()
  })

  // Computed
  const filteredAlerts = computed(() => {
    let filtered = alerts.value

    // Search filter
    if (debouncedSearch.value) {
      const search = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (alert) =>
          alert.driverName.toLowerCase().includes(search) ||
          alert.unit.toLowerCase().includes(search) ||
          alert.odometer.toLowerCase().includes(search) ||
          alert.event.toLowerCase().includes(search)
      )
    }

    // Sort using generic utility
    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      id: commonTransformers.toNumber,
    })

    return filtered
  })

  const paginatedAlerts = computed(() => pagination.paginateData(filteredAlerts.value))

  // Methods - handleSort is provided by useSorting composable

  return {
    // State
    alerts,
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,

    // Pagination (from usePagination)
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Computed
    filteredAlerts,
    paginatedAlerts,

    // Methods
    handleSort: sorting.handleSort,
  }
}
