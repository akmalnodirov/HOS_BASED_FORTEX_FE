/**
 * History mode composable - manages transfer events functionality
 * Single Responsibility: Only handles history/transfer operations
 */

import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { Dayjs } from 'dayjs'

import { useHistorySessionsStore } from '../store/historySessions.ts'
import { useHistoryTabsStore } from '../store/historyTabs.ts'
import { useTransferEventsStore } from '../store/transferEvents.ts'
import {
  HISTORY_SESSION_TYPE,
  type HistoryModals,
  type HistoryTransferForm,
} from '../types/history.ts'

interface UseHistoryOptions {
  driverId: string
  getHeaderDate: () => Dayjs
  screenResolution: number
  formatToUTC: (date: Dayjs | string) => string
  getStartOf: (date: Dayjs, isAlreadyInTimeZone?: boolean) => Dayjs
  getEndOf: (date: Dayjs, isAlreadyInTimeZone?: boolean) => Dayjs
  acceptAsTimeZone: (date: string | Dayjs) => Dayjs
  compareDates: (date1: any, date2: any) => boolean
  onDataRefresh?: () => Promise<void>
}

export function useHistory(options: UseHistoryOptions) {
  const route = useRoute()
  const router = useRouter()

  // Stores
  const sessionStore = useHistorySessionsStore()
  const tabStore = useHistoryTabsStore()
  const transferStore = useTransferEventsStore()

  // Store refs
  const { session, sessionId } = storeToRefs(sessionStore)
  const { tabs, selectedTab } = storeToRefs(tabStore)
  const { originalDailyEvents, loading: transferLoading } = storeToRefs(transferStore)

  // Local state
  const isActive = ref(false)
  const modals = reactive<HistoryModals>({
    transferEvents: false,
    transferByPeriod: false,
  })
  const transferForm = reactive<HistoryTransferForm>({
    dateRange: [null, null],
    dateRangeSubmit: false,
  })
  const selectedRows = ref<any[]>([])

  // Computed
  const hasSelection = computed(() => selectedRows.value.length > 0)
  const selectionCount = computed(() => selectedRows.value.length)

  /**
   * Initialize history mode - creates session and fetches data
   */
  async function activate(): Promise<void> {
    isActive.value = true

    // Clear previous session state to ensure fresh API calls
    sessionStore.clearSession()
    tabStore.clearTabs()
    transferStore.clearOriginalDailyEvents()

    const existingSessionId = route.query?.sessionId as string
    const currentHeaderDate = options.getHeaderDate()

    const sessionRequest = {
      driverId: options.driverId,
      type: HISTORY_SESSION_TYPE,
      startDate: options.formatToUTC(options.getStartOf(currentHeaderDate, true)),
      endDate: options.formatToUTC(options.getEndOf(currentHeaderDate, true)),
      status: 0,
    }

    try {
      let sessionFound = false

      if (existingSessionId) {
        // Always fetch session from API to get fresh data
        sessionFound = await sessionStore.getSession(existingSessionId)
        // Sync header date with session if different
        if (sessionFound && session.value?.startDate) {
          const sessionDate = options.acceptAsTimeZone(session.value.startDate)
          if (!options.compareDates(sessionDate, currentHeaderDate)) {
            // Date mismatch - create new session with current date
            sessionFound = false
          }
        }
      }

      // If no existing session or fetch failed, create a new one
      if (!sessionFound || !sessionId.value) {
        await sessionStore.addSession(sessionRequest)
      }

      // Fetch tabs and select latest
      if (sessionId.value) {
        await tabStore.getTabs(sessionId.value)
        selectedTab.value = tabs.value.at(-1) || null

        // Update URL with session ID
        await router.replace({
          query: { ...route.query, sessionId: sessionId.value },
        })
      }

      // Fetch history data
      await fetchHistoryData()
    } catch (error) {
      console.error('Failed to activate history mode:', error)
      deactivate()
    }
  }

  /**
   * Exit history mode and cleanup
   */
  function deactivate(): void {
    isActive.value = false
    selectedRows.value = []
    transferStore.clearOriginalDailyEvents()
    sessionStore.clearSession()
    tabStore.clearTabs()
  }

  /**
   * Fetch all history data (events, summary, chart)
   */
  async function fetchHistoryData(): Promise<void> {
    if (!selectedTab.value?.id || !sessionId.value) return

    const params = {
      tabId: selectedTab.value.id,
      sessionId: sessionId.value,
    }

    await transferStore.getOriginalTransferEvents(params)
  }

  /**
   * Refresh history data with a new date - creates new session and fetches data
   */
  async function refreshWithNewDate(newDate: Dayjs): Promise<void> {
    if (!isActive.value) return

    // Clear current session and data
    sessionStore.clearSession()
    tabStore.clearTabs()
    transferStore.clearOriginalDailyEvents()
    selectedRows.value = []

    const sessionRequest = {
      driverId: options.driverId,
      type: HISTORY_SESSION_TYPE,
      startDate: options.formatToUTC(options.getStartOf(newDate, true)),
      endDate: options.formatToUTC(options.getEndOf(newDate, true)),
      status: 0,
    }

    try {
      // Create new session with new date
      await sessionStore.addSession(sessionRequest)

      // Fetch tabs and select latest
      if (sessionId.value) {
        await tabStore.getTabs(sessionId.value)
        selectedTab.value = tabs.value.at(-1) || null

        // Update URL with new session ID
        await router.replace({
          query: { ...route.query, sessionId: sessionId.value },
        })
      }

      // Fetch history data
      await fetchHistoryData()
    } catch (error) {
      console.error('Failed to refresh history with new date:', error)
    }
  }

  /**
   * Get history chart data
   * @param screenResolution - current screen resolution (pass current value, not from options)
   */
  async function fetchHistoryChart(screenResolution?: number): Promise<any> {
    if (!selectedTab.value?.id || !sessionId.value) return null

    return transferStore.getGraphTransferEvents({
      tabId: selectedTab.value.id,
      sessionId: sessionId.value,
      screenResolution: screenResolution ?? options.screenResolution,
    })
  }

  /**
   * Get history daily summary
   */
  async function fetchHistorySummary(): Promise<any> {
    if (!selectedTab.value?.id || !sessionId.value) return null

    return transferStore.getDailySummaryTransferEvents({
      tabId: selectedTab.value.id,
      sessionId: sessionId.value,
    })
  }

  /**
   * Transfer selected events to current log
   */
  async function transferSelectedEvents(): Promise<boolean> {
    if (!hasSelection.value || !selectedTab.value?.id || !sessionId.value) {
      return false
    }

    try {
      const success = await transferStore.setTransferEventsByIds({
        tabId: selectedTab.value.id,
        sessionId: sessionId.value,
        eventIds: selectedRows.value.map((row) => row.eventId || row.id),
      })

      if (success) {
        selectedRows.value = []
        modals.transferEvents = false
        await fetchHistoryData()
        options.onDataRefresh?.()
      }

      return success
    } catch (error) {
      console.error('Failed to transfer events:', error)
      return false
    }
  }

  /**
   * Transfer events by date range
   */
  async function transferByDateRange(): Promise<boolean> {
    if (!selectedTab.value?.id || !sessionId.value) return false

    // First call shows confirmation, second call executes
    if (!transferForm.dateRangeSubmit) {
      transferForm.dateRangeSubmit = true
      return false
    }

    const [startDate, endDate] = transferForm.dateRange
    if (!startDate || !endDate) return false

    try {
      const success = await transferStore.setTransferEventsByDateRange({
        tabId: selectedTab.value.id,
        sessionId: sessionId.value,
        startDate: options.formatToUTC(options.getStartOf(startDate, true)),
        endDate: options.formatToUTC(options.getEndOf(endDate, true)),
      })

      if (success) {
        resetTransferForm()
        modals.transferByPeriod = false
        await fetchHistoryData()
        options.onDataRefresh?.()
      }

      return success
    } catch (error) {
      console.error('Failed to transfer by date range:', error)
      return false
    }
  }

  /**
   * Toggle row selection - now does single selection (only one event at a time)
   */
  function toggleRowSelection(row: any): void {
    const rowId = row.eventId || row.id
    const index = selectedRows.value.findIndex((r) => (r.eventId || r.id) === rowId)

    // Single selection: if clicking the same event, deselect it; otherwise select only this one
    if (index > -1) {
      // If already selected, deselect it
      selectedRows.value.splice(index, 1)
    } else {
      // Clear all previous selections and select only this event
      selectedRows.value = [row]
    }
  }

  /**
   * Select/deselect all rows
   */
  function toggleAllRows(events: any[]): void {
    if (selectedRows.value.length === events.length) {
      selectedRows.value = []
    } else {
      selectedRows.value = [...events]
    }
  }

  /**
   * Open transfer events modal
   */
  function openTransferEventsModal(): void {
    if (hasSelection.value) {
      modals.transferEvents = true
    }
  }

  /**
   * Open transfer by period modal
   */
  function openTransferByPeriodModal(): void {
    const currentHeaderDate = options.getHeaderDate()
    transferForm.dateRange = [currentHeaderDate, currentHeaderDate]
    transferForm.dateRangeSubmit = false
    modals.transferByPeriod = true
  }

  /**
   * Reset transfer form state
   */
  function resetTransferForm(): void {
    transferForm.dateRange = [null, null]
    transferForm.dateRangeSubmit = false
    selectedRows.value = []
  }

  /**
   * Close all modals and reset state
   */
  function closeModals(): void {
    modals.transferEvents = false
    modals.transferByPeriod = false
    transferForm.dateRangeSubmit = false
  }

  return {
    // State
    isActive,
    modals,
    transferForm,
    selectedRows,
    originalDailyEvents,
    transferLoading,
    sessionId,
    selectedTab,

    // Computed
    hasSelection,
    selectionCount,

    // Actions
    activate,
    deactivate,
    refreshWithNewDate,
    fetchHistoryData,
    fetchHistoryChart,
    fetchHistorySummary,
    transferSelectedEvents,
    transferByDateRange,
    toggleRowSelection,
    toggleAllRows,
    openTransferEventsModal,
    openTransferByPeriodModal,
    closeModals,
    resetTransferForm,
  }
}
