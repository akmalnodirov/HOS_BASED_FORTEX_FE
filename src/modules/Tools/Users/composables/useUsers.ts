import { computed, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { useModalState } from '@/composables/useModalState'
import { toast } from 'vue-sonner'
import type {
  CreateUserRequest,
  Role,
  RolesResponse,
  UpdateUserRequest,
  User,
  UsersListResponse,
} from '../types'
import { type SortOrder as UtilSortOrder } from '@/utils/sort'

export type SortKey = 'id' | 'firstName' | 'userName' | 'isActive' | 'role'
export type SortOrder = UtilSortOrder

export function useUsers() {
  const api = useApi()
  const authStore = useAuthStore()

  const providerId = computed(() => authStore.providerId || '')

  // State
  const users = ref<User[]>([])
  const roles = ref<Role[]>([])
  const isLoading = ref(false)
  const isLoadingRoles = ref(false)
  const error = ref<string | null>(null)

  // Search
  const searchQuery = ref('')
  const debouncedSearchQuery = ref('')
  let searchTimeout: ReturnType<typeof setTimeout>

  // Filters
  const selectedDriver = ref<string>('all')
  const selectedStatus = ref<'all' | 'online' | 'offline'>('all')

  // Modal state
  const createModal = useModalState<User>()
  const editModal = useModalState<User>()

  // Status toggle modal state
  const isStatusModalOpen = ref(false)
  const statusModalUser = ref<User | null>(null)

  // Delete modal state
  const isDeleteModalOpen = ref(false)
  const deleteModalUser = ref<User | null>(null)

  // Sorting
  const sorting = useSorting<SortKey>({
    defaultKey: 'id',
    defaultOrder: 'asc',
  })

  // Debounce search
  watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      debouncedSearchQuery.value = searchQuery.value
    }, 300)
  })

  // Pagination
  const totalItems = ref(0)
  const pagination = usePagination(totalItems, {
    itemsPerPage: 10,
  })

  // Provider roles (type 3-5 only, matching old project)
  const providerRoles = computed(() => roles.value.filter((r) => r.type >= 3 && r.type <= 5))

  // Form validation
  const formErrors = ref<Record<string, string>>({})

  function validateForm(
    form: {
      firstName: string
      lastName: string
      userName: string
      password?: string
      passwordConfirm?: string
      roleId?: string
    },
    isEditMode: boolean
  ): boolean {
    formErrors.value = {}
    if (!form.firstName?.trim()) formErrors.value.firstName = 'First name is required'
    if (!form.lastName?.trim()) formErrors.value.lastName = 'Last name is required'
    if (!form.userName?.trim()) formErrors.value.userName = 'Username is required'
    if (!isEditMode) {
      if (!form.password) formErrors.value.password = 'Password is required'
      if (!form.passwordConfirm) formErrors.value.passwordConfirm = 'Confirm password is required'
      if (form.password && form.passwordConfirm && form.password !== form.passwordConfirm) {
        formErrors.value.passwordConfirm = 'Passwords do not match'
      }
    }
    return Object.keys(formErrors.value).length === 0
  }

  // Fetch users
  async function fetchUsers() {
    isLoading.value = true
    error.value = null

    try {
      const params: Record<string, any> = {
        PageNumber: pagination.currentPage.value,
        PageSize: pagination.itemsPerPage.value,
        ProviderId: providerId.value,
        Search: debouncedSearchQuery.value || undefined,
        OrderBy: sorting.sortKey.value,
        OrderType: sorting.sortOrder.value === 'asc' ? 0 : 1,
      }

      if (selectedStatus.value !== 'all') {
        params.IsActive = selectedStatus.value === 'online'
      }

      const response = await api.get<UsersListResponse>(ApiEndpoints.PROVIDER_USERS_FILTER, {
        params,
      })

      if (response.data?.successResult?.data) {
        users.value = response.data.successResult.data
        totalItems.value = response.data.successResult.totalCount || users.value.length
      } else {
        users.value = []
        totalItems.value = 0
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch users'
      console.error('Error fetching users:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Fetch roles
  async function fetchRoles() {
    isLoadingRoles.value = true

    try {
      const response = await api.get<RolesResponse>(ApiEndpoints.ROLES_URL, {
        params: { providerId: providerId.value },
      })

      if (response.data?.successResult) {
        roles.value = response.data.successResult
      }
    } catch (err: any) {
      console.error('Error fetching roles:', err)
    } finally {
      isLoadingRoles.value = false
    }
  }

  // Watchers — reset to page 1 when filters change
  watch([debouncedSearchQuery, selectedStatus, selectedDriver], async () => {
    if (pagination.currentPage.value !== 1) {
      pagination.goToPage(1)
    } else {
      await fetchUsers()
    }
  })

  // Watch sort changes
  watch([sorting.sortKey, sorting.sortOrder], async () => {
    if (pagination.currentPage.value !== 1) {
      pagination.goToPage(1)
    } else {
      await fetchUsers()
    }
  })

  // Pagination changes trigger fetch
  watch([() => pagination.currentPage.value, () => pagination.itemsPerPage.value], async () => {
    await fetchUsers()
  })

  // CRUD operations
  async function createUser(data: CreateUserRequest) {
    try {
      await api.post(ApiEndpoints.PROVIDER_USERS, data)
      toast.success('User created successfully')
      await fetchUsers()
      createModal.close()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create user')
      console.error('Error creating user:', err)
    }
  }

  async function updateUser(userId: string, data: UpdateUserRequest) {
    try {
      await api.put(ApiEndpoints.PROVIDER_USERS_BY_ID(userId), data)
      toast.success('User updated successfully')
      await fetchUsers()
      editModal.close()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user')
      console.error('Error updating user:', err)
    }
  }

  function openStatusModal(userId: string, currentStatus: boolean) {
    const user = users.value.find((u) => u.id === userId)
    if (user) {
      statusModalUser.value = user
      isStatusModalOpen.value = true
    }
  }

  function closeStatusModal() {
    isStatusModalOpen.value = false
    statusModalUser.value = null
  }

  async function submitToggleStatus() {
    const user = statusModalUser.value
    if (!user) return
    try {
      await api.put(ApiEndpoints.PROVIDER_USERS_STATE(user.id), {
        state: user.isActive ? 1 : 0,
      })
      toast.success(`User ${user.isActive ? 'disabled' : 'enabled'} successfully`)
      closeStatusModal()
      await fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user status')
      console.error('Error toggling user status:', err)
    }
  }

  function openDeleteModal(userId: string) {
    const user = users.value.find((u) => u.id === userId)
    if (user) {
      deleteModalUser.value = user
      isDeleteModalOpen.value = true
    }
  }

  function closeDeleteModal() {
    isDeleteModalOpen.value = false
    deleteModalUser.value = null
  }

  async function submitDeleteUser() {
    const user = deleteModalUser.value
    if (!user) return
    try {
      await api.delete(ApiEndpoints.PROVIDER_USERS_BY_ID(user.id))
      toast.success('User deleted successfully')
      closeDeleteModal()
      await fetchUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user')
      console.error('Error deleting user:', err)
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 'Online' : 'Offline'
  }

  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive
      ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
  }

  // Initial data loading
  onMounted(async () => {
    await Promise.allSettled([fetchRoles(), fetchUsers()])
  })

  return {
    // State
    users,
    roles,
    providerRoles,
    isLoading,
    isLoadingRoles,
    error,

    // Search
    searchQuery,
    debouncedSearchQuery,

    // Filters
    selectedDriver,
    selectedStatus,

    // Modal state
    isCreateModalOpen: createModal.isOpen,
    isEditModalOpen: editModal.isOpen,
    selectedUser: editModal.selectedItem,
    isStatusModalOpen,
    statusModalUser,
    isDeleteModalOpen,
    deleteModalUser,

    // Sorting
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    paginatedUsers: users,

    // Validation
    formErrors,
    validateForm,

    // Functions
    fetchUsers,
    fetchRoles,
    handleSort: sorting.handleSort,
    openCreateModal: createModal.open,
    closeCreateModal: createModal.close,
    openEditModal: editModal.open,
    closeEditModal: editModal.close,
    createUser,
    updateUser,
    openStatusModal,
    submitToggleStatus,
    closeStatusModal,
    openDeleteModal,
    submitDeleteUser,
    closeDeleteModal,
    getStatusBadge,
    getStatusBadgeClass,

    // Auth
    providerId,
  }
}
