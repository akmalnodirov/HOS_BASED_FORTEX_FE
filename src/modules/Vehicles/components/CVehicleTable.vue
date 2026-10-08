<template>
  <div
    class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
  >
    <!-- Table -->
    <Table class="min-w-[980px] text-sm">
      <TableHeader class="sticky top-0 z-20">
        <TableRow
          class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50"
        >
          <TableHead class="w-16">
            <button
              @click="handleSort('id')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              No
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('unit')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Unit
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('model')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Model
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('make')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Make
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('eld')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Eld
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('vin')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Vin
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('status')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Status
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(vehicle, index) in vehicles"
          :key="vehicle.id"
          class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="p-2 text-sm font-medium">
            {{ (currentPage - 1) * itemsPerPage + index + 1 }}
          </TableCell>
          <TableCell class="p-2 text-sm">{{ vehicle.unit }}</TableCell>
          <TableCell class="p-2 text-sm">{{ vehicle.model }}</TableCell>
          <TableCell class="p-2 text-sm">{{ vehicle.make }}</TableCell>
          <TableCell class="p-2 text-sm">{{ vehicle.eld }}</TableCell>
          <TableCell class="p-2 text-sm">{{ vehicle.vin }}</TableCell>
          <TableCell class="p-2 text-sm">
            <span
              :class="[
                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                vehicle.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ vehicle.status ? 'Active' : 'Inactive' }}
            </span>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="vehicles.length === 0">
          <TableCell colspan="7" class="py-8 text-center text-gray-500 dark:text-gray-400">
            No vehicles found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import SortIcon from '@/components/icons/SortIcon.vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Vehicle } from '@/modules/Vehicles/types'
import type { SortKey } from '../composables/useVehicles'

// Props
interface Props {
  vehicles: Vehicle[]
  currentPage: number
  itemsPerPage: number
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
}>()

const handleSort = (key: SortKey) => {
  emit('sort', key)
}
</script>
