<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Loader2, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import { reportMoney } from '@/modules/Report/utils/money'
import { ownerShiftBadge } from '@/modules/Report/utils/ownerBadges'

interface Row {
  userId: string
  userName: string
  fullName: string | null
  shiftName: string | null
  teamId: string | null
  teamName: string | null
  dailySalary: number
  attendedDays: number
  earnedBase: number
  lateMinutes: number
  undertimeMinutes: number
  latenessPenalty: number
  undertimePenalty: number
  penalty: number
}
interface Day {
  date: string
  isDayOff: boolean
  shiftName: string | null
  dailyRate: number
  clockInTime: string | null
  clockOutTime: string | null
  workedMinutes: number
  lateMinutes: number
  undertimeMinutes: number
  latenessPenalty: number
  undertimePenalty: number
}
interface Stats {
  totalLateMinutes: number
  totalUndertimeMinutes: number
  totalLatenessPenalty: number
  totalUndertimePenalty: number
  totalPenalty: number
  rows: Row[]
}
const api = useApi()
const auth = useAuthStore()
const canSync = computed(
  () =>
    hasPermission(auth.token, 'report.owner.time.sync') ||
    hasPermission(auth.token, 'report.attendance.sync')
)
const range = ref({
  startTime: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString(),
  endTime: new Date().toISOString(),
})
const stats = ref<Stats>({
  totalLateMinutes: 0,
  totalUndertimeMinutes: 0,
  totalLatenessPenalty: 0,
  totalUndertimePenalty: 0,
  totalPenalty: 0,
  rows: [],
})
const teamsVisible = ref(true)
const team = ref('all')
const search = ref('')
const loading = ref(false)
const syncing = ref(false)
const details = ref<Day[]>([])
const detailName = ref('')
const detailOpen = ref(false)
const teamOptions = computed(() => [
  ...new Map(
    stats.value.rows
      .filter((item) => item.teamId)
      .map((item) => [item.teamId, { id: item.teamId, name: item.teamName }])
  ).values(),
])
const visible = computed(() =>
  stats.value.rows.filter(
    (item) =>
      (team.value === 'all' || !item.teamId || item.teamId === team.value) &&
      `${item.fullName ?? ''} ${item.userName}`.toLowerCase().includes(search.value.toLowerCase())
  )
)
const shiftClass = ownerShiftBadge

async function load() {
  loading.value = true
  try {
    const [result, settings] = await Promise.all([
      api.post<{ successResult: Stats }>('/report/api/attendance/statistics', range.value),
      api.get<{ successResult: { teamsVisible: boolean } }>('/report/api/owner/settings'),
    ])
    stats.value = result.data.successResult
    teamsVisible.value = settings.data.successResult.teamsVisible
  } catch {
    toast.error('Could not load attendance.')
  } finally {
    loading.value = false
  }
}

async function sync() {
  syncing.value = true
  try {
    await api.post('/report/api/attendance/sync', range.value)
    await load()
    toast.success('Clockster attendance refreshed.')
  } catch {
    toast.error('Could not refresh Clockster attendance.')
  } finally {
    syncing.value = false
  }
}

async function showDetails(row: Row) {
  detailName.value = row.fullName || row.userName
  detailOpen.value = true
  try {
    const result = await api.get<{ successResult: { days: Day[] } }>(
      `/report/api/attendance/details/${row.userId}`,
      { params: range.value }
    )
    details.value = result.data.successResult.days
  } catch {
    toast.error('Could not load attendance details.')
  }
}

