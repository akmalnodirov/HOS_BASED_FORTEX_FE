<!-- src/components/dvir/DvirTable.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
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
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import type { DvirRecord } from '@/modules/Dvir/types'
import { SortOrder } from '@/utils/sort.ts'
import { SortKey } from '@/modules/Dvir/composables/useDvir.ts'

interface Props {
  dvirs: DvirRecord[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'update:selected', ids: string[]): void
}>()

const selectedIds = ref<Set<string>>(new Set())

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
</script>

<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-10 px-4 py-3" />
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
              @click="emit('sort', 'driverName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Driver
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'time')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Time
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'vehicle')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Vehicle
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'status')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Status
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'defects')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Defects
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
          v-for="(dvir, index) in dvirs"
          :key="dvir.id"
          @click="toggleRow(dvir.id)"
          class="cursor-pointer bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
          :class="{ 'bg-primary/5 dark:bg-primary/10': isSelected(dvir.id) }"
        >
          <TableCell class="px-4 py-3" @click.stop>
            <CCustomCheckbox :checked="isSelected(dvir.id)" @update:checked="toggleRow(dvir.id)" />
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ index + 1 }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dvir.driverName }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dvir.time }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dvir.vehicle }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dvir.status }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ dvir.defects }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <div class="flex items-center gap-2">
              <Button
                @click.stop="emit('edit', dvir.id)"
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-accent"
              >
                <Pencil class="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                @click.stop="emit('delete', dvir.id)"
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-destructive/10"
              >
                <Trash2 class="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="dvirs.length === 0">
          <TableCell colspan="8" class="text-center py-8 text-muted-foreground bg-card">
            No DVIRs found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
