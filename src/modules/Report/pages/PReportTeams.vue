<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission, readTokenPermissions } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'
import CReportMonthField from '@/modules/Report/components/CReportMonthField.vue'

interface Team {
  id: string
  name: string
  employeeCount: number
  companyCount: number
  driverCount: number
}
interface Employee {
  userId: string
  fullName: string | null
  userName: string
  roleName: string | null
  teamId: string | null
}
interface Company {
  companyId: string
  companyName: string
  driverCount: number
  teamId: string | null
}
interface Assignments {
  teams: Team[]
  employees: Employee[]
  companies: Company[]
}
const api = useApi()
const auth = useAuthStore()
const canCreate = computed(() => hasPermission(auth.token, 'report.teams.create'))
const canEdit = computed(() => hasPermission(auth.token, 'report.teams.edit'))
const canDelete = computed(() => hasPermission(auth.token, 'report.teams.delete'))
const canManageTeamDefinitions = computed(() => readTokenPermissions(auth.token).systemAdmin)
const month = ref(new Date().toISOString().slice(0, 7))
const employeeSearch = ref('')
const companySearch = ref('')
const teams = ref<Team[]>([])
const assignments = ref<Assignments>({ teams: [], employees: [], companies: [] })
const employeeTeams = ref<Record<string, string>>({})
const companyTeams = ref<Record<string, string>>({})
const loading = ref(false)
const saving = ref(false)
const editorOpen = ref(false)
const editing = ref<Team | null>(null)
const removing = ref<Team | null>(null)
const name = ref('')
const filteredEmployees = computed(() =>
  assignments.value.employees.filter((item) =>
    `${item.fullName ?? ''} ${item.userName}`
      .toLowerCase()
      .includes(employeeSearch.value.toLowerCase())
  )
)
const filteredCompanies = computed(() =>
  assignments.value.companies.filter((item) =>
    item.companyName.toLowerCase().includes(companySearch.value.toLowerCase())
  )
)
const monthValue = computed(() => `${month.value}-01T00:00:00Z`)

async function load() {
  loading.value = true
  try {
    const [teamResponse, assignmentResponse] = await Promise.all([
      api.get<{ successResult: Team[] }>('/report/api/teams', {
        params: { month: monthValue.value },
      }),
      api.get<{ successResult: Assignments }>('/report/api/teams/assignments', {
        params: { month: monthValue.value },
      }),
    ])
    teams.value = teamResponse.data.successResult ?? []
    assignments.value = assignmentResponse.data.successResult ?? {
      teams: [],
      employees: [],
      companies: [],
    }
    employeeTeams.value = Object.fromEntries(
      assignments.value.employees.map((item) => [item.userId, item.teamId ?? 'none'])
    )
    companyTeams.value = Object.fromEntries(
      assignments.value.companies.map((item) => [item.companyId, item.teamId ?? 'none'])
    )
  } catch {
    toast.error('Could not load teams.')
  } finally {
    loading.value = false
  }
}

function openEditor(team: Team | null = null) {
  editing.value = team
  name.value = team?.name ?? ''
  editorOpen.value = true
}

async function saveTeam() {
  if (!name.value.trim()) return
  saving.value = true
  try {
    if (editing.value)
      await api.put(`/report/api/teams/${editing.value.id}`, { name: name.value.trim() })
    else await api.post('/report/api/teams', { name: name.value.trim() })
    editorOpen.value = false
    await load()
    toast.success('Team saved.')
  } catch {
    toast.error('Could not save the team.')
  } finally {
    saving.value = false
  }
}

async function removeTeam() {
  if (!removing.value) return
  saving.value = true
  try {
    await api.delete(`/report/api/teams/${removing.value.id}`)
    removing.value = null
    await load()
    toast.success('Team deleted.')
  } catch {
    toast.error('Could not delete the team.')
  } finally {
    saving.value = false
  }
}

