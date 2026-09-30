<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-semibold text-foreground">Monitoring</h2>
      </div>

      <!-- Multi-select drivers -->
      <Popover v-model:open="isDropdownOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            class="min-w-64 max-w-80 h-auto justify-start gap-1 flex-wrap px-3 py-1.5 border-border"
          >
            <template v-if="selectedDriverObjects.length">
              <span
                v-for="d in selectedDriverObjects"
                :key="d.id"
                class="flex items-center gap-1 bg-muted text-foreground px-2 py-0.5 rounded text-xs font-normal"
              >
                {{ d.name }}
                <X
                  v-if="d.id !== 'all'"
                  class="w-3 h-3 cursor-pointer hover:text-destructive"
                  @click.stop="removeDriver(d.id)"
                />
              </span>
            </template>
            <span v-else class="text-muted-foreground text-sm font-normal">Select drivers</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-64 p-1 border-border" align="end">
          <div class="max-h-64 overflow-y-auto space-y-0.5">
            <!-- All drivers -->
            <div
              class="flex items-center justify-between px-3 py-2 rounded cursor-pointer hover:bg-muted transition-colors"
              :class="{ 'bg-muted': isDriverSelected('all') }"
              @click="toggleDriver('all')"
            >
              <span class="text-sm">All Drivers</span>
              <Check v-if="isDriverSelected('all')" class="w-4 h-4 text-primary shrink-0" />
            </div>
            <div
              v-for="d in drivers"
              :key="d.id"
              class="flex items-center justify-between px-3 py-2 rounded cursor-pointer hover:bg-muted transition-colors"
              :class="{ 'bg-muted': isDriverSelected(d.id) }"
              @click="toggleDriver(d.id)"
            >
              <span class="text-sm truncate">{{ d.name }}</span>
              <Check v-if="isDriverSelected(d.id)" class="w-4 h-4 text-primary shrink-0" />
            </div>
            <div
              v-if="!drivers.length && !isLoading"
              class="px-3 py-4 text-center text-sm text-muted-foreground"
            >
              No drivers
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12 text-center">
      <p class="text-destructive">{{ error }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!monitorings.length" class="py-16 text-center">
      <p class="text-muted-foreground">No monitoring data available</p>
    </div>

    <!-- Accordion -->
    <Accordion v-else type="multiple" class="w-full space-y-2">
      <AccordionItem
        v-for="item in monitorings"
        :key="item.driverId"
        :value="item.driverId"
        class="border border-border rounded-xl overflow-hidden bg-card"
      >
        <!-- Trigger -->
        <AccordionTrigger
          class="hover:no-underline px-4 py-3 hover:bg-accent/50 data-[state=open]:bg-accent/30 group"
        >
          <div class="flex items-center justify-between w-full gap-3 min-w-0">
            <div class="flex items-center gap-2 shrink-0">
              <ChevronRight
                class="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90"
              />
              <span class="font-medium text-sm text-foreground truncate">
                {{ item.driver }}
              </span>
            </div>

            <div class="flex items-center gap-2 flex-wrap shrink-0">
              <Badge
                variant="outline"
                class="text-xs whitespace-nowrap text-green-700 font-normal"
                style="background-color: #DCF5E2; border-color: #DCF5E2"
              >
                Number of warnings: {{ item.warningEvents }}
              </Badge>
              <Badge
                variant="outline"
                class="text-xs whitespace-nowrap text-red-600 font-normal"
                style="background-color: #F7EDED; border-color: #F7EDED"
              >
                Number of errors: {{ item.errorEvents }}
              </Badge>
              <Badge
                v-if="item.mostCommon"
                variant="outline"
                class="text-xs max-w-80 text-blue-700 font-normal"
                style="background-color: #D6E1FF; border-color: #D6E1FF"
                :title="'Most common: ' + item.mostCommon"
              >
                Most common: {{ item.mostCommon }}
              </Badge>
              <Button
                @click.capture.stop="handleBoostClick(item.driverId)"
                size="sm"
                variant="outline"
                class="h-7 px-2 border-primary/30 hover:bg-primary/10"
              >
                <LineChart class="w-3.5 h-3.5 text-primary" />
              </Button>
            </div>
          </div>
        </AccordionTrigger>

        <!-- Content -->
        <AccordionContent class="px-0 pb-0">
          <!-- Table 1: Summary (last event) -->
          <div class="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow class="bg-primary/5 hover:bg-primary/5">
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('lastEvent')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'lastEvent' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Last Event <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('truck')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'truck' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Truck <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('break')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'break' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Break <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('drive')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'drive' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Drive <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('shift')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'shift' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Shift <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('cycle')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'cycle' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Cycle <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('profile')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'profile' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Has Profile Forms <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('violation')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'violation' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Violation <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="text-center">
                    <button
                      @click="handleDriverSort('updated')"
                      class="flex items-center justify-center gap-1 w-full text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        driverSortKey === 'updated' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Last Event At <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in item.lastEvent" :key="row.updated">
                  <TableCell class="text-center">
                    <Badge
                      variant="outline"
                      class="w-full flex justify-center text-xs uppercase text-blue-600 font-normal"
                      style="background-color: #EBF0FF; border-color: #EBF0FF"
                    >
                      {{ getEventText(row.event.eventType, row.event.eventCode) }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-center text-xs">{{ row.truck || '' }}</TableCell>
                  <TableCell class="text-center text-xs">{{ formatDuration(row.break) }}</TableCell>
                  <TableCell class="text-center text-xs">{{ formatDuration(row.drive) }}</TableCell>
                  <TableCell class="text-center text-xs">{{ formatDuration(row.shift) }}</TableCell>
                  <TableCell class="text-center text-xs">{{ formatDuration(row.cycle) }}</TableCell>
                  <TableCell class="text-center">
                    <Badge
                      variant="outline"
                      class="text-xs uppercase font-normal px-3"
                      :class="row.profile ? 'text-green-700' : 'text-red-600'"
                      :style="
                        row.profile
                          ? 'background-color: #DCF5E2; border-color: #DCF5E2'
                          : 'background-color: #F7EDED; border-color: #F7EDED'
                      "
                    >
                      {{ row.profile ? 'YES' : 'NO' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-center">
                    <Badge
                      variant="outline"
                      class="text-xs uppercase font-normal px-3"
                      :class="row.violation ? 'text-green-700' : 'text-red-600'"
                      :style="
                        row.violation
                          ? 'background-color: #DCF5E2; border-color: #DCF5E2'
                          : 'background-color: #F7EDED; border-color: #F7EDED'
                      "
                    >
                      {{ row.violation ? 'YES' : 'NO' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-center text-xs">{{ row.updated }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Table 2: Damaged events -->
          <div class="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow class="bg-muted/50 hover:bg-muted/50">
                  <TableHead class="w-[28%]">
                    <button
                      @click="handleEventSort('event')"
                      class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        eventSortKey === 'event' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Event <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="w-[14%]">
                    <button
                      @click="handleEventSort('error')"
                      class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        eventSortKey === 'error' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Error type <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="w-[14%]">
                    <button
                      @click="handleEventSort('time')"
                      class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="eventSortKey === 'time' ? 'text-foreground' : 'text-muted-foreground'"
                    >
                      Time <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead class="w-[44%]">
                    <button
                      @click="handleEventSort('message')"
                      class="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
                      :class="
                        eventSortKey === 'message' ? 'text-foreground' : 'text-muted-foreground'
                      "
                    >
                      Error message <SortIcon class="w-3 h-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="event in getPaginatedEvents(item.driverId, item.events)"
                  :key="event.id"
                  class="hover:bg-accent/50 border-b border-border/50"
                >
                  <TableCell>
                    <Badge
                      variant="outline"
                      class="w-full flex justify-center text-xs uppercase text-blue-600 font-normal"
                      style="background-color: #EBF0FF; border-color: #EBF0FF"
                    >
                      {{ getEventText(event.event.eventType, event.event.eventCode) }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      class="w-full flex justify-center text-xs uppercase text-red-600 font-normal"
                      style="background-color: #F7EDED; border-color: #F7EDED"
                    >
                      {{ event.error }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-xs">{{ event.time }}</TableCell>
                  <TableCell class="text-xs text-muted-foreground">{{ event.message }}</TableCell>
                </TableRow>
                <TableRow v-if="!item.events.length">
                  <TableCell colspan="4" class="text-center py-6 text-sm text-muted-foreground">
                    No errors or warnings
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination for events -->
          <div
            v-if="item.events.length > 10"
            class="flex items-center justify-center gap-1 py-3 border-t border-border"
          >
            <Button
              variant="outline"
              size="icon"
              class="h-7 w-7 border-border"
              :disabled="(pageStates[item.driverId] || 1) <= 1"
              @click="pageStates[item.driverId] = Math.max(1, (pageStates[item.driverId] || 1) - 1)"
            >
              <ChevronLeft class="w-3.5 h-3.5" />
            </Button>
            <span class="text-xs text-muted-foreground px-2">
              {{ pageStates[item.driverId] || 1 }} / {{ getTotalPages(item.events) }}
            </span>
            <Button
              variant="outline"
              size="icon"
              class="h-7 w-7 border-border"
              :disabled="(pageStates[item.driverId] || 1) >= getTotalPages(item.events)"
              @click="
                pageStates[item.driverId] = Math.min(
                  getTotalPages(item.events),
                  (pageStates[item.driverId] || 1) + 1
                )
              "
            >
              <ChevronRight class="w-3.5 h-3.5" />
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, X, LineChart, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import SortIcon from '@/components/icons/SortIcon.vue'
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
import { useMonitoringDetail } from '@/modules/Tools/Monitoring/composables/useMonitoringDetail'

const router = useRouter()
const isDropdownOpen = ref(false)

const {
  isLoading,
  error,
  drivers,
  selectedDriverObjects,
  monitorings,
  pageStates,
  toggleDriver,
  removeDriver,
  isDriverSelected,
  getPaginatedEvents,
  getTotalPages,
  driverSortKey,
  eventSortKey,
  handleDriverSort,
  handleEventSort,
  handleBoostClick,
  getEventText,
  formatDuration,
} = useMonitoringDetail()
</script>
