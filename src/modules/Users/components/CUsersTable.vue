<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { User, SortKey, SortOrder } from '@/modules/Users/types'

defineProps<{
  users: User[]
  sortKey: SortKey
  sortOrder: SortOrder
}>()
const emit = defineEmits<{
  (event: 'sort', key: SortKey): void
  (event: 'toggle-status', user: User): void
  (event: 'edit', user: User): void
  (event: 'delete', user: User): void
}>()

const headings: { label: string; key: SortKey; class?: string }[] = [
  { label: 'No', key: 'no', class: 'w-16' },
  { label: 'Name', key: 'name' },
  { label: 'Email', key: 'email' },
  { label: 'Role', key: 'role' },
  { label: 'Companies', key: 'companyNames' },
  { label: 'Status', key: 'status', class: 'w-32' },
]
</script>

<template>
  <div class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible">
    <Table class="min-w-[980px]">
      <TableHeader class="sticky top-0 z-20">
        <TableRow class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50">
          <TableHead v-for="heading in headings" :key="heading.key" :class="heading.class">
            <button
              class="flex cursor-pointer items-center gap-2 font-medium hover:text-foreground"
              @click="emit('sort', heading.key)"
            >
              {{ heading.label }}
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="w-24"><span class="font-medium">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="user in users"
          :key="user.id"
          class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="p-2 font-medium">{{ user.no }}</TableCell>
          <TableCell class="p-2">{{ user.name }}</TableCell>
          <TableCell class="p-2">{{ user.email }}</TableCell>
          <TableCell class="p-2">{{ user.role }}</TableCell>
          <TableCell class="max-w-[360px] p-2">
            <span class="line-clamp-2" :title="user.companyNames">{{ user.companyNames }}</span>
          </TableCell>
          <TableCell class="p-2">
            <Switch
              :model-value="user.status"
              class="data-[state=checked]:bg-primary"
              @update:model-value="emit('toggle-status', user)"
            />
          </TableCell>
          <TableCell class="p-2">
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('edit', user)">
                <Pencil class="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('delete', user)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="users.length === 0">
          <TableCell colspan="7" class="py-8 text-center text-muted-foreground">
            No portal users found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
