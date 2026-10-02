import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '@/composables/useAxiosService.ts'
import { ApiEndpoints } from '@/api/endpoints.ts'
import type {
  DailyTrackingResponse,
  LastTrackingResponse,
  EveryTrackingResponse,
  DriverLogsDailyEventsRequest,
  DriverLogsLastEventRequest,
  DriverLogsShareLiveRequest,
} from '@/types/tracking'
import { Dayjs } from 'dayjs'

interface DriverEveryTrackingsResponse {
  trackingEvents: EveryTrackingResponse[]
  lastEventStatus: string
  lastEventTime: string
  lastLocation: { latitude: number | null; longitude: number | null }
  lastEventType: number
  lastEventCode: number
  firstName: string
  lastName: string
}

type DriverLastEventResponse = DriverEveryTrackingsResponse

interface TelegramApiResponse {
  status: string
  message?: string
}

export const useTrackingStore = defineStore('tracking', () => {
  const api = useApi()

  const dailyTrackings = ref<DailyTrackingResponse | undefined>()
  const lastTrackings = ref<LastTrackingResponse[]>([])
  const trackingTooltips = ref<{ [key: string]: boolean }>({})
  const everyTrackings = ref<EveryTrackingResponse[]>([])

  const lastEventStatus = ref<string>('')
  const lastEventTime = ref<string>('')
  const lastEventType = ref<number>(1)
  const lastEventCode = ref<number>(1)
  const lastLocation = ref<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  })
  const driverFullName = ref<string>('')

  const liveShareExpired = ref<boolean>(false)
  const prevEventBeforeLastOverview = ref<EveryTrackingResponse>()
  const lastOverviewEvent = ref<EveryTrackingResponse>()

  const capitalizeKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(capitalizeKeys)

    return Object.entries(obj).reduce((acc, [key, value]) => {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
      acc[capitalizedKey] = typeof value === 'object' ? capitalizeKeys(value) : value
      return acc
    }, {} as any)
  }

  async function getDriverDailyTrackings(
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ) {
    try {
      const result = await api.get<{ successResult: DailyTrackingResponse }>(
        ApiEndpoints.TRACKING_DRIVER_DAILY_EVENTS,
        {
          params: capitalizeKeys(model),
          signal,
        }
      )
      if (result.data?.successResult) {
        dailyTrackings.value = result.data.successResult
        if (Array.isArray(dailyTrackings.value?.trackingEventResponse)) {
          dailyTrackings.value.trackingEventResponse.reverse()
        }
      }
      console.log('tracking', dailyTrackings.value)
    } catch (error) {
      console.error('Error fetching daily trackings:', error)
      throw error
    }
  }

  async function getDriverLastTrackings(companyId: string, search?: string) {
    try {
      const params: any = { companyId }
      if (search) {
        params.searchQuery = search
      }
      const result = await api.get<{ successResult: LastTrackingResponse[] }>(
        ApiEndpoints.TRACKING_DRIVERS_LAST_EVENTS,
        { params }
      )
      if (result.data?.successResult) {
        lastTrackings.value = result.data.successResult
      }
    } catch (error) {
      console.error('Error fetching last trackings:', error)
      throw error
    }
  }

  async function getDriverEveryTrackings(
    model: DriverLogsDailyEventsRequest,
    signal?: AbortSignal
  ) {
    try {
      const result = await api.get<{ successResult: DriverEveryTrackingsResponse }>(
        ApiEndpoints.TRACKING_DRIVERS_EVERY,
        {
          params: capitalizeKeys(model),
          signal,
        }
      )
      if (result.data?.successResult) {
        const data = result.data.successResult
        everyTrackings.value = data.trackingEvents
        lastEventStatus.value = data.lastEventStatus
        lastEventTime.value = data.lastEventTime
        lastEventType.value = data.lastEventType
        lastEventCode.value = data.lastEventCode
        driverFullName.value = `${data.firstName} ${data.lastName}`.trim()

        const { latitude, longitude } = data.lastLocation
        if (latitude !== null && longitude !== null) {
          lastLocation.value = { latitude, longitude }
        }
      }
    } catch (error) {
      console.error('Error fetching every trackings:', error)
      throw error
    }
  }

  async function getDriverLastEvent(model: DriverLogsLastEventRequest) {
    try {
      const result = await api.get<{ successResult: DriverLastEventResponse }>(
        ApiEndpoints.TRACKING_DRIVER_LAST_EVENT,
        { params: capitalizeKeys(model) }
      )
      if (result.data?.successResult) {
        const data = result.data.successResult
        everyTrackings.value = data.trackingEvents
        lastEventStatus.value = data.lastEventStatus
        lastEventTime.value = data.lastEventTime
        lastEventType.value = data.lastEventType
        lastEventCode.value = data.lastEventCode

        // DO NOT update driverFullName here - it should only come from getDriverDailyTrackings
        // driverFullName.value is populated by api/tracking/driver-daily-events

        const { latitude, longitude } = data.lastLocation
        if (latitude !== null && longitude !== null) {
          lastLocation.value = { latitude, longitude }
        }

        prevEventBeforeLastOverview.value = lastOverviewEvent.value
        lastOverviewEvent.value = everyTrackings.value?.at(-1)

        return result.data.successResult
      }
    } catch (error) {
      console.error('Error fetching last event:', error)
      throw error
    }
  }

  async function createShareLive(model: DriverLogsShareLiveRequest) {
    try {
      const result = await api.post<any>(
        ApiEndpoints.TRACKING_CREATE_LIVE_SHARE,
        capitalizeKeys(model)
      )

      if (result.status !== 200 || result.data?.isSuccess === false) {
        throw new Error(result.data?.error?.message || 'Failed to create live share')
      }

      const telegramResults = await Promise.allSettled(
        model.telegrams.map(async (username) => {
          const telegramResponse = await api.post<TelegramApiResponse>(
            ApiEndpoints.TELEGRAM_SEND_MESSAGE,
            {
              username,
              live_share_url: result.data?.successResult.shareUrl,
              expire_at_utc: result.data?.successResult.expireAt as string,
            }
          )

          if (telegramResponse?.status === 200 && telegramResponse?.data?.status === 'success') {
            return { username, result: 'success' }
          } else {
            throw new Error(`Failed to send to ${username}`)
          }
        })
      )

      const fulfilled = telegramResults.filter((r) => r.status === 'fulfilled')
      const rejected = telegramResults.filter((r) => r.status === 'rejected')

      return {
        status: rejected.length > 0 ? 'partial' : 'success',
        liveShare: result.data?.successResult || null,
        telegramResults: { fulfilled, rejected },
      }
    } catch (error) {
      console.error('Error creating live share:', error)
      throw error
    }
  }

  return {
    dailyTrackings,
    lastTrackings,
    trackingTooltips,
    everyTrackings,
    lastEventStatus,
    lastEventTime,
    lastEventType,
    lastEventCode,
    lastLocation,
    driverFullName,
    liveShareExpired,
    prevEventBeforeLastOverview,
    lastOverviewEvent,

    getDriverDailyTrackings,
    getDriverLastTrackings,
    getDriverEveryTrackings,
    getDriverLastEvent,
    createShareLive,
  }
})
