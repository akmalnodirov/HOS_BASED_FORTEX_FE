// 1. Imports
import dayjs, { Dayjs } from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { CalendarDate } from '@internationalized/date'
import type { DateRange, DateValue } from 'reka-ui'

dayjs.extend(utc)
dayjs.extend(timezone)
import { useDirection } from './useDirection'
import { useRouteAnimation } from './useRouteAnimation'
import { useRouteMode } from './useRouteMode'
import type { RoutePoint } from './useRouteMode'
import { useTrackingStore } from '@/modules/Overview/store/tracking.ts'
import { useFuelStore } from '@/modules/Overview/store/fuel.ts'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations.ts'
import { calculateDistance, isValidCoordinates } from '../utils/mapUtils'
import { subtract } from '@/utils/time'
import { FuelKind } from '@/utils/fuel'
import {
  ICON_ROT_OFFSET,
  MAX_RETRY_COUNT,
  DEFAULT_LAT,
  DEFAULT_LNG,
  MINIMUM_DISTANCE_THRESHOLD,
} from '@/utils/constants'
import { NearbyCheapestFuelStationsRequest } from '@/types/fuel'
import {
  DriverLogsDailyEventsRequest,
  EveryTrackingResponse,
  TrackingResponse,
} from '@/types/tracking'

// 2. TYPES & INTERFACES
type DestinationSelection = {
  lat: number
  lng: number
  label?: string
}