function onRange(value: { startTime: string; endTime: string }) {
  range.value = value
  void load()
}
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      title="Time"
      subtitle="Clockster attendance, worked time and penalties"
      default-period="month"
      @change="onRange"
      ><template #actions
        ><div class="relative">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          /><Input v-model="search" class="w-56 pl-9" placeholder="Search workers" />
        </div>
        <Button v-if="canSync" variant="outline" :disabled="syncing" @click="sync"
          ><Loader2 v-if="syncing" class="mr-2 h-4 w-4 animate-spin" />{{
            syncing ? 'Syncing…' : 'Refresh from Clockster'
          }}</Button
        ></template
      ></CReportToolbar
    >
    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading attendance…
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div
          v-for="card in [
            { label: 'Late minutes', value: stats.totalLateMinutes },
            { label: 'Undertime minutes', value: stats.totalUndertimeMinutes },
            { label: 'Lateness penalty', value: reportMoney(stats.totalLatenessPenalty) },
            { label: 'Undertime penalty', value: reportMoney(stats.totalUndertimePenalty) },
            { label: 'Total penalty', value: reportMoney(stats.totalPenalty) },
          ]"
          :key="card.label"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="text-xs text-muted-foreground">{{ card.label }}</div>
          <strong class="mt-2 block text-xl">{{ card.value }}</strong>
        </div>
      </div>
      <section
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold">Workers ({{ visible.length }})</h2>
            <div v-if="teamsVisible" class="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
              <button
                v-for="option in [{ id: 'all', name: 'All teams' }, ...teamOptions]"
                :key="option.id || 'all'"
                type="button"
                class="rounded-md px-3 py-1 text-xs"
                :class="
                  team === option.id
                    ? 'bg-background font-semibold shadow-sm'
                    : 'text-muted-foreground'
                "
                @click="team = option.id || 'all'"
              >
                {{ option.name }}
              </button>
            </div>
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full min-w-[1100px] text-left text-sm">
            <thead class="bg-muted text-muted-foreground">
              <tr>
                <th class="px-3 py-2 font-medium">Worker</th>
                <th class="px-3 py-2 font-medium">Shift</th>
                <th v-if="teamsVisible" class="px-3 py-2 font-medium">Team</th>
                <th class="px-3 py-2 font-medium">Daily salary</th>
                <th class="px-3 py-2 font-medium">Attended</th>
                <th class="px-3 py-2 font-medium">Earned salary</th>
                <th class="px-3 py-2 font-medium">Late min</th>
                <th class="px-3 py-2 font-medium">Undertime min</th>
                <th class="px-3 py-2 font-medium">Lateness −</th>
                <th class="px-3 py-2 font-medium">Undertime −</th>
                <th class="px-3 py-2 font-medium">Total −</th>
                <th class="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visible" :key="row.userId" class="border-t border-border">
                <td class="px-3 py-2">
                  {{ row.fullName }}
                </td>
                <td class="px-3 py-2">
                  <span class="rounded-md px-2 py-1 text-xs" :class="shiftClass(row.shiftName)">{{
                    row.shiftName || '—'
                  }}</span>
                </td>
                <td v-if="teamsVisible" class="px-3 py-2">{{ row.teamName || 'Unassigned' }}</td>
                <td class="px-3 py-2">{{ reportMoney(row.dailySalary) }}</td>
                <td class="px-3 py-2">{{ row.attendedDays }}</td>
                <td class="px-3 py-2">{{ reportMoney(row.earnedBase) }}</td>
                <td class="px-3 py-2">{{ row.lateMinutes }}</td>
                <td class="px-3 py-2">{{ row.undertimeMinutes }}</td>
                <td class="px-3 py-2 text-red-600">{{ reportMoney(row.latenessPenalty) }}</td>
                <td class="px-3 py-2 text-red-600">{{ reportMoney(row.undertimePenalty) }}</td>
                <td class="px-3 py-2 text-red-600">{{ reportMoney(row.penalty) }}</td>
                <td class="px-3 py-2">
                  <Button size="sm" variant="outline" @click="showDetails(row)">Details</Button>
                </td>
              </tr>
              <tr v-if="!visible.length">
                <td
                  :colspan="teamsVisible ? 12 : 11"
                  class="px-3 py-12 text-center text-muted-foreground"
                >
                  No attendance in this period.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {{ visible.length }} workers
        </div>
      </section>
    </div>
    <Dialog v-model:open="detailOpen"
      ><DialogContent class="max-h-[85vh] max-w-4xl overflow-auto"
        ><DialogHeader
          ><DialogTitle>{{ detailName }} · Time details</DialogTitle></DialogHeader
        >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[700px] text-left text-sm">
            <thead class="bg-muted text-muted-foreground">
              <tr>
                <th class="px-3 py-2">Date</th>
                <th class="px-3 py-2">Shift</th>
                <th class="px-3 py-2">Clock in</th>
                <th class="px-3 py-2">Clock out</th>
                <th class="px-3 py-2">Worked min</th>
                <th class="px-3 py-2">Late min</th>
                <th class="px-3 py-2">Undertime min</th>
                <th class="px-3 py-2">Daily rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in details" :key="day.date" class="border-t border-border">
                <td class="px-3 py-2">{{ day.date.slice(0, 10) }}</td>
                <td class="px-3 py-2">
                  {{ day.shiftName || '—' }}
                  <span
                    v-if="day.isDayOff"
                    class="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >Day off</span
                  >
                </td>
                <td class="px-3 py-2">
                  {{ day.clockInTime ? new Date(day.clockInTime).toLocaleTimeString() : '—' }}
                </td>
                <td class="px-3 py-2">
                  {{ day.clockOutTime ? new Date(day.clockOutTime).toLocaleTimeString() : '—' }}
                </td>
                <td class="px-3 py-2">{{ day.workedMinutes }}</td>
                <td class="px-3 py-2">{{ day.lateMinutes }}</td>
                <td class="px-3 py-2">{{ day.undertimeMinutes }}</td>
                <td class="px-3 py-2">{{ reportMoney(day.dailyRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div></DialogContent
      ></Dialog
    >
  </div>
</template>
