/**
 * Composable for managing Permissions
 * Handles data fetching, pagination, sorting, and CRUD operations
 * Fixed memory leaks: proper cleanup of watchers and async operations
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { permissionService } from '../services/permissionService'
import type {
  PermissionResponse,
  SortKey,
  SortOrder,
  Permission,
  PermissionFormData,
} from '../types'

export function usePermissions() {
  // State
  const permissions = ref<PermissionResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const isMounted = ref(true) // Track component mount state to prevent memory leaks

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'name',
    defaultOrder: 'asc',
  })

  // Pagination setup (permissions don't use pagination in API, but we'll paginate locally)
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, { itemsPerPage: 10 })

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    if (isMounted.value) {
      pagination.resetPage()
    }
  })

  /**
   * Fetch permissions from API
   * Fixed: Checks isMounted before updating state to prevent memory leaks
   */
  const fetchPermissions = async () => {
    if (!isMounted.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await permissionService.getPermissions()

      // Check if still mounted before updating state
      if (!isMounted.value) return

      if (response.successResult) {
        // API returns successResult as array directly
        if (Array.isArray(response.successResult)) {
          permissions.value = response.successResult
          totalItems.value = response.successResult.length
        } else {
          // Handle paginated response structure
          permissions.value = response.successResult.data || []
          totalItems.value = response.successResult.totalCount || 0
        }
      } else {
        permissions.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      // Only update error if still mounted
      if (isMounted.value) {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch permissions'
        console.error('Error fetching permissions:', err)
      }
    } finally {
      if (isMounted.value) {
        isLoading.value = false
      }
    }
  }

  // Computed - Filtered permissions
  const filteredPermissions = computed(() => {
    let filtered = permissions.value

    // Search filter
    if (debouncedSearch.value) {
      const search = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(search) || p.code.toLowerCase().includes(search)
      )
    }

    // Sort using generic utility
    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value)

    return filtered
  })

  // Transform for table display
  const paginatedPermissions = computed(() => {
    const filtered = filteredPermissions.value
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value
    const endIndex = startIndex + pagination.itemsPerPage.value
    const paginated = filtered.slice(startIndex, endIndex)

    return paginated.map((permission, index) => ({
      id: permission.id,
      no: startIndex + index + 1,
      name: permission.name,
      code: permission.code,
    })) as Permission[]
  })

  // Update total items based on filtered results
  const stopWatcher = watch(filteredPermissions, (filtered) => {
    if (isMounted.value) {
      totalItems.value = filtered.length
    }
  })

  // Methods
  const addPermission = async (data: PermissionFormData) => {
    if (!isMounted.value) return

    try {
      await permissionService.createPermission({
        name: data.name,
        code: data.code || '',
        methodName: 'Test', // Default methodName as per RouteApp
      })

      if (isMounted.value) {
        await fetchPermissions()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error adding permission:', err)
        throw err
      }
    }
  }

  const updatePermission = async (id: string | number, data: PermissionFormData) => {
    if (!isMounted.value) return

    try {
      await permissionService.updatePermission(String(id), {
        name: data.name,
        code: data.code || '',
        methodName: 'Test', // Default methodName as per RouteApp
      })

      if (isMounted.value) {
        await fetchPermissions()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error updating permission:', err)
        throw err
      }
    }
  }

  const deletePermission = async (id: string | number) => {
    if (!isMounted.value) return

    try {
      await permissionService.deletePermission(String(id))

      if (isMounted.value) {
        await fetchPermissions()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error deleting permission:', err)
        throw err
      }
    }
  }

  // Watchers with proper cleanup
  const stopPaginationWatcher = watch(
    [() => pagination.currentPage.value, () => pagination.itemsPerPage.value],
    () => {
      // Permissions are fetched all at once, so we don't need to refetch on pagination change
      // This watcher is here for consistency but won't trigger API calls
    }
  )

  // Auto-fetch on mount
  onMounted(async () => {
    isMounted.value = true
    await fetchPermissions()
  })

  // Cleanup on unmount to prevent memory leaks
  onUnmounted(() => {
    isMounted.value = false
    stopWatcher() // Stop the watcher
    stopPaginationWatcher() // Stop pagination watcher
  })

  return {
    // State
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,
    error,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,

    // Computed
    paginatedPermissions,

    // Methods
    handleSort: sorting.handleSort,
    addPermission,
    updatePermission,
    deletePermission,
    fetchPermissions,
  }
}
