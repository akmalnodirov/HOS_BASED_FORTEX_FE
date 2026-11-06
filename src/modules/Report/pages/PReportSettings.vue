<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'
import CReportSearchSelect from '@/modules/Report/components/CReportSearchSelect.vue'

interface ReportSettings {
  clocksterEnabled: boolean
  clocksterConfigured: boolean
  statisticsEnabled: boolean
  attendanceEnabled: boolean
  teamsEnabled: boolean
  kpiEnabled: boolean
  salariesEnabled: boolean
  bonusesEnabled: boolean
  notesEnabled: boolean
  contractsEnabled: boolean
  statementEnabled: boolean
  activityShiftBased: boolean
}
interface KpiSettings {
  eachPointValue: number
  lateGraceMinutes: number
  morningShiftStart: string
  afternoonShiftStart: string
  nightShiftStart: string
}
interface Mapping {
  clocksterId: number
  reportId: string | null
  fullName: string | null
}
interface MappingPayload {
  clockster_id: number
  report_id: string | null
  fullname: string | null
}
interface Note {
  id: string
  title: string
}
interface Level {
  id: string
  name: string
}
interface Rule {
  noteId: string
  levelId: string
  points: number
}
interface Employee {
  id: string
  firstName: string | null
  lastName: string | null
  userName: string
}
interface IgnoredEmployee {
  id: string
  userId: string
  fullName: string | null
  userName: string | null
  shift: number
}
const api = useApi()
const auth = useAuthStore()
const canEdit = computed(() => hasPermission(auth.token, 'report.settings.edit'))
const settings = ref<ReportSettings>({
  clocksterEnabled: false,
  clocksterConfigured: false,
  statisticsEnabled: true,
  attendanceEnabled: true,
  teamsEnabled: true,
  kpiEnabled: true,
  salariesEnabled: true,
  bonusesEnabled: true,
  notesEnabled: true,
  contractsEnabled: true,
  statementEnabled: true,
  activityShiftBased: true,
})
const kpi = ref<KpiSettings>({
  eachPointValue: 0,
  lateGraceMinutes: 0,
  morningShiftStart: '09:00',
  afternoonShiftStart: '14:00',
  nightShiftStart: '22:00',
})
const mapping = ref<Mapping[]>([])
const mappingSearch = ref('')
const discovering = ref(false)
const savingMapping = ref(false)
const filteredMapping = computed(() =>
  mapping.value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      `${item.fullName ?? ''} ${item.clocksterId} ${employeeOptions.value.find((employee) => employee.id === item.reportId)?.name ?? ''}`
        .toLowerCase()
        .includes(mappingSearch.value.trim().toLowerCase())
    )
)
const notes = ref<Note[]>([])
const levels = ref<Level[]>([])
const rules = ref<Rule[]>([])
const employees = ref<Employee[]>([])
const employeeOptions = computed(() =>
  employees.value.map((item) => ({
    id: item.id,
    name: `${item.firstName ?? ''} ${item.lastName ?? ''} (${item.userName})`.trim() || item.userName,
  }))
)
function mappingOptions(index: number) {
  const selectedIds = new Set(
    mapping.value.filter((_, rowIndex) => rowIndex !== index).map((item) => item.reportId)
  )
  return employeeOptions.value.filter((employee) => !selectedIds.has(employee.id))
}
const ignored = ref<IgnoredEmployee[]>([])
const ignoredUserId = ref('')
const ignoredShift = ref('0')
const loading = ref(false)
const saving = ref(false)
const features: { label: string; key: keyof ReportSettings }[] = [
  { label: 'Statistics', key: 'statisticsEnabled' },
  { label: 'Attendance', key: 'attendanceEnabled' },
  { label: 'Teams', key: 'teamsEnabled' },
  { label: 'KPI', key: 'kpiEnabled' },
  { label: 'Salary', key: 'salariesEnabled' },
  { label: 'Bonuses & Charges', key: 'bonusesEnabled' },
  { label: 'Notes', key: 'notesEnabled' },
  { label: 'Contracts', key: 'contractsEnabled' },
  { label: 'Statement', key: 'statementEnabled' },
]

