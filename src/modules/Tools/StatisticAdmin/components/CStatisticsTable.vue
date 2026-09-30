<!-- src/components/statistics/StatisticsTable.vue -->
<script setup lang="ts">
import { RotateCw } from 'lucide-vue-next'
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
import type { TableRecord } from '@/modules/Tools/StatisticAdmin/types'
import type {
  SortKey,
  SortOrder,
} from '@/modules/Tools/StatisticAdmin/composables/useAdminStatistics.ts'

interface Props {
  records: TableRecord[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'action', id: string): void
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead class="w-16">
            <button
              @click="emit('sort', 'no')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              No
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'company')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              Company
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'driver')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              Driver
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'ufUsedTool')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              UfUsed tool
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'mistakesBefore')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              Mistakes befor
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'mistakesAfter')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              Mistakes after
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'violationBefore')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              Violetion befor
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'violationAfter')"
              class="flex items-center gap-2 font-medium hover:text-foreground cursor-pointer"
            >
              Violetion after
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <span class="font-medium">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="record in records"
          :key="record.id"
          class="hover:bg-accent/50 border-b border-border/50 transition-colors"
        >
          <TableCell class="font-medium">{{ record.no }}</TableCell>
          <TableCell>{{ record.company }}</TableCell>
          <TableCell>{{ record.driver }}</TableCell>
          <TableCell>{{ record.ufUsedTool }}</TableCell>
          <TableCell>{{ record.mistakesBefore }}</TableCell>
          <TableCell>{{ record.mistakesAfter }}</TableCell>
          <TableCell>{{ record.violationBefore }}</TableCell>
          <TableCell>{{ record.violationAfter }}</TableCell>
          <TableCell>
            <Button @click="emit('action', record.id)" variant="ghost" size="icon" class="h-8 w-8 hover:bg-accent">
              <RotateCw class="w-4 h-4 text-muted-foreground" />
            </Button>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="records.length === 0">
          <TableCell colspan="9" class="text-center py-8 text-muted-foreground">
            No records found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
