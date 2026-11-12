import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiErrorMessage, useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useAuditStore } from '../store/auditStore'
import { useGeoLocationsStore } from '@/modules/Overview/store/geoLocations'
import { getCompanyId } from '@/utils/company'
import type { RouteEldCompaniesResponse } from '@/types/company'
import type { RouteEldDriverOption } from '@/modules/Tools/DotInspection/types'
import { formatTime } from '@/utils/time'
import { toast } from 'vue-sonner'
import type { Dayjs } from 'dayjs'
import type {
  Trip,
  AuditRequest,
  AuditTripForm,
  FuelLocationItem,
  TimeValue,
  AuditCarrier,
  AuditDriver,
} from '../types'

function createEmptyTrip(): Trip {
  return {
    bolNumber: '',
    trailerNumber: '',
    odometer: 0,
    engineHours: 0,
    shiftDistanceInMile: 0,
    from: { latitude: 0, longitude: 0, address: '', locationType: 2 },
    to: { latitude: 0, longitude: 0, address: '', locationType: 3 },
    fromLocations: [{ latitude: 0, longitude: 0, address: '', locationType: 2 }],
    toLocations: [{ latitude: 0, longitude: 0, address: '', locationType: 3 }],
    fuelLocations: [],
  }
}

export function useAuditForm() {
  const api = useApi()
  const router = useRouter()
  const auditStore = useAuditStore()
  const geoLocationsStore = useGeoLocationsStore()
  const { convertToTimeZone } = useTimeZoneHelper()

  const loading = ref(false)
  const generationError = ref('')
  const tripsSaved = ref(false)

  const carriers = ref<AuditCarrier[]>([])
  const drivers = ref<AuditDriver[]>([])
  const carrierExternalIds = new Map<string, string>()

  async function fetchCarriers() {
    const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
    const companies = response.data.successResult
    carriers.value = companies.map((company) => ({
      id: company.id,
      name: company.name,
    }))
    for (const company of companies) {
      carrierExternalIds.set(company.id, company.externalCompanyId)
    }
  }

  async function fetchDrivers(carrierId: string) {
    const response = await api.get<RouteEldDriverOption[] | { successResult: RouteEldDriverOption[] }>(ApiEndpoints.ROUTE_ELD_DRIVERS)
    const options = Array.isArray(response.data) ? response.data : response.data.successResult
    drivers.value = options
      .filter((driver) => driver.externalCompanyId === carrierExternalIds.get(carrierId))
      .map((driver) => ({ id: driver.id, name: driver.displayName }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const auditFormAll = reactive<AuditRequest>({
    carrierId: '',
    driverId: '',
    startDate: convertToTimeZone(),
    startTime: {
      hours: convertToTimeZone().hour(),
      minutes: convertToTimeZone().minute(),
      seconds: convertToTimeZone().second(),
    },
    endDate: convertToTimeZone(),
    endTime: {
      hours: convertToTimeZone().hour(),
      minutes: convertToTimeZone().minute(),
      seconds: convertToTimeZone().second(),
    },
    trips: [createEmptyTrip()],
  })

  const selectedTripIndex = ref(0)
  const selectedTrip = computed(() => auditFormAll.trips[selectedTripIndex.value])
  const auditId = ref('')
  const formKeys = ref<number[]>([Date.now()])

  const tripNumbers = computed(() =>
    Array.from({ length: auditFormAll.trips.length }, (_, i) => i + 1)
  )

  const disableAuditForm = computed(() => {
    if (!auditFormAll.carrierId || !auditFormAll.driverId) return true

    for (const trip of auditFormAll.trips) {
      if (
        !trip.bolNumber ||
        !trip.trailerNumber ||
        typeof trip.odometer !== 'number' ||
        typeof trip.engineHours !== 'number' ||
        !trip.fuelLocations
      ) {
        return true
      }
      const pickups = trip.fromLocations?.length ? trip.fromLocations : [trip.from]
      const deliveries = trip.toLocations?.length ? trip.toLocations : [trip.to]
      if (!pickups.length || !deliveries.length ||
        [...pickups, ...deliveries].some((location) => !location?.address ||
          !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 ||
          !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180)) return true
      for (const fuel of trip.fuelLocations) {
        if (!fuel.address || !fuel.latitude || !fuel.longitude) return true
      }
    }
    return false
  })

  function addTrip() {
    auditFormAll.trips.push(createEmptyTrip())
    formKeys.value.push(Date.now())
    selectedTripIndex.value = auditFormAll.trips.length - 1
  }

  function deleteTrip() {
    if (auditFormAll.trips.length <= 1) return
    if (selectedTripIndex.value !== auditFormAll.trips.length - 1) return

    auditFormAll.trips.pop()
    formKeys.value.pop()
    selectedTripIndex.value = auditFormAll.trips.length - 1
  }

  function selectTrip(index: number) {
    selectedTripIndex.value = index
  }

  function resetCurrentTrip() {
    const index = auditFormAll.trips.length - 1
    if (selectedTripIndex.value !== index) return

    auditFormAll.trips[index] = createEmptyTrip()
    selectedTripIndex.value = index
    formKeys.value[index] = Date.now()
  }

  function updateTrip(trip: Trip, index: number) {
    auditFormAll.trips[index] = trip
  }

  function updateConstants(newConstants: {
    carrierId: string
    driverId: string
    startDate: Dayjs
    endDate: Dayjs
    startTime: TimeValue
    endTime: TimeValue
    odometer: number
    engineHours: number
    distance: number
  }) {
    auditFormAll.driverId = newConstants.driverId
    auditFormAll.carrierId = newConstants.carrierId
    auditFormAll.startDate = newConstants.startDate
    auditFormAll.endDate = newConstants.endDate
    auditFormAll.startTime = newConstants.startTime
    auditFormAll.endTime = newConstants.endTime
    auditFormAll.trips[0].odometer = newConstants.odometer
    auditFormAll.trips[0].engineHours = newConstants.engineHours
    auditFormAll.trips[0].shiftDistanceInMile = newConstants.distance
  }

  async function resolveAddress(latitude: number, longitude: number): Promise<string> {
    if (
      latitude &&
      longitude &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return (await geoLocationsStore.getCalculatedAddress({ latitude, longitude })) || ''
    }
    return ''
  }

  async function copyLongLat(location: { latitude: number; longitude: number }) {
    if (!location.latitude && !location.longitude) return
    await navigator.clipboard.writeText(`${location.latitude ?? ''} ${location.longitude ?? ''}`)
    toast.success('Coordinates copied')
  }

  async function pasteLongLat(location: {
    latitude: number
    longitude: number
    location?: string
  }) {
    try {
      const text = await navigator.clipboard.readText()
      const regex = /^([+-]?\d*\.?\d+)\s*[^0-9+-]*\s*([+-]?\d*\.?\d+)/
      const match = text.match(regex)
      if (match) {
        location.latitude = parseFloat(match[1])
        location.longitude = parseFloat(match[2])
        toast.success('Coordinates pasted')
      } else {
        toast.error('Invalid coordinates format in clipboard')
      }
    } catch {
      toast.error('Failed to read clipboard')
    }
  }

  async function addAudit() {
    loading.value = true
    generationError.value = ''
    try {
      const model: AuditRequest = { ...auditFormAll }
      model.startDate = formatTime(auditFormAll.startDate as Dayjs, 'YYYY-MM-DD')
      model.endDate = formatTime(auditFormAll.endDate as Dayjs, 'YYYY-MM-DD')

      if (typeof auditFormAll.startTime === 'object') {
        const t = auditFormAll.startTime as TimeValue
        model.startTime = `${t.hours.toString().padStart(2, '0')}:${t.minutes.toString().padStart(2, '0')}:${t.seconds.toString().padStart(2, '0')}`
      }
      if (typeof auditFormAll.endTime === 'object') {
        const t = auditFormAll.endTime as TimeValue
        model.endTime = `${t.hours.toString().padStart(2, '0')}:${t.minutes.toString().padStart(2, '0')}:${t.seconds.toString().padStart(2, '0')}`
      }

      const result = await auditStore.addAudit(model)
      if (result) {
        auditId.value = result.auditId
        localStorage.setItem('tripNumbers', JSON.stringify(tripNumbers.value))
        tripsSaved.value = true
      }
    } catch (error) {
      generationError.value = getApiErrorMessage(error, 'Could not generate the audit draft.')
    } finally {
      loading.value = false
    }
  }

  async function navigateToBoost() {
    if (auditFormAll.driverId && auditId.value) {
      await router.push({
        path: `/logs/${auditFormAll.driverId}/boost`,
        query: { sessionId: auditId.value, auditSessionId: auditId.value },
      })
    }
  }

  watch(
    () => auditFormAll.carrierId,
    async (newCarrierId) => {
      if (newCarrierId) {
        await fetchDrivers(newCarrierId)
      } else {
        drivers.value = []
      }
    }
  )

  onMounted(async () => {
    await fetchCarriers()

    const currentCarrierId = getCompanyId()
    if (currentCarrierId && !auditFormAll.carrierId) {
      auditFormAll.carrierId = currentCarrierId
    }
  })

  return {
    loading,
    generationError,
    tripsSaved,
    carriers,
    drivers,
    auditFormAll,
    auditId,
    formKeys,
    selectedTripIndex,

    selectedTrip,
    tripNumbers,
    disableAuditForm,

    addTrip,
    deleteTrip,
    selectTrip,
    resetCurrentTrip,
    updateTrip,
    updateConstants,

    resolveAddress,

    copyLongLat,
    pasteLongLat,

    addAudit,
    navigateToBoost,
  }
}
