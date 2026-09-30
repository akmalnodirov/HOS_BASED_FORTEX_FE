<template>
  <div class="space-y-4">
    <!-- Table Content -->
    <div class="overflow-x-auto overflow-y-auto max-h-[80vh] rounded-lg">
      <div class="w-full min-w-350">
        <!-- Table Header - Outside Accordion -->
        <div class="bg-[#f0f0f0] rounded-lg dark:bg-muted/50 sticky top-0 z-10 mb-1">
          <div
            class="grid grid-cols-[30px_60px_1.5fr_80px_110px_150px_1fr_80px_85px_70px_70px_100px_70px] gap-2 px-4 py-3"
          >
            <!-- Columns matching the original table headers but in grid -->
            <div class="flex items-center justify-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              ></span>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('id')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                No
                <SortIcon class="w-4 h-4" :class="getSortClass('id')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('name')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Name
                <SortIcon class="w-4 h-4" :class="getSortClass('name')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('unit')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Unit
                <SortIcon class="w-4 h-4" :class="getSortClass('unit')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('event')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Event
                <SortIcon class="w-4 h-4" :class="getSortClass('event')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('uploadTime')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Upload Time
                <SortIcon class="w-4 h-4" :class="getSortClass('uploadTime')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('location')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Location
                <SortIcon class="w-4 h-4" :class="getSortClass('location')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('break')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Break
                <SortIcon class="w-4 h-4" :class="getSortClass('break')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('driving')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Driving
                <SortIcon class="w-4 h-4" :class="getSortClass('driving')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('shift')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Shift
                <SortIcon class="w-4 h-4" :class="getSortClass('shift')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('cycle')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Cycle
                <SortIcon class="w-4 h-4" :class="getSortClass('cycle')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('violation')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                Violation
                <SortIcon class="w-4 h-4" :class="getSortClass('violation')" />
              </button>
            </div>
            <div class="flex items-center">
              <button
                @click="handleSort('eld')"
                class="flex items-center gap-2 text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase hover:text-foreground transition-colors"
              >
                ELD
                <SortIcon class="w-4 h-4" :class="getSortClass('eld')" />
              </button>
            </div>
          </div>
        </div>

        <!-- Accordion Items -->
        <Accordion type="multiple" v-model="openItems" class="w-full">
          <AccordionItem
            v-for="log in paginatedLogs"
            :key="log.id"
            :value="`log-${log.id}`"
            class="border-b-0"
          >
            <div
              class="border border-[#DBDBDB] dark:border-border rounded-sm mb-1 bg-white dark:bg-card"
            >
              <AccordionTrigger
                class="border-0 px-4 py-3 cursor-pointer w-full bg-transparent! data-[state=open]:bg-muted/50"
              >
                <div
                  class="grid grid-cols-[30px_60px_1.5fr_80px_110px_150px_1fr_80px_85px_70px_70px_100px_70px] gap-2 w-full items-center text-left"
                >
                  <!-- Chevron -->
                  <div class="flex items-center justify-center">
                    <ChevronDown
                      class="h-5 w-5 shrink-0 transition-transform duration-200 text-[#666666] dark:text-muted-foreground"
                      :class="{ 'rotate-180': isOpen(log.id) }"
                    />
                  </div>
                  <!-- No -->
                  <div class="text-sm text-[#090909] dark:text-foreground font-normal">
                    {{ log.id }}
                  </div>
                  <!-- Name (Clickable) -->
                  <div
                    class="text-sm font-normal text-[#090909] dark:text-foreground cursor-pointer truncate"
                    @click.stop="handleRowClick(log)"
                  >
                    {{ log.name }}
                  </div>
                  <!-- Unit -->
                  <div class="text-sm text-[#090909] dark:text-foreground font-normal truncate">
                    {{ log.unit }}
                  </div>
                  <!-- Event -->
                  <div>
                    <Badge
                      :class="getEventBadgeClass(log.event)"
                      class="text-[11px] font-normal py-0.5 px-2 h-auto"
                    >
                      {{ log.event }}
                    </Badge>
                  </div>
                  <!-- Upload Time -->
                  <div
                    class="text-sm text-[#090909] dark:text-foreground font-normal whitespace-nowrap"
                  >
                    {{ log.uploadTime }}
                  </div>
                  <!-- Location -->
                  <div
                    class="text-sm text-[#090909] dark:text-foreground font-normal truncate"
                    :title="log.location"
                  >
                    {{ log.location }}
                  </div>
                  <!-- Break -->
                  <div
                    class="text-sm text-[#090909] dark:text-foreground font-normal border-b border-foreground/20 pb-0.5 w-max"
                  >
                    {{ log.break }}
                  </div>
                  <!-- Driving -->
                  <div
                    class="text-sm text-[#090909] dark:text-foreground font-normal border-b border-foreground/20 pb-0.5 w-max"
                  >
                    {{ log.driving }}
                  </div>
                  <!-- Shift -->
                  <div
                    class="text-sm text-[#090909] dark:text-foreground font-normal border-b border-foreground/20 pb-0.5 w-max"
                  >
                    {{ log.shift }}
                  </div>
                  <!-- Cycle -->
                  <div
                    class="text-sm text-[#090909] dark:text-foreground font-normal border-b border-foreground/20 pb-0.5 w-max"
                  >
                    {{ log.cycle }}
                  </div>
                  <!-- Violation -->
                  <div
                    class="text-sm font-normal truncate ml-5"
                    :class="
                      log.violation === 'N/A' || log.violation !== 'None'
                        ? 'text-destructive'
                        : 'text-[#090909] dark:text-foreground'
                    "
                  >
                    {{ log.violation }}
                  </div>
                  <!-- ELD -->
                  <div>
                    <Badge
                      :class="getEldBadgeClass(log.eld)"
                      class="text-[11px] font-normal py-0.5 px-2 h-auto"
                    >
                      {{ log.eld }}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent class="pt-0 border-t">
                <div class="px-6 py-4">
                  <div class="rounded-lg border border-primary/20 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow class="bg-primary/5">
                          <TableHead
                            v-for="column in innerColumns"
                            :key="column.key"
                            class="text-center font-bold text-xs p-2"
                          >
                            {{ column.label }}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow
                          v-for="(record, idx) in log.records"
                          :key="idx"
                          @click.stop="handleInnerRowClick(log.driverId, record.date)"
                          class="cursor-pointer hover:bg-primary/5 transition-colors bg-card text-xs"
                        >
                          <TableCell class="text-center p-2">{{ record.dateFormatted }}</TableCell>
                          <TableCell class="text-center p-2">
                            <Badge
                              variant="outline"
                              class="border-border text-[11px] py-0 px-2 h-5"
                            >
                              {{ formatDuration(record.driven) || '0h 0m' }}
                            </Badge>
                          </TableCell>
                          <TableCell class="text-center p-2">
                            <Badge
                              variant="outline"
                              class="border-border text-[11px] py-0 px-2 h-5"
                            >
                              {{ formatDuration(record.duty) || '0h 0m' }}
                            </Badge>
                          </TableCell>
                          <TableCell class="text-center p-2">
                            <Badge
                              class="text-[11px] py-0 px-2 h-5"
                              :class="
                                record.profile
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                              "
                            >
                              {{ record.profile ? 'YES' : 'NO' }}
                            </Badge>
                          </TableCell>
                          <TableCell class="text-center p-2">
                            <Badge
                              class="text-[11px] py-0 px-2 h-5"
                              :class="
                                record.violation
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                              "
                            >
                              {{ record.violation ? 'YES' : 'NO' }}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        <TableRow v-if="!log.records || log.records.length === 0">
                          <TableCell :colspan="5" class="text-center py-6 text-gray-500">
                            No daily records found
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </div>
          </AccordionItem>
          <!-- No Results -->
          <div
            v-if="paginatedLogs.length === 0"
            class="flex items-center justify-center p-8 text-muted-foreground border rounded-lg bg-card"
          >
            No logs found
          </div>
        </Accordion>
      </div>
    </div>

    <!-- Footer / Pagination -->
    <div
      class="px-6 py-4 border-t border-border flex items-center justify-between bg-white dark:bg-card rounded-lg shadow-sm"
    >
      <!-- Items per page -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">
          {{ totalEntries.toLocaleString() }} entries
        </span>
      </div>

      <!-- Pagination -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1">
          <button
            v-for="page in pageNumbers"
            :key="page"
            @click="typeof page === 'number' && goToPage(page)"
            :disabled="page === '...'"
            :class="[
              'min-w-[32px] h-8 px-2 text-sm font-normal rounded transition-colors',
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'text-muted-foreground/50 cursor-default'
                  : 'text-foreground hover:bg-accent',
            ]"
          >
            {{ page }}
          </button>
        </div>

        <div class="flex items-center gap-2 ml-4">
          <span class="text-sm text-muted-foreground">
            {{ currentPage }} of {{ totalPages }} pages
          </span>
          <div class="flex gap-1">
            <Button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              variant="outline"
              size="icon"
              class="h-8 w-8"
            >
              <ChevronLeft class="w-4 h-4" />
            </Button>
            <Button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="icon"
              class="h-8 w-8"
            >
              <ChevronRight class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-vue-next'
