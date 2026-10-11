<!-- src/components/drivers/DriversTable.vue -->
<script setup lang="ts">
import { Eye, EyeOff, LoaderCircle, Pencil } from 'lucide-vue-next'
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
import type { Driver, SortKey, SortOrder } from '../types'

interface Props {
  drivers: Driver[]
  currentPage: number
  itemsPerPage: number
  sortKey: SortKey
  sortOrder: SortOrder
  monitoringChangingIds: Set<string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'edit', driver: Driver): void
  (e: 'toggle-monitoring', driver: Driver): void
}>()
</script>

<template>
  <div
    class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
  >
    <Table class="min-w-[980px]">
      <TableHeader class="sticky top-0 z-20">
        <TableRow
          class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50"
        >
          <TableHead class="w-16">
            <button
              @click="emit('sort', 'id')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              No
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'name')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Name
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'unit')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Unit
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'username')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Username
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'appVersion')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              App Version
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'eventsTime')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Events Time
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'status')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Status
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <span class="font-medium dark:text-gray-300">Monitoring</span>
          </TableHead>
          <TableHead class="w-28">
            <span class="font-medium dark:text-gray-300">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(driver, index) in drivers"
          :key="driver.id"
          class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="p-2 font-medium">
            {{ (currentPage - 1) * itemsPerPage + index + 1 }}
          </TableCell>
          <TableCell class="p-2">{{ driver.name }}</TableCell>
          <TableCell class="p-2">{{ driver.unit }}</TableCell>
          <TableCell class="p-2">{{ driver.username }}</TableCell>
          <TableCell class="p-2">{{ driver.appVersion }}</TableCell>
          <TableCell class="p-2">{{ driver.eventsTime }}</TableCell>
          <TableCell class="p-2">
            <span
              :class="[
                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                driver.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ driver.status ? 'Active' : 'Inactive' }}
            </span>
          </TableCell>
          <TableCell class="p-2">
            <span
              :class="[
                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                driver.isMonitoringEnabled
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ driver.isMonitoringEnabled ? 'Enabled' : 'Disabled' }}
            </span>
          </TableCell>
          <TableCell class="p-2">
            <div class="flex items-center gap-1">
              <Button @click="emit('edit', driver)" variant="ghost" size="icon" class="h-8 w-8">
                <Pencil class="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                :class="driver.isMonitoringEnabled ? 'text-red-600' : 'text-blue-600'"
                :disabled="monitoringChangingIds.has(String(driver.id))"
                :aria-label="
                  driver.isMonitoringEnabled ? 'Disable monitoring' : 'Enable monitoring'
                "
                :title="driver.isMonitoringEnabled ? 'Disable monitoring' : 'Enable monitoring'"
                @click="emit('toggle-monitoring', driver)"
              >
                <LoaderCircle
                  v-if="monitoringChangingIds.has(String(driver.id))"
                  class="h-4 w-4 animate-spin"
                />
                <EyeOff v-else-if="driver.isMonitoringEnabled" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="drivers.length === 0">
          <TableCell colspan="9" class="text-center py-8 text-gray-500 dark:text-gray-400">
            No drivers found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