export const useOverviewId = () => {
  // 3. VARIABLES
  // Router
  const route = useRoute()
  const router = useRouter()

  // Composables
  const {
    testDirectionsAPI,
    renderDirections,
    updateLiveRoute,
    cleanUpRenderers,
    getRoutePathPoints,
    calculateRouteFromAddress,
    showETAInfoWindow,
    clearETAInfoWindow,
  } = useDirection()

  const {
    truckHeading,
    animationState,
    startAnimation,
    stopAnimation,
    updateAnimationPath,
    ANIMATION_CONFIG,
  } = useRouteAnimation()

  const { formatToUTC, convertToTimeZone, getStartOf, getEndOf, getDefaultTimeZoneId } =
    useTimeZoneHelper()

  // Stores
  const trackingsStore = useTrackingStore()
  const fuelStore = useFuelStore()
  const geoLocationsStore = useGeoLocationsStore()

  const {
    dailyTrackings,
    everyTrackings,
    trackingTooltips,
    lastEventStatus,
    lastEventTime,
    lastLocation,
    lastEventCode,
    lastEventType,
    driverFullName,
  } = storeToRefs(trackingsStore)
  const { cheapestFuelStations } = storeToRefs(fuelStore)

  // Map State
  const mapInstance = ref<any>(null)
  const mapType = ref<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('satellite')
  const focusLiveTracking = ref<boolean>(false)

  // Route mode (SRP: routing logic is isolated in useRouteMode)
  const {
    isRoutingMode,
    routeForm,
    selectedRouteIndex,
    isFetchingRoutes,
    routeAlternatives,
    clearDirectionsRenderers,
    onSelectRouteFrom,
    onSelectRouteDestination,
    fetchRouteAlternatives,
    selectRoute,
  } = useRouteMode(mapInstance)
  const zoomMap = ref<number>(17)
  const mapCenter = ref<{ lat: number; lng: number }>({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })

  // Route State
  const directionsSegments = ref<any[]>([])
  const historicalSegments = ref<any[]>([])
  const isDestinationRoute = ref<boolean>(false)

  // Tracking State
  const liveTrackingInterval = ref()
  const isLiveTracking = ref<boolean>(false)
  const liveTrackingRetryCount = ref(0)
  const liveTrackingError = ref<string | null>(null)
  const truckPosition = reactive({ lat: 0, lng: 0 })
  const initialPosition = reactive({ lat: 0, lng: 0 })
  const truckMarker = ref<null>(null)
  const destinationMarker = reactive({ lat: 0, lng: 0, visible: false })
  const isSetFirstTrack = ref<boolean>(false)
  const currentAbortController = ref<AbortController | null>(null)

  // Selection State
  const selectedTrackingEvents = ref<EveryTrackingResponse[]>([])
  const selectedEvent = ref<TrackingResponse | null>(null)

  // Live Share State
  const liveModal = ref<boolean>(false)
  const liveState = reactive({
    emails: [''],
    telegrams: [''],
    expireAt: dayjs().add(1, 'day'),
  })
  const saveLoading = ref<boolean>(false)

  // Form State
  const liveTrackingForm = reactive({
    latitude: (route.query.latitude as string) || '',
    longitude: (route.query.longitude as string) || '',
    fromLocation: (route.query.fromLocation as string) || '',
    toDestination: (route.query.toDestination as string) || '',
  })

  // ETA State
  const currentSpeed = ref<number>(0)
  const destinationDistance = ref<number>(0)
  const estimatedTimeOfArrival = ref<string>('')

  // Date State
  // Default: yesterday to today (same as old project)
  const headerDate = ref<[Dayjs, Dayjs]>([
    convertToTimeZone(subtract(dayjs(), 1, 'day')),
    convertToTimeZone(dayjs()),
  ])

  // Calendar State
  const isCalendarOpen = ref(false)

  // Calendar Date conversion utilities
  const dayjsToCalendarDate = (date: Dayjs): CalendarDate => {
    return new CalendarDate(date.year(), date.month() + 1, date.date())
  }

  const calendarDateToDayjs = (date: DateValue): Dayjs => {
    // Create date in the correct timezone to avoid timezone conversion issues
    const timeZoneId = getDefaultTimeZoneId()
    // Create date string in format: YYYY-MM-DD
    const dateString = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
    // Parse in the correct timezone
    return dayjs.tz(dateString, timeZoneId).startOf('day')
  }

  // Calendar value for RangeCalendar (actual value)
  // Note: setter uses handleDateSelect which is defined later
  let handleDateSelectFn: ((dates: [Dayjs, Dayjs]) => Promise<void>) | null = null

  const calendarValue = computed<DateRange>({
    get: () => {
      if (!headerDate.value || headerDate.value.length !== 2) {
        const now = dayjs()
        const yesterday = now.subtract(1, 'day')
        return {
          start: dayjsToCalendarDate(yesterday),
          end: dayjsToCalendarDate(now),
        }
      }
      return {
        start: dayjsToCalendarDate(headerDate.value[0]),
        end: dayjsToCalendarDate(headerDate.value[1]),
      }
    },
    set: (value) => {
      // This setter is not used anymore, but kept for compatibility
      if (value?.start && value?.end && handleDateSelectFn) {
        const startDate = calendarDateToDayjs(value.start)
        const endDate = calendarDateToDayjs(value.end)
        handleDateSelectFn([startDate, endDate])
      }
    },
  })

  // Internal ref to store the temp value
  const tempCalendarValueInternal = ref<{ start: CalendarDate; end: CalendarDate }>({
    start: dayjsToCalendarDate(dayjs().subtract(2, 'day')),
    end: dayjsToCalendarDate(dayjs().subtract(1, 'day')),
  })

  // Function to disable future dates (dates after today)
  const isDateDisabled = (date: DateValue) => {
    const today = dayjs().startOf('day')
    const dateToCheck = dayjs
      .tz(
        `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
        getDefaultTimeZoneId()
      )
      .startOf('day')
    return dateToCheck.isAfter(today)
  }

  // Watch calendar open state to sync temp value
  watch(isCalendarOpen, (isOpen) => {
    if (isOpen) {
      // Initialize temp value with current calendar value when opening
      tempCalendarValueInternal.value = {
        start: calendarValue.value.start as CalendarDate,
        end: calendarValue.value.end as CalendarDate,
      }
    }
  })

  // Override tempCalendarValue to use internal ref
  const tempCalendarValueForBinding = computed({
    get: () => tempCalendarValueInternal.value as DateRange,
    set: (value: DateRange | undefined) => {
      if (value?.start && value?.end) {
        tempCalendarValueInternal.value = {
          start: value.start as CalendarDate,
          end: value.end as CalendarDate,
        }
      }
    },
  })

  // Fuel State
  const fuelState = reactive<NearbyCheapestFuelStationsRequest>({
    kind: FuelKind.Diesel,
    radius: 5,
    lon: 0,
    lat: 0,
  })

  // Visibility State
  const isTabVisible = ref(true)
  const lastVisibleTime = ref(Date.now())
  const justReturnedFromTab = ref(false)

  // 4. COMPUTED PROPERTIES
  const isLiveTrackingFormValid = computed(() => liveTrackingForm.toDestination.trim().length > 0)

  // 5. FUNCTIONS
  /** --- Helper Functions --- */
  const calculateTotalRouteDistance = (
    fromPosition: any,
    toPosition: any,
    segments?: any[]
  ): number => {
    if (
      !isValidCoordinates(fromPosition.lat, fromPosition.lng) ||
      !isValidCoordinates(toPosition.lat, toPosition.lng)
    ) {
      return 0
    }
    if (segments && segments.length > 0) {
      let totalDist = 0
      segments.forEach((segment) => {
        if (segment.path && Array.isArray(segment.path)) {
          for (let i = 0; i < segment.path.length - 1; i++) {
            totalDist += calculateDistance(segment.path[i], segment.path[i + 1])
          }
        }
      })
      return totalDist
    }
    return calculateDistance(fromPosition, toPosition)
  }

  const calculateETA = (distanceInMeters: number, speedInKmh: number): string => {
    if (!distanceInMeters || distanceInMeters <= 0) return 'No route'
    const DEFAULT_SPEED_KMH = 63
    const effectiveSpeed = !speedInKmh || speedInKmh < 1 ? DEFAULT_SPEED_KMH : speedInKmh
    const distanceInKm = distanceInMeters / 1000
    const timeInHours = distanceInKm / effectiveSpeed

    const hours = Math.floor(timeInHours)
    const minutes = Math.round((timeInHours - hours) * 60)

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
    else if (hours > 0) return `${hours}h`
    else if (minutes > 0) return `${minutes}min`
    else return '< 1min'
  }

  const calculateCenter = () => {
    const valid = dailyTrackings.value?.trackingEventResponse?.filter(
      (t) => t.latitude && t.longitude
    )
    if (valid == null || !valid.length) {
      mapCenter.value = { lat: DEFAULT_LAT, lng: DEFAULT_LNG }
      zoomMap.value = 8
      return
    }
    const lat = valid.reduce((acc, p) => acc + p.latitude, 0) / valid.length
    const lng = valid.reduce((acc, p) => acc + p.longitude, 0) / valid.length
    mapCenter.value = { lat, lng }

    const latDiff =
      Math.max(...valid.map((p) => p.latitude)) - Math.min(...valid.map((p) => p.latitude))
    const lngDiff =
      Math.max(...valid.map((p) => p.longitude)) - Math.min(...valid.map((p) => p.longitude))
    const maxDiff = Math.max(latDiff, lngDiff)

    if (maxDiff === 0) zoomMap.value = 15
    else if (maxDiff > 10) zoomMap.value = 5
    else if (maxDiff > 5) zoomMap.value = 7
    else if (maxDiff > 2) zoomMap.value = 9
    else if (maxDiff > 1) zoomMap.value = 10
    else if (maxDiff > 0.5) zoomMap.value = 11
    else if (maxDiff > 0.1) zoomMap.value = 13
    else zoomMap.value = 15
  }

  const fitMapBounds = (segments?: any[]) => {
    const google = (window as any).google
    const map = mapInstance.value?.map

    if (!map || !google) return

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    if (segments && segments.length > 0) {
      segments.forEach((segment) => {
        if (segment.path && Array.isArray(segment.path)) {
          segment.path.forEach((point: any) => {
            if (point.lat && point.lng) {
              bounds.extend(new google.maps.LatLng(point.lat, point.lng))
              hasPoints = true
            }
          })
        }
      })
      if (isValidCoordinates(truckPosition.lat, truckPosition.lng)) {
        bounds.extend(new google.maps.LatLng(truckPosition.lat, truckPosition.lng))
        hasPoints = true
      }
      if (destinationMarker.visible && destinationMarker.lat && destinationMarker.lng) {
        bounds.extend(new google.maps.LatLng(destinationMarker.lat, destinationMarker.lng))
        hasPoints = true
      }
    } else {
      const valid = dailyTrackings.value?.trackingEventResponse?.filter(
        (t) => t.latitude && t.longitude
      )
      if (valid && valid.length > 0) {
        valid.forEach((tracking) => {
          bounds.extend(new google.maps.LatLng(tracking.latitude, tracking.longitude))
          hasPoints = true
        })
      }
    }

    if (!hasPoints) {
      mapCenter.value = { lat: DEFAULT_LAT, lng: DEFAULT_LNG }
      zoomMap.value = 8
      return
    }
    map.fitBounds(bounds, { duration: 2000 })
  }

  const updateTruckPosition = (currentPos: any) => {
    truckPosition.lat = currentPos.lat
    truckPosition.lng = currentPos.lng
    if (focusLiveTracking.value) {
      mapCenter.value = { lat: currentPos.lat, lng: currentPos.lng }
      zoomMap.value = 17
    }
  }

  /** --- Main Logic Functions --- */
  const updateHeaderDate = async (date: Array<Dayjs>) => {
    if (currentAbortController.value) currentAbortController.value.abort()
    stopLiveTracking()
    await new Promise((resolve) => setTimeout(resolve, 100))
    // Use isAlreadyInTimeZone: true to prevent timezone conversion issues
    // The dates are already in the correct format from calendarDateToDayjs
    headerDate.value = [getStartOf(date[0], true), getEndOf(date[1])]
    currentAbortController.value = new AbortController()
    await getTrackings()
  }

  // Handle date selection
  const handleDateSelect = async (dates: [Dayjs, Dayjs]) => {
    await updateHeaderDate(dates)
  }
  handleDateSelectFn = handleDateSelect

  // Handle cancel button click
  const handleCancelDateSelect = () => {
    isCalendarOpen.value = false
    // Reset temp value to current value
    tempCalendarValueInternal.value = {
      start: calendarValue.value.start as CalendarDate,
      end: calendarValue.value.end as CalendarDate,
    }
  }

  // Handle apply button click
  const isApplyLoading = ref(false)
  const handleApplyDateSelect = async () => {
    if (tempCalendarValueInternal.value?.start && tempCalendarValueInternal.value?.end) {
      const startDate = calendarDateToDayjs(tempCalendarValueInternal.value.start as DateValue)
      const endDate = calendarDateToDayjs(tempCalendarValueInternal.value.end as DateValue)
      isApplyLoading.value = true
      try {
        await handleDateSelect([startDate, endDate])
        isCalendarOpen.value = false
      } finally {
        isApplyLoading.value = false
      }
    }
  }

  // Map Controls Logic
  const currentStatusFilter = ref('all')

  const mapStatuses = computed(() => {
    // Initialize counts
    const counts = {
      all: 0,
      off_duty: 0,
      sleeper: 0,
      driving: 0,
      on_duty: 0,
      ym: 0, // Yard Move (special Off Duty)
      pc: 0, // Personal Conveyance (special Off Duty)
    }

    // Count events from dailyTrackings
    if (dailyTrackings.value?.trackingEventResponse) {
      const events = dailyTrackings.value.trackingEventResponse
      counts.all = events.length

      events.forEach((event) => {
        // eventCode: 1 (OFF), 2 (SB), 3 (D), 4 (ON)
        // eventType: 1 (Normal), 2 (PC), 3 (YM)
        if (event.eventCode === 1) {
          if (event.eventType === 3) counts.ym++
          else if (event.eventType === 2) counts.pc++
          else counts.off_duty++
        } else if (event.eventCode === 2) {
          counts.sleeper++
        } else if (event.eventCode === 3) {
          counts.driving++
        } else if (event.eventCode === 4) {
          counts.on_duty++
        }
      })
    }

    return [
      { id: 'all', label: 'All', count: counts.all },
      {
        id: 'sleeper',
        label: 'Sleep',
        count: counts.sleeper,
        colorClass: 'bg-gray-900 border-white',
      },
      { id: 'on_duty', label: 'On duty', count: counts.on_duty, colorClass: 'bg-blue-500' },
      { id: 'ym', label: 'Off duty (YM)', count: counts.ym, colorClass: 'bg-red-500' },
      { id: 'driving', label: 'Driving', count: counts.driving, colorClass: 'bg-green-500' },
      { id: 'pc', label: 'Off duty (PC)', count: counts.pc, colorClass: 'bg-orange-500' },
    ]
  })

  const updateMapLayer = (layer: string) => {
    if (layer === 'roadmap') mapType.value = 'roadmap'
    else if (layer === 'terrain') mapType.value = 'terrain'
    else if (layer === 'satellite') mapType.value = 'satellite'
  }

  const toggleWeather = (id: string, checked: boolean) => {
    console.log(`Toggle weather: ${id} -> ${checked}`)
    // Implement weather layer logic here
  }

  const toggleStations = (checked: boolean) => {
    console.log(`Toggle stations -> ${checked}`)
    // Implement stations layer logic here
  }

  const isTrafficActive = ref(false)

  const toggleTraffic = () => {
    // Implement traffic layer toggle if needed
    const google = (window as any).google
    if (mapInstance.value?.map && google) {
      if (!mapInstance.value.trafficLayer) {
        mapInstance.value.trafficLayer = new google.maps.TrafficLayer()
      }

      if (mapInstance.value.trafficLayer.getMap()) {
        mapInstance.value.trafficLayer.setMap(null)
        isTrafficActive.value = false
      } else {
        mapInstance.value.trafficLayer.setMap(mapInstance.value.map)
        isTrafficActive.value = true
      }
    }
  }

  const isParkingActive = computed(() => focusLiveTracking.value)

  const toggleParking = () => {
    // Toggle to Live Tracking mode when parking button is clicked
    focusLiveTracking.value = !focusLiveTracking.value
  }

  const handleToggleLiveTracking = (newValue: boolean) => {
    focusLiveTracking.value = newValue
  }

  const isFullscreen = ref(false)

  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value

    // Resize map trigger
    setTimeout(() => {
      const google = (window as any).google
      if (mapInstance.value?.map && google) {
        google.maps.event.trigger(mapInstance.value.map, 'resize')
        if (truckPosition.lat && truckPosition.lng) {
          mapInstance.value.map.setCenter({ lat: truckPosition.lat, lng: truckPosition.lng })
        }
      }
    }, 100)
  }

  // Driver information computed properties
  const driverName = computed(() => {
    // First try driverFullName from store
    if (driverFullName.value && driverFullName.value.trim() !== '') {
      return driverFullName.value
    }

    // Then try dailyTrackings
    if (dailyTrackings.value) {
      const firstName = dailyTrackings.value.firstName || ''
      const lastName = dailyTrackings.value.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()

      if (fullName && fullName !== 'null null' && fullName !== 'null') {
        return fullName
      }
    }

    // Fallback to 'N/A' if nothing is available
    return 'N/A'
  })

  const driverUnit = computed(() => {
    // Try to get vehicleUnit from dailyTrackings or from first event
    if (
      dailyTrackings.value?.trackingEventResponse &&
      dailyTrackings.value.trackingEventResponse.length > 0
    ) {
      return dailyTrackings.value.trackingEventResponse[0].vehicleUnit || 'N/A'
    }
    return 'N/A'
  })

  const driverPhone = computed(() => {
    return dailyTrackings.value?.phoneNumber || 'N/A'
  })

  const driverEmail = computed(() => {
    return dailyTrackings.value?.email || 'N/A'
  })

  // History events - show all event types
  const historyEvents = computed(() => {
    if (!dailyTrackings.value?.trackingEventResponse) return []

    const events = dailyTrackings.value.trackingEventResponse
    const filter = currentStatusFilter.value

    if (filter === 'all') {
      return events
    }

    // Filter based on status
    return events.filter((event) => {
      const code = Number(event.eventCode)
      const type = Number(event.eventType)

      if (filter === 'sleeper') return code === 2
      if (filter === 'driving') return code === 3
      if (filter === 'on_duty') return code === 4
      if (filter === 'ym') return code === 1 && type === 3
      if (filter === 'pc') return code === 1 && type === 2

      return false
    })
  })

  // Watch for filter changes to debug
  watch(currentStatusFilter, (newVal) => {
    console.log('Current Status Filter Changed:', newVal)
  })

  // Formatting functions
  const formatDateTime = (dateTime: string | Dayjs): string => {
    if (!dateTime) return 'N/A'
    const date = dayjs(dateTime)
    return date.format('MMM DD, hh:mm A')
  }

  const formattedStartTime = computed(() => {
    if (historyEvents.value.length > 0) {
      return formatDateTime(historyEvents.value[0].startTime)
    }
    if (
      dailyTrackings.value?.trackingEventResponse &&
      dailyTrackings.value.trackingEventResponse.length > 0
    ) {
      return formatDateTime(dailyTrackings.value.trackingEventResponse[0].startTime)
    }
    return 'N/A'
  })

  const formattedDistance = computed(() => {
    if (!dailyTrackings.value?.trackingEventResponse) return '0 km'
    const totalMiles = dailyTrackings.value.trackingEventResponse.reduce(
      (sum, event) => sum + (event.vehicleMiles || 0),
      0
    )
    const totalKm = totalMiles * 1.60934
    return `${Math.round(totalKm)} km`
  })

  const firstEvent = computed(() => {
    const events = dailyTrackings.value?.trackingEventResponse
    if (!events || events.length === 0) return null
    return events[0]
  })

  const lastEvent = computed(() => {
    const events = dailyTrackings.value?.trackingEventResponse
    if (!events || events.length === 0) return null
    return events[events.length - 1]
  })

  const formatDistance = (miles: number): string => {
    if (!miles) return '0 mi'
    return `${Math.round(miles)} mi`
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0s'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const formatEventTimeRange = (
    startTime: string | dayjs.Dayjs,
    endTime: string | dayjs.Dayjs
  ): string => {
    if (!startTime || !endTime) return 'N/A'
    const start = dayjs(startTime)
    const end = dayjs(endTime)
    return `${start.format('hh:mm A')} - ${end.format('hh:mm A')}`
  }

  // Event name helper
  const getEventName = (eventCode: number, eventType: number): string => {
    const eventMap: Record<number, string> = {
      1: eventType === 3 ? 'Off duty (YM)' : eventType === 2 ? 'Off duty (PC)' : 'Off duty',
      2: 'Sleep',
      3: 'Drive',
      4: 'On duty',
    }
    return eventMap[eventCode] || 'Unknown'
  }

  // Status colors matching DriverCard
  const STATUS_COLORS = {
    sleep: '#954BAF', // Sleep - Purple
    onDuty: '#6082E0', // On duty - Blue
    offDutyYM: '#AF4B4B', // Off duty (YM) - Red
    driving: '#589E67', // Driving - Green
    offDutyPC: '#D28E3D', // Off duty (PC) - Orange
  } as const

  // Get header color based on last event status from dailyTrackings
  const headerStatusColor = computed(() => {
    // Get the last event from trackingEventResponse array
    const events = dailyTrackings.value?.trackingEventResponse
    if (!events || events.length === 0) {
      return STATUS_COLORS.driving // Default to green if no events
    }

    // Get the last event (most recent)
    const lastEvent = events[events.length - 1]
    const eventCode = lastEvent.eventCode
    const eventType = lastEvent.eventType

    // Off duty (PC) - Orange (eventCode 1 with eventType === 2)
    // Off duty (YM) - Red (eventCode 1 with eventType === 3)
    // Off duty (regular) - Red (eventCode 1 with eventType === 1)
    if (eventCode === 1) {
      if (eventType === 2) {
        return STATUS_COLORS.offDutyPC // Personal Conveyance - Orange
      }
      // eventType === 3 (YM) or eventType === 1 (regular) both use Red
      return STATUS_COLORS.offDutyYM // Yard Move or regular Off duty - Red
    }

    const colorMap: Record<number, string> = {
      2: STATUS_COLORS.sleep, // Sleep - Purple
      3: STATUS_COLORS.driving, // Driving - Green
      4: STATUS_COLORS.onDuty, // On duty - Blue
    }

    return colorMap[eventCode] || STATUS_COLORS.driving // Default to green if unknown
  })

  // Email/Telegram update handlers
  const updateEmail = (index: number, value: string) => {
    liveState.emails[index] = value
  }

  const updateTelegram = (index: number, value: string) => {
    liveState.telegrams[index] = value
  }

  const validateFuelForm = (state: typeof fuelState) => {
    const errors = []
    if (state.kind === null || Number.isNaN(state.kind)) {
      errors.push({ path: 'fuelKind', message: 'Fuel kind is required' })
    }
    if (!state.radius || state.radius < 1) {
      errors.push({ path: 'radius', message: 'Radius must be at least 1' })
    }
    return errors
  }

  async function applyFilter() {
    fuelState.kind = Number(fuelState.kind)
    await fuelStore.getCheapestFuelStations(fuelState)
  }

  const updateETA = () => {
    if (!isDestinationRoute.value || !destinationMarker.visible) {
      estimatedTimeOfArrival.value = ''
      clearETAInfoWindow()
      return
    }
    const distance = calculateDistance(
      { lat: truckPosition.lat, lng: truckPosition.lng },
      { lat: destinationMarker.lat, lng: destinationMarker.lng }
    )
    destinationDistance.value = distance
    estimatedTimeOfArrival.value = calculateETA(distance, currentSpeed.value)

    if (mapInstance.value && estimatedTimeOfArrival.value) {
      const distanceText = (distance / 1000).toFixed(1) + 'km'
      showETAInfoWindow(
        mapInstance.value,
        { lat: destinationMarker.lat, lng: destinationMarker.lng },
        estimatedTimeOfArrival.value,
        distanceText
      )
    }
  }

  const setupInitialRoute = async () => {
    if (lastEventStatus.value === 'DS_D' && everyTrackings.value?.length > 0) {
      const initialTracking = everyTrackings.value.at(0)
      const latestTracking = everyTrackings.value.at(-1)
      const startPos = {
        lat: Number(initialTracking?.latitude),
        lng: Number(initialTracking?.longitude),
      }
      const endPos = {
        lat: Number(latestTracking?.latitude),
        lng: Number(latestTracking?.longitude),
      }
      if (mapInstance.value && startPos.lat && startPos.lng && endPos.lat && endPos.lng) {
        try {
          const routeResult = await updateLiveRoute(mapInstance.value, startPos, endPos, false)
          const pathPoints = getRoutePathPoints(routeResult)
          if (pathPoints && pathPoints.length > 1) {
            updateAnimationPath(pathPoints)
            animationState.allowedDistance = animationState.totalDistance
            startAnimation(updateTruckPosition)
          }
        } catch (error) {
          console.error('Initial route setup failed:', error)
        }
      }
    }
  }

  const handleNewLocation = async (newLocation: any) => {
    try {
      const currentPosition = {
        lat: truckPosition.lat || initialPosition.lat,
        lng: truckPosition.lng || initialPosition.lng,
      }

      if (!isSetFirstTrack.value) {
        truckPosition.lat = newLocation.latitude
        truckPosition.lng = newLocation.longitude
        isSetFirstTrack.value = true
        if (focusLiveTracking.value) {
          mapCenter.value = { lat: truckPosition.lat, lng: truckPosition.lng }
        }
        return
      }

      stopAnimation()
      const routeResult = await updateLiveRoute(
        mapInstance.value,
        currentPosition,
        newLocation,
        false
      )
      const pathPoints = getRoutePathPoints(routeResult)

      if (pathPoints && pathPoints.length > 1) {
        updateAnimationPath(pathPoints)
        if (animationState.totalDistance < MINIMUM_DISTANCE_THRESHOLD) {
          truckPosition.lat = newLocation.latitude
          truckPosition.lng = newLocation.longitude
          if (focusLiveTracking.value) {
            mapCenter.value = { lat: truckPosition.lat, lng: truckPosition.lng }
          }
          return
        }
        const animationDurationSeconds = animationState.TRACKING_UPDATE_PERIOD / 1000
        const calculatedSpeed = animationState.totalDistance / animationDurationSeconds
        animationState.animationSpeed = Math.max(ANIMATION_CONFIG.MINIMUM_SPEED_MS, calculatedSpeed)
        animationState.allowedDistance = animationState.totalDistance
        startAnimation(updateTruckPosition)
      }
    } catch (error) {
      console.error('Route update failed:', error)
    }
  }

  const updateLiveLocation = async () => {
    try {
      // Use current lastEventTime, or fallback to start of today if not set
      const eventDateTime =
        lastEventTime.value || formatToUTC(getStartOf(convertToTimeZone(dayjs())))

      const model = {
        driverId: route.params.id as string,
        lastEventDateTime: eventDateTime,
      }

      console.log('🔄 Fetching live location:', model)

      const newEvent: any = await trackingsStore.getDriverLastEvent(model)
      liveTrackingRetryCount.value = 0
      liveTrackingError.value = null

      // Update lastEventTime for next poll
      if (newEvent.lastEventTime) {
        lastEventTime.value = newEvent.lastEventTime
      }

      console.log('📍 Live location received:', {
        status: newEvent.lastEventStatus,
        location: newEvent.lastLocation,
        time: newEvent.lastEventTime,
      })

      if (newEvent.lastLocation?.latitude && newEvent.lastLocation?.longitude) {
        const lastLat = newEvent.lastLocation.latitude
        const lastLng = newEvent.lastLocation.longitude

        if (!isValidCoordinates(lastLat, lastLng)) return

        fuelState.lon = lastLng
        fuelState.lat = lastLat
        liveTrackingForm.latitude = lastLat.toString()
        liveTrackingForm.longitude = lastLng.toString()

        if (newEvent.lastEventStatus === 'DS_D') {
          let vehicleSpeed = 0
          if (newEvent.trackingEvents && newEvent.trackingEvents.length > 0) {
            const latest = newEvent.trackingEvents[0]
            vehicleSpeed = latest.vehicleSpeed || 0
            everyTrackings.value.push({ ...latest })
          }

          currentSpeed.value = vehicleSpeed || 63
          if (isDestinationRoute.value) updateETA()

          const newLocation = {
            speed: vehicleSpeed,
            latitude: lastLat,
            longitude: lastLng,
          }

          if (mapInstance.value) {
            if (justReturnedFromTab.value) {
              truckPosition.lat = lastLat
              truckPosition.lng = lastLng
              if (focusLiveTracking.value) {
                mapCenter.value = { lat: lastLat, lng: lastLng }
                zoomMap.value = 17
              }
              justReturnedFromTab.value = false
            } else {
              if (!animationState.isAnimating && animationState.path.length === 0) {
                await setupInitialRoute()
              }
              await handleNewLocation(newLocation)
            }
          }
        } else {
          if (focusLiveTracking.value && mapInstance.value) {
            mapCenter.value = { lat: lastLat, lng: lastLng }
            truckPosition.lat = lastLat
            truckPosition.lng = lastLng
          }
        }
      }
    } catch (error: any) {
      liveTrackingRetryCount.value++
      if (liveTrackingRetryCount.value >= MAX_RETRY_COUNT) {
        liveTrackingError.value = 'Unable to fetch live location.'
        stopLiveTracking()
      } else {
        liveTrackingError.value = `Connection issue (retry ${liveTrackingRetryCount.value}/${MAX_RETRY_COUNT})`
      }
    }
  }

  const startLiveTracking = async () => {
    if (liveTrackingInterval.value) clearInterval(liveTrackingInterval.value)
    isLiveTracking.value = true

    console.log('📡 Live tracking started')

    // Immediately fetch the first location update
    await updateLiveLocation()

    // Then continue polling every TRACKING_UPDATE_PERIOD (10 seconds)
    liveTrackingInterval.value = setInterval(async () => {
      await updateLiveLocation()
    }, animationState.TRACKING_UPDATE_PERIOD)
  }

  const stopLiveTracking = () => {
    cleanup()
  }

  const resetState = () => {
    stopAnimation()
    truckPosition.lat = 0
    truckPosition.lng = 0
    initialPosition.lat = 0
    initialPosition.lng = 0
    isSetFirstTrack.value = false
    isLiveTracking.value = false
  }

  const cleanup = () => {
    if (liveTrackingInterval.value) {
      clearInterval(liveTrackingInterval.value)
      liveTrackingInterval.value = null
    }
    stopAnimation()
    if (currentAbortController.value) {
      currentAbortController.value.abort()
      currentAbortController.value = null
    }
    cleanUpRenderers()
    resetState()
  }

  const addEmail = () => liveState.emails.push('')
  const removeEmail = (index: number) => {
    if (liveState.emails.length > 1) liveState.emails.splice(index, 1)
  }
  const addTelegram = () => liveState.telegrams.push('')
  const removeTelegram = (index: number) => {
    if (liveState.telegrams.length > 1) liveState.telegrams.splice(index, 1)
  }

  const getTrackings = async () => {
    const model: DriverLogsDailyEventsRequest = {
      driverId: route.params.id as string,
      startDate: formatToUTC(getStartOf(headerDate.value[0])),
      endDate: formatToUTC(getEndOf(headerDate.value[1])),
    }
    await trackingsStore.getDriverDailyTrackings(model)
    await trackingsStore.getDriverEveryTrackings(model)

    if (dailyTrackings.value) {
      dailyTrackings.value.trackingEventResponse =
        dailyTrackings.value.trackingEventResponse.filter((tracking) =>
          isValidCoordinates(tracking.latitude, tracking.longitude)
        )
      dailyTrackings.value.trackingEventResponse.forEach((tracking) => {
        trackingTooltips.value[tracking.eventId as string] = false
      })
    }

    if (everyTrackings.value) {
      everyTrackings.value = everyTrackings.value.filter((tracking) =>
        isValidCoordinates(tracking.latitude, tracking.longitude)
      )
      if (lastEventStatus.value === 'DS_D') {
        everyTrackings.value = everyTrackings.value.slice(0, -1)
      }

      // Set truck position from the last event in dailyTrackings (index 0 because array is reversed)
      if (
        dailyTrackings.value?.trackingEventResponse &&
        dailyTrackings.value.trackingEventResponse.length > 0
      ) {
        const lastDailyEvent = dailyTrackings.value.trackingEventResponse[0]
        if (lastDailyEvent) {
          truckPosition.lat = Number(lastDailyEvent.latitude)
          truckPosition.lng = Number(lastDailyEvent.longitude)
        }
      }

      // Set initial position from second to last event in dailyTrackings (index 1 because array is reversed)
      if (
        dailyTrackings.value?.trackingEventResponse &&
        dailyTrackings.value.trackingEventResponse.length > 1
      ) {
        const secondLastEvent = dailyTrackings.value.trackingEventResponse[1]
        if (secondLastEvent) {
          initialPosition.lat = Number(secondLastEvent.latitude)
          initialPosition.lng = Number(secondLastEvent.longitude)
        }
      }

      if (!route.query.latitude && !route.query.longitude) {
        liveTrackingForm.latitude = truckPosition.lat?.toString() || ''
        liveTrackingForm.longitude = truckPosition.lng?.toString() || ''
      }

      fuelState.lat = truckPosition.lat
      fuelState.lon = truckPosition.lng

      if (focusLiveTracking.value) {
        mapCenter.value = { lat: truckPosition.lat, lng: truckPosition.lng }
        zoomMap.value = 17
        mapType.value = 'satellite'
      } else {
        calculateCenter()
        mapType.value = 'roadmap'
      }

      try {
        // Use dailyTrackings for route rendering since it has all events
        const routePoints =
          dailyTrackings.value?.trackingEventResponse?.filter((t) =>
            isValidCoordinates(t.latitude, t.longitude)
          ) || []

        console.log('🔍 DEBUG: Route points from dailyTrackings:', routePoints.length)

        if (routePoints.length > 1) {
          const segments: any = await testDirectionsAPI(routePoints)
          console.log('🔍 DEBUG: segments returned:', segments?.length)

          if (segments?.length > 0) {
            isDestinationRoute.value = false
            historicalSegments.value = segments
            directionsSegments.value = segments
          }
        }
      } catch (error) {
        console.error('Directions API error:', error)
      }
    }
  }

  const selectEvent: (event: TrackingResponse) => void = (event) => {
    if (selectedEvent.value?.eventId === event.eventId) selectedEvent.value = null
    else selectedEvent.value = event

    if (
      selectedEvent.value &&
      selectedEvent.value?.eventCode === 3 &&
      selectedEvent.value.eventType === 1
    ) {
      selectedTrackingEvents.value = everyTrackings.value.filter((tracking) => {
        const eventTime = tracking.currentTime
        const startTime = selectedEvent.value?.startTime
        const endTime = selectedEvent.value?.endTime
        return (
          (dayjs(eventTime).isAfter(startTime) || dayjs(eventTime).isSame(startTime)) &&
          (dayjs(eventTime).isBefore(endTime) || dayjs(eventTime).isSame(endTime))
        )
      })
    } else {
      Object.keys(trackingTooltips.value).forEach((key) => (trackingTooltips.value[key] = false))
      trackingTooltips.value[selectedEvent.value?.eventId as string] =
        !trackingTooltips.value[selectedEvent.value?.eventId as string]
    }

    // Pan map to selected event's coordinates
    const lat = selectedEvent.value?.latitude
    const lng = selectedEvent.value?.longitude
    if (lat && lng) {
      mapCenter.value = { lat, lng }
      zoomMap.value = 15
      mapInstance.value?.map?.setCenter({ lat, lng })
    }
  }

  const submitLiveShare = async () => {
    const model = {
      ...liveState,
      expireAt: formatToUTC(liveState.expireAt),
      driverId: route.params.id as string,
    }
    saveLoading.value = true
    const res = await trackingsStore.createShareLive(model)
    saveLoading.value = false
    if (res) liveModal.value = false
  }

  const applyLiveTrackingRoute = async (selectedDestination?: DestinationSelection) => {
    try {
      const destinationLabel = selectedDestination?.label ?? liveTrackingForm.toDestination
      if (!destinationLabel) throw new Error('Destination label is required')

      // Use truck's current position if available, otherwise use form coordinates
      let originLat: number
      let originLng: number

      if (
        truckPosition.lat &&
        truckPosition.lng &&
        isValidCoordinates(truckPosition.lat, truckPosition.lng)
      ) {
        // Use driver's current position
        originLat = truckPosition.lat
        originLng = truckPosition.lng
        // Update form with current position
        liveTrackingForm.latitude = originLat.toString()
        liveTrackingForm.longitude = originLng.toString()
      } else {
        // Fallback to form coordinates
        originLat = parseFloat(liveTrackingForm.latitude)
        originLng = parseFloat(liveTrackingForm.longitude)
      }

      if (Number.isNaN(originLat) || Number.isNaN(originLng)) throw new Error('Invalid coordinates')

      await router.push({
        query: {
          ...route.query,
          latitude: liveTrackingForm.latitude,
          longitude: liveTrackingForm.longitude,
          fromLocation: liveTrackingForm.fromLocation,
          toDestination: destinationLabel,
          ...(selectedDestination
            ? {
                destinationLat: selectedDestination.lat.toString(),
                destinationLng: selectedDestination.lng.toString(),
              }
            : {}),
        },
      })

      let segments: any[] = []
      let destinationPoint: { latitude: number; longitude: number } | null = null

      if (selectedDestination) {
        destinationPoint = {
          latitude: selectedDestination.lat,
          longitude: selectedDestination.lng,
        }
        segments = (await testDirectionsAPI([
          { latitude: originLat, longitude: originLng },
          destinationPoint,
        ])) as any[]
      } else {
        const result = await calculateRouteFromAddress(originLat, originLng, destinationLabel)
        segments = result.segments
        destinationPoint = result.destination
      }

      if (segments?.length > 0 && destinationPoint) {
        isDestinationRoute.value = true
        directionsSegments.value = segments

        if (destinationPoint.latitude && destinationPoint.longitude) {
          destinationMarker.lat = destinationPoint.latitude
          destinationMarker.lng = destinationPoint.longitude
          destinationMarker.visible = true
        }

        if (!focusLiveTracking.value) {
          await nextTick()
          fitMapBounds(segments)
        }

        if (currentSpeed.value > 0) {
          updateETA()
        } else {
          const distance = calculateDistance(
            { lat: truckPosition.lat, lng: truckPosition.lng },
            { lat: destinationMarker.lat, lng: destinationMarker.lng }
          )
          destinationDistance.value = distance
          estimatedTimeOfArrival.value = calculateETA(distance, 0)
        }
      }

      mapType.value = 'hybrid'
      await nextTick()
      fitMapBounds(isDestinationRoute.value ? directionsSegments.value : undefined)
    } catch (error) {
      console.error('Failed to calculate route:', error)
    }
  }

  const handleVisibilityChange = async () => {
    if (document.hidden) {
      isTabVisible.value = false
      lastVisibleTime.value = Date.now()
      stopAnimation()
    } else {
      isTabVisible.value = true
      if (isLiveTracking.value) {
        justReturnedFromTab.value = true
        stopAnimation()
        await updateLiveLocation()
      }
    }
  }

  // 6. WATCHERS
  watch(directionsSegments, async (segments) => {
    const shouldRender = isDestinationRoute.value || !focusLiveTracking.value
    if (mapInstance.value && segments?.length > 0 && shouldRender) {
      await renderDirections(mapInstance.value, segments)
      if (!focusLiveTracking.value) {
        fitMapBounds(isDestinationRoute.value ? segments : undefined)
      }
    }
  })

  watch(focusLiveTracking, async (newVal) => {
    if (newVal) {
      selectedEvent.value = null
      if (isValidCoordinates(truckPosition.lat, truckPosition.lng)) {
        const google = (window as any).google
        const map = mapInstance.value?.map
        mapCenter.value = { lat: truckPosition.lat, lng: truckPosition.lng }
        zoomMap.value = 17
        if (map && google) {
          map.setZoom(17)
          map.setCenter(new google.maps.LatLng(truckPosition.lat, truckPosition.lng))
        }
      } else {
        mapCenter.value = { lat: DEFAULT_LAT, lng: DEFAULT_LNG }
        zoomMap.value = 8
      }
      cleanUpRenderers()
      if (
        isDestinationRoute.value &&
        directionsSegments.value?.length > 0 &&
        mapInstance.value?.map
      ) {
        await renderDirections(mapInstance.value, directionsSegments.value)
      }
      mapType.value = 'satellite'
    } else {
      if (directionsSegments.value?.length > 0) {
        fitMapBounds(isDestinationRoute.value ? directionsSegments.value : undefined)
      } else {
        fitMapBounds()
      }
      if (mapInstance.value?.map && directionsSegments.value?.length > 0) {
        await renderDirections(mapInstance.value, directionsSegments.value)
      }
      mapType.value = 'roadmap'
    }
  })

  watch(
    [lastEventStatus, lastEventTime],
    async ([status, time]) => {
      console.log('📍 Live tracking watcher triggered:', {
        status,
        time,
        isLiveTracking: isLiveTracking.value,
      })

      const headerEndDate = convertToTimeZone(headerDate.value[1])
      const todayDate = convertToTimeZone(dayjs())
      const isSameDay = headerEndDate.isSame(todayDate, 'day')

      console.log('📅 Date comparison:', {
        headerEndDate: headerEndDate.format('YYYY-MM-DD'),
        todayDate: todayDate.format('YYYY-MM-DD'),
        isSameDay,
      })

      if (!isLiveTracking.value && isSameDay && status && time) {
        await startLiveTracking()
      }
    },
    { immediate: false }
  )

  watch(liveModal, (val) => {
    if (!val) saveLoading.value = false
  })

  watch(
    () => ({ lat: liveTrackingForm.latitude, lng: liveTrackingForm.longitude }),
    async (newVal) => {
      const lat = parseFloat(newVal.lat)
      const lng = parseFloat(newVal.lng)
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        try {
          const address = await geoLocationsStore.getCalculatedAddress({
            latitude: lat,
            longitude: lng,
          })
          if (address) liveTrackingForm.fromLocation = address
        } catch (error) {
          console.error(error)
        }
      }
    },
    { deep: true }
  )

  watch(
    () => ({ lat: liveTrackingForm.latitude, lng: liveTrackingForm.longitude }),
    (newVal) => {
      const lat = parseFloat(newVal.lat)
      const lng = parseFloat(newVal.lng)
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        const currentLat = route.query.latitude as string
        const currentLng = route.query.longitude as string
        if (currentLat !== newVal.lat || currentLng !== newVal.lng) {
          router.replace({
            query: {
              ...route.query,
              latitude: newVal.lat,
              longitude: newVal.lng,
              fromLocation: liveTrackingForm.fromLocation,
              toDestination: liveTrackingForm.toDestination,
            },
          })
        }
      }
    },
    { deep: true }
  )

  watch(
    () => liveTrackingForm.toDestination,
    async (newVal) => {
      if (!newVal || newVal.trim() === '') {
        isDestinationRoute.value = false
        destinationMarker.visible = false
        destinationMarker.lat = 0
        destinationMarker.lng = 0
        currentSpeed.value = 0
        destinationDistance.value = 0
        estimatedTimeOfArrival.value = ''
        clearETAInfoWindow()
        cleanUpRenderers()
        directionsSegments.value = []
        await nextTick()
        if (historicalSegments.value?.length > 0) {
          directionsSegments.value = [...historicalSegments.value]
        }
        const query = { ...route.query }
        delete query.toDestination
        await router.replace({ query })
      }
    }
  )

  // ─── Mode coordination ────────────────────────────────────────────────────
  // Deactivates all mutually exclusive map modes at once
  const deactivateAllControls = () => {
    if (isTrafficActive.value) toggleTraffic()
    if (isParkingActive.value) toggleParking()
    if (isRoutingMode.value) isRoutingMode.value = false
  }

  const handleTrafficToggle = () => {
    const wasActive = isTrafficActive.value
    deactivateAllControls()
    if (!wasActive) toggleTraffic()
  }

  const handleParkingToggle = () => {
    const wasActive = isParkingActive.value
    deactivateAllControls()
    if (!wasActive) toggleParking()
  }

  const handleRoutingToggle = () => {
    const wasActive = isRoutingMode.value
    deactivateAllControls()
    if (!wasActive) {
      isRoutingMode.value = true
      // Pre-fill "from" field with current truck location when entering route mode
      if (liveTrackingForm.fromLocation) {
        routeForm.from = liveTrackingForm.fromLocation
      }
    } else {
      routeAlternatives.value = []
      clearDirectionsRenderers()
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Live tracking destination handler ───────────────────────────────────
  const selectedDestination = ref<RoutePoint | null>(null)

  const onSelectDestination = (option: RoutePoint) => {
    selectedDestination.value = option
    liveTrackingForm.toDestination = option.label
    destinationMarker.lat = option.lat
    destinationMarker.lng = option.lng
    destinationMarker.visible = true
  }

  const handleApplyDestinationRoute = async () => {
    await applyLiveTrackingRoute(selectedDestination.value ?? undefined)
  }

  watch(
    () => liveTrackingForm.toDestination,
    (value) => {
      if (selectedDestination.value && selectedDestination.value.label !== value) {
        selectedDestination.value = null
      }
    },
  )
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Mode persistence (URL query param) ──────────────────────────────────
  type OverviewMode = 'routing' | 'traffic' | 'parking' | 'liveTracking' | null

  const saveMode = (mode: OverviewMode) => {
    const query = { ...route.query }
    if (mode === null) {
      delete query.mode
    } else {
      query.mode = mode
    }
    router.replace({ query })
  }

  watch(isRoutingMode, (val) => {
    if (val) saveMode('routing')
  })
  watch(isTrafficActive, (val) => {
    if (val) saveMode('traffic')
  })
  watch(isParkingActive, (val) => {
    if (val) saveMode('parking')
  })
  watch(focusLiveTracking, (val) => {
    if (val) saveMode('liveTracking')
  })
  watch([isRoutingMode, isTrafficActive, isParkingActive, focusLiveTracking], ([r, t, p, l]) => {
    if (!r && !t && !p && !l) saveMode(null)
  })
  // ─────────────────────────────────────────────────────────────────────────

  // 7. LIFECYCLE HOOKS
  onMounted(async () => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    await Promise.allSettled([getTrackings()])

    // Restore active mode from URL query param
    const savedMode = route.query.mode as OverviewMode
    if (savedMode) {
      switch (savedMode) {
        case 'routing':
          handleRoutingToggle()
          break
        case 'traffic':
          handleTrafficToggle()
          break
        case 'parking':
          handleParkingToggle()
          break
        case 'liveTracking':
          handleToggleLiveTracking(true)
          break
      }
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stopLiveTracking()
    clearDirectionsRenderers()
  })

  return {
    headerDate,
    updateHeaderDate,
    dailyTrackings,
    everyTrackings,
    trackingTooltips,
    selectEvent,
    selectedEvent,
    selectedTrackingEvents,
    liveModal,
    liveState,
    submitLiveShare,
    addEmail,
    removeEmail,
    addTelegram,
    removeTelegram,
    updateEmail,
    updateTelegram,
    saveLoading,
    truckPosition,
    truckMarker,
    destinationMarker,
    truckHeading,
    ICON_ROT_OFFSET,
    animationState,
    startLiveTracking,
    stopLiveTracking,
    mapInstance,
    zoomMap,
    mapCenter,
    mapType,
    focusLiveTracking,
    fuelState,
    cheapestFuelStations,
    liveTrackingForm,
    validateFuelForm,
    applyFilter,
    isLiveTrackingFormValid,
    applyLiveTrackingRoute,
    currentSpeed,
    destinationDistance,
    estimatedTimeOfArrival,
    lastEventCode,
    lastEventType,
    // Calendar state and functions
    isCalendarOpen,
    calendarValue,
    tempCalendarValueForBinding,
    isDateDisabled,
    handleDateSelect,
    handleCancelDateSelect,
    handleApplyDateSelect,
    isApplyLoading,
    // Map controls
    currentStatusFilter,
    mapStatuses,
    updateMapLayer,
    toggleWeather,
    toggleStations,
    isTrafficActive,
    toggleTraffic,
    isParkingActive,
    toggleParking,
    handleToggleLiveTracking,
    isFullscreen,
    toggleFullscreen,
    // Driver information
    driverName,
    driverUnit,
    driverPhone,
    driverEmail,
    // History events and formatting
    historyEvents,
    formatDateTime,
    formattedStartTime,
    formattedDistance,
    formatDistance,
    formatDuration,
    formatEventTimeRange,
    getEventName,
    // Status colors
    headerStatusColor,

    // First and last events
    firstEvent,
    lastEvent,
    // Route mode
    isRoutingMode,
    routeForm,
    selectedRouteIndex,
    isFetchingRoutes,
    routeAlternatives,
    onSelectRouteFrom,
    onSelectRouteDestination,
    fetchRouteAlternatives,
    selectRoute,
    // Mode coordination
    handleTrafficToggle,
    handleParkingToggle,
    handleRoutingToggle,
    // Live destination
    selectedDestination,
    onSelectDestination,
    handleApplyDestinationRoute,
  }
}