async function saveAssignments() {
  saving.value = true
  try {
    await api.put('/report/api/teams/assignments', {
      month: monthValue.value,
      employees: assignments.value.employees.map((item) => ({
        userId: item.userId,
        teamId:
          employeeTeams.value[item.userId] === 'none' ? null : employeeTeams.value[item.userId],
      })),
      companies: assignments.value.companies.map((item) => ({
        companyId: item.companyId,
        teamId:
          companyTeams.value[item.companyId] === 'none' ? null : companyTeams.value[item.companyId],
      })),
    })
    toast.success('Assignments saved.')
    await load()
  } catch {
    toast.error('Could not save assignments.')
  } finally {
    saving.value = false
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <CReportAdminHeader title="Teams" subtitle="Manage employee and company assignments.">
      <Button v-if="canCreate && canManageTeamDefinitions" @click="openEditor()"><Plus class="mr-2 h-4 w-4" />Add team</Button>
      <CReportMonthField v-model="month" />
      <Button
        v-if="canEdit"
        variant="outline"
        :disabled="saving || loading"
        @click="saveAssignments">
          Save assignments
        </Button>
    </CReportAdminHeader>
    <div class="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-4" :aria-busy="loading">
      <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-background/75" role="status">
        <div class="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <Loader2 class="h-4 w-4 animate-spin" />Loading teams…
        </div>
      </div>
      <div class="flex flex-none flex-wrap gap-2 rounded-lg border border-border bg-card p-2">
        <article
          v-for="team in teams"
          :key="team.id"
          class="w-56 flex-none rounded-md border border-border bg-muted/30 px-3 py-2"
        >
          <div class="flex items-start justify-between">
            <strong class="text-sm">{{ team.name }}</strong>
            <div class="flex gap-1">
              <Button
                v-if="canEdit && canManageTeamDefinitions"
                size="icon-sm"
                variant="ghost"
                title="Edit"
                @click="openEditor(team)"
                ><Pencil class="h-4 w-4" /></Button
              ><Button
                v-if="canDelete && canManageTeamDefinitions"
                size="icon-sm"
                variant="ghost"
                title="Delete"
                @click="removing = team"
                ><Trash2 class="h-4 w-4 text-destructive"
              /></Button>
            </div>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ team.employeeCount }} employees · {{ team.companyCount }} companies ·
            {{ team.driverCount }} drivers
          </p>
        </article>
        <p v-if="!loading && !teams.length" class="px-2 py-3 text-sm text-muted-foreground">No teams created.</p>
      </div>
      <div class="grid min-h-0 flex-1 gap-3 xl:grid-cols-2">
        <section
          class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="flex items-center justify-between gap-3 border-b border-border p-3">
            <span class="text-sm font-semibold">Employees ({{ filteredEmployees.length }})</span
            ><Input v-model="employeeSearch" placeholder="Search employees" class="h-9 max-w-56" />
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <table class="w-full text-left text-sm">
              <thead class="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th class="px-4 py-2 font-medium">Employee</th>
                  <th class="px-4 py-2 font-medium">Role</th>
                  <th class="px-4 py-2 font-medium">Team</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredEmployees"
                  :key="item.userId"
                  class="border-t border-border"
                >
                  <td class="px-4 py-2">
                    <span>{{ item.fullName || item.userName }}</span>
                    <span v-if="item.fullName" class="ml-1 text-xs text-muted-foreground">({{ item.userName }})</span>
                  </td>
                  <td class="px-4 py-2">{{ item.roleName || '—' }}</td>
                  <td class="px-4 py-2">
                    <Select v-model="employeeTeams[item.userId]" :disabled="!canEdit"
                      ><SelectTrigger class="h-8"><SelectValue /></SelectTrigger
                      ><SelectContent
                        ><SelectItem value="none">Unassigned</SelectItem
                        ><SelectItem v-for="team in teams" :key="team.id" :value="team.id">{{
                          team.name
                        }}</SelectItem></SelectContent
                      ></Select
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {{ filteredEmployees.length }} employees
          </div>
        </section>
        <section
          class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
        >
          <div class="flex items-center justify-between gap-3 border-b border-border p-3">
            <span class="text-sm font-semibold">Companies ({{ filteredCompanies.length }})</span
            ><Input v-model="companySearch" placeholder="Search companies" class="h-9 max-w-56" />
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <table class="w-full text-left text-sm">
              <thead class="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th class="px-4 py-2 font-medium">Company</th>
                  <th class="px-4 py-2 font-medium">Drivers</th>
                  <th class="px-4 py-2 font-medium">Team</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredCompanies"
                  :key="item.companyId"
                  class="border-t border-border"
                >
                  <td class="px-4 py-2">{{ item.companyName }}</td>
                  <td class="px-4 py-2">{{ item.driverCount }}</td>
                  <td class="px-4 py-2">
                    <Select v-model="companyTeams[item.companyId]" :disabled="!canEdit"
                      ><SelectTrigger class="h-8"><SelectValue /></SelectTrigger
                      ><SelectContent
                        ><SelectItem value="none">Unassigned</SelectItem
                        ><SelectItem v-for="team in teams" :key="team.id" :value="team.id">{{
                          team.name
                        }}</SelectItem></SelectContent
                      ></Select
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            {{ filteredCompanies.length }} companies
          </div>
        </section>
      </div>
    </div>
    <Dialog v-model:open="editorOpen"
      ><DialogContent class="max-w-md"
        ><DialogHeader
          ><DialogTitle>{{ editing ? 'Edit team' : 'Add team' }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-4" @submit.prevent="saveTeam">
          <label class="grid gap-1.5 text-sm"
            >Name<Input v-model="name" required maxlength="200" /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="editorOpen = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !name.trim()">Save</Button></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
    <Dialog
      :open="!!removing"
      @update:open="
        (value) => {
          if (!value) removing = null
        }
      "
      ><DialogContent class="max-w-sm"
        ><DialogHeader
          ><DialogTitle>Delete {{ removing?.name }}?</DialogTitle></DialogHeader
        ><DialogFooter
          ><Button variant="outline" @click="removing = null">Cancel</Button
          ><Button variant="destructive" :disabled="saving" @click="removeTeam"
            >Delete</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
