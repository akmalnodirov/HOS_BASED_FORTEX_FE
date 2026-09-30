<template>
  <div class="overflow-x-auto rounded-lg">
    <Table>
      <TableHeader>
        <TableRow class="bg-[#f0f0f0] dark:bg-muted/50 border-0">
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
              @click="emit('sort', 'firstName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Name
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'userName')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Username
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'isActive')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Action
              <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead class="px-4 py-3">
            <button
              @click="emit('sort', 'role')"
              class="flex items-center gap-2 text-xs font-semibold text-[#666666] uppercase hover:text-foreground transition-colors cursor-pointer"
            >
              Role
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
          v-for="(user, index) in users"
          :key="user.id"
          class="bg-white dark:bg-card hover:bg-accent/50 transition-colors border-[#DBDBDB] dark:border-border"
        >
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ index + 1 }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ user.firstName }} {{ user.lastName }}
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ user.userName }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <Badge
              :class="getStatusBadgeClass(user.isActive)"
              class="text-[11px] font-normal py-0.5 px-2 h-auto"
            >
              {{ getStatusBadge(user.isActive) }}
            </Badge>
          </TableCell>
          <TableCell class="px-4 py-3 text-sm font-normal text-[#090909] dark:text-foreground">
            {{ user.role?.name || '-' }}
          </TableCell>
          <TableCell class="px-4 py-3">
            <Switch
              :model-value="user.isActive"
              @update:model-value="emit('toggle-status', user.id, user.isActive)"
            />
          </TableCell>
          <TableCell class="px-4 py-3">
            <div class="flex items-center gap-2">
              <Button
                @click="emit('edit', user)"
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-accent"
              >
                <Pencil class="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                @click="emit('delete', user.id)"
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
        <TableRow v-if="users.length === 0">
          <TableCell colspan="7" class="text-center py-8 text-muted-foreground bg-card">
            No users found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
<!-- src/components/users/UsersTable.vue -->
<script setup lang="ts">
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { User } from '@/modules/Tools/Users/types'
import type { SortKey, SortOrder } from '@/modules/Tools/Users/composables/useUsers'

interface Props {
  users: User[]
  sortKey: SortKey
  sortOrder: SortOrder
  getStatusBadge: (isActive: boolean) => string
  getStatusBadgeClass: (isActive: boolean) => string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', key: SortKey): void
  (e: 'toggle-status', userId: string, currentStatus: boolean): void
  (e: 'edit', user: User): void
  (e: 'delete', userId: string): void
}>()
</script>
