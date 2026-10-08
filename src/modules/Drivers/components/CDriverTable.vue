<!-- src/components/drivers/DriversTable.vue -->
<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
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
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'edit', driver: Driver): void
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
            <Button @click="emit('edit', driver)" variant="ghost" size="icon" class="h-8 w-8">
              <Pencil class="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </Button>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="drivers.length === 0">
          <TableCell colspan="8" class="text-center py-8 text-gray-500 dark:text-gray-400">
            No drivers found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
