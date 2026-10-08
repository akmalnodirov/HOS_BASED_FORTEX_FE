<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="sm:max-w-[800px] p-0 gap-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold uppercase tracking-wide">
          ERRORS & WARNINGS
        </DialogTitle>
      </DialogHeader>

      <div class="p-6 max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader class="bg-[#f8f9fd] dark:bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead class="w-[80px]">
                No <ChevronsUpDown class="w-3 h-3 inline-block ml-1 opacity-50" />
              </TableHead>
              <TableHead>
                Events <ChevronsUpDown class="w-3 h-3 inline-block ml-1 opacity-50" />
              </TableHead>
              <TableHead>
                Time <ChevronsUpDown class="w-3 h-3 inline-block ml-1 opacity-50" />
              </TableHead>
              <TableHead>
                Error & Warnings <ChevronsUpDown class="w-3 h-3 inline-block ml-1 opacity-50" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(item, index) in rows"
              :key="item.id ?? index"
              class="hover:bg-muted/50 cursor-pointer"
              @click="$emit('row-click', item.id)"
            >
              <TableCell class="font-medium">{{ item.no }}</TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <span v-if="item.badge" :class="getBadgeClass(item.badge)">{{ item.badge }}</span>
                  <span v-else>{{ item.event }}</span>
                </div>
              </TableCell>
              <TableCell>{{ item.time }}</TableCell>
              <TableCell>{{ item.error }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div class="px-6 py-4 border-t flex items-center justify-between bg-white dark:bg-card">
        <div class="text-sm font-medium">All errors: {{ rows.length }}</div>
        <Button variant="outline" @click="$emit('update:open', false)">Cancel</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown } from 'lucide-vue-next'

defineProps<{
  open: boolean
  rows: Array<{
    id: string
    no: number
    event: string
    time: string
    error: string
    badge?: string
  }>
}>()

defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'row-click', eventId: string): void
}>()

const getBadgeClass = (badge: string) => {
  if (badge === 'Driving')
    return 'bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium'
  if (badge === 'Sleep')
    return 'bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium'
  return ''
}
</script>
