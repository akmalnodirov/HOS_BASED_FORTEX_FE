<template>
  <div class="flex items-start justify-between">
    <div class="space-y-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <h1 class="lg:text-sm 2xl:text-base font-semibold text-foreground uppercase">
            {{ driverInfo?.name || 'N/A' }}
          </h1>
          <CEventBadge
            v-if="driverInfo?.lastEventType != null"
            :event-code="driverInfo.lastEventCode ?? 0"
            :event-type="driverInfo.lastEventType"
          />
          <span
            v-if="driverInfo?.connectionStatus"
            class="flex items-center gap-1 text-xs font-medium"
            :class="connectionStatusClass"
          >
            <Wifi v-if="driverInfo.connectionStatus === 'CONNECTED'" class="h-3.5 w-3.5" />
            <WifiOff v-else class="h-3.5 w-3.5" />
            {{ connectionStatusLabel }}
          </span>
        </div>
      </div>

      <div class="flex gap-x-8 font-normal text-sm">
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Mail class="w-4 h-4" />
            <span>{{ driverInfo?.email || 'N/A' }}</span>
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <Phone class="w-4 h-4" />
            <span>{{ driverInfo?.phone || 'N/A' }}</span>
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.6663 10.6667V4.13333C10.6663 3.3866 10.6663 3.01323 10.521 2.72801C10.3932 2.47713 10.1892 2.27316 9.93833 2.14532C9.65311 2 9.27974 2 8.53301 2H3.46634C2.7196 2 2.34624 2 2.06102 2.14532C1.81014 2.27316 1.60616 2.47713 1.47833 2.72801C1.33301 3.01323 1.33301 3.3866 1.33301 4.13333V8.53333C1.33301 9.28007 1.33301 9.65344 1.47833 9.93865C1.60616 10.1895 1.81014 10.3935 2.06102 10.5213C2.34624 10.6667 2.7196 10.6667 3.46634 10.6667H10.6663ZM10.6663 10.6667H13.5997C13.973 10.6667 14.1597 10.6667 14.3023 10.594C14.4278 10.5301 14.5298 10.4281 14.5937 10.3027C14.6663 10.1601 14.6663 9.97337 14.6663 9.6V7.77516C14.6663 7.6121 14.6663 7.53057 14.6479 7.45385C14.6316 7.38582 14.6047 7.32079 14.5681 7.26114C14.5269 7.19387 14.4692 7.13622 14.3539 7.02091L12.9788 5.64575C12.8635 5.53045 12.8058 5.4728 12.7385 5.43157C12.6789 5.39502 12.6139 5.36808 12.5458 5.35175C12.4691 5.33333 12.3876 5.33333 12.2245 5.33333H10.6663M5.99967 12.3333C5.99967 13.2538 5.25348 14 4.33301 14C3.41253 14 2.66634 13.2538 2.66634 12.3333C2.66634 11.4129 3.41253 10.6667 4.33301 10.6667C5.25348 10.6667 5.99967 11.4129 5.99967 12.3333ZM13.333 12.3333C13.333 13.2538 12.5868 14 11.6663 14C10.7459 14 9.99967 13.2538 9.99967 12.3333C9.99967 11.4129 10.7459 10.6667 11.6663 10.6667C12.5868 10.6667 13.333 11.4129 13.333 12.3333Z"
                stroke="#666666"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>{{ driverInfo?.vehicleUnit || 'N/A' }}</span>
          </div>
        </div>

        <div class="w-px bg-border self-stretch"></div>

        <div class="space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Clock class="w-4 h-4 text-[#6082E0]" />
            <span class="text-[#6082E0]">
              Worked hours:
              <span class="text-[#6082E0] font-medium">{{ totalWorkedHours }}</span>
            </span>
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <AlertCircle class="w-4 h-4 text-[#AF4B4B]" />
            <span class="text-[#AF4B4B]">
              Violations:
              <span class="text-[#AF4B4B] font-medium">{{
                driverInfo?.hasViolation ? 'Yes' : 'No'
              }}</span>
            </span>
          </div>
          <div class="flex items-center gap-2 text-muted-foreground">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
            >
              <mask
                id="mask0_2001_118042"
                style="mask-type: alpha"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="16"
                height="16"
              >
                <rect width="16" height="16" fill="url(#pattern0_2001_118042)" />
              </mask>
              <g mask="url(#mask0_2001_118042)">
                <rect width="16" height="16" fill="#589E67" />
              </g>
              <defs>
                <pattern
                  id="pattern0_2001_118042"
                  patternContentUnits="objectBoundingBox"
                  width="1"
                  height="1"
                >
                  <use xlink:href="#image0_2001_118042" transform="scale(0.00195312)" />
                </pattern>
                <image
                  id="image0_2001_118042"
                  width="512"
                  height="512"
                  preserveAspectRatio="none"
                  xlink:href="data:image/png;base64,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"
                />
              </defs>
            </svg>

            <span class="text-[#589E67]">
              Signature:
              <span class="text-[#589E67] font-medium">{{
                driverInfo?.signaturePath ? 'Yes' : 'No'
              }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="
        route.name === 'ELDLogDetail' || route.name === 'ELDBoost' || route.name === 'ELDTracking'
      "
      class="flex items-center gap-5 2xl:gap-6"
    >
      <div v-for="stat in stats" :key="stat.label" class="flex flex-col items-center">
        <span
          class="progress-ring relative w-19.25 h-19.25 2xl:w-20.5 2xl:h-20.5 rounded-full flex items-center justify-center"
          :style="{
            '--progress-angle': `${stat.progress * 3.6}deg`,
            '--progress-color': stat.color,
          }"
        >
          <span
            class="absolute w-[67px] h-[67px] 2xl:w-[72px] 2xl:h-[72px] rounded-full bg-white dark:bg-background"
          ></span>
          <span
            class="absolute w-[63px] h-[63px] 2xl:w-[68px] 2xl:h-[68px] rounded-full transition-colors"
            :style="{ backgroundColor: stat.innerBg }"
          ></span>
          <span class="relative flex flex-col items-center justify-center leading-tight">
            <span class="text-base font-bold text-foreground">{{ stat.value }}</span>
            <span class="text-[11px] font-semibold" :style="{ color: stat.color }">{{
              stat.label
            }}</span>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Mail, Phone, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-vue-next'
import { formatDuration } from '@/utils/time.ts'
import { useDarkMode } from '@/composables/useDarkMode.ts'
import type { DailySummaryResponse } from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'
import { useRoute } from 'vue-router'
import CEventBadge from './CEventBadge.vue'

interface DriverInfo {
  name?: string
  email?: string
  phone?: string
  vehicleUnit?: string
  hasViolation?: boolean
  connectionStatus?: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONNECTED' | string
  signaturePath?: string
  workedDurationInSeconds?: number
  lastEventCode?: number | null
  lastEventType?: number | null
  timeRemainder?: {
    breakDuration: number
    drivingDuration: number
    shiftDuration: number
    cycleDuration: number
  }
}

interface DailyTimeRemainder {
  breakDuration: number
  drivingDuration: number
  shiftDuration: number
  cycleDuration: number
}

const props = defineProps<{
  driverInfo?: DriverInfo
  dailySummary?: DailySummaryResponse | null
  dailyTimeRemainder?: DailyTimeRemainder | null
}>()

const { isDarkMode } = useDarkMode()
const route = useRoute()

const connectionStatusLabel = computed(() => {
  if (props.driverInfo?.connectionStatus === 'CONNECTED') return 'Connected'
  if (props.driverInfo?.connectionStatus === 'DISCONNECTED') return 'Disconnected'
  return 'Not Connected'
})

const connectionStatusClass = computed(() => {
  if (props.driverInfo?.connectionStatus === 'CONNECTED') return 'text-[#589E67]'
  if (props.driverInfo?.connectionStatus === 'DISCONNECTED') return 'text-[#AF4B4B]'
  return 'text-muted-foreground'
})

const totalWorkedHours = computed(() => {
  if (props.dailySummary) {
    const total = (props.dailySummary.dailyOnDuty || 0) + (props.dailySummary.dailyDriving || 0)
    return formatDuration(total)
  }
  if (props.driverInfo?.workedDurationInSeconds) {
    return formatDuration(props.driverInfo.workedDurationInSeconds)
  }
  return '0h 0m'
})

const maxDurations = {
  break: 8 * 3600, // 8 hours
  drive: 11 * 3600, // 11 hours
  shift: 14 * 3600, // 14 hours
  cycle: 70 * 3600, // 70 hours
}

const formatHoursMinutes = (seconds: number): string => {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const stats = computed(() => {
  const timeRemainder = props.dailyTimeRemainder || props.driverInfo?.timeRemainder

  if (!timeRemainder) {
    return [
      {
        label: 'Break',
        value: '0m',
        color: '#D28E3D',
        innerBg: '#F5E9DA',
        progress: 0,
      },
      {
        label: 'Drive',
        value: '0m',
        color: '#6082E0',
        innerBg: '#D6E1FF',
        progress: 0,
      },
      {
        label: 'Shift',
        value: '0m',
        color: '#589E67',
        innerBg: '#DCF5E2',
        progress: 0,
      },
      {
        label: 'Cycle',
        value: '0m',
        color: '#AF4B4B',
        innerBg: '#F7E3E3',
        progress: 0,
      },
    ]
  }

  return [
    {
      label: 'Break',
      value: formatHoursMinutes(timeRemainder.breakDuration),
      color: '#D28E3D',
      innerBg: isDarkMode.value ? '#3d2e1f' : '#F5E9DA',
      progress: Math.min(100, (timeRemainder.breakDuration / maxDurations.break) * 100),
    },
    {
      label: 'Drive',
      value: formatHoursMinutes(timeRemainder.drivingDuration),
      color: '#6082E0',
      innerBg: isDarkMode.value ? '#1e2b4d' : '#D6E1FF',
      progress: Math.min(100, (timeRemainder.drivingDuration / maxDurations.drive) * 100),
    },
    {
      label: 'Shift',
      value: formatHoursMinutes(timeRemainder.shiftDuration),
      color: '#589E67',
      innerBg: isDarkMode.value ? '#1f3024' : '#DCF5E2',
      progress: Math.min(100, (timeRemainder.shiftDuration / maxDurations.shift) * 100),
    },
    {
      label: 'Cycle',
      value: formatHoursMinutes(timeRemainder.cycleDuration),
      color: '#AF4B4B',
      innerBg: isDarkMode.value ? '#3d1f1f' : '#F7E3E3',
      progress: Math.min(100, (timeRemainder.cycleDuration / maxDurations.cycle) * 100),
    },
  ]
})
</script>

<style scoped>
@property --progress-deg {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.progress-ring {
  --progress-deg: 0deg;
  background: conic-gradient(
    var(--progress-color) var(--progress-deg),
    #f0f0f0 var(--progress-deg)
  );
  animation: progress-fill 1s ease-out forwards;
}

@keyframes progress-fill {
  from {
    --progress-deg: 0deg;
  }
  to {
    --progress-deg: var(--progress-angle);
  }
}
</style>
