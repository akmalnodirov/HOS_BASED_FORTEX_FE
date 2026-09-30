<template>
  <div class="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead class="w-16">No</TableHead>
          <TableHead>
            <button
              @click="handleSort('macAddress')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'macAddress' ? 'text-foreground' : 'text-muted-foreground'"
            >
              MAC <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('serialNumber')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'serialNumber' ? 'text-foreground' : 'text-muted-foreground'"
            >
              SN <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('isConnected')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'isConnected' ? 'text-foreground' : 'text-muted-foreground'"
            >
              Status <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('name')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'name' ? 'text-foreground' : 'text-muted-foreground'"
            >
              ELD type <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('vehicle')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'vehicle' ? 'text-foreground' : 'text-muted-foreground'"
            >
              Vehicle <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('malfunctions')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'malfunctions' ? 'text-foreground' : 'text-muted-foreground'"
            >
              Malfunctions <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('mainVersionInfo')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'mainVersionInfo' ? 'text-foreground' : 'text-muted-foreground'"
            >
              FM Version <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
          <TableHead>
            <button
              @click="handleSort('cycle')"
              class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
              :class="sortKey === 'cycle' ? 'text-foreground' : 'text-muted-foreground'"
            >
              Cycle <SortIcon class="w-3 h-3" />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="(eld, index) in sortedElds"
          :key="eld.id"
          class="hover:bg-accent/50 border-b border-border/50 transition-colors cursor-pointer"
          @click="emit('select', eld)"
        >
          <TableCell class="font-medium">{{ (currentPage - 1) * itemsPerPage + index + 1 }}</TableCell>
          <TableCell>{{ eld.macAddress }}</TableCell>
          <TableCell>{{ eld.serialNumber }}</TableCell>
          <TableCell>
            <Badge :class="getStatusBadgeClass(eld.isConnected)">
              {{ eld.isConnected ? 'Active' : 'In active' }}
            </Badge>
          </TableCell>
          <TableCell>{{ eld.name }}</TableCell>
          <TableCell>{{ eld.vehicle?.vehicleId || '07' }}</TableCell>
          <TableCell>{{ eld.malfunctions || 'N/A' }}</TableCell>
          <TableCell>{{ eld.mainVersionInfo }}</TableCell>
          <TableCell>{{ formatDuration(eld.hosTimeRemainder?.cycleDuration ?? 0) }}</TableCell>
        </TableRow>

        <!-- No results -->
        <TableRow v-if="elds.length === 0">
          <TableCell colspan="9" class="text-center py-8 text-muted-foreground">
            No ELDs found
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import SortIcon from '@/components/icons/SortIcon.vue'
import type { EldInfo } from '@/modules/Tools/ELDs/types'
import { formatDuration } from '@/utils/time'

type SortKey = 'macAddress' | 'serialNumber' | 'isConnected' | 'name' | 'vehicle' | 'malfunctions' | 'mainVersionInfo' | 'cycle'

interface Props {
  elds: EldInfo[]
  currentPage: number
  itemsPerPage: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', eld: EldInfo): void
}>()

const sortKey = ref<SortKey | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

const handleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortedElds = computed(() => {
  if (!sortKey.value) return props.elds
  return [...props.elds].sort((a, b) => {
    let aVal: string | number
    let bVal: string | number
    switch (sortKey.value) {
      case 'macAddress': aVal = a.macAddress; bVal = b.macAddress; break
      case 'serialNumber': aVal = a.serialNumber; bVal = b.serialNumber; break
      case 'isConnected': aVal = a.isConnected ? 1 : 0; bVal = b.isConnected ? 1 : 0; break
      case 'name': aVal = a.name; bVal = b.name; break
      case 'vehicle': aVal = a.vehicle?.vehicleId || ''; bVal = b.vehicle?.vehicleId || ''; break
      case 'malfunctions': aVal = a.malfunctions || ''; bVal = b.malfunctions || ''; break
      case 'mainVersionInfo': aVal = a.mainVersionInfo || ''; bVal = b.mainVersionInfo || ''; break
      case 'cycle': aVal = a.hosTimeRemainder?.cycleDuration ?? 0; bVal = b.hosTimeRemainder?.cycleDuration ?? 0; break
      default: return 0
    }
    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const getStatusBadgeClass = (isConnected: boolean) => {
  return isConnected
    ? 'bg-primary/10 text-primary hover:bg-primary/20'
    : 'bg-muted text-muted-foreground hover:bg-muted/80'
}
</script>
