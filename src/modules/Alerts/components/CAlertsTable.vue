<template>
  <div class="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0 hover:bg-[#f0f0f0] dark:hover:bg-muted/50">
          <TableHead class="w-16">
            <button
              @click="emit('sort', 'id')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 cursor-pointer"
            >
              No
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'driverName')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 cursor-pointer"
            >
              Driver name
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'unit')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 cursor-pointer"
            >
              Unit #
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'odometer')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 cursor-pointer"
            >
              Odometer
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'updatedTime')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 cursor-pointer"
            >
              Updated time
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'event')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 cursor-pointer"
            >
              Events
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <span class="font-medium">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="alert in alerts"
          :key="alert.id"
          @click="emit('row-click', alert)"
          class="cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <TableCell class="font-medium">{{ alert.id }}</TableCell>
          <TableCell>{{ alert.driverName }}</TableCell>
          <TableCell>{{ alert.unit }}</TableCell>
          <TableCell>{{ alert.odometer }}</TableCell>
          <TableCell>{{ alert.updatedTime }}</TableCell>
          <TableCell>
            <Badge :class="getEventBadgeClass(alert.event)">
              {{ alert.event }}
            </Badge>
          </TableCell>
          <TableCell>
            <Button
              @click.stop="emit('send-alert', alert)"
              variant="ghost"
              size="icon"
              class="h-8 w-8"
            >
              <Bell v-if="hasAlert(alert.event)" class="w-4 h-4 text-blue-500" />
              <BellOff v-else class="w-4 h-4 text-gray-400" />
            </Button>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="alerts.length === 0">
          <TableCell colspan="7" class="text-center py-8 text-gray-500">
            No alerts found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { Bell, BellOff } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { Alert, SortKey, SortOrder } from '@/modules/Alerts/composables/useAlerts.ts'

interface Props {
  alerts: Alert[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'send-alert', alert: Alert): void
  (e: 'row-click', alert: Alert): void
}>()


const getEventBadgeClass = (event: string) => {
  const eventMap: Record<string, string> = {
    Sleep: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
    Driving: 'bg-green-100 text-green-700 hover:bg-green-100',
    'Off duty (OFF)': 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    'On duty': 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    'Off duty (YM)': 'bg-red-100 text-red-700 hover:bg-red-100',
    'Off duty (PC)': 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  }
  return eventMap[event] || 'bg-gray-100 text-gray-700'
}

const hasAlert = (event: string) => {
  return (
    event === 'Off duty (OFF)' ||
    event === 'Off duty (PC)' ||
    event === 'Driving' ||
    event === 'On duty'
  )
}
</script>
