<script setup lang="ts">
import { inject } from 'vue'
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/utils/time'
import { useELDLogs, type RouteEldClock } from '../composables/useELDLogs'

const logsInstance = inject<ReturnType<typeof useELDLogs>>('eldLogs') ?? useELDLogs()

const {
  loading,
  error,
  paginatedLogs,
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,
  handleSort,
  getSortIcon,
  getEventBadgeClass,
  getConnectionBadgeClass,
  toggleRow,
  isRowExpanded,
  isDailyLogsLoading,
  getDailyLogs,
  getDailyLogsError,
  fetchDailyLogs,
  fetchLogs,
} = logsInstance

const formatClock = (clock: RouteEldClock | null) => {
  if (!clock) return '—'
  const totalMinutes = Math.max(0, Math.floor(clock.remainingMilliseconds / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

const formatHours = (milliseconds: number) => `${(milliseconds / 3600000).toFixed(2)} h`

const formatDate = (value: string | null) =>
  value ? formatTime(value, 'MMM D, YYYY h:mm A') : 'Never'

const formatLogDate = (value: string) => {
  if (!value) return '—'
  const parsed = formatTime(value.replaceAll('/', '-'), 'MMM D, YYYY')
  return parsed === 'Invalid Date' ? value : parsed
}

const formatViolationTime = (value: string | null) =>
  value ? formatTime(value, 'MMM D, h:mm A') : ''

const formatTrailers = (value: string | null) => {
  const trailers = value?.split(/[,|\s]+/).filter(Boolean) ?? []
  return trailers.length ? trailers.join(', ') : '—'
}

const formatConnection = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
</script>

<template>
  <div class="flex flex-col">
    <div
      v-if="error"
      class="flex min-h-48 flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card"
    >
      <p class="text-sm text-destructive">{{ error }}</p>
      <Button variant="outline" class="mt-4" @click="fetchLogs(true)">
        <RefreshCw class="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>

    <div v-else class="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
      <table class="min-w-[1900px] w-full border-collapse text-left text-sm">
        <thead class="sticky top-0 z-20 bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th class="w-10 px-3 py-3"></th>
            <th class="w-14 px-3 py-3">No</th>
            <th class="min-w-52 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('displayName')">
                Driver
                <component :is="getSortIcon('displayName')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <!-- <th class="min-w-48 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('companyName')">
                Company
                <component :is="getSortIcon('companyName')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <th class="min-w-36 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('externalDriverId')">
                Route ELD ID
                <component :is="getSortIcon('externalDriverId')" class="h-3.5 w-3.5" />
              </button>
            </th> -->
            <th class="min-w-10 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('vehicleUnitName')">
                Unit
                <component :is="getSortIcon('vehicleUnitName')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <th class="min-w-25 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('currentStatus')">
                Event
                <component :is="getSortIcon('currentStatus')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <th class="w-15 px-3 py-3">VAN</th>
            <th class="min-w-15 px-3 py-3">Trailers</th>
            <th class="min-w-50 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('location')">
                Latest location
                <component :is="getSortIcon('location')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <th class="min-w-30 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('statusAt')">
                Last status
                <component :is="getSortIcon('statusAt')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <th class="min-w-24 px-3 py-3">Break</th>
            <th class="min-w-24 px-3 py-3">Driving</th>
            <th class="min-w-24 px-3 py-3">Shift</th>
            <th class="min-w-24 px-3 py-3">Cycle</th>
            <th class="min-w-15 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('violationCount')">
                Violation
                <component :is="getSortIcon('violationCount')" class="h-3.5 w-3.5" />
              </button>
            </th>
            <th class="min-w-32 px-3 py-3">
              <button class="flex items-center gap-1" @click="handleSort('connectionStatus')">
                ELD
                <component :is="getSortIcon('connectionStatus')" class="h-3.5 w-3.5" />
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-if="loading">
            <tr v-for="index in 8" :key="index" class="border-t border-border">
              <td v-for="column in 17" :key="column" class="px-3 py-4">
                <Skeleton class="h-4 w-full min-w-8" />
              </td>
            </tr>
          </template>

          <template v-for="(log, index) in paginatedLogs" v-else :key="log.driverId">
            <tr
              class="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
              :class="isRowExpanded(log.driverId) && 'bg-muted/30'"
              @click="toggleRow(log.driverId)"
            >
              <td class="px-3 py-4">
                <ChevronDown
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="!isRowExpanded(log.driverId) && '-rotate-90'"
                />
              </td>
              <td class="px-3 py-4 text-muted-foreground">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </td>
              <td class="px-3 py-4">
                <div class="font-medium text-foreground">{{ log.displayName }}</div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  {{ log.email || log.phoneNumber || 'No contact information' }}
                </div>
              </td>
              <!-- <td class="max-w-52 truncate px-3 py-4" :title="log.companyName">
                {{ log.companyName }}
              </td>
              <td class="px-3 py-4 font-mono text-xs">{{ log.externalDriverId }}</td> -->
              <td class="px-3 py-4">{{ log.vehicleUnitName || '—' }}</td>
              <td class="px-3 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="getEventBadgeClass(log.currentStatus)"
                >
                  {{ log.currentStatus }}
                </span>
              </td>
              <td class="px-3 py-4">{{ log.hasVan ? 'Yes' : 'No' }}</td>
              <td class="max-w-36 truncate px-3 py-4" :title="formatTrailers(log.trailers)">
                {{ formatTrailers(log.trailers) }}
              </td>
              <td class="max-w-50 px-3 py-4">
                <div class="truncate" :title="log.location || ''">
                  {{ log.location || 'No location yet' }}
                </div>
                <div
                  v-if="log.latitude != null && log.longitude != null"
                  class="mt-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {{ log.latitude.toFixed(5) }}, {{ log.longitude.toFixed(5) }}
                </div>
                <div
                  v-if="log.lastSyncError"
                  class="mt-0.5 truncate text-[11px] text-destructive"
                  :title="log.lastSyncError"
                >
                  {{ log.lastSyncError }}
                </div>
              </td>
              <td class="whitespace-nowrap px-3 py-4">{{ formatDate(log.statusAt) }}</td>
              <td class="whitespace-nowrap px-3 py-4 font-medium tabular-nums">
                {{ formatClock(log.break) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 font-medium tabular-nums">
                {{ formatClock(log.drive) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 font-medium tabular-nums">
                {{ formatClock(log.shift) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 font-medium tabular-nums">
                {{ formatClock(log.cycle) }}
              </td>
              <td class="px-3 py-4">
                <span
                  class="font-medium"
                  :class="log.violationCount ? 'text-destructive' : 'text-emerald-600'"
                >
                  {{ log.violationCount }}
                </span>
              </td>
              <td class="px-3 py-4">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="getConnectionBadgeClass(log.connectionStatus)"
                >
                  {{ formatConnection(log.connectionStatus) }}
                </span>
              </td>
            </tr>

            <tr v-if="isRowExpanded(log.driverId)" class="border-t border-border bg-muted/20">
              <td colspan="17" class="p-4">
                <div class="overflow-hidden rounded-lg border border-border bg-background">
                  <div class="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <div class="font-medium text-foreground">Daily logs</div>
                      <div class="text-xs text-muted-foreground">
                        Latest Route ELD summaries for {{ log.displayName }}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      :disabled="isDailyLogsLoading(log.driverId)"
                      @click.stop="fetchDailyLogs(log.driverId, true)"
                    >
                      <RefreshCw
                        class="h-4 w-4"
                        :class="isDailyLogsLoading(log.driverId) && 'animate-spin'"
                      />
                    </Button>
                  </div>

                  <div v-if="isDailyLogsLoading(log.driverId)" class="space-y-3 p-4">
                    <Skeleton v-for="item in 3" :key="item" class="h-9 w-full" />
                  </div>

                  <div
                    v-else-if="getDailyLogsError(log.driverId)"
                    class="flex flex-col items-center py-8"
                  >
                    <p class="text-sm text-destructive">{{ getDailyLogsError(log.driverId) }}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      class="mt-3"
                      @click.stop="fetchDailyLogs(log.driverId, true)"
                    >
                      Try again
                    </Button>
                  </div>

                  <table v-else class="w-full text-left text-sm">
                    <thead class="bg-muted/60 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th class="px-4 py-3">Log date</th>
                        <th class="px-4 py-3">Time zone</th>
                        <th class="px-4 py-3">Drive time</th>
                        <th class="px-4 py-3">Shift time</th>
                        <th class="px-4 py-3">Profile forms</th>
                        <th class="px-4 py-3">Violations</th>
                        <th class="px-4 py-3">Signed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="dailyLog in getDailyLogs(log.driverId)"
                        :key="dailyLog.id"
                        class="border-t border-border"
                      >
                        <td class="px-4 py-3 font-medium">
                          {{ formatLogDate(dailyLog.logDate) }}
                        </td>
                        <td class="px-4 py-3">{{ dailyLog.timeZone || '—' }}</td>
                        <td class="px-4 py-3 tabular-nums">
                          {{ formatHours(dailyLog.timeDrivenMilliseconds) }}
                        </td>
                        <td class="px-4 py-3 tabular-nums">
                          {{ formatHours(dailyLog.timeOnDutyMilliseconds) }}
                        </td>
                        <td class="px-4 py-3">{{ dailyLog.hasForms ? 'Yes' : 'No' }}</td>
                        <td class="px-4 py-3">
                          <span
                            class="font-medium"
                            :class="
                              dailyLog.violationCount ? 'text-destructive' : 'text-emerald-600'
                            "
                          >
                            {{ dailyLog.violationCount }}
                          </span>
                          <div v-if="dailyLog.violations.length" class="mt-1 flex flex-wrap gap-1">
                            <span
                              v-for="(violation, violationIndex) in dailyLog.violations"
                              :key="`${dailyLog.id}-${violationIndex}`"
                              class="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                            >
                              {{ violation.regulation }}
                              <template v-if="violation.startTime">
                                · {{ formatViolationTime(violation.startTime) }}
                              </template>
                            </span>
                          </div>
                        </td>
                        <td class="px-4 py-3">{{ dailyLog.isSigned ? 'Yes' : 'No' }}</td>
                      </tr>
                      <tr v-if="getDailyLogs(log.driverId).length === 0">
                        <td colspan="7" class="px-4 py-10 text-center text-muted-foreground">
                          No daily logs returned.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="!loading && paginatedLogs.length === 0">
            <td colspan="17" class="h-32 text-center text-muted-foreground">
              No Route ELD logs found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!error"
      class="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ totalEntries }} entries</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="hidden gap-1 md:flex">
          <button
            v-for="page in pageNumbers"
            :key="page"
            class="h-8 min-w-8 rounded px-2 text-sm transition-colors"
            :class="
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted'
            "
            :disabled="page === '...'"
            @click="typeof page === 'number' && goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ totalEntries ? currentPage : 0 }} of {{ totalPages }} pages
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage <= 1"
          @click="previousPage"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
