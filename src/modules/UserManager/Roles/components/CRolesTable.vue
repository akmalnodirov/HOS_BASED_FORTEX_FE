<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { Role, SortKey, SortOrder } from '../types'

defineProps<{
  roles: Role[]
  sortKey: SortKey
  sortOrder: SortOrder
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{
  (event: 'sort', key: SortKey): void
  (event: 'edit', role: Role): void
  (event: 'delete', role: Role): void
}>()

const headings: { label: string; key: SortKey; class?: string }[] = [
  { label: 'No', key: 'no', class: 'w-20' },
  { label: 'Name', key: 'name' },
  { label: 'Permissions', key: 'permission', class: 'w-40' },
]
</script>

<template>
  <div class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible">
    <Table class="min-w-[720px]">
      <TableHeader class="sticky top-0 z-20">
        <TableRow class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50">
          <TableHead v-for="heading in headings" :key="heading.key" :class="heading.class">
            <button class="flex cursor-pointer items-center gap-2 font-medium hover:text-foreground" @click="emit('sort', heading.key)">
              {{ heading.label }}
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="w-28 text-right"><span class="font-medium">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading">
          <TableCell colspan="4" class="h-24 text-center text-muted-foreground">Loading roles...</TableCell>
        </TableRow>
        <TableRow v-else-if="error">
          <TableCell colspan="4" class="h-24 text-center text-destructive">{{ error }}</TableCell>
        </TableRow>
        <TableRow
          v-for="role in loading || error ? [] : roles"
          :key="role.id"
          class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="p-2 font-medium">{{ role.no }}</TableCell>
          <TableCell class="p-2">{{ role.name }}</TableCell>
          <TableCell class="p-2">{{ role.permission }}</TableCell>
          <TableCell class="p-2">
            <div class="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('edit', role)">
                <Pencil class="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('delete', role)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="!loading && !error && roles.length === 0">
          <TableCell colspan="4" class="h-24 text-center text-muted-foreground">No roles found</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
