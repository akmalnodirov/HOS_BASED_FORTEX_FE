<template>
  <div class="bg-white dark:bg-card rounded-lg shadow-sm">
    <!-- Table -->
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow
            class="bg-[#f0f0f0] dark:bg-muted/50 border-0 hover:bg-[#f0f0f0] dark:hover:bg-muted/50"
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
            v-for="(vehicle, index) in paginatedVehicles"
            :key="vehicle.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <TableCell class="font-medium p-2">{{ index + 1 }}</TableCell>
            <TableCell class="p-2">{{ vehicle.unit }}</TableCell>
            <TableCell class="p-2">{{ vehicle.model }}</TableCell>
            <TableCell class="p-2">{{ vehicle.make }}</TableCell>
            <TableCell class="p-2">{{ vehicle.eld }}</TableCell>
            <TableCell class="p-2">{{ vehicle.vin }}</TableCell>
            <TableCell class="p-2">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium"
                :class="
                  vehicle.status
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-muted text-muted-foreground'
                "
              >
                {{ vehicle.status ? 'Active' : 'Inactive' }}
              </span>
            </TableCell>
          </TableRow>

          <!-- No results -->
          <TableRow v-if="paginatedVehicles.length === 0">
            <TableCell colspan="7" class="text-center py-8 text-gray-500 dark:text-gray-400">
              No vehicles found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Footer / Pagination -->
    <div
      class="px-6 py-4 border-t border-gray-200 dark:border-border flex items-center justify-between"
    >
      <!-- Items per page -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-400">Display on page</span>
        <Select v-model="localItemsPerPage">
          <SelectTrigger class="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ totalEntries.toLocaleString() }} entries
        </span>
      </div>

      <!-- Pagination -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <button
            v-for="page in pageNumbers"
            :key="page"
            @click="typeof page === 'number' && goToPage(page)"
            :disabled="page === '...'"
            :class="[
              'min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors',
              page === currentPage
                ? 'bg-gray-900 dark:bg-gray-700 text-white'
                : page === '...'
                  ? 'text-gray-400 dark:text-gray-500 cursor-default'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            ]"
          >
            {{ page }}
          </button>
        </div>

        <div class="flex items-center gap-2 ml-4">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ currentPage }} of {{ totalPages }} pages
          </span>
          <div class="flex gap-1">
            <Button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              variant="outline"
              size="icon"
              class="h-8 w-8"
            >
              <ChevronLeft class="w-4 h-4" />
            </Button>
            <Button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="icon"
              class="h-8 w-8"
            >
              <ChevronRight class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Vehicle } from '@/modules/Vehicles/types'
import type { SortKey } from '../composables/useVehicles'

// Props
interface Props {
  itemsPerPage: number
  currentPage: number
  paginatedVehicles: Vehicle[]
  totalPages: number
  totalEntries: number
  pageNumbers: (number | string)[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'goToPage', page: number): void
  (e: 'update:itemsPerPage', value: number): void
}>()

// Local itemsPerPage model for v-model
const localItemsPerPage = computed({
  get: () => props.itemsPerPage,
  set: (value) => emit('update:itemsPerPage', value),
})

const handleSort = (key: SortKey) => {
  emit('sort', key)
}

const goToPage = (page: number) => {
  emit('goToPage', page)
}
</script>
