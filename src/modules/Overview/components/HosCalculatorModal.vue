<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { useDarkMode } from '@/composables/useDarkMode'
import { getCompanyId } from '@/utils/company'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cycleRule as formatCycleRule, hours as formatCarrierHours, minutes as formatCarrierMinutes } from '@/modules/Company/utils/routeEldCarrierSettings'
import type { RouteEldCompanyProfileResponse } from '@/modules/Company/types/routeEldCompanyProfile'
import type { RouteEldHosStatus, RouteEldLogDetail } from '@/modules/ELD/LogsModule/[Id]/types/routeEldDetail'
import CHosClockRings from '@/modules/ELD/LogsModule/[Id]/components/detail/CHosClockRings.vue'
import { resolveRouteEldScheduleTimeZone } from '@/utils/routeEldTimeZone'
import CAlprLocationInput from '@/modules/AlprCamera/components/CAlprLocationInput.vue'
import type { AlprLocation } from '@/modules/AlprCamera/types'

type Border = 'none' | 'usca' | 'high'
type RouteOrigin = { latitude: number; longitude: number; timestamp: number; location: string | null }
type CacheEntry<T> = { value: T; expiresAt: number }

const HOS_CACHE_MS = 10 * 60_000
const CARRIER_CACHE_MS = 30 * 60_000
const companyCache = new Map<string, CacheEntry<RouteEldCompanyProfileResponse>>()
const companyPending = new Map<string, Promise<RouteEldCompanyProfileResponse>>()
const hosCache = new Map<string, CacheEntry<RouteEldLogDetail>>()
const hosPending = new Map<string, Promise<RouteEldLogDetail>>()

function cachedRequest<T>(
  cache: Map<string, CacheEntry<T>>,
  pending: Map<string, Promise<T>>,
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) return Promise.resolve(entry.value)
  cache.delete(key)
  const activeRequest = pending.get(key)
  if (activeRequest) return activeRequest
  const request = fetcher().then((value) => {
    for (const [cachedKey, cachedEntry] of cache) {
      if (cachedEntry.expiresAt <= Date.now()) cache.delete(cachedKey)
    }
    if (cache.size >= 50) cache.delete(cache.keys().next().value!)
    cache.set(key, { value, expiresAt: Date.now() + ttl })
    return value
  }).finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}

