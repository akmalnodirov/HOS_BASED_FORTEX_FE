<script setup lang="ts">
import { Pencil, Trash2, KeyRound } from 'lucide-vue-next'
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

export interface Permission {
  id: number | string
  no: number
  name: string
  code?: string
}

export type SortKey = 'no' | 'name' | 'code'
export type SortOrder = 'asc' | 'desc'

interface Props {
  permissions: Permission[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'edit', permission: Permission): void
  (e: 'delete', permission: Permission): void
}>()
</script>

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
              @click="emit('sort', 'code')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Code
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
          v-for="permission in permissions"
          :key="permission.id"
          class="bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
        >
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ permission.no }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ permission.name }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ permission.code || 'N/A' }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                @click="emit('edit', permission)"
                class="h-8 w-8 hover:bg-accent"
              >
                <Pencil class="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="emit('delete', permission)"
                class="h-8 w-8 hover:bg-destructive/10"
              >
                <Trash2 class="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="permissions.length === 0">
          <TableCell colspan="4" class="text-center py-8 text-muted-foreground bg-card">
            No permissions found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