function normalizeMapping(items: (Mapping | MappingPayload)[]): Mapping[] {
  return items.map((item) =>
    'clockster_id' in item
      ? { clocksterId: item.clockster_id, reportId: item.report_id, fullName: item.fullname }
      : item
  )
}

async function load() {
  loading.value = true
  try {
    const [
      settingsResponse,
      kpiResponse,
      mappingResponse,
      noteResponse,
      levelResponse,
      ruleResponse,
      employeeResponse,
      ignoredResponse,
    ] = await Promise.all([
      api.get<{ successResult: ReportSettings }>('/report/api/settings'),
      api.get<{ successResult: KpiSettings }>('/report/api/kpi/settings'),
      api.get<{ successResult: MappingPayload[] }>('/report/api/attendance/mapping'),
      api.get<{ successResult: Note[] }>('/report/api/note'),
      api.get<{ successResult: Level[] }>('/report/api/levels'),
      api.get<{ successResult: Rule[] }>('/report/api/kpi/note-point-rules'),
      api.get<{ successResult: Employee[] }>('/report/api/users'),
      api.get<{ successResult: IgnoredEmployee[] }>('/report/api/attendance/ignored'),
    ])
    settings.value = settingsResponse.data.successResult
    kpi.value = kpiResponse.data.successResult
    mapping.value = normalizeMapping(mappingResponse.data.successResult ?? [])
    notes.value = noteResponse.data.successResult ?? []
    levels.value = levelResponse.data.successResult ?? []
    rules.value = ruleResponse.data.successResult ?? []
    employees.value = employeeResponse.data.successResult ?? []
    ignored.value = ignoredResponse.data.successResult ?? []
  } catch {
    toast.error('Could not load Report settings.')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await api.put('/report/api/settings', settings.value)
    await api.put('/report/api/kpi/settings', kpi.value)
    await api.put(
      '/report/api/kpi/note-point-rules',
      rules.value.filter((item) => Number.isFinite(item.points))
    )
    toast.success('Settings saved.')
    window.dispatchEvent(new Event('report-features-updated'))
    await load()
  } catch {
    toast.error('Could not save Report settings.')
  } finally {
    saving.value = false
  }
}

async function saveMapping() {
  savingMapping.value = true
  try {
    await api.put(
      '/report/api/attendance/mapping',
      mapping.value.map((item) => ({
        clockster_id: item.clocksterId,
        report_id: item.reportId,
        fullname: item.fullName,
      }))
    )
    toast.success('Employee mappings saved.')
  } catch {
    toast.error('Could not save employee mappings. Check employee IDs and assignments.')
  } finally {
    savingMapping.value = false
  }
}

function addMapping() {
  mapping.value.push({ clocksterId: 0, reportId: null, fullName: null })
}

async function discoverMapping() {
  discovering.value = true
  try {
    const response = await api.post<{ successResult: MappingPayload[] }>(
      '/report/api/attendance/mapping/discover'
    )
    mapping.value = normalizeMapping(response.data.successResult ?? [])
    toast.success(`Found ${mapping.value.length} Clockster employees.`)
  } catch {
    toast.error('Could not discover Clockster employees. Check the token and API URL.')
  } finally {
    discovering.value = false
  }
}

function ruleValue(noteId: string, levelId: string) {
  return (
    rules.value.find((item) => item.noteId === noteId && item.levelId === levelId)?.points ?? ''
  )
}

function setRule(noteId: string, levelId: string, value: string | number) {
  rules.value = rules.value.filter((item) => item.noteId !== noteId || item.levelId !== levelId)
  if (value !== '' && Number.isFinite(Number(value)))
    rules.value.push({ noteId, levelId, points: Number(value) })
}

