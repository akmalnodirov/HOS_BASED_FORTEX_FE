<template>
  <div class="overflow-x-auto">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
    <div v-else-if="!events || events.length === 0" class="flex items-center justify-center p-8">
      <div class="text-muted-foreground">No events found</div>
    </div>
    <table v-else class="min-w-full w-full text-sm text-left text-muted-foreground">
      <thead class="text-xs text-foreground uppercase border-b">
        <tr>
          <th class="px-4 py-3 font-semibold w-12 bg-[#F0F0F0] dark:bg-muted/50 first:rounded-l">
            <CCustomCheckbox :checked="isAllSelected" @update:checked="toggleAll" />
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 font-semibold text-[#666666] dark:text-muted-foreground bg-[#F0F0F0] dark:bg-muted/50 last:rounded-r text-center"
            :class="col.class"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr
          v-for="event in events"
          :key="event.id"
          class="hover:bg-accent transition-colors cursor-pointer text-[#222222]"
          :class="{
            'bg-primary/10': isRowSelected(event.id),
            'bg-accent border-l-3 border-l-primary': isRowSelected(event.id),
          }"
          :style="
            !isRowSelected(event.id) && (event.errorTitles?.length || event.warningTitles?.length)
              ? { backgroundColor: event.errorTitles?.length ? '#F7EDED' : '#FBF4EC' }
              : undefined
          "
          @click="handleRowSelect(event)"
        >
          <td class="px-4 py-3" @click.stop>
            <CCustomCheckbox
              :checked="isRowSelected(event.id)"
              :disabled="event.status === 4"
              @update:checked="handleRowSelect(event)"
            />
          </td>
          <td class="px-4 py-3 font-normal text-foreground">{{ event.count }}</td>
          <td class="px-4 py-3">
            {{ event.est }}
          </td>
          <td class="px-4 py-3 text-center">
            <CEventBadge :event-code="event.event.eventCode" :event-type="event.event.eventType" />
          </td>
          <td class="px-4 py-3 font-normal dark:text-foreground text-center">
            {{ event.duration }}
          </td>
          <td class="px-4 py-3 text-center">
            <div class="max-w-64 truncate mx-auto" :title="event.location">
              {{ event.location || '---' }}
            </div>
          </td>
          <td class="px-4 py-3 text-center font-normal">{{ event.system }}</td>
          <td class="px-4 py-3 text-center font-normal">{{ event.odometer }}</td>
          <td class="px-4 py-3 text-center font-normal">{{ event.hours }}</td>
          <td class="px-4 py-3 text-center text-muted-foreground/60">
            <div class="max-w-32 truncate mx-auto" :title="event.notes">
              {{ event.notes || '---' }}
            </div>
          </td>
          <td class="px-4 py-3 text-center">
            <Badge
              :style="{
                backgroundColor: getStatusColor(event.status, 0.1),
                color: getStatusColor(event.status, 1),
              }"
              class="font-semibold"
            >
              {{ getStatusLabel(event.status) }}
            </Badge>
          </td>
          <td class="px-4 py-3 text-center">{{ event.trailer || '---' }}</td>
          <td class="px-4 py-3 text-center">{{ event.doc || '---' }}</td>
          <td class="px-4 py-3 text-right" @click.stop>
            <div class="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-muted"
                :disabled="isSubmitted || event.recordOrigin === 4 || event.recordStatus !== 1"
                @click="$emit('edit', event.id)"
              >
                <Pencil class="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-muted"
                :disabled="isSubmitted"
                @click="$emit('copy', event.id)"
              >
                <Copy class="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                v-if="event.status === 0"
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-muted"
                :disabled="isSubmitted"
                @click="$emit('delete', event.id)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
              <Button
                v-else
                variant="ghost"
                size="icon"
                class="h-8 w-8 hover:bg-muted"
                :disabled="!canRevert || isSubmitted"
                @click="$emit('revert', event.id)"
              >
                <Undo2 class="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Copy, Trash2, Undo2 } from 'lucide-vue-next'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import CEventBadge from './CEventBadge.vue'
import type { OptimizeEventTableRow } from '../types/optimize'
import type { TabResponse } from '../../Boost/types/boost'
import { ActionStates } from '../constants'

const props = defineProps<{
  events: OptimizeEventTableRow[]
  columns: Array<{ key: string; label: string; class?: string }>
  selectedRows: OptimizeEventTableRow[]
  loading?: boolean
  isSubmitted?: boolean
  tabs: TabResponse[]
  selectedTab: TabResponse | null
}>()

const emit = defineEmits<{
  (e: 'rowSelect', row: OptimizeEventTableRow): void
  (e: 'edit', eventId: string): void
  (e: 'copy', eventId: string): void
  (e: 'revert', eventId: string): void
  (e: 'delete', eventId: string): void
}>()

const isRowSelected = (eventId: string) => {
  return props.selectedRows.some((row) => row.id === eventId)
}

const isAllSelected = computed(() => {
  const selectableEvents = props.events?.filter((e) => e.status !== 4) || []
  return selectableEvents.length > 0 && selectableEvents.every((e) => isRowSelected(e.id))
})

const canRevert = computed(() => {
  if (!props.selectedTab || props.tabs.length === 0) return false
  const lastTab = props.tabs[props.tabs.length - 1]
  return lastTab.id === props.selectedTab.id && props.selectedTab.type !== 0
})

const handleRowSelect = (event: OptimizeEventTableRow) => {
  emit('rowSelect', event)
}

const toggleAll = () => {
  const selectableEvents = props.events?.filter((e) => e.status !== 4) || []
  if (isAllSelected.value) {
    // Deselect all
    selectableEvents.forEach((event) => {
      if (isRowSelected(event.id)) {
        emit('rowSelect', event)
      }
    })
  } else {
    // Select all
    selectableEvents.forEach((event) => {
      if (!isRowSelected(event.id)) {
        emit('rowSelect', event)
      }
    })
  }
}

const getStatusColor = (status: number, opacity: number): string => {
  const color = ActionStates[status as keyof typeof ActionStates]?.color || '#6B7280'
  if (opacity < 1) {
    // Convert hex to rgba
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return color
}

const getStatusLabel = (status: number): string => {
  return ActionStates[status as keyof typeof ActionStates]?.label || 'Unknown'
}
</script>
