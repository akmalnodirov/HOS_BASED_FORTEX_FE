<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import SortIcon from '@/components/icons/SortIcon.vue'

export interface Permission {
  id: number | string
  no: number
  name: string
  code?: string
}
export type SortKey = 'no' | 'name' | 'code'
export type SortOrder = 'asc' | 'desc'

defineProps<{
  permissions: Permission[]
  sortKey: SortKey
  sortOrder: SortOrder
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{
  (event: 'sort', key: SortKey): void
  (event: 'edit', permission: Permission): void
}>()

const headings: { label: string; key: SortKey; class?: string }[] = [
  { label: 'No', key: 'no', class: 'w-20' },
  { label: 'Name', key: 'name' },
  { label: 'Code', key: 'code' },
]
</script>

<template>
  <div class="min-h-0 overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible">
    <Table class="min-w-[820px]">
      <TableHeader class="sticky top-0 z-20">
        <TableRow class="border-0 bg-[#f0f0f0] hover:bg-[#f0f0f0] dark:bg-muted/50 dark:hover:bg-muted/50">
          <TableHead v-for="heading in headings" :key="heading.key" :class="heading.class">
            <button class="flex cursor-pointer items-center gap-2 font-medium hover:text-foreground" @click="emit('sort', heading.key)">
              {{ heading.label }}
              <SortIcon class="h-4 w-4" />
            </button>
          </TableHead>
          <TableHead class="w-24 text-right"><span class="font-medium">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="loading">
          <TableCell colspan="4" class="h-24 text-center text-muted-foreground">Loading permissions...</TableCell>
        </TableRow>
        <TableRow v-else-if="error">
          <TableCell colspan="4" class="h-24 text-center text-destructive">{{ error }}</TableCell>
        </TableRow>
        <TableRow
          v-for="permission in loading || error ? [] : permissions"
          :key="permission.id"
          class="h-12 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <TableCell class="p-2 font-medium">{{ permission.no }}</TableCell>
          <TableCell class="p-2">{{ permission.name }}</TableCell>
          <TableCell class="p-2 font-mono text-xs text-muted-foreground">{{ permission.code || 'N/A' }}</TableCell>
          <TableCell class="p-2">
            <div class="flex justify-end">
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('edit', permission)">
                <Pencil class="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <TableRow v-if="!loading && !error && permissions.length === 0">
          <TableCell colspan="4" class="h-24 text-center text-muted-foreground">No permissions found</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