async function addIgnored() {
  if (!ignoredUserId.value) return
  try {
    await api.post('/report/api/attendance/ignored', {
      userId: ignoredUserId.value,
      shift: Number(ignoredShift.value),
    })
    ignoredUserId.value = ''
    await load()
  } catch {
    toast.error('Could not add ignored employee.')
  }
}

async function removeIgnored(id: string) {
  try {
    await api.delete(`/report/api/attendance/ignored/${id}`)
    await load()
  } catch {
    toast.error('Could not remove ignored employee.')
  }
}

onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <CReportAdminHeader title="Report settings" subtitle="Configure KPI and optional integrations."
      ><Button v-if="canEdit" :disabled="saving || loading" @click="save">{{
        saving ? 'Saving…' : 'Save settings'
      }}</Button></CReportAdminHeader
    >
    <div class="min-h-0 flex-1 space-y-4 overflow-auto pb-4">
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Clockster</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          Attendance synchronization runs only when enabled and an API token is configured in
          Vectorium settings.
        </p>
        <div class="mt-4 flex items-center gap-3">
          <Switch
            v-model="settings.clocksterEnabled"
            :disabled="!canEdit || !settings.clocksterConfigured"
          /><span class="text-sm">Enable Clockster synchronization</span>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          {{
            settings.clocksterConfigured
              ? 'API token configured'
              : 'Set Report:Clockster:ApiToken in Vectorium configuration before enabling.'
          }}
        </p>
      </section>
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Activity checking</h2>
        <p class="mt-1 text-xs text-muted-foreground">Choose whether each day has one status or separate morning, afternoon, and night statuses.</p>
        <div class="mt-4 flex items-center gap-3">
          <Switch v-model="settings.activityShiftBased" :disabled="!canEdit" />
          <span class="text-sm">Shift-based columns</span>
        </div>
      </section>
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Board features</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          Features disabled here are unavailable throughout this Vectorium installation. User
          permissions still apply when enabled.
        </p>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label
            v-for="feature in features"
            :key="feature.key"
            class="flex items-center gap-3 text-sm"
            ><Switch v-model="settings[feature.key]" :disabled="!canEdit" />{{
              feature.label
            }}</label
          >
        </div>
      </section>
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">KPI calculation</h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label class="grid gap-1.5 text-sm"
            >Value per point ($)<Input
              v-model.number="kpi.eachPointValue"
              type="number"
              min="0"
              step="0.01"
              :disabled="!canEdit" /></label
          ><label class="grid gap-1.5 text-sm"
            >Late grace (minutes)<Input
              v-model.number="kpi.lateGraceMinutes"
              type="number"
              min="0"
              :disabled="!canEdit" /></label
          ><label class="grid gap-1.5 text-sm"
            >Morning shift<Input v-model="kpi.morningShiftStart" :disabled="!canEdit" /></label
          ><label class="grid gap-1.5 text-sm"
            >Afternoon shift<Input v-model="kpi.afternoonShiftStart" :disabled="!canEdit" /></label
          ><label class="grid gap-1.5 text-sm"
            >Night shift<Input v-model="kpi.nightShiftStart" :disabled="!canEdit"
          /></label>
        </div>
      </section>
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Note point rules</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          Set points for each note and employee level. Empty cells do not score.
        </p>
        <div class="mt-4 overflow-auto">
          <table class="w-full min-w-[600px] text-left text-sm">
            <thead class="bg-muted text-muted-foreground">
              <tr>
                <th class="px-3 py-2 font-medium">Note</th>
                <th v-for="level in levels" :key="level.id" class="px-3 py-2 font-medium">
                  {{ level.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="note in notes" :key="note.id" class="border-t border-border">
                <td class="px-3 py-2 font-medium">{{ note.title }}</td>
                <td v-for="level in levels" :key="level.id" class="px-3 py-2">
                  <Input
                    :model-value="ruleValue(note.id, level.id)"
                    type="number"
                    step="0.01"
                    min="0"
                    class="h-8 w-24"
                    :disabled="!canEdit"
                    @update:model-value="(value) => setRule(note.id, level.id, value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!notes.length" class="py-6 text-center text-sm text-muted-foreground">
            Add notes to configure point rules.
          </p>
        </div>
      </section>
      <section class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Attendance exceptions</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          Selected employees earn their daily salary for Monday through Saturday without Clockster records, using the effective rate for each day.
        </p>
        <div v-if="canEdit" class="mt-4 flex flex-wrap gap-2">
          <Select v-model="ignoredUserId"
            ><SelectTrigger class="w-64"
              ><SelectValue placeholder="Select employee" /></SelectTrigger
            ><SelectContent
              ><SelectItem v-for="employee in employees" :key="employee.id" :value="employee.id">{{
                `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.userName
              }}</SelectItem></SelectContent
            ></Select
          ><Select v-model="ignoredShift"
            ><SelectTrigger class="w-44"><SelectValue /></SelectTrigger
            ><SelectContent
              ><SelectItem value="0">Morning</SelectItem><SelectItem value="1">Afternoon</SelectItem
              ><SelectItem value="2">Night</SelectItem></SelectContent
            ></Select
          ><Button variant="outline" :disabled="!ignoredUserId" @click="addIgnored"
            >Add exception</Button
          >
        </div>
        <div class="mt-3 space-y-2">
          <div
            v-for="item in ignored"
            :key="item.id"
            class="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
          >
            <span
              >{{ item.fullName || item.userName }} ·
              {{ ['Morning', 'Afternoon', 'Night'][item.shift] }}</span
            ><Button v-if="canEdit" variant="ghost" size="sm" @click="removeIgnored(item.id)"
              >Remove</Button
            >
          </div>
        </div>
      </section>
      <section class="rounded-lg border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold">Clockster employee mapping</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Discover employees from Clockster, then match them to Vectorium users. Mappings are
              stored in the Report database.
            </p>
          </div>
          <div v-if="canEdit" class="flex gap-2">
            <Button
              variant="outline"
              :disabled="discovering || !settings.clocksterConfigured"
              @click="discoverMapping"
              >{{ discovering ? 'Discovering…' : 'Discover employees' }}</Button
            ><Button variant="outline" @click="addMapping">Add manually</Button
            ><Button :disabled="savingMapping" @click="saveMapping">{{
              savingMapping ? 'Saving…' : 'Save mappings'
            }}</Button>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <Input
            v-model="mappingSearch"
            placeholder="Search Clockster or Vectorium employees"
            class="max-w-sm"
          /><span class="text-xs text-muted-foreground"
            >{{ mapping.filter((item) => !item.reportId).length }} unassigned of
            {{ mapping.length }}</span
          >
        </div>
        <div class="mt-4 space-y-2">
          <div
            v-for="{ item, index } in filteredMapping"
            :key="`${item.clocksterId}-${index}`"
            class="grid items-center gap-2 rounded-md border border-border p-2 md:grid-cols-[minmax(160px,1fr)_100px_minmax(200px,1fr)_auto]"
          >
            <Input
              :model-value="item.fullName ?? ''"
              placeholder="Clockster employee name"
              :disabled="true"
              @update:model-value="(value) => (item.fullName = String(value))"
            />
            <Input
              v-model.number="item.clocksterId"
              type="number"
              placeholder="Clockster ID"
              :disabled="true"
            /><CReportSearchSelect
              :model-value="item.reportId ?? ''"
              :options="mappingOptions(index)"
              placeholder="Select Vectorium employee"
              empty-label="Unassigned"
              empty-value=""
              :disabled="!canEdit"
              @update:model-value="(value) => (item.reportId = value || null)"
            /><Button v-if="canEdit" variant="ghost" @click="mapping.splice(index, 1)"
              >Remove</Button
            >
          </div>
          <p v-if="!mapping.length" class="text-sm text-muted-foreground">No employee mappings.</p>
        </div>
      </section>
    </div>
  </div>
</template>
