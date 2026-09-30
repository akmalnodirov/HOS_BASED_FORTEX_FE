<!-- src/components/dotInspection/DotInspectionTable.vue -->
<script setup lang="ts">
import { Power, Trash2 } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { DotInspection } from '@/modules/Tools/DotInspection/types'
import type { SortKey, SortOrder } from '@/modules/Tools/DotInspection/composables/useDotIns'
import dayjs from 'dayjs'

interface Props {
  dotInspections: DotInspection[]
  sortKey: SortKey
  sortOrder: SortOrder
  getStatusBadge: (status: number) => string
  getStatusBadgeClass: (status: number) => string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'toggle-status', dotId: string, currentStatus: number): void
  (e: 'delete', dotId: string): void
}>()

const formatDateRange = (startDate: string, endDate: string) => {
  return `${dayjs(startDate).format('DD.MM.YYYY')} - ${dayjs(endDate).format('DD.MM.YYYY')}`
}

const formatDateTime = (dateTime: string) => {
  return dayjs(dateTime).format('DD.MM.YYYY HH:mm')
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-16 px-4 py-3">
            <button
              @click="emit('sort', 'id')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              No
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'providerName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Provider
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'carrierName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Company
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'driverName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Driver
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'startDate')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Date Range
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">Status</span>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'dateTime')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Created
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(dot, index) in dotInspections"
          :key="dot.id"
          class="bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
        >
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ index + 1 }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dot.providerName }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dot.carrierName }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dot.driverName }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ formatDateRange(dot.startDate, dot.endDate) }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <Badge
              :class="getStatusBadgeClass(dot.status)"
              class="text-[11px] font-normal py-0.5 px-2 h-auto"
            >
              {{ getStatusBadge(dot.status) }}
            </Badge>
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ formatDateTime(dot.dateTime) }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <div class="flex items-center gap-2">
              <Button
                @click="emit('toggle-status', dot.id, dot.status)"
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-accent"
                :title="dot.status === 0 ? 'Disable' : 'Enable'"
              >
                <Power class="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                @click="emit('delete', dot.id)"
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 class="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="dotInspections.length === 0">
          <TableCell colspan="8" class="text-center py-8 text-muted-foreground bg-card">
            No dot inspections found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
