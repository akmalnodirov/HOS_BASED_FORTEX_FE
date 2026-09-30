<!-- src/components/drivers/DriversTable.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Pencil } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import SortIcon from '@/components/icons/SortIcon.vue'
import { Driver, SortKey, SortOrder } from '../types'

interface Props {
  drivers: Driver[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'toggle-status', driver: Driver): void
  (e: 'edit', driver: Driver): void
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0 hover:bg-[#f0f0f0] dark:hover:bg-muted/50">
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
          class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <TableCell class="font-medium p-2">{{ index + 1 }}</TableCell>
          <TableCell class="p-2">{{ driver.name }}</TableCell>
          <TableCell class="p-2">{{ driver.unit }}</TableCell>
          <TableCell class="p-2">{{ driver.username }}</TableCell>
          <TableCell class="p-2">{{ driver.appVersion }}</TableCell>
          <TableCell class="p-2">{{ driver.eventsTime }}</TableCell>
          <TableCell class="p-2">
            <Switch :model-value="driver.status" @update:model-value="emit('toggle-status', driver)" />
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
