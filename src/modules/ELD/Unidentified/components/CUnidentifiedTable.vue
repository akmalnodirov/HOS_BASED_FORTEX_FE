<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import { Badge } from '@/components/ui/badge'
import { getEventLabel, getEventBadgeClass } from '@/utils/events'
import { computed } from 'vue'
import type { UnidentifiedTableRow } from '../types'

interface Props {
  rows: UnidentifiedTableRow[]
  selectedRows: UnidentifiedTableRow[]
  isLoading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select-row', row: UnidentifiedTableRow): void
  (e: 'select-all'): void
  (e: 'edit-status', eventCode: number, eventIds: string[], count: number): void
}>()

const isAllSelected = computed(
  () => props.rows.length > 0 && props.selectedRows.length === props.rows.length
)

function isRowSelected(row: UnidentifiedTableRow): boolean {
  return props.selectedRows.some((r) => r.ids.some((id) => row.ids.includes(id)))
}

const columns = [
  { key: 'count', label: 'N' },
  { key: 'driver', label: 'Driver' },
  { key: 'vehicleUnit', label: 'Vehicles id' },
  { key: 'distance', label: 'Distance' },
  { key: 'location', label: 'Location' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'odometer', label: 'Odometer' },
  { key: 'engineHours', label: 'Engine hours' },
  { key: 'duration', label: 'Duration' },
  { key: 'event', label: 'Event' },
  { key: 'action', label: 'Actions' },
]
</script>

<template>
  <div class="overflow-x-auto rounded-lg bg-white dark:bg-card">
    <Table>
      <TableHeader>
        <TableRow
          class="bg-[#f0f0f0] dark:bg-muted/50 border-0 hover:bg-[#f0f0f0] dark:hover:bg-muted/50"
        >
          <TableHead class="w-12.5 px-4 py-3">
            <CCustomCheckbox :checked="isAllSelected" @update:checked="emit('select-all')" />
          </TableHead>
          <TableHead
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3"
            :class="{
              'text-right': col.key === 'action',
              'min-w-50': col.key === 'location',
              'min-w-45': col.key === 'driver',
              'min-w-40': col.key === 'event',
            }"
          >
            <span class="text-xs font-semibold text-[#666666] uppercase">{{ col.label }}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in rows"
          :key="row.count"
          class="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
          :class="{ 'bg-primary/5': isRowSelected(row) }"
          @click="emit('select-row', row)"
        >
          <TableCell class="px-4 py-3">
            <CCustomCheckbox
              :checked="isRowSelected(row)"
              @update:checked="emit('select-row', row)"
            />
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.count }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.driver }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.vehicleUnit }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.distance }}
          </TableCell>
          <TableCell
            class="px-4 py-3 text-sm text-[#090909] dark:text-foreground max-w-75 truncate"
          >
            {{ row.location }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.submitted }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.odometer }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.engineHours }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm text-[#090909] dark:text-foreground">
            {{ row.duration }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <Badge
              v-if="row.eventCode && row.eventType"
              :class="[
                'font-normal px-2 py-0.5 rounded text-[10px]',
                getEventBadgeClass(row.eventType, row.eventCode),
              ]"
            >
              {{ getEventLabel(row.eventType, row.eventCode) }}
            </Badge>
            <span v-else class="text-sm text-muted-foreground">Event not specified</span>
          </TableCell>
          <TableCell class="px-4 py-3 text-right">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
              :disabled="row.eventType === 6"
              @click.stop="
                row.eventType !== 6 && emit('edit-status', row.eventCode!, row.ids, row.count)
              "
            >
              <Pencil class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="rows.length === 0 && !isLoading">
          <TableCell
            :colspan="columns.length + 1"
            class="text-center py-12 text-muted-foreground font-medium"
          >
            No unidentified logs found
          </TableCell>
        </TableRow>

        <!-- Loading state -->
        <TableRow v-if="isLoading">
          <TableCell :colspan="columns.length + 1" class="text-center py-12">
            <div class="flex justify-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
