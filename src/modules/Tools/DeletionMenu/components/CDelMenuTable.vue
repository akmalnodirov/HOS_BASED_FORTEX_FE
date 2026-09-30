<!-- src/components/deletionMenu/DeletionMenuTable.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
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
import SortIcon from '@/components/icons/SortIcon.vue'
import type { Driver } from '@/modules/Tools/DeletionMenu/types'

interface ITableRow {
  counter: number
  id: string
  system: string
  company: string
  drivers: Driver[]
  testDriverId: string | null
}

type SortKey = 'counter' | 'system' | 'company' | 'driver'

interface Props {
  rows: ITableRow[]
  isLoading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'edit-driver', row: ITableRow): void
}>()

const sortKey = ref<SortKey | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

const handleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const getAssignedDriverName = (drivers: Driver[]) => {
  const driver = drivers.find((d) => d.isTestDriver)
  return driver ? `${driver.firstName} ${driver.lastName}` : 'No driver assigned'
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows
  return [...props.rows].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number
    switch (sortKey.value) {
      case 'counter': aVal = a.counter; bVal = b.counter; break
      case 'system': aVal = a.system; bVal = b.system; break
      case 'company': aVal = a.company; bVal = b.company; break
      case 'driver':
        aVal = getAssignedDriverName(a.drivers)
        bVal = getAssignedDriverName(b.drivers)
        break
      default: return 0
    }
    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})
</script>

<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-24 px-4 py-3">
            <button
              @click="handleSort('counter')"
              class="flex items-center gap-1 text-xs font-semibold uppercase cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'counter' ? 'text-foreground' : 'text-[#666666]'"
            >
              # <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="w-48 px-4 py-3">
            <button
              @click="handleSort('system')"
              class="flex items-center gap-1 text-xs font-semibold uppercase cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'system' ? 'text-foreground' : 'text-[#666666]'"
            >
              System <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="w-1/3 px-4 py-3">
            <button
              @click="handleSort('company')"
              class="flex items-center gap-1 text-xs font-semibold uppercase cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'company' ? 'text-foreground' : 'text-[#666666]'"
            >
              Company <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="handleSort('driver')"
              class="flex items-center gap-1 text-xs font-semibold uppercase cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'driver' ? 'text-foreground' : 'text-[#666666]'"
            >
              Driver <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="w-24 px-4 py-3 text-right">
            <span class="text-xs font-semibold text-[#666666] uppercase">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in sortedRows"
          :key="row.id"
          class="bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
        >
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ row.counter }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ row.system }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ row.company }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ getAssignedDriverName(row.drivers) }}
          </TableCell>
          <TableCell class="px-4 py-3 text-right">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
              @click="emit('edit-driver', row)"
            >
              <Pencil class="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="rows.length === 0">
          <TableCell colspan="5" class="text-center py-8 text-muted-foreground bg-card">
            No items found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
