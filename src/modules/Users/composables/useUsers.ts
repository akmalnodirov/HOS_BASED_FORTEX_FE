import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useDebounce } from '@/composables/useDebounce'
import { usePagination } from '@/composables/usePagination'
import { useSorting } from '@/composables/useSorting'
import { commonTransformers, sortArray } from '@/utils/sort'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import type {
  DispatcherCompany,
  User,
  UserFilter,
  UserFormData,
  UserRequest,
  Role,
  RouteEldDispatcherApiResponse,
  SortKey,
} from '@/modules/Users/types'

interface ApiEnvelope<T> {
  successResult: T
}

function unwrap<T>(value: T | ApiEnvelope<T>): T {
  return value && typeof value === 'object' && 'successResult' in value
    ? value.successResult
    : value
}

function errorMessage(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: string } | string }; message?: string }
  const data = value.response?.data
  return typeof data === 'string' ? data : data?.message ?? value.message ?? fallback
}

export function usePortalUsers() {
  const api = useApi()
  const authStore = useAuthStore()
  const portalUsers = ref<User[]>([])
  const roles = ref<Role[]>([])
  const companies = ref<DispatcherCompany[]>([])
  const isLoading = ref(false)
  const isLoadingRoles = ref(false)
  const searchQuery = ref('')
  const statusFilter = ref<UserFilter>('all')
  const debouncedSearch = useDebounce(searchQuery, 250)
  const sorting = useSorting<SortKey>({ defaultKey: 'name', defaultOrder: 'asc' })

  const filteredUsers = computed(() => {
    const term = debouncedSearch.value.trim().toLowerCase()
    const rows = portalUsers.value.filter((user) => {
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term) ||
        user.companyNames.toLowerCase().includes(term)
      const matchesStatus =
        statusFilter.value === 'all' || user.status === (statusFilter.value === 'active')
      return matchesSearch && matchesStatus
    })
    sortArray(rows, sorting.sortKey.value, sorting.sortOrder.value, {
      no: commonTransformers.toNumber,
      status: commonTransformers.toBoolean,
    })
    return rows
  })

  const totalCount = computed(() => filteredUsers.value.length)
  const pagination = usePagination(totalCount, { itemsPerPage: 10 })
  const paginatedUsers = computed(() => {
    const start = (pagination.currentPage.value - 1) * pagination.itemsPerPage.value
    return filteredUsers.value.slice(start, start + pagination.itemsPerPage.value).map((user, index) => ({
      ...user,
      no: start + index + 1,
    }))
  })

  async function fetchUsers() {
    isLoading.value = true
    try {
      const response = await api.get<
        RouteEldDispatcherApiResponse[] | ApiEnvelope<RouteEldDispatcherApiResponse[]>
      >(ApiEndpoints.ROUTE_ELD_DISPATCHERS)
      portalUsers.value = unwrap(response.data).map((user, index) => ({
        id: user.id,
        no: index + 1,
        name: user.fullName,
        email: user.email,
        role: user.role.name,
        roleId: user.role.id,
        companies: user.companies,
        companyNames: user.companies.map((company) => company.name).join(', '),
        status: user.isActive,
      }))
    } catch (error) {
      portalUsers.value = []
      toast.error(errorMessage(error, 'Failed to load users'))
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOptions() {
    isLoadingRoles.value = true
    try {
      const clientId = authStore.clientId
      if (!clientId) throw new Error('Client ID is unavailable for role management.')

      const [rolesResponse, companiesResponse] = await Promise.all([
        api.get<Role[] | ApiEnvelope<Role[]>>(ApiEndpoints.ROLES_URL, {
          params: { clientId },
        }),
        api.get<DispatcherCompany[] | ApiEnvelope<DispatcherCompany[]>>(
          ApiEndpoints.ROUTE_ELD_DISPATCHER_COMPANIES
        ),
      ])
      roles.value = unwrap(rolesResponse.data).filter((role) =>
        role.permissions.some((permission) => permission.code.startsWith('route_eld.'))
      )
      companies.value = unwrap(companiesResponse.data)
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to load roles and companies'))
    } finally {
      isLoadingRoles.value = false
    }
  }

  function payload(data: UserFormData, isActive?: boolean): UserRequest {
    return {
      fullName: data.name.trim(),
      email: data.email.trim(),
      password: data.password || null,
      companyIds: data.companyIds,
      roleId: data.roleId,
      ...(isActive === undefined ? {} : { isActive }),
    }
  }

  async function addUser(data: UserFormData) {
    await api.post(ApiEndpoints.ROUTE_ELD_DISPATCHERS, payload(data))
    toast.success('User added')
    await fetchUsers()
  }

  async function updateUser(id: string, data: UserFormData, isActive: boolean) {
    await api.put(ApiEndpoints.ROUTE_ELD_DISPATCHER(id), payload(data, isActive))
    toast.success('User updated')
    await fetchUsers()
  }

  const isStatusModalOpen = ref(false)
  const statusModalUser = ref<User | null>(null)
  const isStatusChanging = ref(false)

  function openStatusModal(user: User) {
    statusModalUser.value = user
    isStatusModalOpen.value = true
  }

  function closeStatusModal() {
    isStatusModalOpen.value = false
    statusModalUser.value = null
  }

  async function submitToggleStatus() {
    const user = statusModalUser.value
    if (!user) return
    isStatusChanging.value = true
    try {
      const data: UserFormData = {
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        roleId: user.roleId,
        companyIds: user.companies.map((company) => company.id),
      }
      await api.put(ApiEndpoints.ROUTE_ELD_DISPATCHER(user.id), payload(data, !user.status))
      toast.success(`User ${user.status ? 'deactivated' : 'activated'}`)
      await fetchUsers()
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to update user'))
    } finally {
      isStatusChanging.value = false
      closeStatusModal()
    }
  }

  async function removeUser(user: User) {
    await api.delete(ApiEndpoints.ROUTE_ELD_DISPATCHER(user.id))
    toast.success('User removed')
    await fetchUsers()
  }

  watch([debouncedSearch, statusFilter], () => pagination.resetPage())
  onMounted(() => Promise.allSettled([fetchUsers(), fetchOptions()]))

  return {
    searchQuery,
    statusFilter,
    itemsPerPage: pagination.itemsPerPage,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    sortKey: sorting.sortKey,
    sortOrder: sorting.sortOrder,
    handleSort: sorting.handleSort,
    paginatedUsers,
    roles,
    companies,
    isLoading,
    isLoadingRoles,
    isStatusModalOpen,
    statusModalUser,
    isStatusChanging,
    openStatusModal,
    closeStatusModal,
    submitToggleStatus,
    addUser,
    updateUser,
    removeUser,
  }
}
