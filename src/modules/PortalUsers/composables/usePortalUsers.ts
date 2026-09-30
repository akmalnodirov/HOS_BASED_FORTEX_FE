import { ref, computed, watch, onMounted } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'
import { useDebounce } from '@/composables/useDebounce'
import { sortArray, commonTransformers, type SortOrder } from '@/utils/sort'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { ApiEndpoints } from '@/api/endpoints'
import { getCarrierId } from '@/utils/carrier'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type {
  PortalUser,
  PortalUserFormData,
  PortalUserApiResponse,
  PortalUserRequest,
  Role,
  SortKey,
} from '@/modules/PortalUsers/types'
import type { PortalUserFilter } from '@/types/portalUsers'

interface PortalUsersListResponse {
  successResult: {
    data: PortalUserApiResponse[]
    totalCount: number
  }
}

interface RolesResponse {
  successResult: Role[] | { data: Role[]; totalCount: number }
}

export function usePortalUsers() {
  const api = useApi()
  const authStore = useAuthStore()

  // State
  const portalUsers = ref<PortalUser[]>([])
  const totalCount = ref(0)
  const isLoading = ref(false)
  const searchQuery = ref('')
  const statusFilter = ref<PortalUserFilter>('all')

  // Sorting using composable
  const sorting = useSorting<SortKey>({
    defaultKey: 'no',
    defaultOrder: 'asc',
  })

  // Roles
  const roles = ref<Role[]>([])
  const isLoadingRoles = ref(false)

  // Pagination setup - uses server totalCount
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300, () => {
    pagination.resetPage()
  })

  // Transform API response to UI shape
  const mapApiResponseToPortalUser = (user: PortalUserApiResponse, index: number): PortalUser => ({
    id: user.id,
    no: (pagination.currentPage.value - 1) * pagination.itemsPerPage.value + index + 1,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    email: user.email || 'N/A',
    role: user.role ? user.role.name : 'N/A',
    phoneNumber: user.phoneNumber || 'N/A',
    status: user.isActive ?? false,
    // Keep raw data for edit
    firstName: user.firstName,
    lastName: user.lastName,
    userName: user.userName,
    roleId: user.role?.id,
  })

  // Fetch users from API
  const fetchUsers = async () => {
    isLoading.value = true
    try {
      const params = {
        pageNumber: pagination.currentPage.value,
        pageSize: pagination.itemsPerPage.value,
        providerId: authStore.providerId,
        carrierId: getCarrierId(),
      }

      const response = await api.get<PortalUsersListResponse>(ApiEndpoints.PORTAL_USERS_FILTER, {
        params,
      })

      if (response.data?.successResult) {
        const apiUsers = response.data.successResult.data || []
        totalCount.value = response.data.successResult.totalCount || 0
        portalUsers.value = apiUsers.map((user, index) => mapApiResponseToPortalUser(user, index))
      } else {
        portalUsers.value = []
        totalCount.value = 0
      }
    } catch (error: any) {
      console.error('Error fetching portal users:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Computed - Filtered users (client-side filtering on current page)
  const filteredUsers = computed(() => {
    let filtered = portalUsers.value

    // Search filter
    if (debouncedSearch.value) {
      const search = debouncedSearch.value.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.phoneNumber.toLowerCase().includes(search) ||
          user.role.toLowerCase().includes(search)
      )
    }

    // Status filter
    if (statusFilter.value !== 'all') {
      const isActive = statusFilter.value === 'active'
      filtered = filtered.filter((user) => user.status === isActive)
    }

    // Sort using generic utility
    sortArray(filtered, sorting.sortKey.value, sorting.sortOrder.value, {
      no: commonTransformers.toNumber,
      status: commonTransformers.toBoolean,
    })

    return filtered
  })

  // Since we use server-side pagination, paginatedUsers = filteredUsers (already paginated by server)
  const paginatedUsers = computed(() => filteredUsers.value)

  // Fetch roles — pass providerId to get roles scoped to this provider (same as useUsers.ts)
  const fetchRoles = async () => {
    isLoadingRoles.value = true
    try {
      const response = await api.get<RolesResponse>(ApiEndpoints.ROLES_URL, {
        params: { providerId: authStore.providerId },
      })
      if (response.data?.successResult) {
        const result = response.data.successResult
        const allRoles: Role[] = Array.isArray(result) ? result : ((result as any).data ?? [])
        // Portal roles have type === 6; fall back to all roles if none match
        const portalRoles = allRoles.filter((r) => r.type === 6)
        roles.value = portalRoles.length > 0 ? portalRoles : allRoles
      }
    } catch (error: any) {
      console.error('Error fetching roles:', error)
      toast.error('Failed to load roles')
    } finally {
      isLoadingRoles.value = false
    }
  }

  // Status modal state
  const isStatusModalOpen = ref(false)
  const statusModalUser = ref<PortalUser | null>(null)
  const isStatusChanging = ref(false)

  const openStatusModal = (user: PortalUser) => {
    statusModalUser.value = user
    isStatusModalOpen.value = true
  }

  const closeStatusModal = () => {
    isStatusModalOpen.value = false
    statusModalUser.value = null
  }

  // Toggle user status
  const submitToggleStatus = async () => {
    const user = statusModalUser.value
    if (!user) return
    isStatusChanging.value = true
    try {
      const newState = user.status ? 1 : 0
      await api.put(ApiEndpoints.PORTAL_USERS_STATE(user.id), { state: newState })
      toast.success('User status updated')
      await fetchUsers()
    } catch (error: any) {
      console.error('Error updating user status:', error)
    } finally {
      isStatusChanging.value = false
      closeStatusModal()
    }
  }

  // Add user
  const addUser = async (userData: PortalUserFormData) => {
    try {
      // Split name into firstName and lastName
      const nameParts = userData.name.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // Find roleId from role name
      const selectedRole = roles.value.find((r) => r.name === userData.role)

      const request: PortalUserRequest = {
        firstName,
        lastName,
        userName: userData.email, // Use email as username
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        password: userData.password,
        passwordConfirm: userData.confirmPassword,
        providerId: authStore.providerId,
        carrierId: getCarrierId(),
        roleId: selectedRole?.id || null,
      }

      await api.post(ApiEndpoints.PORTAL_USERS, request)
      toast.success('User added successfully')
      await fetchUsers()
    } catch (error: any) {
      console.error('Error adding user:', error)
      throw error
    }
  }

  // Update user
  const updateUser = async (id: string, userData: Partial<PortalUserFormData>) => {
    try {
      const nameParts = (userData.name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const selectedRole = roles.value.find((r) => r.name === userData.role)

      const request: PortalUserRequest = {
        firstName,
        lastName,
        userName: userData.email || null,
        email: userData.email || null,
        phoneNumber: userData.phoneNumber || null,
        password: userData.password || null,
        passwordConfirm: userData.confirmPassword || null,
        providerId: authStore.providerId,
        carrierId: getCarrierId(),
        roleId: selectedRole?.id || null,
      }

      await api.put(ApiEndpoints.PORTAL_USERS_BY_ID(id), request)
      toast.success('User updated successfully')
      await fetchUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  // Watch pagination changes to refetch
  watch([() => pagination.currentPage.value, () => pagination.itemsPerPage.value], async () => {
    await fetchUsers()
  })

  // Initial fetch
  onMounted(async () => {
    await Promise.allSettled([fetchUsers(), fetchRoles()])
  })

  return {
    // State
    portalUsers,
    searchQuery,
    debouncedSearch,
    statusFilter,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    roles,
    isLoadingRoles,
    isLoading,

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
    filteredUsers,
    paginatedUsers,

    // Methods
    handleSort: sorting.handleSort,
    openStatusModal,
    closeStatusModal,
    submitToggleStatus,
    addUser,
    updateUser,
    fetchRoles,
    fetchUsers,

    // Status modal state
    isStatusModalOpen,
    statusModalUser,
    isStatusChanging,
  }
}
