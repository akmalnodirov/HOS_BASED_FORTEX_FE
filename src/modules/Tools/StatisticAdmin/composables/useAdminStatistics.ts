// src/composables/useStatistics.ts
import { ref, computed, onMounted } from 'vue'
import type {
  StatisticsAdmin,
  KpiData,
  TasksData,
  DonutData,
  TableRecord,
  StatisticsCard,
} from '@/types/statistics'
import { usePagination } from '@/composables/usePagination'

export type SortKey =
  | 'no'
  | 'company'
  | 'driver'
  | 'ufUsedTool'
  | 'mistakesBefore'
  | 'mistakesAfter'
  | 'violationBefore'
  | 'violationAfter'
export type SortOrder = 'asc' | 'desc'
export type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'yearly'

export function useStatistics() {
  // State
  const selectedAdmin = ref('all')
  const dateRange = ref('08.14.2024 - 09.14.2024')
  const activeTimeFilter = ref<TimeFilter>('daily')
  const isLoading = ref(false)

  // Admin data
  const admin = ref<StatisticsAdmin>({
    name: 'Temur Joraev',
    avatar: '/avatars/temur.jpg',
    percentage: '+12.%',
    startDate: '2024.09.12',
    endDate: '2024.09.12',
    editDate: 56,
    mistakeFixed: 80,
    violationFixed: -5,
  })

  // Stats cards
  const statsCards = ref<StatisticsCard[]>([
    { label: 'Quantity rate', value: '0.5/5' },
    { label: 'Quality rate', value: '5/5' },
    { label: 'Overall rate', value: '2.75' },
  ])

  // KPI Chart Data
  const kpiData = ref<KpiData>({
    categories: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    series: [
      {
        name: 'Admin 1',
        data: [60, 65, 80, 75, 85, 60, 50, 45, 55, 65, 50, 70],
      },
      {
        name: 'Admin 2',
        data: [55, 70, 75, 80, 80, 70, 55, 50, 60, 70, 60, 75],
      },
    ],
  })

  // Tasks Chart Data
  const tasksData = ref<TasksData>({
    categories: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    series: [
      {
        name: 'Admin 1',
        data: [70, 65, 75, 40, 65, 55, 60, 65, 55, 60, 55, 60],
      },
      {
        name: 'Admin 2',
        data: [30, 35, 25, 60, 35, 45, 40, 35, 45, 40, 45, 40],
      },
    ],
  })

  // Donut Chart Data
  const donutData = ref<DonutData>({
    labels: ['AI', 'Boost'],
    series: [150, 150],
  })

  // Tasks List (right side bar chart)
  const tasksList = ref([
    { name: '1. location', value: 40 },
    { name: '2. Speed', value: 40 },
    { name: '3. Intermediate', value: 40 },
    { name: '4. Odometer', value: 40 },
    { name: '5. Engine hours', value: 40 },
    { name: '6. Power up / shut down', value: 100 },
    { name: '7. Log in / Log out', value: 40 },
  ])

  // Table Data
  const tableRecords = ref<TableRecord[]>(
    Array.from({ length: 100 }, (_, i) => ({
      id: `record-${i + 1}`,
      no: i + 1,
      company: 'B1 Carriers INC',
      driver: 'Albert Flores',
      ufUsedTool: i % 3 === 0 ? 'Booster' : 'AI',
      mistakesBefore: 12,
      mistakesAfter: 4,
      violationBefore: 5,
      violationAfter: 0,
    }))
  )

  // Admin options
  const adminOptions = ref([
    { id: 'all', name: 'Select admin' },
    { id: '1', name: 'Temur Joraev' },
    { id: '2', name: 'John Doe' },
  ])

  // Sorting
  const sortKey = ref<SortKey>('no')
  const sortOrder = ref<SortOrder>('asc')

  // Setup pagination
  const pagination = usePagination(
    computed(() => tableRecords.value.length),
    {
      itemsPerPage: 10,
    }
  )

  // Sort utility
  const sortData = <T extends Record<string, any>>(
    data: T[],
    key: keyof T,
    order: 'asc' | 'desc'
  ): T[] => {
    return [...data].sort((a, b) => {
      let aVal = a[key]
      let bVal = b[key]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
  }

  // Filtered and sorted records
  const sortedRecords = computed(() => {
    return sortData(tableRecords.value, sortKey.value, sortOrder.value)
  })

  // Paginated records
  const paginatedRecords = computed(() => pagination.paginateData(sortedRecords.value))

  // Functions
  const handleSort = (key: SortKey) => {
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortOrder.value = 'asc'
    }
  }

  const setTimeFilter = (filter: TimeFilter) => {
    activeTimeFilter.value = filter
  }

  const fetchStatistics = async () => {
    isLoading.value = true
    // TODO: Implement API call
    setTimeout(() => {
      isLoading.value = false
    }, 1000)
  }

  onMounted(() => {
    fetchStatistics()
  })

  return {
    // State
    selectedAdmin,
    dateRange,
    activeTimeFilter,
    isLoading,
    admin,
    statsCards,
    kpiData,
    tasksData,
    donutData,
    tasksList,
    adminOptions,

    // Sorting
    sortKey,
    sortOrder,

    // Pagination
    currentPage: pagination.currentPage,
    itemsPerPage: pagination.itemsPerPage,
    totalPages: pagination.totalPages,
    totalEntries: pagination.totalEntries,
    pageNumbers: pagination.pageNumbers,
    goToPage: pagination.goToPage,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,

    // Computed
    paginatedRecords,

    // Functions
    handleSort,
    setTimeFilter,
    fetchStatistics,
  }
}
