<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-16 px-4 py-3">
            <button
              @click="emit('sort', 'no')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              No
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'name')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Name
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'tool')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Tool
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'company')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Company
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'driver')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Driver
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'period')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Period
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'shiftRepair')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Changes
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'created')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Created
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">Status</span>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="item in items"
          :key="item.id"
          class="bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border cursor-pointer"
          @click="emit('rowSelect', item)"
        >
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.no }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.name }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.tool }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.company }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.driver }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.period }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal bg-primary/10 text-primary"
            >
              {{ item.shiftRepair }}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ item.created }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <span
              :class="[
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal',
                getStatusClass(item.status),
              ]"
            >
              {{ getStatusText(item.status) }}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3" @click.stop>
            <!-- Rollback Button -->
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    @click="emit('rollback', item)"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20"
                    :disabled="
                      !canRollback(item) || (rollbackLoading && selectedRollbackId === item.id)
                    "
                  >
                    <RefreshCcw
                      v-if="!(rollbackLoading && selectedRollbackId === item.id)"
                      class="w-4 h-4 text-red-600"
                    />
                    <Loader2 v-else class="w-4 h-4 text-red-600 animate-spin" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rollback session</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="items.length === 0">
          <TableCell colspan="10" class="text-center py-8 text-muted-foreground bg-card">
            No activities found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { RefreshCcw, Loader2 } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { ActivityTableItem } from '../types'
import type { SortKey, SortOrder } from '../composables/useActivity'

// Session status enum
const SessionStatus: Record<number, string> = {
  1: 'Pending',
  2: 'Completed',
  3: 'Failed',
  4: 'Rolled Back',
}

interface Props {
  items: ActivityTableItem[]
  sortKey: SortKey
  sortOrder: SortOrder
  rollbackLoading?: boolean
  selectedRollbackId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  rollbackLoading: false,
  selectedRollbackId: null,
})

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'rollback', item: ActivityTableItem): void
  (e: 'rowSelect', item: ActivityTableItem): void
}>()


const getStatusText = (status: number): string => {
  return SessionStatus[status] || 'Unknown'
}

const getStatusClass = (status: number): string => {
  switch (status) {
    case 1:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 2:
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 3:
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 4:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const canRollback = (item: ActivityTableItem): boolean => {
  return item.status === 2 && item.isSubmitted
}
</script>
