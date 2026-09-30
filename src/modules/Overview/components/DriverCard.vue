<template>
  <div
    :class="[
      'rounded-md overflow-hidden border transition-all hover:shadow-md cursor-pointer card-hover',
    ]"
    :style="cardStyle"
  >
    <!-- Colored Header Bar with DriverId and Status Badge -->
    <div
      :class="['flex items-center justify-between px-2.5 py-1.5']"
      :style="{ backgroundColor: headerColorValue, borderBottom: `2px solid ${headerColorValue}` }"
    >
      <!-- Driver ID -->
      <span class="text-xs font-medium text-white">Id: {{ driver.driverId }}</span>

      <!-- Status Badge -->
      <Badge
        class="px-2 py-0.5 text-[10px] font-medium rounded bg-white/20 text-white border border-white/30 shrink-0 max-w-[120px] truncate hover:bg-white/30 hover:border-white/50 transition-colors"
      >
        {{ statusName }}
      </Badge>
    </div>

    <div class="p-2.5 space-y-2">
      <!-- Vehicle Unit -->
      <div class="text-xs text-gray-700 dark:text-gray-300">
        {{ driver.vehicleUnit || 'N/A' }}
      </div>

      <!-- Contact Info with Badge, Name, Phone, and WiFi -->
      <div class="flex items-center gap-2">
        <!-- General Badge (instead of profile picture) -->
        <div
          class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0"
        >
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
            {{ driver.driverName.charAt(0).toUpperCase() }}
          </span>
        </div>

        <!-- Driver Name and Phone -->
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
            {{ driver.driverName }}
          </div>
          <div v-if="driver.phoneNumber" class="text-xs text-gray-600 dark:text-gray-400">
            {{ driver.phoneNumber }}
          </div>
        </div>

        <!-- WiFi Icon -->
        <Wifi
          :class="[
            'w-4 h-4 shrink-0',
            driver.isConnected
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-400 dark:text-gray-500',
          ]"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Wifi } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import type { MonitoringDriver } from '../types'

interface Props {
  driver: MonitoringDriver
  getEventName: (eventCode: number, eventType: number) => string
  getEventBadgeClass: (eventCode: number) => string
  getStatusColor: (eventCode: number, eventType: number) => string
}

const props = defineProps<Props>()

const statusName = computed(() =>
  props.getEventName(props.driver.eventCode, props.driver.eventType)
)

const badgeClass = computed(() => props.getEventBadgeClass(props.driver.eventCode))

const statusColor = computed(() =>
  props.getStatusColor(props.driver.eventCode, props.driver.eventType)
)

// Status colors
const STATUS_COLORS = {
  sleep: '#954BAF', // Sleep - Purple
  onDuty: '#6082E0', // On duty - Blue
  offDutyYM: '#AF4B4B', // Off duty (YM) - Red
  driving: '#589E67', // Driving - Green
  offDutyPC: '#D28E3D', // Off duty (PC) - Orange
} as const

// Helper function to lighten color for hover
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) + Math.round((255 - (num >> 16)) * percent)
  const g = ((num >> 8) & 0x00ff) + Math.round((255 - ((num >> 8) & 0x00ff)) * percent)
  const b = (num & 0x0000ff) + Math.round((255 - (num & 0x0000ff)) * percent)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// Get header color value based on event code
const headerColorValue = computed(() => {
  // Off duty (PC) - Orange (eventCode 1 with eventType !== 1)
  if (props.driver.eventCode === 1 && props.driver.eventType !== 1) {
    return STATUS_COLORS.offDutyPC
  }
  const colorMap: Record<number, string> = {
    1: STATUS_COLORS.offDutyYM, // Off duty (YM) - Red
    2: STATUS_COLORS.sleep, // Sleep - Purple
    3: STATUS_COLORS.driving, // Driving - Green
    4: STATUS_COLORS.onDuty, // On duty - Blue
  }
  return colorMap[props.driver.eventCode] || '#6B7280'
})

// Get hover color value based on event code
const hoverColorValue = computed(() => {
  return lightenColor(headerColorValue.value, 0.85)
})

// Card style with hover, background and border
const cardStyle = computed(() => ({
  '--hover-bg': hoverColorValue.value,
  backgroundColor: '#fff',
  borderColor: '#DBDBDB',
}))
</script>

<style scoped>
.card-hover:hover {
  background-color: var(--hover-bg) !important;
}
</style>
