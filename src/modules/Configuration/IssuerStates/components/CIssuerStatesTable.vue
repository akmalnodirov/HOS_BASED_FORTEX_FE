<script setup lang="ts">
import { Pencil, Trash2, MapPin } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import CEmptyState from '@/components/custom/CEmptyState.vue'
import SortIcon from '@/components/icons/SortIcon.vue'

export interface IssuerState {
  id: number | string
  no: number
  name: string
  parent: string
}

export type SortKey = 'no' | 'name' | 'parent'
export type SortOrder = 'asc' | 'desc'

interface Props {
  issuerStates: IssuerState[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'edit', state: IssuerState): void
  (e: 'delete', state: IssuerState): void
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow class="bg-gray-50 dark:bg-gray-800">
          <TableHead class="w-16">
            <button
              @click="emit('sort', 'no')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              No
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="emit('sort', 'name')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Name
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead>
             <button
              @click="emit('sort', 'parent')"
              class="flex items-center gap-2 font-medium hover:text-gray-900 dark:hover:text-gray-100 dark:text-gray-300 cursor-pointer"
            >
              Parent
              <SortIcon class="w-4 h-4" />
            </button>
          </TableHead>
          <TableHead class="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="issuerStates.length === 0">
          <TableCell colspan="4" class="h-100 text-center">
            <CEmptyState
              :icon="MapPin"
              title="No issuer states found"
              description="It looks like there are no issuer states to display. Try adding a new state or adjusting your search."
            />
          </TableCell>
        </TableRow>
        <TableRow
          v-else
          v-for="state in issuerStates"
          :key="state.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="font-medium py-3">{{ state.no }}</TableCell>
          <TableCell class="py-3">{{ state.name }}</TableCell>
          <TableCell class="py-3">{{ state.parent }}</TableCell>
          <TableCell class="text-right py-3">
            <div class="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                @click="emit('edit', state)"
                class="h-8 w-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Pencil class="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="emit('delete', state)"
                class="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
