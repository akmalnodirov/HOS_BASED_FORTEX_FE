<script setup lang="ts">
import { ref } from 'vue'
import dayjs from 'dayjs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import type { IftaReport, IftaSortKey } from '../types'

const props = defineProps<{
  records: IftaReport[]
  isLoading: boolean
  selectedIds: Set<string>
  allSelected: boolean
  sortKey: IftaSortKey
  emptyMessage: string
}>()
const emit = defineEmits<{
  (e: 'sort', key: IftaSortKey): void
  (e: 'select-row', index: number, shiftKey: boolean): void
  (e: 'select-all'): void
  (e: 'download', report: IftaReport): void
}>()
const checkboxShift = ref(false)
const isSelected = (id: string) => props.selectedIds.has(id)
function statusClass(status: string) {
  if (status === 'READY') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (status === 'WAITING')
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
  if (status === 'ERROR') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-10 px-4 py-3">
            <CCustomCheckbox
              :checked="allSelected"
              aria-label="Select all visible reports"
              @update:checked="emit('select-all')"
            />
          </TableHead>
          <TableHead class="w-16 px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">#</span>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'timeSubmitted')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'timeSubmitted' }"
            >
              Submitted <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'fromDate')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'fromDate' }"
            >
              From <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'toDate')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'toDate' }"
            >
              To <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'vehicleName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'vehicleName' }"
            >
              Vehicle <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">States</span>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'status')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'status' }"
            >
              Status <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <!-- Loading state -->
        <TableRow v-if="isLoading">
          <TableCell colspan="9" class="text-center py-8 text-muted-foreground bg-card">
            Loading...
          </TableCell>
        </TableRow>

        <!-- Data rows -->
        <TableRow
          v-else
          v-for="(record, index) in records"
          :key="record.id"
          class="cursor-pointer bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
          :class="{ 'bg-primary/5 dark:bg-primary/10': isSelected(record.id) }"
          @click="emit('select-row', index, $event.shiftKey)"
        >
          <TableCell
            class="px-4 py-3"
            @click.stop
            @click.capture="checkboxShift = $event.shiftKey"
            @keydown.capture="checkboxShift = false"
          >
            <CCustomCheckbox
              :checked="isSelected(record.id)"
              :aria-label="`Select report for ${record.vehicleName || record.vehicleId}`"
              @update:checked="emit('select-row', index, checkboxShift)"
            />
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ index + 1 }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dayjs(record.timeSubmitted).format('MMM DD, hh:mm A') }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.fromDate }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.toDate }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.vehicleName || record.vehicleId }}
          </TableCell>
          <TableCell class="px-4 py-3 text-xs text-muted-foreground">
            {{ record.states.length ? record.states.join(', ') : 'All available states' }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                statusClass(record.status),
              ]"
            >
              {{ record.status.charAt(0) + record.status.slice(1).toLowerCase() }}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              class="h-7 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
              :disabled="record.status !== 'READY' || !record.csvUrl"
              @click.stop="emit('download', record)"
            >
              <Download class="w-3 h-3 mr-1" /> Download
            </Button>
          </TableCell>
        </TableRow>

        <!-- Empty state -->
        <TableRow v-if="!isLoading && records.length === 0">
          <TableCell colspan="9" class="text-center py-8 text-muted-foreground bg-card">
            {{ emptyMessage }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
