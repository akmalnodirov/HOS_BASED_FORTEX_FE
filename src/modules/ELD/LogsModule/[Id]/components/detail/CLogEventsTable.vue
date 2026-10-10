<template>
  <div ref="tableContainer" class="max-h-[60vh] overflow-x-auto bg-white dark:bg-card">
    <CModalEditStatus
      v-model:open="showEditModal"
      :action="editAction"
      :event="currentEditingEvent"
      :header-date="headerDate"
      :edit-chart-data="editChartData"
      :daily-summary="dailySummary"
      :driver-vehicles="driverVehicles"
      :loading="editLoading"
      :chart-error="chartError"
      @submit="handleSaveEvent"
      @container:update="$emit('chart:container-update', $event)"
      @duty-event:update="$emit('chart:duty-event-update', $event)"
    />

    <div v-if="loading" class="flex items-center justify-center p-8">
      <div class="text-muted-foreground">Loading events...</div>
    </div>
    <div v-else-if="!events || events.length === 0" class="flex items-center justify-center p-8">
      <div class="text-muted-foreground">No events found</div>
    </div>
    <table v-else class="min-w-350! w-full text-sm text-left text-muted-foreground">
      <thead class="text-xs text-foreground uppercase bg-[#F0F0F0] dark:bg-muted/50">
        <tr>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold w-12"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground">No</button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[160px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Time (CDT)
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[100px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Event
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold min-w-[100px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground">
              Duration
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[220px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Location
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[120px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Odometer
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[150px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Engine Hours
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[150px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Record Origin
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[150px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Record Status
            </button>
          </th>
          <th
            class="px-4 py-3 text-sm text-[#666666] dark:text-muted-foreground font-semibold text-center min-w-[100px]"
          >
            <button class="flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
              Notes
            </button>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border [&>tr:first-child]:border-t-0">
        <tr
          v-for="(event, index) in sortedEvents"
          :key="event.id || event.eventId || index"
          :data-event-id="event.id || event.eventId"
          class="hover:bg-accent transition-colors cursor-pointer"
          :class="{
            'bg-primary/10': selectedEventId === event.id || selectedEventId === event.eventId,
            'bg-accent border-l-3 border-l-primary':
              event.id || event.eventId
                ? selectedRowsSet.has(String(event.id || event.eventId))
                : false,
          }"
          @click="selectRow(event)"
        >
          <td class="px-4 py-3 font-normal text-foreground">{{ index + 1 }}</td>
          <td class="px-4 py-3 text-center">{{ formatEventTime(event) }}</td>
          <td class="px-4 py-3 text-center">
            <span
              class="px-3 py-1 rounded text-[10px] font-bold text-center uppercase tracking-tight whitespace-nowrap"
              :class="getEventBadgeClass(event.eventType, event.eventCode)"
            >
              {{ getEventLabelFromUtils(event.eventType, event.eventCode) }}
            </span>
          </td>
          <td class="px-4 py-3 font-normal text-[#222222] dark:text-foreground">
            {{ formatDuration(event) }}
          </td>
          <td class="px-4 py-3 text-center">
            <div class="wrap-break-word whitespace-normal">
              {{ getLocation(event) }}
            </div>
          </td>
          <td class="px-4 py-3 text-center font-normal">
            {{ getOdometer(event) }}
          </td>
          <td class="px-4 py-3 text-center font-normal">
            {{ getEngineHours(event) }}
          </td>
          <td class="px-4 py-3 text-center">{{ getRecordOrigin(event) }}</td>
          <td class="px-4 py-3 text-center">{{ getRecordStatus(event) }}</td>
          <td class="px-4 py-3 text-center text-muted-foreground/60">{{ getNotes(event) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Pencil } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  getEventKey,
  getEventLabel as getEventLabelFromUtils,
  getEventBadgeClass,
} from '@/utils/events.ts'
import CModalEditStatus from './CModalEditStatus.vue'
import type { GraphResponse, DailySummaryResponse } from '../../types/chart'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'

const route = useRoute()
const api = useApi()

interface Props {
  events: any[]
  loading?: boolean
  selectedEventId?: string | null
  formatTime: (date: any, format: string) => string
  selectable?: boolean
  selectedRows?: any[]
  readonly?: boolean
  headerDate?: Dayjs
  editChartData?: GraphResponse | null
  dailySummary?: DailySummaryResponse | null
  driverVehicles?: any[]
  editLoading?: boolean
  chartError?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedEventId: null,
  selectable: false,
  readonly: false,
  selectedRows: () => [],
  headerDate: undefined,
  editChartData: null,
  dailySummary: null,
  driverVehicles: () => [],
  editLoading: false,
  chartError: '',
})

const emit = defineEmits<{
  'select-row': [event: any]
  'update:selectedEventId': [id: string | null]
  'row-select': [event: any]
  'edit-event': [event: any]
  'save-event': [data: any]
  'chart:container-update': [width: number]
  'chart:duty-event-update': [data: any]
}>()

const internalSelectedRows = ref<Set<string>>(new Set())
const tableContainer = ref<HTMLElement | null>(null)

const selectRow = (event: any) => {
  const eventId = event.id || event.eventId
  if (!eventId) return
  internalSelectedRows.value = new Set([String(eventId)])
  emit('select-row', event)
  emit('update:selectedEventId', String(eventId))
}

const selectedRowsSet = computed(() => {
  if (props.selectable && props.selectedRows) {
    const set = new Set<string>()
    props.selectedRows.forEach((row: any) => {
      const id = row.eventId || row.id
      if (id) set.add(String(id))
    })
    return set
  }
  return internalSelectedRows.value
})

async function focusEvent(eventId: string) {
  await nextTick()
  const rowElement = Array.from(
    tableContainer.value?.querySelectorAll<HTMLElement>('[data-event-id]') ?? []
  ).find((element) => element.dataset.eventId === String(eventId))

  if (!rowElement) return false
  rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}

watch(
  () => props.selectedEventId,
  async (newId) => {
    if (!newId) return

    const event = props.events.find(
      (e) =>
        e.id === newId ||
        e.eventId === newId ||
        String(e.id) === String(newId) ||
        String(e.eventId) === String(newId)
    )

    if (event && !props.selectable) {
      const eventId = event.id || event.eventId
      if (eventId) {
        internalSelectedRows.value = new Set([String(eventId)])
        emit('update:selectedEventId', String(eventId))
      }
    }

    await focusEvent(String(event?.id || event?.eventId || newId))
  }
)

defineExpose({ focusEvent })

const isAllSelected = computed(() => {
  if (!props.events || props.events.length === 0) return false
  const eventsWithId = props.events.filter((event) => event.id || event.eventId)
  if (eventsWithId.length === 0) return false
  return eventsWithId.every((event) => selectedRowsSet.value.has(String(event.id || event.eventId)))
})

const toggleAllRows = (checked: boolean) => {
  if (props.selectable) {
    props.events.forEach((event) => {
      const eventId = event.id || event.eventId
      if (eventId) {
        const isCurrentlySelected = selectedRowsSet.value.has(String(eventId))
        if (checked && !isCurrentlySelected) {
          emit('row-select', event)
        } else if (!checked && isCurrentlySelected) {
          emit('row-select', event)
        }
      }
    })
  } else {
    if (checked) {
      const newSet = new Set(internalSelectedRows.value)
      props.events.forEach((event) => {
        const eventId = event.id || event.eventId
        if (eventId) {
          newSet.add(String(eventId))
        }
      })
      internalSelectedRows.value = newSet
    } else {
      internalSelectedRows.value = new Set()
    }
  }
}

const toggleRowSelection = (event: any, checked: boolean) => {
  const eventId = event.id || event.eventId
  if (!eventId) return

  if (props.selectable) {
    emit('row-select', event)
  } else {
    const next = new Set(internalSelectedRows.value)
    if (checked) {
      next.add(String(eventId))
    } else {
      next.delete(String(eventId))
    }
    internalSelectedRows.value = next
  }
}

const formatEventTime = (event: any) => {
  if (!event.dateTime && !event.startedAt && !event.createdAt) return '---'
  const date = event.dateTime || event.startedAt || event.createdAt
  return props.formatTime(date, 'MMM D, h:mm:ss a')
}

const formatDuration = (event: any) => {
  if (!event.durationInSeconds && event.durationInSeconds !== 0) return '---'
  const hours = Math.floor(event.durationInSeconds / 3600)
  const minutes = Math.floor((event.durationInSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const getLocation = (event: any): string => {
  if (event.locationOrigin === 1 || !Number.isInteger(event.locationOrigin)) {
    return (
      event.calculatedLocation || event.manualLocation || event.location || event.address || '---'
    )
  } else {
    return (
      event.manualLocation || event.calculatedLocation || event.location || event.address || '---'
    )
  }
}

const getOdometer = (event: any): string => {
  const odometer = event.totalVehicleMiles || event.odometer
  return odometer ? Math.round(odometer).toString() : '---'
}

const getEngineHours = (event: any): string => {
  const hours = event.totalEngineHours || event.engineHours
  return hours ? hours.toFixed(1) : '---'
}

const getRecordOrigin = (event: any): string => {
  const recordOrigin = event.recordOrigin
  if (recordOrigin === 1) return 'Auto'
  if (recordOrigin === 2) return 'Manual'
  if (recordOrigin === 3) return 'Edited'
  if (recordOrigin === 4) return 'Exempt'
  if (event.isAutomatic) return 'Auto'
  if (event.origin) return event.origin
  return 'Manual'
}

const getRecordStatus = (event: any): string => {
  const recordStatus = event.recordStatus
  if (recordStatus === 1) return 'Active'
  if (recordStatus === 2) return 'Inactive'
  if (event.status) return event.status
  if (event.isActive !== undefined) return event.isActive ? 'Active' : 'Inactive'
  return 'Active'
}

const getNotes = (event: any): string => {
  return event.annotation || event.notes || '---'
}

const showEditModal = ref(false)
const currentEditingEvent = ref<any>(null)
const editAction = ref<'edit' | 'add'>('edit')

const canEditEvent = (event: any): boolean => {
  if (props.readonly) return false

  const eventDate = event.dateTime || event.time || event.startedAt || event.createdAt
  if (!eventDate) return false

  const eventDateStr = dayjs(eventDate).format('YYYY-MM-DD')
  const headerDateStr = props.headerDate ? dayjs(props.headerDate).format('YYYY-MM-DD') : ''

  const isAutoGeneratedDriving =
    event.eventType === 1 && event.eventCode === 3 && event.recordOrigin === 1

  const isActiveStatus = event.recordStatus === 1

  const isValidEventType = [1, 3].includes(event.eventType)

  const isSameDay = eventDateStr === headerDateStr

  const isNotHistoryTab = route.query.tab !== 'history'

  return (
    !isAutoGeneratedDriving && isActiveStatus && isValidEventType && isSameDay && isNotHistoryTab
  )
}

const handleEditClick = async (event: any) => {
  const eventId = event.id || event.eventId
  editAction.value = 'edit'
  emit('edit-event', event)

  try {
    const response = await api.get<{ successResult: any }>(
      ApiEndpoints.EVENT_BY_OTHERS_GET(eventId)
    )
    const fullEventData = response.data?.successResult
    currentEditingEvent.value = fullEventData ? { ...event, ...fullEventData } : { ...event }
  } catch (error) {
    console.error('Failed to fetch event details:', error)
    currentEditingEvent.value = { ...event }
  }

  showEditModal.value = true
}

const handleAddClick = () => {
  currentEditingEvent.value = {}
  editAction.value = 'add'
  showEditModal.value = true
}

const handleSaveEvent = (updatedEventData: any) => {
  emit('save-event', updatedEventData)
  showEditModal.value = false
}

type SortKey =
  | 'dateTime'
  | 'eventCode'
  | 'durationInSeconds'
  | 'location'
  | 'totalVehicleMiles'
  | 'totalEngineHours'
  | 'recordOrigin'
  | 'recordStatus'
  | 'annotation'

const sortKey = ref<SortKey | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

const handleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortedEvents = computed(() => {
  if (!sortKey.value) return props.events
  const key = sortKey.value
  const order = sortOrder.value === 'asc' ? 1 : -1
  return [...props.events].sort((a, b) => {
    let valA: any
    let valB: any
    if (key === 'location') {
      valA = a.calculatedLocation || a.manualLocation || a.location || ''
      valB = b.calculatedLocation || b.manualLocation || b.location || ''
    } else {
      valA = a[key] ?? ''
      valB = b[key] ?? ''
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB) * order
    }
    return (valA > valB ? 1 : valA < valB ? -1 : 0) * order
  })
})
</script>

<style scoped></style>
