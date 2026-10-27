<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { getCompanyId } from '@/utils/company'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cycleRule as formatCycleRule, hours as formatCarrierHours, minutes as formatCarrierMinutes } from '@/modules/Company/utils/routeEldCarrierSettings'
import type { RouteEldCompanyProfileResponse } from '@/modules/Company/types/routeEldCompanyProfile'
import type { RouteEldLogDetail } from '@/modules/ELD/LogsModule/[Id]/types/routeEldDetail'
import { resolveRouteEldScheduleTimeZone } from '@/utils/routeEldTimeZone'

type Border = 'none' | 'usca' | 'high'

const props = defineProps<{
  open: boolean
  driverId: string
  driverName: string
  suggestedSpeed: number | null
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const api = useApi()
const authStore = useAuthStore()

const tripMiles = ref<number | string>('')
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
let loadVersion = 0

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
function formatHours(hours: number) {
  return `${hours.toFixed(1)}h`
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
  if (!open || !driverId) return

  tripMiles.value = ''
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
  sourceError.value = ''
  loading.value = true

  try {
    const companyId = authStore.companyId || getCompanyId()
    if (!companyId) throw new Error('Select a company to load its HOS settings.')
    const companyResponse = await api.get<{ successResult: RouteEldCompanyProfileResponse }>(
      ApiEndpoints.ROUTE_ELD_COMPANY_PROFILE(companyId)
    )
    if (version !== loadVersion) return
    const profile = companyResponse.data.successResult?.profile
    if (!profile?.timeZoneId) throw new Error('The company time zone is unavailable.')

    cycleRule.value = profile.cycleRuleId
    restartRule.value = profile.restartId
    restBreakRule.value = profile.restBreakId
    breakMinutes.value = Number(/^M(\d+)$/.exec(profile.restBreakId ?? '')?.[1]) || null
    cycleRestartHours.value = Number(/^H(\d+)$/.exec(profile.restartId ?? '')?.[1]) || null
    cycleLimitHours.value = Number(/^[A-Z]+_(\d+)_(\d+)$/.exec(profile.cycleRuleId ?? '')?.[1]) || null

    const detailResponse = await api.get<{ successResult: RouteEldLogDetail }>(
      ApiEndpoints.ROUTE_ELD_LOG_DETAIL(driverId),
      { params: { date: companyDate(profile.timeZoneId) } }
    )
    if (version !== loadVersion) return
    const detail = detailResponse.data.successResult
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
    else sourceError.value = 'Shift hours are unavailable. Enter them manually.'

    dailyResetHours.value = shiftLimitHours.value != null && shiftLimitHours.value < 24
      ? 24 - shiftLimitHours.value : null
    if (!driveLimitHours.value || driveUsedHours.value == null || !shiftLimitHours.value ||
        !breakAfterHours.value || !dailyResetHours.value ||
        !cycleLimitHours.value || cycleRemainingHours.value == null ||
        !cycleRestartHours.value || !breakMinutes.value)
      sourceError.value += `${sourceError.value ? ' ' : ''}HOS limits or company settings are unavailable; ETA cannot be calculated.`
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

        <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="eta-trip-miles">Trip miles</Label>
            <Input id="eta-trip-miles" v-model.number="tripMiles" type="number" min="0" step="any" placeholder="Enter distance" />
          </div>
          <div class="space-y-1.5">
            <Label for="eta-hours-used">Shift used today (h)</Label>
            <Input id="eta-hours-used" v-model.number="hoursUsed" type="number" min="0" step="any" />
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
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Drive time</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{{ canCalculate ? formatHours(driveHours) : '—' }}</p>
          </div>
          <div class="min-w-0 px-3">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Estimated ETA</p>
            <p class="mt-1 text-lg font-semibold text-[#D28E3D]">{{ canCalculate ? formatHours(eta) : '—' }}</p>
          </div>
          <div class="min-w-0 px-3">
            <p class="text-[10px] uppercase tracking-wide text-muted-foreground">Breaks</p>
            <p class="mt-1 text-lg font-semibold text-foreground">{{ canCalculate ? breaks : '—' }}</p>
          </div>
        </div>
      </div>
    </ModalContent>
  </Modal>
</template>
