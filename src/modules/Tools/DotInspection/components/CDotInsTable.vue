<script setup lang="ts">
import dayjs from 'dayjs'
import { Power, Trash2 } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  DotInspection,
  DotInspectionSortKey,
  SortOrder,
} from '@/modules/Tools/DotInspection/types'

defineProps<{
  dotInspections: DotInspection[]
  currentPage: number
  itemsPerPage: number
  sortKey: DotInspectionSortKey
  sortOrder: SortOrder
}>()

const emit = defineEmits<{
  (event: 'sort', key: DotInspectionSortKey): void
  (event: 'toggle-status', inspection: DotInspection): void
  (event: 'delete', inspectionId: string): void
}>()

function formatDate(value: string) {
  return dayjs(value).format('MMM D, YYYY')
}

function formatDateTime(value: string) {
  return dayjs(value).format('MMM D, YYYY h:mm A')
}
</script>

<template>
  <div
    class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
  >
    <Table class="min-w-[1050px]">
      <TableHeader class="sticky top-0 z-20">
        <TableRow
          class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50"
        >
          <TableHead class="w-16">No</TableHead>
          <TableHead class="min-w-52">
            <button class="flex items-center gap-2 font-medium" @click="emit('sort', 'driverName')">
              Driver
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="min-w-48">
            <button class="flex items-center gap-2 font-medium" @click="emit('sort', 'fromDate')">
              Freeze period
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="min-w-64">
            <button
              class="flex items-center gap-2 font-medium"
              @click="emit('sort', 'description')"
            >
              Description
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="w-32">
            <button class="flex items-center gap-2 font-medium" @click="emit('sort', 'isEnabled')">
              Status
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="min-w-48">
            <button class="flex items-center gap-2 font-medium" @click="emit('sort', 'createdAt')">
              Created
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="w-28">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(inspection, index) in dotInspections"
          :key="inspection.id"
          class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="p-2 font-medium">
            {{ (currentPage - 1) * itemsPerPage + index + 1 }}
          </TableCell>
          <TableCell class="p-2 font-medium">{{ inspection.driverName }}</TableCell>
          <TableCell class="p-2">
            {{ formatDate(inspection.fromDate) }} – {{ formatDate(inspection.toDate) }}
          </TableCell>
          <TableCell class="max-w-80 truncate p-2" :title="inspection.description || ''">
            {{ inspection.description || '—' }}
          </TableCell>
          <TableCell class="p-2">
            <span
              :class="[
                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                inspection.isEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
              ]"
            >
              {{ inspection.isEnabled ? 'Enabled' : 'Disabled' }}
            </span>
          </TableCell>
          <TableCell class="p-2">{{ formatDateTime(inspection.createdAt) }}</TableCell>
          <TableCell class="p-2">
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                :class="[
                  'h-8 w-8',
                  inspection.isEnabled
                    ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                    : 'text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950',
                ]"
                :title="inspection.isEnabled ? 'Disable' : 'Enable'"
                @click="emit('toggle-status', inspection)"
              >
                <Power class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-destructive/10"
                title="Delete"
                @click="emit('delete', inspection.id)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="dotInspections.length === 0">
          <TableCell colspan="7" class="h-28 text-center text-muted-foreground">
            No DOT inspections found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
