<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { History, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
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
import CReportDateField from '@/modules/Report/components/CReportDateField.vue'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'
import { reportMoney } from '@/modules/Report/utils/money'

interface Salary {
  userId: string
  userName: string
  firstName: string | null
  lastName: string | null
  fixedSalary: number
  roleName: string | null
  levelName: string | null
  teamName: string | null
  effectiveDate: string
}
interface Adjustment {
  id: string
  userId: string
  userName: string
  fullName: string | null
  type: number
  amount: number
  reason: string | null
  effectiveDate: string
}
interface Employee {
  id: string
  userName: string
  firstName: string | null
  lastName: string | null
}
interface SalaryHistory {
  userName: string
  fullName: string | null
  currentSalary: number
  history: { amount: number; effectiveDate: string; changedDate: string }[]
}
const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const bonuses = computed(() => route.path.endsWith('/bonuses'))
const permission = computed(() => (bonuses.value ? 'bonuses' : 'salaries'))
const canCreate = computed(() => hasPermission(auth.token, `report.${permission.value}.create`))
const canEdit = computed(() => hasPermission(auth.token, `report.${permission.value}.edit`))
const canDelete = computed(() => hasPermission(auth.token, `report.${permission.value}.delete`))
const search = ref('')
const rows = ref<(Salary | Adjustment)[]>([])
const employees = ref<Employee[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const removing = ref<Adjustment | null>(null)
const salaryHistory = ref<SalaryHistory | null>(null)
const historyOpen = ref(false)
const userId = ref('')
const type = ref('0')
const amount = ref('0')
const reason = ref('')
const effectiveDate = ref(new Date().toISOString().slice(0, 10))
const filtered = computed(() =>
  rows.value.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(search.value.trim().toLowerCase())
  )
)

function salaryName(row: Salary) {
  return `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() || row.userName
}

async function load() {
  loading.value = true
  try {
    if (bonuses.value) {
      const [adjustmentResponse, employeeResponse] = await Promise.all([
        api.get<{ successResult: Adjustment[] }>('/report/api/kpi/adjustments'),
        api.get<{ successResult: Employee[] }>('/report/api/users'),
      ])
      rows.value = adjustmentResponse.data.successResult ?? []
      employees.value = employeeResponse.data.successResult ?? []
    } else {
      const response = await api.get<{ successResult: Salary[] }>('/report/api/kpi/salaries')
      rows.value = response.data.successResult ?? []
      employees.value = (response.data.successResult ?? []).map((item) => ({
        id: item.userId,
        userName: item.userName,
        firstName: item.firstName,
        lastName: item.lastName,
      }))
    }
  } catch {
    toast.error('Could not load compensation data.')
  } finally {
    loading.value = false
  }
}

function openEditor(row: Salary | Adjustment | null = null) {
  editingId.value = row && 'id' in row ? row.id : null
  userId.value = row?.userId ?? ''
  type.value = row && 'type' in row ? String(row.type) : '0'
  amount.value = String(row ? ('amount' in row ? row.amount : row.fixedSalary) : 0)
  reason.value = row && 'reason' in row ? (row.reason ?? '') : ''
  effectiveDate.value = row?.effectiveDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  dialogOpen.value = true
}

async function save() {
  if (!userId.value || Number(amount.value) < 0) return
  saving.value = true
  try {
    if (bonuses.value) {
      const body = {
        userId: userId.value,
        type: Number(type.value),
        amount: Number(amount.value),
        reason: reason.value.trim(),
        effectiveDate: `${effectiveDate.value}T00:00:00Z`,
      }
      if (editingId.value) await api.put(`/report/api/kpi/adjustments/${editingId.value}`, body)
      else await api.post('/report/api/kpi/adjustments', body)
    } else {
      await api.put(`/report/api/kpi/salaries/${userId.value}`, {
        fixedSalary: Number(amount.value),
        effectiveDate: `${effectiveDate.value}T00:00:00Z`,
      })
    }
    dialogOpen.value = false
    toast.success('Saved.')
    await load()
  } catch {
    toast.error('Could not save this entry.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  try {
    await api.delete(`/report/api/kpi/adjustments/${removing.value.id}`)
    removing.value = null
    toast.success('Entry deleted.')
    await load()
  } catch {
    toast.error('Could not delete this entry.')
  } finally {
    saving.value = false
  }
}

async function openHistory(userId: string) {
  historyOpen.value = true
  salaryHistory.value = null
  try {
    const response = await api.get<{ successResult: SalaryHistory }>(
      `/report/api/kpi/salary-history/${userId}`
    )
    salaryHistory.value = response.data.successResult
  } catch {
    toast.error('Could not load salary history.')
  }
}

watch(bonuses, load)
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <CReportAdminHeader
      v-model:search="search"
      :title="bonuses ? 'Bonuses & Charges' : 'Salary'"
      :subtitle="bonuses ? 'Adjust employee earnings.' : 'Manage monthly employee salaries.'"
      placeholder="Search employees"
    >
      <Button v-if="bonuses ? canCreate : canEdit" @click="openEditor()"
        ><Plus class="mr-2 h-4 w-4" />{{ bonuses ? 'Add adjustment' : 'Set salary' }}</Button
      >
    </CReportAdminHeader>
    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full text-left text-sm" :class="bonuses ? 'min-w-[720px]' : 'min-w-[840px]'">
          <thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50">
            <tr class="h-11">
              <th class="px-4 font-medium">No</th>
              <th class="px-4 font-medium">Employee</th>
              <th class="px-4 font-medium">{{ bonuses ? 'Type' : 'Role' }}</th>
              <th v-if="!bonuses" class="px-4 font-medium">Level</th>
              <th class="px-4 font-medium">{{ bonuses ? 'Amount' : 'Salary' }}</th>
              <th class="px-4 font-medium">{{ bonuses ? 'Reason' : 'Team' }}</th>
              <th class="px-4 font-medium">Effective date</th>
              <th v-if="canEdit || canDelete || !bonuses" class="px-4 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in filtered"
              :key="'id' in item ? item.id : item.userId"
              class="h-12 border-t border-border"
            >
              <td class="px-4 text-muted-foreground">{{ index + 1 }}</td>
              <td class="px-4 font-medium">
                {{ 'id' in item ? item.fullName || item.userName : salaryName(item) }}
              </td>
              <td class="px-4">
                {{ 'id' in item ? (item.type === 0 ? 'Bonus' : 'Charge') : item.roleName || '—' }}
              </td>
              <td v-if="!bonuses" class="px-4">{{ 'levelName' in item ? item.levelName || '—' : '—' }}</td>
              <td class="px-4">{{ reportMoney('id' in item ? item.amount : item.fixedSalary) }}</td>
              <td class="px-4">{{ 'id' in item ? item.reason || '—' : item.teamName || '—' }}</td>
              <td class="px-4">{{ item.effectiveDate?.slice(0, 10) }}</td>
              <td v-if="canEdit || canDelete || !bonuses" class="px-4">
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="!bonuses"
                    size="icon-sm"
                    variant="ghost"
                    title="Salary history"
                    @click="openHistory(item.userId)"
                    ><History class="h-4 w-4"
                  /></Button>
                  <Button
                    v-if="canEdit"
                    size="icon-sm"
                    variant="ghost"
                    title="Edit"
                    @click="openEditor(item)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    v-if="bonuses && canDelete && 'id' in item"
                    size="icon-sm"
                    variant="ghost"
                    title="Delete"
                    @click="removing = item"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td
                :colspan="(canEdit || canDelete || !bonuses ? 7 : 6) + (bonuses ? 0 : 1)"
                class="px-4 py-12 text-center text-muted-foreground"
              >
                {{ loading ? 'Loading…' : 'No entries found.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {{ filtered.length }} entries
      </div>
    </div>
    <Dialog v-model:open="dialogOpen"
      ><DialogContent class="max-w-md"
        ><DialogHeader
          ><DialogTitle>{{ bonuses ? 'Adjustment' : 'Salary' }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-4" @submit.prevent="save">
          <label class="grid gap-1.5 text-sm"
            >Employee<Select v-model="userId" :disabled="!!editingId"
              ><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger
              ><SelectContent
                ><SelectItem
                  v-for="employee in employees"
                  :key="employee.id"
                  :value="employee.id"
                  >{{
                    `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
                    employee.userName
                  }}</SelectItem
                ></SelectContent
              ></Select
            ></label
          ><label v-if="bonuses" class="grid gap-1.5 text-sm"
            >Type<Select v-model="type"
              ><SelectTrigger><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="0">Bonus</SelectItem
                ><SelectItem value="1">Charge</SelectItem></SelectContent
              ></Select
            ></label
          ><label class="grid gap-1.5 text-sm"
            >Amount ($)<Input v-model="amount" type="number" min="0" step="0.01" required /></label
          ><label v-if="bonuses" class="grid gap-1.5 text-sm"
            >Reason<Input v-model="reason" /></label
          ><label class="grid gap-1.5 text-sm"
            >Effective date<CReportDateField v-model="effectiveDate" /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="dialogOpen = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !userId">Save</Button></DialogFooter
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
        ><DialogHeader><DialogTitle>Delete adjustment?</DialogTitle></DialogHeader
        ><DialogFooter
          ><Button variant="outline" @click="removing = null">Cancel</Button
          ><Button variant="destructive" :disabled="saving" @click="remove"
            >Delete</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
    <Dialog v-model:open="historyOpen">
      <DialogContent class="max-w-md">
        <DialogHeader
          ><DialogTitle
            >Salary history ·
            {{ salaryHistory?.fullName || salaryHistory?.userName || 'Employee' }}</DialogTitle
          ></DialogHeader
        >
        <div v-if="salaryHistory" class="max-h-80 overflow-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted">
              <tr>
                <th class="px-3 py-2">Effective date</th>
                <th class="px-3 py-2">Salary</th>
                <th class="px-3 py-2">Changed</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(entry, index) in salaryHistory.history"
                :key="index"
                class="border-t border-border"
              >
                <td class="px-3 py-2">{{ entry.effectiveDate.slice(0, 10) }}</td>
                <td class="px-3 py-2">{{ reportMoney(entry.amount) }}</td>
                <td class="px-3 py-2">{{ entry.changedDate.slice(0, 10) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="py-6 text-center text-sm text-muted-foreground">Loading…</div>
      </DialogContent>
    </Dialog>
  </div>
</template>
