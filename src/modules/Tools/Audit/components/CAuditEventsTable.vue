<template>
  <div class="rounded-lg border border-border bg-card p-4">
    <h2 class="text-sm font-semibold mb-4">Events</h2>
    <div class="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead v-for="col in columns" :key="col.key" class="text-xs font-semibold">
              {{ col.label }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in rows" :key="row.eventId">
            <TableCell class="text-sm">{{ row.sequence }}</TableCell>
            <TableCell class="text-sm">{{ row.time }}</TableCell>
            <TableCell>
              <span
                :class="getEventBadgeClass(row.eventType, row.eventCode)"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ row.event }}
              </span>
            </TableCell>
            <TableCell class="text-sm">{{ row.duration }}</TableCell>
            <TableCell class="text-sm max-w-[200px] truncate">{{ row.location }}</TableCell>
            <TableCell class="text-sm">{{ row.odometer }}</TableCell>
            <TableCell class="text-sm">{{ row.hours }}</TableCell>
            <TableCell class="text-sm">{{ EventRecordOrigins[row.recordOrigin] || 'N/A' }}</TableCell>
            <TableCell class="text-sm">{{ EventRecordStatuses[row.recordStatus] || 'N/A' }}</TableCell>
            <TableCell class="text-sm max-w-[150px] truncate">{{ row.notes }}</TableCell>
          </TableRow>
          <TableRow v-if="rows.length === 0">
            <TableCell :colspan="columns.length" class="text-center py-8 text-muted-foreground">
              No events found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getEventBadgeClass } from '@/utils/events'
import { EventRecordOrigins, EventRecordStatuses } from '../constants'
import type { AuditEventTableRow } from '../types'

interface Props {
  columns: Array<{ key: string; label: string }>
  rows: AuditEventTableRow[]
}

defineProps<Props>()
</script>
