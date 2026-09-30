<script setup lang="ts">
import { Pencil, Trash2, ShieldOff } from 'lucide-vue-next'
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
import type { Role, SortKey, SortOrder } from '../types/index.ts'

interface Props {
  roles: Role[]
  sortKey: SortKey
  sortOrder: SortOrder
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'edit', role: Role): void
  (e: 'delete', role: Role): void
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
          <TableHead class="w-16 px-4 py-3">
            <span class="text-xs font-semibold text-[#666666] uppercase">No</span>
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
          <TableHead class="w-34 px-4 py-3">
            <button
              @click="emit('sort', 'permission')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Permission
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="w-32 px-4 py-3 text-right">
            <span class="text-xs font-semibold text-[#666666] uppercase">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="role in roles"
          :key="role.id"
          class="bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
        >
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ role.no }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ role.name }}
          </TableCell>
          <TableCell class="w-34 px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ role.permission }}
          </TableCell>
          <TableCell class="w-32 px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                @click="emit('edit', role)"
                class="h-8 w-8 hover:bg-accent"
              >
                <Pencil class="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="emit('delete', role)"
                class="h-8 w-8 hover:bg-destructive/10"
              >
                <Trash2 class="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="roles.length === 0">
          <TableCell colspan="4" class="text-center py-8 text-muted-foreground bg-card">
            No roles found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
