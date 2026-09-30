import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import dayjs, { type Dayjs } from 'dayjs'
import { toast } from 'vue-sonner'

// Stores
import { useOptimizeStore } from '../store/optimizeStore'
import { useBoostSessionsStore } from '../../Boost/store/boostSessions'
import { useBoostTabsStore } from '../../Boost/store/boostTabs'
import { useBoostEventsStore } from '../../Boost/store/boostEvents'

// Services
import { OptimizeFormService } from '../services/optimizeFormService'
import { LocationService } from '../services/locationService'
import { OptimizeEventService } from '../services/optimizeEventService'

// Utils
import { EventMapper } from '../utils/eventMapper'

// Normalize service - for collecting errors and warnings
import { collectEventWarningAndErrors } from '@/services/normalize'

// Composables
import { useOptimizeSelection } from './useOptimizeSelection'
import { useTimeZoneHelper } from '@/composables/useTimezone'

// Types
import type {
  OptimizeEditStatus,
  OptimizeEventTableRow,
  OptimizeNotificationResult,
} from '../types/optimize'
import type { SessionRequest } from '../../Boost/types/boost'

// Constants
import { createOptimizeTableColumns, createErrorAndWarningColumns } from '../constants'

// API
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'

/**
 * Main Optimize Composable
 * Manages the optimize page logic
 * Following Composition Pattern and Dependency Injection
 */
