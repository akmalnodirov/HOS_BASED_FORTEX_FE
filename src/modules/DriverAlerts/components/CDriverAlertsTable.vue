<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import SortIcon from '@/components/icons/SortIcon.vue'
import { formatTime } from '@/utils/time'
import type { AlertDriver, DutyStatusKey, SortKey } from '../types'

interface Props {
  drivers: AlertDriver[]
  currentPage: number
  itemsPerPage: number
  isLoading: boolean
  error: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'send', driver: AlertDriver): void
}>()

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Driver name' },
  { key: 'unit', label: 'Unit #' },
  { key: 'odometer', label: 'Odometer' },
  { key: 'updatedAt', label: 'Updated time' },
  { key: 'statusLabel', label: 'Events' },
]

const statusClasses: Record<DutyStatusKey, string> = {
  sleep: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  driving: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  off: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pc: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  on: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ym: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  unknown: 'bg-muted text-muted-foreground',
}

const formatOdometer = (value: number | null) =>
  value == null ? '—' : `${Math.round(value).toLocaleString()} mi`

const formatUpdatedAt = (value: number | null) =>
  value == null ? '—' : formatTime(new Date(value), 'MMM DD, hh:mm A')
</script>

<template>
  <div
    class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
  >
    <Table class="min-w-[900px]">
      <TableHeader class="sticky top-0 z-20">
        <TableRow
          class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50"
        >
          <TableHead class="w-16">
            <span class="font-medium dark:text-gray-300">No</span>
          </TableHead>
          <TableHead v-for="column in columns" :key="column.key">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 font-medium hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              @click="emit('sort', column.key)"
            >
              {{ column.label }}
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="w-24 text-center">
            <span class="font-medium dark:text-gray-300">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="!isLoading && !error">
          <TableRow
            v-for="(driver, index) in drivers"
            :key="driver.id"
            class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <TableCell class="p-2 font-medium">
              {{ (currentPage - 1) * itemsPerPage + index + 1 }}
            </TableCell>
            <TableCell class="p-2">{{ driver.name }}</TableCell>
            <TableCell class="p-2">{{ driver.unit || '—' }}</TableCell>
            <TableCell class="p-2 tabular-nums">{{ formatOdometer(driver.odometer) }}</TableCell>
            <TableCell class="whitespace-nowrap p-2">
              {{ formatUpdatedAt(driver.updatedAt) }}
            </TableCell>
            <TableCell class="p-2">
              <span
                :class="[
                  'inline-flex rounded px-2 py-1 text-xs font-medium',
                  statusClasses[driver.status],
                ]"
              >
                {{ driver.statusLabel }}
              </span>
            </TableCell>
            <TableCell class="p-2 text-center">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-blue-600 dark:text-blue-400"
                :aria-label="`Send an alert to ${driver.name}`"
                :title="`Send an alert to ${driver.name}`"
                @click="emit('send', driver)"
              >
                <Bell class="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </template>

        <TableRow v-if="isLoading">
          <TableCell :colspan="7" class="py-8 text-center text-gray-500 dark:text-gray-400">
            Loading drivers...
          </TableCell>
        </TableRow>
        <TableRow v-else-if="error">
          <TableCell :colspan="7" class="py-8 text-center text-red-600 dark:text-red-400">
            {{ error }}
          </TableCell>
        </TableRow>
        <TableRow v-else-if="drivers.length === 0">
          <TableCell :colspan="7" class="py-8 text-center text-gray-500 dark:text-gray-400">
            No drivers found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
