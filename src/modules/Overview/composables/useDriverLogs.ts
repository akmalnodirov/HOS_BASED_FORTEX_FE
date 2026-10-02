import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService'
import { getCompanyId } from '@/utils/company'
import type { DriversLastEventsResponse, MonitoringDriver, DriverLastEvent } from '../types'

export function useDriverLogs() {
  const api = useApi()
  const drivers = ref<MonitoringDriver[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Event code to name mapping based on design
  const getEventName = (eventCode: number, eventType: number): string => {
    // eventType 1 seems to be regular status, eventType might indicate variations
    const eventMap: Record<number, string> = {
      1: eventType === 1 ? 'Off duty (YM)' : 'Off duty (PC)', // Yard Move or Personal Conveyance
      2: 'Sleep',
      3: 'Driving',
      4: 'On duty',
    }
    return eventMap[eventCode] || 'Unknown'
  }

  // Event code to badge color mapping based on design
  const getEventBadgeClass = (eventCode: number): string => {
    const colorMap: Record<number, string> = {
      1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', // Off duty (YM) - Red
      2: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', // Sleep - Purple
      3: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', // Driving - Green
      4: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', // On duty - Blue
    }
    return colorMap[eventCode] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  // Get status color for card border/background
  const getStatusColor = (eventCode: number, eventType: number): string => {
    // Off duty (PC) - Orange (eventCode 1 with eventType !== 1)
    if (eventCode === 1 && eventType !== 1) {
      return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' // Off duty (PC) - Orange
    }
    const colorMap: Record<number, string> = {
      1: 'border-red-500 bg-red-50 dark:bg-red-900/20', // Off duty (YM) - Red
      2: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', // Sleep - Purple
      3: 'border-green-500 bg-green-50 dark:bg-green-900/20', // Driving - Green
      4: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', // On duty - Blue
    }
    return colorMap[eventCode] || 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
  }

  // Format date time
  const formatDateTime = (dateTime: string): { time: string; date: string } => {
    const date = new Date(dateTime)
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    const dateStr = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
    return { time, date: dateStr }
  }

  // Map DriverLastEvent to MonitoringDriver
  const mapDriverLastEventToMonitoringDriver = (event: DriverLastEvent): MonitoringDriver => {
    return {
      driverId: event.driverDetails.driverId,
      driverName: `${event.driverDetails.firstName} ${event.driverDetails.lastName}`,
      phoneNumber: event.driverDetails.phoneNumber,
      vehicleId: event.driverDetails.vehicleId,
      vehicleUnit: event.driverDetails.vehicleUnit,
      eventCode: event.eventCode,
      eventType: event.eventType,
      dateTime: '', // No dateTime in new API
      hasViolation: false, // Not provided in new API
      isCertified: false, // Not provided in new API
      isConnected: event.driverDetails.isConnected,
      calculatedLocation: event.calculatedLocation || '',
      manualLocation: event.manualLocation || '',
      latitude: event.latitude,
      longitude: event.longitude,
      violation: null,
      timeZoneInfo: {
        id: '',
        offset: 0,
        displayName: '',
        daylightName: '',
        shortName: '',
        ianaId: '',
      },
      hosTimeRemainder: {
        breakDuration: 0,
        drivingDuration: 0,
        shiftDuration: 0,
        cycleDuration: 0,
      },
      hosRecords: [],
    }
  }

  // Fetch driver logs
  const fetchDriverLogs = async () => {
    const currentCompanyId = getCompanyId()
    if (!currentCompanyId) {
      error.value = 'Company ID is required'
      console.warn('fetchDriverLogs: Company ID is not available')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const params: Record<string, string | number> = {
        CompanyId: currentCompanyId,
      }

      if (searchQuery.value.trim()) {
        params.searchQuery = searchQuery.value.trim()
      }

      console.log('Fetching drivers last events with params:', params)
      const response = await api.get<DriversLastEventsResponse>(
        '/api/tracking/drivers-last-events',
        { params }
      )
      console.log('Drivers last events response:', response.data)

      if (response.data?.successResult && Array.isArray(response.data.successResult)) {
        // Map DriverLastEvent array to MonitoringDriver array
        drivers.value = response.data.successResult.map(mapDriverLastEventToMonitoringDriver)
      } else {
        drivers.value = []
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch drivers'
      console.error('Error fetching drivers last events:', err)
      drivers.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout> | null = null
  const handleSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    searchTimeout = setTimeout(async () => {
      await fetchDriverLogs()
    }, 500) // 500ms debounce
  }

  return {
    // State
    drivers,
    isLoading,
    error,
    searchQuery,

    // Functions
    fetchDriverLogs,
    handleSearch,
    getEventName,
    getEventBadgeClass,
    getStatusColor,
    formatDateTime,
  }
}