export function useOptimize(driverId: string) {
  const route = useRoute()
  const router = useRouter()

  // Timezone helper
  const { formatToUTC, convertToTimeZone, getStartOf, getEndOf } = useTimeZoneHelper()

  // API
  const api = useApi()

  // Stores
  const optimizeStore = useOptimizeStore()
  const sessionStore = useBoostSessionsStore()
  const tabStore = useBoostTabsStore()
  const eventsStore = useBoostEventsStore()

  // Store refs
  const { optimizeCategories } = storeToRefs(optimizeStore)
  const { session, sessionId } = storeToRefs(sessionStore)
  const { tabs, selectedTab } = storeToRefs(tabStore)
  const { boostEvents, pinTimes } = storeToRefs(eventsStore)

  // State - Date Range
  const headerDate = ref<[Dayjs, Dayjs]>([
    route.query.fromDate
      ? dayjs(String(route.query.fromDate))
      : convertToTimeZone(dayjs().subtract(2, 'week')),
    route.query.toDate ? dayjs(String(route.query.toDate)) : convertToTimeZone(dayjs()),
  ])

  // State - Modal visibility
  const editStatusModal = ref(false)
  const showAllErrorsAndWarningsModal = ref(false)

  // State - Optimize categories
  const selectedOptimizeCategories = ref<Record<string, boolean>>({})
  const selectAllOptimizeCategories = ref(false)

  // State - Loading
  const loading = ref(false)
  const loadingOptimizeEvents = ref(false)
  const loadingTable = ref(false)
  const loadingMultiDelete = ref(false)

  // State - Events
  const detailList = ref<OptimizeEventTableRow[]>([])
  const isOptimizeEventsLoaded = ref(false)
  const isOptimizeEventsSubmitted = ref(false)

  // State - Edit form
  const editStatus = reactive<OptimizeEditStatus>({
    id: 0,
    eventId: '',
    event: { eventCode: null, eventType: null },
    startDate: dayjs(),
    origin: 1,
    vehicle: null,
    vehicles: [],
    vehicleId: null,
    odometer: 0,
    engine_hours: 0,
    location_origin: 1,
    latitude: null,
    longitude: null,
    location: '',
    location_note: '',
    notes: '',
    trailer: null,
    doc: null,
  })

  // Selection composable
  const {
    selectedRows,
    selectedRowSet,
    isShiftPressed,
    tableRowSelect,
    clearSelection,
    handleKeyDown,
    handleKeyUp,
  } = useOptimizeSelection(detailList)

  // Computed
  const columns = computed(() => createOptimizeTableColumns())
  const errorAndWarningColumns = computed(() => createErrorAndWarningColumns())

  const isOptimizeDisabled = computed(
    () => loading.value || OptimizeFormService.validateStatusForm(editStatus).length > 0
  )

  /**
   * Get boost events and process them
   */
  async function getBoostActions(tabType: number = 2) {
    if (!sessionId.value || !selectedTab.value?.id) return

    // Update tab type if needed
    if (selectedTab.value.type !== tabType) {
      await tabStore.updateTab(selectedTab.value.id, {
        sessionId: sessionId.value,
        name: selectedTab.value.name,
        type: tabType,
      })
      // Refresh tabs list so computed properties (canSubmitEvents) re-evaluate correctly
      await tabStore.getTabs(sessionId.value)
      selectedTab.value = tabs.value?.at(-1) || null
    }

    if (!selectedTab.value?.id) return

    const model = {
      tabId: selectedTab.value.id,
      sessionId: sessionId.value,
    }

    try {
      await Promise.allSettled([
        eventsStore.getHistoryBoostEvents(model),
        eventsStore.getHistoryBoostResetPinTimes({ ...model, screenResolution: window.innerWidth }),
      ])

      // Process events to table rows
      processEventsToTable()
    } catch (error) {
      console.error('Failed to get boost actions:', error)
    }
  }

  /**
   * Process boost events to table rows
   * 1. Flatten all events from grouped response
   * 2. Filter out archived events (actionState === 4)
   * 3. Run validation to collect errors and warnings
   * 4. Map to table rows
   */
  function processEventsToTable() {
    loadingTable.value = true
    try {
      // Flatten all events and filter out archived ones for validation
      const allEvents = boostEvents.value?.flatMap((item) => item.events) || []
      const eventsToValidate = allEvents.filter((event) => event.actionState !== 4)

      // Run validation - this mutates events by adding errorTitles/warningTitles
      if (eventsToValidate.length > 0) {
        collectEventWarningAndErrors(eventsToValidate as any, pinTimes.value || [])
      }

      // Map to table rows (uses the now-validated boostEvents)
      detailList.value = EventMapper.mapBoostEventsToTableRows(boostEvents.value)
    } catch (error) {
      console.error('Failed to process events:', error)
    } finally {
      loadingTable.value = false
    }
  }

  /**
   * Load optimize events
   */
  async function loadOptimizeEvents(isSessionCreated: boolean = false) {
    loadingOptimizeEvents.value = true
    isOptimizeEventsLoaded.value = false

    const sessionModel: SessionRequest = {
      driverId,
      type: 2,
      status: 0,
      startDate: formatToUTC(getStartOf(headerDate.value[0])),
      endDate: formatToUTC(getEndOf(headerDate.value[1])),
    }

    try {
      if (!isSessionCreated) {
        await sessionStore.addSession(sessionModel)
      }

      // Get tabs by session
      if (sessionId.value) {
        await tabStore.getTabs(sessionId.value)
        selectedTab.value = tabs.value?.at(-1) || null

        await getBoostActions(!isSessionCreated ? 1 : selectedTab.value?.type)

        // Update route with sessionId
        router.push({
          query: { ...route.query, sessionId: sessionId.value },
        })

        isOptimizeEventsLoaded.value = true
      }
    } catch (error) {
      console.error('Failed to load optimize events:', error)
      isOptimizeEventsLoaded.value = false
    } finally {
      loadingOptimizeEvents.value = false
    }
  }

  /**
   * Show sequential toast notifications for optimization results
   */
  async function showSequentialNotifications(result: OptimizeNotificationResult) {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    for (const failed of result.failedOptimizations) {
      toast.error('Failed to optimize category!', { description: failed.value })
      await delay(800)
    }

    for (const success of result.fulFilledOptimizations) {
      toast.success('Successfully optimized category!', { description: success })
      await delay(800)
    }
  }

  /**
   * Submit optimize categories
   */
  async function submitOptimizeCategories() {
    if (!sessionId.value || !selectedTab.value?.id) return

    try {
      loading.value = true
      const selectedCategories = optimizeCategories.value.filter(
        (category) => selectedOptimizeCategories.value[category.id]
      )

      const result = await optimizeStore.optimizeSelectedCategories({
        sessionId: sessionId.value,
        tabId: selectedTab.value.id,
        eventCategoryInfos: selectedCategories,
      })

      await getBoostActions(4)

      if (result) {
        await showSequentialNotifications(result)
      }
    } catch (error) {
      console.error('Failed to optimize categories:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Submit edit driver daily form
   */
  async function submitEditDriverDailyForm(sessionId: string) {
    await api.put(`${ApiEndpoints.EDIT_DRIVER_DAILY_FORMS_SUBMIT}/${sessionId}`)
  }

  /**
   * Submit optimize events
   */
  async function submitOptimizeEvents() {
    if (!sessionId.value) return

    try {
      await Promise.allSettled([
        eventsStore.submitBoostEvents(sessionId.value),
        submitEditDriverDailyForm(sessionId.value),
      ])
    } catch (error) {
      console.error('Failed to submit optimize events:', error)
    } finally {
      isOptimizeEventsSubmitted.value = true
      await getBoostActions()
    }
  }

  /**
   * Open edit event modal
   */
  async function openEditOptimizeEvent(eventId: string) {
    await OptimizeEventService.openEditOptimizeEvent(editStatus, eventId, editStatusModal)
  }

  /**
   * Submit edited event
   */
  async function submitEditOptimizeEvent() {
    if (!sessionId.value || !selectedTab.value?.id) return

    try {
      loading.value = true
      await OptimizeEventService.submitEditOptimizeEvent(
        editStatus,
        sessionId.value,
        selectedTab.value.id,
        driverId
      )
      editStatusModal.value = false
      await getBoostActions()
    } catch (error) {
      console.error('Failed to submit edit event:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Copy event
   */
  async function copyOptimizeEvent(eventId: string) {
    if (!sessionId.value || !selectedTab.value?.id) return

    try {
      await OptimizeEventService.copyOptimizeEvent(eventId, sessionId.value, selectedTab.value.id)
      await getBoostActions()
      toast.success('Event copied')
    } catch (error) {
      console.error('Failed to copy event:', error)
    }
  }

  /**
   * Revert event
   */
  async function revertOptimizeEvent(eventId: string) {
    if (!sessionId.value || !selectedTab.value?.id) return

    try {
      await OptimizeEventService.revertOptimizeEvent(eventId, sessionId.value, selectedTab.value.id)
      await getBoostActions()
    } catch (error) {
      console.error('Failed to revert event:', error)
    }
  }

  /**
   * Delete event
   */
  async function deleteOptimizeEvent(eventId: string) {
    if (!sessionId.value || !selectedTab.value?.id) return

    try {
      await OptimizeEventService.deleteOptimizeEvent(eventId, sessionId.value, selectedTab.value.id)
      await getBoostActions()
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  /**
   * Multi delete events
   */
  async function multiDeleteBoostEvents(events: OptimizeEventTableRow[]) {
    if (!sessionId.value || !selectedTab.value?.id) return

    loadingMultiDelete.value = true
    try {
      const eventIds = events.map((e) => e.id)
      await OptimizeEventService.multiDeleteOptimizeEvents(
        eventIds,
        sessionId.value,
        selectedTab.value.id
      )
      clearSelection()
      await getBoostActions()
    } catch (error) {
      console.error('Failed to multi-delete events:', error)
    } finally {
      loadingMultiDelete.value = false
    }
  }

  /**
   * Copy location coordinates
   */
  async function copyLongLat() {
    const success = await LocationService.copyLongLat(editStatus)
    if (success) {
      toast.success('Coordinates copied')
    }
  }

  /**
   * Paste location coordinates
   */
  async function pasteLongLat() {
    await LocationService.pasteLongLat(editStatus)
  }

  /**
   * Validate form
   */
  function validateStatusForm() {
    return OptimizeFormService.validateStatusForm(editStatus)
  }

  // Watchers
  watch(
    () => [headerDate.value[0], headerDate.value[1]],
    async () => {
      const dateQuery =
        headerDate.value[0] && headerDate.value[1]
          ? `?fromDate=${getStartOf(headerDate.value[0]).format('YYYY-MM-DDTHH:mm:ss')}&toDate=${getEndOf(headerDate.value[1]).format('YYYY-MM-DDTHH:mm:ss')}`
          : ''

      await router.push(`/eld/logs/${driverId}/optimise${dateQuery}`)

      isOptimizeEventsLoaded.value = false
      isOptimizeEventsSubmitted.value = false

      await loadOptimizeEvents()
    }
  )

  watch(selectAllOptimizeCategories, (value) => {
    if (value) {
      optimizeCategories.value.forEach((category) => {
        selectedOptimizeCategories.value[category.id] = true
      })
    } else {
      selectedOptimizeCategories.value = {}
    }
  })

  // Lifecycle
  onMounted(async () => {
    // Add keyboard listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Load optimize categories
    await optimizeStore.getOptimizeCategories()

    // Check if session exists in query
    if (route.query?.sessionId) {
      const sessionExists = await sessionStore.getSession(route.query.sessionId as string)
      if (sessionExists) {
        isOptimizeEventsLoaded.value = !!session.value?.isSubmitted
        await loadOptimizeEvents(true)
      } else {
        await loadOptimizeEvents(false)
      }
    } else {
      await loadOptimizeEvents(false)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return {
    // State
    headerDate,
    loading,
    loadingOptimizeEvents,
    loadingTable,
    loadingMultiDelete,

    // Modals
    editStatusModal,
    showAllErrorsAndWarningsModal,

    // Optimize categories
    optimizeCategories,
    selectedOptimizeCategories,
    selectAllOptimizeCategories,

    // Events
    detailList,
    isOptimizeEventsLoaded,
    isOptimizeEventsSubmitted,

    // Selection
    selectedRows,
    selectedRowSet,
    isShiftPressed,

    // Edit form
    editStatus,

    // Tabs
    tabs,
    selectedTab,

    // Computed
    columns,
    errorAndWarningColumns,
    isOptimizeDisabled,

    // Methods - Events
    loadOptimizeEvents,
    submitOptimizeCategories,
    submitOptimizeEvents,
    tableRowSelect,

    // Methods - Event CRUD
    openEditOptimizeEvent,
    submitEditOptimizeEvent,
    copyOptimizeEvent,
    revertOptimizeEvent,
    deleteOptimizeEvent,
    multiDeleteBoostEvents,

    // Methods - Location
    copyLongLat,
    pasteLongLat,

    // Methods - Validation
    validateStatusForm,
  }
}
