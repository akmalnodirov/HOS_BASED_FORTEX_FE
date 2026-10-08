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
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import type { IftaRecord } from '@/modules/Ifta/types'

type SortKey = 'submitted' | 'from' | 'to' | 'vehicleId' | 'status'

interface Props {
  records: IftaRecord[]
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'download-pdf', path: string): void
  (e: 'download-csv', path: string): void
  (e: 'update:selected', ids: string[]): void
}>()

const selectedIds = ref<Set<string>>(new Set())
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

const sortedRecords = computed(() => {
  if (!sortKey.value) return props.records
  return [...props.records].sort((a, b) => {
    const aVal =
      sortKey.value === 'submitted'
        ? Date.parse(a.submitted) || 0
        : a[sortKey.value!]
    const bVal =
      sortKey.value === 'submitted'
        ? Date.parse(b.submitted) || 0
        : b[sortKey.value!]
    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const toggleRow = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
  emit('update:selected', [...next])
}

const isSelected = (id: string) => selectedIds.value.has(id)

const statusLabel = (status: string) => {
  if (status === 'READY') return 'Ready'
  if (status === 'ERROR' || status === 'FAILED') return 'Failed'
  if (status === 'WAITING') return 'Waiting'
  return 'Processing'
}

const statusClass = (status: string) => {
  if (status === 'READY')
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  if (status === 'ERROR' || status === 'FAILED')
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
}
</script>

<template>
  <div class="ifta-table min-w-[980px]">
    <Table class="min-w-full">
      <TableHeader class="sticky top-0 z-10">
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-10 px-4 py-3" />
          <TableHead class="w-16 px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">#</span>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="handleSort('submitted')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'submitted' }"
            >
              Submitted <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="handleSort('from')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'from' }"
            >
              From <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="handleSort('to')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'to' }"
            >
              To <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="handleSort('vehicleId')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'vehicleId' }"
            >
              Vehicle ID <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="handleSort('status')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
              :class="{ 'text-foreground': sortKey === 'status' }"
            >
              Status <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">Report (PDF & CSV)</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <!-- Loading state -->
        <TableRow v-if="isLoading">
          <TableCell colspan="8" class="text-center py-8 text-muted-foreground bg-card">
            Loading...
          </TableCell>
        </TableRow>

        <!-- Data rows -->
        <TableRow
          v-else
          v-for="(record, index) in sortedRecords"
          :key="record.id"
          class="cursor-pointer bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
          :class="{ 'bg-primary/5 dark:bg-primary/10': isSelected(record.id) }"
          @click="toggleRow(record.id)"
        >
          <TableCell class="px-4 py-3" @click.stop>
            <CCustomCheckbox
              :checked="isSelected(record.id)"
              @update:checked="toggleRow(record.id)"
            />
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ index + 1 }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.submitted }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.from }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.to }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ record.vehicleId }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                statusClass(record.status),
              ]"
              :title="record.errors.join(', ')"
            >
              {{ statusLabel(record.status) }}
            </span>
          </TableCell>
          <TableCell class="px-4 py-3">
            <div class="flex items-center gap-2" v-if="record.status === 'READY'">
              <Button
                v-if="record.pdfPath"
                variant="ghost"
                size="sm"
                class="h-7 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                @click.stop="emit('download-pdf', record.pdfPath)"
              >
                <Download class="w-3 h-3 mr-1" />
                PDF
              </Button>
              <Button
                v-if="record.csvPath"
                variant="ghost"
                size="sm"
                class="h-7 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                @click.stop="emit('download-csv', record.csvPath)"
              >
                <Download class="w-3 h-3 mr-1" />
                CSV
              </Button>
            </div>
            <span v-else class="text-gray-400 dark:text-gray-500 text-sm">
              {{ statusLabel(record.status) }}
            </span>
          </TableCell>
        </TableRow>

        <!-- Empty state -->
        <TableRow v-if="!isLoading && records.length === 0">
          <TableCell colspan="8" class="text-center py-8 text-muted-foreground bg-card">
            No IFTA reports found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<style scoped>
.ifta-table :deep(.relative.w-full.overflow-auto) {
  overflow: visible;
}
</style>
