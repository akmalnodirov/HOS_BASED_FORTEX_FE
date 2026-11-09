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
  const isMounted = ref(true)

  const authStore = useAuthStore()
  const { getUser: user } = storeToRefs(authStore)

  const sorting = useSorting<SortKey>({
    defaultKey: 'name',
    defaultOrder: 'asc',
  })

  const totalItems = ref(0)
  const pagination = usePagination(totalItems, { itemsPerPage: 10 })

  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    if (isMounted.value) {
      pagination.resetPage()
    }
  })

  const getClientId = (): string | null => {
    return authStore.clientId
  }

  const fetchRoles = async () => {
    if (!isMounted.value) return

    isLoading.value = true
    error.value = null

    try {
      const clientId = getClientId()
      const params: { clientId?: string } = {}

      if (clientId) {
        params.clientId = clientId
      }

      const response = await roleService.getRoles(params)

      if (!isMounted.value) return

      if (response.successResult) {
        if (Array.isArray(response.successResult)) {
          roles.value = response.successResult
          totalItems.value = response.successResult.length
        } else {
          roles.value = response.successResult.data || []
          totalItems.value = response.successResult.totalCount || 0
        }
      } else {
        roles.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
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

  const filteredRoles = computed(() => {
    let filtered = [...roles.value]

    if (debouncedSearch.value) {
      const search = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.permissions?.some((p) => p.name.toLowerCase().includes(search))
      )
    }

    const currentSortKey = sorting.sortKey.value
    const currentSortOrder = sorting.sortOrder.value

    if (currentSortKey === 'no') {
      if (currentSortOrder === 'desc') {
        filtered.reverse()
      }
    } else if (currentSortKey === 'name') {
      filtered.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        const comparison = aName.localeCompare(bName)
        return currentSortOrder === 'asc' ? comparison : -comparison
      })
    } else if (currentSortKey === 'permission') {
      filtered.sort((a, b) => {
        const aVal = a.permissions?.length || 0
        const bVal = b.permissions?.length || 0
        const comparison = aVal - bVal
        return currentSortOrder === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  })

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
      canManage: role.canManage,
    })) as Role[]
  })

  const stopWatcher = watch(filteredRoles, (filtered) => {
    if (isMounted.value) {
      totalItems.value = filtered.length
    }
  })

  const roleTypes = computed(() => {
    const userRoleType = Math.min(...(user.value?.roles?.map((role) => role.type) ?? [1]))
    return getRoleTypes(userRoleType)
  })

  const addRole = async (data: RoleFormData) => {
    if (!isMounted.value) return

    try {
      const clientId = getClientId()
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

  onMounted(async () => {
    isMounted.value = true
    await Promise.all([fetchRoles(), fetchPermissions()])
  })

  onUnmounted(() => {
    isMounted.value = false
    stopWatcher() 
  })

  return {
    searchQuery,
    debouncedSearch,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    isLoading,
    error,
    permissions: computed(() => permissions.value),
    roleTypes,

    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,

    paginatedRoles,

    handleSort: sorting.handleSort,
    addRole,
    updateRole,
    deleteRole,
    fetchRoles,
    fetchPermissions,
  }
}