import SortIcon from '@/components/icons/SortIcon.vue'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useELDLogs, type Log } from '../composables/useELDLogs.ts'
import { formatDuration } from '@/utils/time.ts'

const router = useRouter()

// Reuse the single instance provided by the parent page (PELDLogs.vue)
// so that filter state (status, event, violation) is shared
const logsInstance = inject<ReturnType<typeof useELDLogs>>('eldLogs') ?? useELDLogs()

const {
  itemsPerPage,
  currentPage,
  paginatedLogs,
  totalPages,
  totalEntries,
  pageNumbers,
  handleSort,
  sortKey,
  sortOrder,
  goToPage,
  getEventBadgeClass,
  getEldBadgeClass,
  handleDriverClick,
  handleDateClick,
  innerColumns,
} = logsInstance

const getSortClass = (key: string) => {
  if (sortKey.value !== key) return 'opacity-40'
  return sortOrder.value === 'desc' ? 'text-primary rotate-180' : 'text-primary'
}

// Local accordion state
const openItems = ref<string[]>([])

const isOpen = (logId: number) => {
  return openItems.value.includes(`log-${logId}`)
}

const handleRowClick = (log: Log) => {
  handleDriverClick(log)
}

const handleInnerRowClick = (driverId: string, date: string) => {
  handleDateClick(driverId, date)
}
</script>