const props = defineProps<{
  open: boolean
  driverId: string
  driverName: string
  suggestedSpeed: number | null
  origin: RouteOrigin | null
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const api = useApi()
const authStore = useAuthStore()
const { isDarkMode } = useDarkMode()

const tripMiles = ref<number | string>('')
const destinationLabel = ref('')
const destination = ref<AlprLocation | null>(null)
const routeOrigin = ref<RouteOrigin | null>(null)
const routeMiles = ref<number | null>(null)
const distanceSource = ref<'none' | 'route' | 'manual'>('none')
const routeLoading = ref(false)
const routeError = ref('')
const hoursUsed = ref<number | string>(0)
const avgSpeed = ref<number | string>(60)
const border = ref<Border>('none')
const loading = ref(false)
const sourceError = ref('')
const cycleRule = ref<string | null>(null)
const restartRule = ref<string | null>(null)
const restBreakRule = ref<string | null>(null)
const breakMinutes = ref<number | null>(null)
const driveLimitHours = ref<number | null>(null)
const driveUsedHours = ref<number | null>(null)
const shiftLimitHours = ref<number | null>(null)
const breakAfterHours = ref<number | null>(null)
const dailyResetHours = ref<number | null>(null)
const cycleLimitHours = ref<number | null>(null)
const cycleRemainingHours = ref<number | null>(null)
const cycleRestartHours = ref<number | null>(null)
const hosStatus = ref<RouteEldHosStatus | null>(null)
let loadVersion = 0
let routeVersion = 0

const displayedOrigin = computed(() => routeOrigin.value ?? props.origin)
const originLocation = computed(() => {
  const origin = displayedOrigin.value
  if (!origin) return ''
  return origin.location?.trim() || `${origin.latitude.toFixed(5)}, ${origin.longitude.toFixed(5)}`
})
const originChanged = computed(() => destination.value && routeOrigin.value && props.origin &&
  (routeOrigin.value.latitude !== props.origin.latitude ||
    routeOrigin.value.longitude !== props.origin.longitude))

function setTripMiles(value: string | number) {
  routeVersion++
  routeLoading.value = false
  routeError.value = ''
  routeMiles.value = null
  distanceSource.value = 'manual'
  tripMiles.value = value
}

function clearDestination() {
  routeVersion++
  if (distanceSource.value === 'route') {
    tripMiles.value = ''
    distanceSource.value = 'none'
  }
  destination.value = null
  routeOrigin.value = null
  routeMiles.value = null
  routeLoading.value = false
  routeError.value = ''
}

async function waitForDirectionsService() {
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
    throw new Error('Map routing is unavailable. Enter trip miles manually.')
  const startedAt = Date.now()
  while (Date.now() - startedAt < 6_000) {
    const maps = (window as any).google?.maps
    if (maps?.DirectionsService) return maps
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Map routing is unavailable. Enter trip miles manually.')
}

async function calculateRouteMiles() {
  const selected = destination.value
  const origin = props.origin
  const version = ++routeVersion
  if (distanceSource.value === 'route') {
    tripMiles.value = ''
    distanceSource.value = 'none'
  }
  routeMiles.value = null
  routeLoading.value = false
  routeError.value = ''
  if (!selected) return
  if (!origin) {
    routeError.value = 'No last known driver location is available. Enter trip miles manually.'
    return
  }
  routeOrigin.value = { ...origin }
  routeLoading.value = true
  try {
    const maps = await waitForDirectionsService()
    if (version !== routeVersion || !props.open) return
    const result = await new maps.DirectionsService().route({
      origin: { lat: origin.latitude, lng: origin.longitude },
      destination: { lat: selected.latitude, lng: selected.longitude },
      travelMode: maps.TravelMode.DRIVING,
      provideRouteAlternatives: false,
    })
    if (version !== routeVersion || !props.open) return
    const legs = result?.routes?.[0]?.legs
    if (!legs?.length || legs.some((leg: any) => !Number.isFinite(leg.distance?.value)))
      throw new Error('No driving route was found. Enter trip miles manually.')
    const miles = Math.round(legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0) / 1609.344 * 10) / 10
    routeMiles.value = miles
    tripMiles.value = miles
    distanceSource.value = 'route'
  } catch (error) {
    if (version === routeVersion && props.open)
      routeError.value = error instanceof Error ? error.message : 'Road distance could not be calculated.'
  } finally {
    if (version === routeVersion) routeLoading.value = false
  }
}

function selectDestination(location: AlprLocation) {
  destination.value = location
  destinationLabel.value = location.label
  void calculateRouteMiles()
}

const borderOptions: { value: Border; label: string; delay: number }[] = [
  { value: 'none', label: 'None', delay: 0 },
  { value: 'usca', label: 'USA ⇄ CA (+1.5h)', delay: 1.5 },
  { value: 'high', label: 'High volume (+2.5h)', delay: 2.5 },
]

const nonnegative = (value: number | string) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}
const driveHours = computed(() => {
  const speed = nonnegative(avgSpeed.value)
  return speed > 0 ? nonnegative(tripMiles.value) / speed : 0
})
const canCalculate = computed(() =>
  String(tripMiles.value).trim() !== '' &&
  String(hoursUsed.value).trim() !== '' &&
  nonnegative(avgSpeed.value) > 0 &&
  driveLimitHours.value != null && driveLimitHours.value > 0 &&
  driveUsedHours.value != null &&
  shiftLimitHours.value != null && shiftLimitHours.value > 0 &&
  breakAfterHours.value != null && breakAfterHours.value > 0 &&
  dailyResetHours.value != null && dailyResetHours.value > 0 &&
  breakMinutes.value != null && breakMinutes.value > 0 &&
  cycleLimitHours.value != null && cycleLimitHours.value > 0 &&
  cycleRemainingHours.value != null &&
  cycleRestartHours.value != null && cycleRestartHours.value > 0
)
const breaks = computed(() => breakAfterHours.value
  ? Math.floor(driveHours.value / breakAfterHours.value) : 0)
