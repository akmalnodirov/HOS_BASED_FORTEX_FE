/**
 * Composable for managing Roles
 * Handles data fetching, pagination, sorting, and CRUD operations with permissions assignment
 * Fixed memory leaks: proper cleanup of watchers and async operations
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { roleService } from '../services/roleService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { getRoleTypes } from '../utils/roleHelpers'
import type {
  RoleResponse,
  SortKey,
  SortOrder,
  Role,
  RoleFormData,
  PermissionResponse,
} from '../types'

export function useRoles() {
  // State
  const roles = ref<RoleResponse[]>([])
  const permissions = ref<PermissionResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const isMounted = ref(true) // Track component mount state to prevent memory leaks

  // Auth store for getting clientId
  const authStore = useAuthStore()
  const { getUser: user } = storeToRefs(authStore)

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'name',
    defaultOrder: 'asc',
  })

  // Pagination setup
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, { itemsPerPage: 10 })

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    if (isMounted.value) {
      pagination.resetPage()
    }
  })

  /**
   * Get clientId from auth store (falls back to companyId if clientId is not available)
   * Uses carrier.provider.id from current-user API response
   */
  const getClientId = (): string | null => {
    return authStore.clientId || authStore.companyId || null
  }

  /**
   * Fetch roles from API
   * Fixed: Checks isMounted before updating state to prevent memory leaks
   * ClientId is always sent as query parameter if available (like RouteApp)
   */
  const fetchRoles = async () => {
    if (!isMounted.value) return

    isLoading.value = true
    error.value = null

    try {
      const clientId = getClientId()
      // Always include clientId in params if available (like RouteApp)
      const params: {
        pageNumber: number
        pageSize: number
        clientId?: string
      } = {
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
      }

      // Add clientId to query params if available (like RouteApp does)
      if (clientId) {
        params.clientId = clientId
      }

      const response = await roleService.getRoles(params)

      // Check if still mounted before updating state
      if (!isMounted.value) return

      if (response.successResult) {
        // API returns successResult as array directly
        if (Array.isArray(response.successResult)) {
          roles.value = response.successResult
          totalItems.value = response.successResult.length
        } else {
          // Handle paginated response structure
          roles.value = response.successResult.data || []
          totalItems.value = response.successResult.totalCount || 0
        }
      } else {
        roles.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      // Only update error if still mounted
      if (isMounted.value) {
        error.value = err.response?.data?.message || err.message || 'Failed to fetch roles'
        console.error('Error fetching roles:', err)
      }
    } finally {
      if (isMounted.value) {
        isLoading.value = false
      }
    }
  }

  /**
   * Fetch permissions for role assignment
   */
  const fetchPermissions = async () => {
    if (!isMounted.value) return

    try {
      const response = await roleService.getPermissions()

      if (!isMounted.value) return

      if (response.successResult) {
        permissions.value = response.successResult
      } else {
        permissions.value = []
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error fetching permissions:', err)
      }
    }
  }

  // Computed - Filtered roles
  const filteredRoles = computed(() => {
    let filtered = [...roles.value]

    // Search filter
    if (debouncedSearch.value) {
      const search = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.permissions?.some((p) => p.name.toLowerCase().includes(search))
      )
    }

    // Sort based on sortKey
    const currentSortKey = sorting.sortKey.value
    const currentSortOrder = sorting.sortOrder.value

    if (currentSortKey === 'no') {
      // 'no' is row number - asc keeps original order, desc reverses it
      if (currentSortOrder === 'desc') {
        filtered.reverse()
      }
    } else if (currentSortKey === 'name') {
      // Sort by name alphabetically (case-insensitive)
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        const comparison = aName.localeCompare(bName)
        return currentSortOrder === 'asc' ? comparison : -comparison
      })
    } else if (currentSortKey === 'permission') {
      // Sort by permission count
      filtered.sort((a, b) => {
        const aVal = a.permissions?.length || 0
        const bVal = b.permissions?.length || 0
        const comparison = aVal - bVal
        return currentSortOrder === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  })

  // Transform for table display
  const paginatedRoles = computed(() => {
    const filtered = filteredRoles.value
    const startIndex = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value
    const endIndex = startIndex + pagination.itemsPerPage.value
    const paginated = filtered.slice(startIndex, endIndex)

    return paginated.map((role, index) => ({
      id: role.id,
      no: startIndex + index + 1,
      name: role.name,
      permission: role.permissions?.length || 0,
      type: role.type,
      permissions: role.permissions,
    })) as Role[]
  })

  // Update total items based on filtered results
  const stopWatcher = watch(filteredRoles, (filtered) => {
    if (isMounted.value) {
      totalItems.value = filtered.length
    }
  })

  // Get role types for select dropdown
  const roleTypes = computed(() => {
    const userRoleType = user.value?.roles?.[0]?.type ?? 1
    return getRoleTypes(userRoleType)
  })

  // Methods
  const addRole = async (data: RoleFormData) => {
    if (!isMounted.value) return

    try {
      const clientId = getClientId()
      if (!clientId) {
        throw new Error('Client ID is required')
      }

      await roleService.createRole({
        name: data.name,
        type: parseInt(data.type, 10) || 5,
        clientId: clientId,
        permissionIds: Array.isArray(data.permissions) ? data.permissions : [],
      })

      if (isMounted.value) {
        await fetchRoles()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error adding role:', err)
        throw err
      }
    }
  }

  const updateRole = async (id: string | number, data: RoleFormData) => {
    if (!isMounted.value) return

    try {
      const clientId = getClientId()
      if (!clientId) {
        throw new Error('Client ID is required')
      }

      await roleService.updateRole(String(id), {
        name: data.name,
        type: parseInt(data.type, 10) || 5,
        clientId: clientId,
        permissionIds: Array.isArray(data.permissions) ? data.permissions : [],
      })

      if (isMounted.value) {
        await fetchRoles()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error updating role:', err)
        throw err
      }
    }
  }

  const deleteRole = async (id: string | number) => {
    if (!isMounted.value) return

    try {
      await roleService.deleteRole(String(id))

      if (isMounted.value) {
        await fetchRoles()
      }
    } catch (err: any) {
      if (isMounted.value) {
        console.error('Error deleting role:', err)
        throw err
      }
    }
  }

  // Auto-fetch on mount
  onMounted(async () => {
    isMounted.value = true
    await Promise.all([fetchRoles(), fetchPermissions()])
  })

  // Cleanup on unmount to prevent memory leaks
  onUnmounted(() => {
    isMounted.value = false
    stopWatcher() // Stop the watcher
  })

  return {
    // State
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,
    error,
    permissions: computed(() => permissions.value),
    roleTypes,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,

    // Computed
    paginatedRoles,

    // Methods
    handleSort: sorting.handleSort,
    addRole,
    updateRole,
    deleteRole,
    fetchRoles,
    fetchPermissions,
  }
}
