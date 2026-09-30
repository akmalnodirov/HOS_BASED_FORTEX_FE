<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Errors & Warnings</DialogTitle>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/50 hover:bg-muted/50">
              <TableHead v-for="col in columns" :key="col.key">
                {{ col.label }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-if="!filteredEvents || filteredEvents.length === 0"
              class="hover:bg-transparent"
            >
              <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                No errors or warnings found
              </TableCell>
            </TableRow>
            <TableRow
              v-else
              v-for="event in filteredEvents"
              :key="event.id"
              class="hover:bg-muted/50"
            >
              <TableCell>{{ event.count }}</TableCell>
              <TableCell>
                <CEventBadge
                  :event-code="event.event.eventCode"
                  :event-type="event.event.eventType"
                />
              </TableCell>
              <TableCell>{{ event.est }}</TableCell>
              <TableCell class="max-w-md">
                <div class="space-y-1">
                  <!-- Errors -->
                  <div
                    v-if="event.errorTitles && event.errorTitles.length > 0"
                    class="flex flex-wrap gap-1"
                  >
                    <Badge
                      v-for="(error, idx) in event.errorTitles"
                      :key="idx"
                      variant="destructive"
                      class="text-xs"
                    >
                      {{ error }}
                    </Badge>
                  </div>
                  <!-- Warnings -->
                  <div
                    v-if="event.warningTitles && event.warningTitles.length > 0"
                    class="flex flex-wrap gap-1"
                  >
                    <Badge
                      v-for="(warning, idx) in event.warningTitles"
                      :key="idx"
                      class="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-xs"
                    >
                      {{ warning }}
                    </Badge>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('update:open', false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
import CEventBadge from './CEventBadge.vue'
import type { OptimizeEventTableRow } from '../types/optimize'

const props = defineProps<{
  open: boolean
  events: OptimizeEventTableRow[]
  columns: Array<{ key: string; label: string }>
}>()

defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const filteredEvents = computed(() => {
  return props.events?.filter(
    (event) =>
      (event.errorTitles && event.errorTitles.length > 0) ||
      (event.warningTitles && event.warningTitles.length > 0)
  )
})
</script>