const resets = computed(() => {
  if (!driveLimitHours.value || !shiftLimitHours.value || driveUsedHours.value == null) return 0
  const driveAvailable = Math.max(0, driveLimitHours.value - driveUsedHours.value)
  const shiftAvailable = Math.max(0, shiftLimitHours.value - nonnegative(hoursUsed.value))
  const available = Math.min(driveAvailable, shiftAvailable)
  const freshShiftCapacity = Math.min(driveLimitHours.value, shiftLimitHours.value)
  return driveHours.value <= available ? 0 : Math.ceil((driveHours.value - available) / freshShiftCapacity)
})
const cycleResets = computed(() => {
  if (!cycleLimitHours.value || cycleRemainingHours.value == null || driveHours.value === 0) return 0
  const remaining = Math.max(0, cycleRemainingHours.value)
  return driveHours.value <= remaining ? 0 : Math.ceil((driveHours.value - remaining) / cycleLimitHours.value)
})

const dailyResetsOutsideCycle = computed(() => Math.max(0, resets.value - cycleResets.value))
const borderDelay = computed(() => borderOptions.find((option) => option.value === border.value)?.delay ?? 0)
const eta = computed(() =>
  driveHours.value + breaks.value * (breakMinutes.value ?? 0) / 60 +
  dailyResetsOutsideCycle.value * (dailyResetHours.value ?? 0) +
  cycleResets.value * (cycleRestartHours.value ?? 0) + borderDelay.value
)
const etaNote = computed(() => {
  const parts = ['drive']
  if (breaks.value) parts.push(`${formatCompactHours(breaks.value * (breakMinutes.value ?? 0) / 60)} breaks`)
  if (dailyResetsOutsideCycle.value) parts.push(`${formatCompactHours(dailyResetsOutsideCycle.value * (dailyResetHours.value ?? 0))} reset`)
  if (cycleResets.value) parts.push(`${formatCompactHours(cycleResets.value * (cycleRestartHours.value ?? 0))} cycle restart`)
  if (borderDelay.value) parts.push(`${formatCompactHours(borderDelay.value)} border`)
  return parts.join(' + ')
})
const clockStats = computed(() => [
  { label: 'Break', clock: hosStatus.value?.break, color: '#D28E3D', lightBg: '#F5E9DA', darkBg: '#3d2e1f' },
  { label: 'Drive', clock: hosStatus.value?.drive, color: '#6082E0', lightBg: '#D6E1FF', darkBg: '#1e2b4d' },
  { label: 'Shift', clock: hosStatus.value?.shift, color: '#589E67', lightBg: '#DCF5E2', darkBg: '#1f3024' },
  { label: 'Cycle', clock: hosStatus.value?.cycle, color: '#AF4B4B', lightBg: '#F7E3E3', darkBg: '#3d1f1f' },
].map(({ label, clock, color, lightBg, darkBg }) => ({
  label,
  value: clock ? formatClock(clock.remainingMilliseconds) : '—',
  color,
  innerBg: isDarkMode.value ? darkBg : lightBg,
  progress: clock?.limitMilliseconds
    ? Math.min(100, Math.max(0, clock.remainingMilliseconds / clock.limitMilliseconds * 100)) : 0,
})))

function formatHours(hours: number) {
  const rounded = Math.round(Math.max(0, hours) * 10) / 10
  if (rounded < 24) return `${rounded.toFixed(1)}h`
  const days = Math.floor(rounded / 24)
  return `${days}d ${formatCompactHours(rounded - days * 24)}`
}

function formatCompactHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10
  return `${rounded}h`
}

function formatClock(milliseconds: number) {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60_000)
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

