<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportMonthField from '@/modules/Report/components/CReportMonthField.vue'
import CReportEmployeeDaysOff from '@/modules/Report/components/CReportEmployeeDaysOff.vue'
import { currentOwnerMonth } from '@/modules/Report/utils/ownerDates'
import { parseEmployeeDaysOff, serializeEmployeeDaysOff } from '@/modules/Report/utils/employeeDaysOff'
import { reportMoney } from '@/modules/Report/utils/money'
import { ownerRoleBadge, ownerShiftBadge } from '@/modules/Report/utils/ownerBadges'

interface Employee {
  userId: string
  userName: string
  firstName: string | null
  lastName: string | null
  roleName: string | null
  levelId: string | null
  shift: number | null
  daysOff: string
  performanceId: string | null
  baseDailySalary: number
  dailySalary: number
}
interface Performance {
  id: string
  name: string
  color: string
}
interface Level {
  id: string
  name: string
}
interface Rate {
  performanceId: string
  userId: string
  dailySalary: number
}

const api = useApi()
const auth = useAuthStore()
const canEdit = computed(() => hasPermission(auth.token, 'report.owner.teams.edit'))
const month = ref(currentOwnerMonth())
const employees = ref<Employee[]>([])
const original = ref<Record<string, string>>({})
const performances = ref<Performance[]>([])
const levels = ref<Level[]>([])
const rates = ref<Rate[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const shiftNames = ['Morning', 'Afternoon', 'Night']
const roleNames = ['SystemAdmin', 'Manager', 'Logbooker', 'Checker', 'Assistant']
const filteredEmployees = computed(() =>
  employees.value.filter((item) =>
    `${item.firstName ?? ''} ${item.lastName ?? ''} ${item.userName}`
      .toLowerCase()
      .includes(search.value.toLowerCase())
  )
)

function employeeName(item: Employee) {
  return (
    `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() ||
    (item.userName.startsWith('vectorium:') ? 'Unnamed worker' : item.userName)
  )
}
function employeeDays(item: Employee): number[] {
  return parseEmployeeDaysOff(item.daysOff)
}
function snapshot(item: Employee) {
  return JSON.stringify({
    shift: item.shift,
    daysOff: employeeDays(item),
    roleName: item.roleName,
    levelId: item.levelId,
    performanceId: item.performanceId,
  })
}
function rateFor(item: Employee) {
  return (
    rates.value.find(
      (rate) => rate.performanceId === item.performanceId && rate.userId === item.userId
    )?.dailySalary ?? item.baseDailySalary
  )
}
function performanceColor(id: string | null) {
  return performances.value.find((item) => item.id === id)?.color ?? '#64748b'
}
function availableRoles(item: Employee) {
  return item.roleName && !roleNames.includes(item.roleName)
    ? [item.roleName, ...roleNames]
    : roleNames
}

async function load() {
  loading.value = true
  try {
    const [employeeResponse, performanceResponse] = await Promise.all([
      api.get<{ successResult: Employee[] }>('/report/api/owner/employees', {
        params: { month: `${month.value}-01` },
      }),
      api.get<{ successResult: { definitions: Performance[]; levels: Level[]; rates: Rate[] } }>(
        '/report/api/owner/performances',
        { params: { month: `${month.value}-01` } }
      ),
    ])
    employees.value = employeeResponse.data.successResult ?? []
    performances.value = performanceResponse.data.successResult.definitions ?? []
    levels.value = performanceResponse.data.successResult.levels ?? []
    rates.value = performanceResponse.data.successResult.rates ?? []
    original.value = Object.fromEntries(
      employees.value.map((item) => [item.userId, snapshot(item)])
    )
  } catch {
    toast.error('Could not load employee settings.')
  } finally {
    loading.value = false
  }
}

async function save() {
  const changed = employees.value.filter((item) => snapshot(item) !== original.value[item.userId])
  if (!changed.length) return
  saving.value = true
  try {
    await Promise.all(
      changed.map((item) =>
        api.put(`/report/api/owner/employees/${item.userId}`, {
          month: `${month.value}-01`,
          shift: item.shift,
          daysOff: employeeDays(item),
          roleName: item.roleName,
          levelId: item.levelId,
          performanceId: item.performanceId,
        })
      )
    )
    await load()
    toast.success('Monthly employee settings saved.')
  } catch {
    toast.error('Could not save employee settings.')
  } finally {
    saving.value = false
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar title="Teams" subtitle="Monthly employee settings" :show-filters="false">
      <template #actions>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" class="w-60 pl-9" placeholder="Search employees" />
        </div>
        <CReportMonthField v-model="month" />
        <Button v-if="canEdit" :disabled="saving || loading" @click="save">
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />Save employee settings
        </Button>
      </template>
    </CReportToolbar>
    <div class="flex min-h-0 flex-1 flex-col p-4">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading employees…
      </div>
      <section
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
      >
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full min-w-[1120px] text-left text-sm">
            <thead class="sticky top-0 z-10 bg-muted text-muted-foreground">
              <tr>
                <th class="px-3 py-2 font-medium">Worker</th>
                <th class="px-3 py-2 font-medium">Role</th>
                <th class="px-3 py-2 font-medium">Level</th>
                <th class="px-3 py-2 font-medium">Shift</th>
                <th class="px-3 py-2 font-medium">Days off</th>
                <th class="px-3 py-2 font-medium">Performance</th>
                <th class="px-3 py-2 font-medium text-right">Daily salary</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredEmployees"
                :key="item.userId"
                class="border-t border-border"
              >
                <td class="px-3 py-2 font-medium">
                  {{ employeeName(item) }}
                  <span
                    v-if="
                      !item.userName.startsWith('vectorium:') &&
                      item.userName !== employeeName(item)
                    "
                    class="block text-xs font-normal text-muted-foreground"
                    >{{ item.userName }}</span
                  >
                </td>
                <td class="px-3 py-2">
                  <Select
                    :model-value="item.roleName ?? 'none'"
                    :disabled="!canEdit"
                    @update:model-value="
                      (value) => (item.roleName = value === 'none' ? null : String(value))
                    "
                  >
                    <SelectTrigger class="h-8 min-w-32" :class="ownerRoleBadge(item.roleName)"
                      ><SelectValue placeholder="Role"
                    /></SelectTrigger>
                    <SelectContent
                      ><SelectItem value="none">Unassigned</SelectItem
                      ><SelectItem v-for="role in availableRoles(item)" :key="role" :value="role">{{
                        role
                      }}</SelectItem></SelectContent
                    >
                  </Select>
                </td>
                <td class="px-3 py-2">
                  <Select
                    :model-value="item.levelId ?? 'none'"
                    :disabled="!canEdit"
                    @update:model-value="
                      (value) => (item.levelId = value === 'none' ? null : String(value))
                    "
                  >
                    <SelectTrigger class="h-8 min-w-28"
                      ><SelectValue placeholder="Level"
                    /></SelectTrigger>
                    <SelectContent
                      ><SelectItem value="none">Unassigned</SelectItem
                      ><SelectItem v-for="level in levels" :key="level.id" :value="level.id">{{
                        level.name
                      }}</SelectItem></SelectContent
                    >
                  </Select>
                </td>
                <td class="px-3 py-2">
                  <Select
                    :model-value="item.shift == null ? 'none' : String(item.shift)"
                    :disabled="!canEdit"
                    @update:model-value="
                      (value) => (item.shift = value === 'none' ? null : Number(value))
                    "
                  >
                    <SelectTrigger class="h-8 min-w-32" :class="ownerShiftBadge(item.shift)"
                      ><SelectValue placeholder="Shift"
                    /></SelectTrigger>
                    <SelectContent
                      ><SelectItem value="none">Unassigned</SelectItem
                      ><SelectItem
                        v-for="(name, index) in shiftNames"
                        :key="name"
                        :value="String(index)"
                        >{{ name }}</SelectItem
                      ></SelectContent
                    >
                  </Select>
                </td>
                <td class="px-3 py-2">
                  <CReportEmployeeDaysOff
                    :model-value="employeeDays(item)"
                    :disabled="!canEdit"
                    @update:model-value="(days) => item.daysOff = serializeEmployeeDaysOff(days)"
                  />
                </td>
                <td class="px-3 py-2">
                  <Select
                    :model-value="item.performanceId ?? 'none'"
                    :disabled="!canEdit"
                    @update:model-value="
                      (value) => (item.performanceId = value === 'none' ? null : String(value))
                    "
                  >
                    <SelectTrigger
                      class="h-8 min-w-32"
                      :style="
                        item.performanceId
                          ? { color: performanceColor(item.performanceId) }
                          : undefined
                      "
                      ><SelectValue placeholder="Performance"
                    /></SelectTrigger>
                    <SelectContent
                      ><SelectItem value="none">Unassigned</SelectItem
                      ><SelectItem
                        v-for="performance in performances"
                        :key="performance.id"
                        :value="performance.id"
                        >{{ performance.name }}</SelectItem
                      ></SelectContent
                    >
                  </Select>
                </td>
                <td class="px-3 py-2 text-right font-semibold">{{ reportMoney(rateFor(item)) }}</td>
              </tr>
              <tr v-if="!filteredEmployees.length">
                <td colspan="7" class="px-4 py-12 text-center text-muted-foreground">
                  No employees found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {{ filteredEmployees.length }} employees
        </div>
      </section>
    </div>
  </div>
</template>