function companyDate(timeZoneId: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveRouteEldScheduleTimeZone(timeZoneId),
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

watch(() => [props.open, props.driverId] as const, async ([open, driverId]) => {
  const version = ++loadVersion
  routeVersion++
  if (!open || !driverId) return

  tripMiles.value = ''
  destinationLabel.value = ''
  destination.value = null
  routeOrigin.value = null
  routeMiles.value = null
  distanceSource.value = 'none'
  routeLoading.value = false
  routeError.value = ''
  hoursUsed.value = ''
  avgSpeed.value = props.suggestedSpeed && props.suggestedSpeed > 0
    ? Math.round(props.suggestedSpeed * 10) / 10 : 60
  border.value = 'none'
  cycleRule.value = null
  restartRule.value = null
  restBreakRule.value = null
  breakMinutes.value = null
  driveLimitHours.value = null
  driveUsedHours.value = null
  shiftLimitHours.value = null
  breakAfterHours.value = null
  dailyResetHours.value = null
  cycleLimitHours.value = null
  cycleRemainingHours.value = null
  cycleRestartHours.value = null
  hosStatus.value = null
  sourceError.value = ''
  loading.value = true

  try {
    const companyId = authStore.companyId || getCompanyId()
    if (!companyId) throw new Error('Select a company to load its HOS settings.')
    const principal = authStore.user?.id || authStore.getTokens() || ''
    const companyResponse = await cachedRequest(companyCache, companyPending,
      `${principal}:${companyId}`, CARRIER_CACHE_MS,
      async () => (await api.get<{ successResult: RouteEldCompanyProfileResponse }>(
        ApiEndpoints.ROUTE_ELD_COMPANY_PROFILE(companyId)
      )).data.successResult)
    if (version !== loadVersion) return
    const profile = companyResponse?.profile
    if (!profile?.timeZoneId) throw new Error('The company time zone is unavailable.')

    cycleRule.value = profile.cycleRuleId
    restartRule.value = profile.restartId
    restBreakRule.value = profile.restBreakId
    breakMinutes.value = Number(/^M(\d+)$/.exec(profile.restBreakId ?? '')?.[1]) || null
    cycleRestartHours.value = Number(/^H(\d+)$/.exec(profile.restartId ?? '')?.[1]) || null
    cycleLimitHours.value = Number(/^[A-Z]+_(\d+)_(\d+)$/.exec(profile.cycleRuleId ?? '')?.[1]) || null

    const date = companyDate(profile.timeZoneId)
    const detail = await cachedRequest(hosCache, hosPending,
      `${principal}:${companyId}:${driverId}:${date}`, HOS_CACHE_MS,
      async () => (await api.get<{ successResult: RouteEldLogDetail }>(
        ApiEndpoints.ROUTE_ELD_LOG_DETAIL(driverId),
        { params: { date } }
      )).data.successResult)
    if (version !== loadVersion) return
    hosStatus.value = detail?.hos ?? null
    const clockHours = (milliseconds: number | undefined) =>
      milliseconds != null && milliseconds > 0 ? milliseconds / 3_600_000 : null
    driveLimitHours.value = clockHours(detail?.hos?.drive?.limitMilliseconds)
    driveUsedHours.value = detail?.hos?.drive && driveLimitHours.value != null
      ? Math.max(0, driveLimitHours.value - detail.hos.drive.remainingMilliseconds / 3_600_000) : null
    breakAfterHours.value = clockHours(detail?.hos?.break?.limitMilliseconds)
    cycleRemainingHours.value = detail?.hos?.cycle
      ? Math.max(0, detail.hos.cycle.remainingMilliseconds / 3_600_000) : null
    shiftLimitHours.value = clockHours(detail?.hos?.shift?.limitMilliseconds)
    if (detail?.hos?.shift && shiftLimitHours.value != null)
      hoursUsed.value = Math.round(Math.max(0,
        shiftLimitHours.value - detail.hos.shift.remainingMilliseconds / 3_600_000
      ) * 100) / 100
    else sourceError.value = 'The Shift clock is unavailable for this driver; ETA cannot be calculated.'

    dailyResetHours.value = shiftLimitHours.value != null && shiftLimitHours.value < 24
      ? 24 - shiftLimitHours.value : null
    if (!driveLimitHours.value || driveUsedHours.value == null || !shiftLimitHours.value ||
        !breakAfterHours.value || !dailyResetHours.value ||
        !cycleLimitHours.value || cycleRemainingHours.value == null ||
        !cycleRestartHours.value || !breakMinutes.value)
      sourceError.value ||= 'HOS limits or company settings are unavailable; ETA cannot be calculated.'
  } catch (error) {
    if (version === loadVersion)
      sourceError.value = error instanceof Error ? error.message : 'HOS settings could not be loaded.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <Modal :open="open" @update:open="emit('update:open', $event)">
    <ModalContent max-width="2xl">
      <ModalHeader>
        <ModalTitle class="text-xl font-semibold">HOS Calculator</ModalTitle>
        <p class="text-xs text-muted-foreground">{{ driverName }}</p>
      </ModalHeader>
      <div class="space-y-5">
        <div v-if="cycleRule || restartRule || restBreakRule" class="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Cycle</p>
            <p class="mt-0.5 text-xs font-medium text-foreground">{{ formatCycleRule(cycleRule) }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Restart</p>
            <p class="mt-0.5 text-xs font-medium text-foreground">{{ formatCarrierHours(restartRule) }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Rest break</p>
            <p class="mt-0.5 text-xs font-medium text-foreground">{{ formatCarrierMinutes(restBreakRule) }}</p>
          </div>
        </div>
        <p v-if="loading" class="text-xs text-muted-foreground">Loading HOS data…</p>
        <p v-else-if="sourceError" class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{{ sourceError }}</p>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <Label>Destination</Label>
            <button v-if="destination && origin" type="button" class="text-xs font-medium text-primary hover:underline" :disabled="routeLoading" @click="calculateRouteMiles">
              Recalculate
            </button>
          </div>
          <CAlprLocationInput
            v-model="destinationLabel"
            placeholder="Search a destination or enter coordinates"
            @select="selectDestination"
            @clear="clearDestination"
          />
          <p class="text-[11px] text-muted-foreground">
            <template v-if="displayedOrigin">
              From last known driver location: {{ originLocation }} · {{ new Date(displayedOrigin.timestamp).toLocaleString() }}
              <span v-if="originChanged"> · New location available</span>
            </template>
            <template v-else>Last known driver location unavailable; enter miles manually.</template>
          </p>
          <p v-if="routeLoading" class="flex items-center gap-1.5 text-xs text-muted-foreground"><LoaderCircle class="h-3.5 w-3.5 animate-spin" /> Calculating road distance…</p>
          <p v-else-if="routeError" class="text-xs text-amber-700 dark:text-amber-300">{{ routeError }}</p>
          <p v-else-if="routeMiles != null" class="text-xs text-muted-foreground">Road route: {{ routeMiles }} mi</p>
        </div>

        <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="eta-trip-miles">Trip miles</Label>
            <Input id="eta-trip-miles" :model-value="tripMiles" type="number" min="0" step="any" placeholder="Enter distance" @update:model-value="setTripMiles" />
          </div>
          <div class="space-y-1.5">
            <Label for="eta-hours-used">Shift used today (h)</Label>
            <Input id="eta-hours-used" v-model.number="hoursUsed" type="number" min="0" step="any" :disabled="loading || shiftLimitHours == null" />
          </div>
          <div class="space-y-1.5">
            <Label for="eta-speed">Avg speed (mph)</Label>
            <Input id="eta-speed" v-model.number="avgSpeed" type="number" min="1" step="any" />
          </div>
          <div class="space-y-1.5">
            <Label for="eta-border">Border crossing</Label>
            <Select v-model="border">
              <SelectTrigger id="eta-border"><SelectValue placeholder="Select border crossing" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in borderOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/20 py-3">
          <div class="min-w-0 px-3">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Drive hours needed</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{{ canCalculate ? formatHours(driveHours) : '—' }}</p>
            <p class="mt-1 text-[11px] leading-snug text-muted-foreground">at selected speed</p>
          </div>
          <div class="min-w-0 px-3">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Realistic ETA</p>
            <p class="mt-1 text-lg font-semibold text-[#D28E3D]">{{ canCalculate ? formatHours(eta) : '—' }}</p>
            <p class="mt-1 text-[11px] leading-snug text-muted-foreground">{{ canCalculate ? etaNote : 'Enter trip miles to calculate' }}</p>
          </div>
          <div class="min-w-0 px-3">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Breaks required</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{{ canCalculate ? breaks : '—' }}</p>
            <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
              {{ breakMinutes ?? '—' }} min per {{ breakAfterHours != null ? formatCompactHours(breakAfterHours) : '—' }} drive
            </p>
          </div>
        </div>

        <div class="overflow-x-auto pb-1">
          <CHosClockRings :stats="clockStats" distributed />
        </div>
      </div>
    </ModalContent>
  </Modal>
</template>
