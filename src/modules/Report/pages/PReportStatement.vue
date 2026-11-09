<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
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
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import CReportMonthField from '@/modules/Report/components/CReportMonthField.vue'

interface PortalUser {
  id: string
  name: string
}
interface StatementRow {
  id: string
  portalUserId: string
  companyName: string
  trucksCount: number
  trucksPerHosCount: number
  fortexTrucksCount: number
  month: string
}
const api = useApi()
const auth = useAuthStore()
const canCreate = computed(() => hasPermission(auth.token, 'report.statement.create'))
const canEdit = computed(() => hasPermission(auth.token, 'report.statement.edit'))
const canDelete = computed(() => hasPermission(auth.token, 'report.statement.delete'))
const users = ref<PortalUser[]>([])
const rows = ref<StatementRow[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const selectedUser = ref('all')
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const editorOpen = ref(false)
const userEditorOpen = ref(false)
const editingRow = ref<StatementRow | null>(null)
const editingUser = ref<PortalUser | null>(null)
const removing = ref<{ id: string; kind: 'row' | 'user' } | null>(null)
const portalUserId = ref('')
const companyName = ref('')
const trucksCount = ref(0)
const trucksPerHosCount = ref(0)
const fortexTrucksCount = ref(0)
const month = ref(new Date().toISOString().slice(0, 7))
const userName = ref('')
const filtered = computed(() =>
  rows.value.filter((row) => row.companyName.toLowerCase().includes(search.value.toLowerCase()))
)
const totals = computed(() =>
  filtered.value.reduce(
    (result, row) => ({
      trucks: result.trucks + row.trucksCount,
      hos: result.hos + row.trucksPerHosCount,
      fortex: result.fortex + row.fortexTrucksCount,
    }),
    { trucks: 0, hos: 0, fortex: 0 }
  )
)

async function loadRows() {
  const response = await api.get<{ successResult: StatementRow[] }>('/report/api/statement/rows', {
    params: {
      month: `${selectedMonth.value}-01T00:00:00Z`,
      portalUserId: selectedUser.value === 'all' ? undefined : selectedUser.value,
    },
  })
  rows.value = response.data.successResult ?? []
}

async function load() {
  loading.value = true
  try {
    const userResponse = await api.get<{ successResult: PortalUser[] }>(
      '/report/api/statement/portal-users'
    )
    users.value = userResponse.data.successResult ?? []
    await loadRows()
  } catch {
    toast.error('Could not load statement data.')
  } finally {
    loading.value = false
  }
}

function openRow(row: StatementRow | null = null) {
  editingRow.value = row
  portalUserId.value = row?.portalUserId ?? (selectedUser.value === 'all' ? '' : selectedUser.value)
  companyName.value = row?.companyName ?? ''
  trucksCount.value = row?.trucksCount ?? 0
  trucksPerHosCount.value = row?.trucksPerHosCount ?? 0
  fortexTrucksCount.value = row?.fortexTrucksCount ?? 0
  month.value = row?.month.slice(0, 7) ?? selectedMonth.value
  editorOpen.value = true
}

function openUser(user: PortalUser | null = null) {
  editingUser.value = user
  userName.value = user?.name ?? ''
  userEditorOpen.value = true
}

async function saveRow() {
  if (!portalUserId.value || !companyName.value.trim()) return
  saving.value = true
  try {
    const body = {
      portalUserId: portalUserId.value,
      companyId: null,
      companyName: companyName.value.trim(),
      trucksCount: trucksCount.value,
      trucksPerHosCount: trucksPerHosCount.value,
      fortexTrucksCount: fortexTrucksCount.value,
      month: `${month.value}-01T00:00:00Z`,
    }
    if (editingRow.value) await api.put(`/report/api/statement/rows/${editingRow.value.id}`, body)
    else await api.post('/report/api/statement/rows', body)
    editorOpen.value = false
    toast.success('Statement row saved.')
    await load()
  } catch {
    toast.error('Could not save the statement row.')
  } finally {
    saving.value = false
  }
}

async function saveUser() {
  if (!userName.value.trim()) return
  saving.value = true
  try {
    if (editingUser.value)
      await api.put(`/report/api/statement/portal-users/${editingUser.value.id}`, {
        name: userName.value.trim(),
      })
    else await api.post('/report/api/statement/portal-users', { name: userName.value.trim() })
    userEditorOpen.value = false
    toast.success('Portal user saved.')
    await load()
  } catch {
    toast.error('Could not save the portal user.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  try {
    await api.delete(
      `/report/api/statement/${removing.value.kind === 'row' ? 'rows' : 'portal-users'}/${removing.value.id}`
    )
    removing.value = null
    toast.success('Deleted.')
    await load()
  } catch {
    toast.error('Could not delete this entry.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
watch([selectedMonth, selectedUser], async () => {
  try {
    await loadRows()
  } catch {
    toast.error('Could not load statement rows.')
  }
})
</script>

<template>
  <div class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-background">
    <CReportToolbar title="Statement" subtitle="Manage portal users and monthly statement rows" :show-filters="false">
      <template #actions>
        <div class="flex items-center gap-1">
          <Select v-model="selectedUser">
            <SelectTrigger class="h-10 w-40 bg-card" aria-label="Portal user"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</SelectItem>
            </SelectContent>
          </Select>
          <Button v-if="canEdit && selectedUser !== 'all'" size="icon-sm" variant="ghost" title="Edit portal user" @click="openUser(users.find((item) => item.id === selectedUser) ?? null)"><Pencil class="h-4 w-4" /></Button>
          <Button v-if="canDelete && selectedUser !== 'all'" size="icon-sm" variant="ghost" title="Delete portal user" @click="removing = { id: selectedUser, kind: 'user' }"><Trash2 class="h-4 w-4 text-destructive" /></Button>
        </div>
        <Input v-model="search" placeholder="Search companies" aria-label="Search companies" class="h-10 w-44 bg-card" />
        <CReportMonthField v-model="selectedMonth" />
        <Button v-if="canCreate" variant="outline" @click="openUser()"><Plus class="mr-2 h-4 w-4" />Portal user</Button>
        <Button v-if="canCreate" @click="openRow()"><Plus class="mr-2 h-4 w-4" />Add row</Button>
      </template>
    </CReportToolbar>
    <div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full min-w-[860px] text-left text-sm">
          <thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50">
            <tr class="h-11">
              <th class="px-4 font-medium">No</th>
              <th class="px-4 font-medium">Portal user</th>
              <th class="px-4 font-medium">Company</th>
              <th class="px-4 font-medium">Trucks</th>
              <th class="px-4 font-medium">HOS trucks</th>
              <th class="px-4 font-medium">Fortex trucks</th>
              <th class="px-4 font-medium">Month</th>
              <th v-if="canEdit || canDelete" class="px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in filtered" :key="row.id" class="h-12 border-t border-border">
              <td class="px-4 text-muted-foreground">{{ index + 1 }}</td>
              <td class="px-4">
                {{ users.find((item) => item.id === row.portalUserId)?.name || '—' }}
              </td>
              <td class="px-4 font-medium">{{ row.companyName }}</td>
              <td class="px-4">{{ row.trucksCount }}</td>
              <td class="px-4">{{ row.trucksPerHosCount }}</td>
              <td class="px-4">{{ row.fortexTrucksCount }}</td>
              <td class="px-4">{{ row.month.slice(0, 7) }}</td>
              <td v-if="canEdit || canDelete" class="px-4">
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="canEdit"
                    size="icon-sm"
                    variant="ghost"
                    title="Edit"
                    @click="openRow(row)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    v-if="canDelete"
                    size="icon-sm"
                    variant="ghost"
                    title="Delete"
                    @click="removing = { id: row.id, kind: 'row' }"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td
                :colspan="canEdit || canDelete ? 8 : 7"
                class="px-4 py-12 text-center text-muted-foreground"
              >
                {{ loading ? 'Loading…' : 'No statement rows found.' }}
              </td>
            </tr>
          </tbody>
          <tfoot
            v-if="filtered.length"
            class="sticky bottom-0 border-t border-border bg-card font-semibold"
          >
            <tr>
              <td class="px-4 py-3" colspan="3">Total</td>
              <td class="px-4 py-3">{{ totals.trucks }}</td>
              <td class="px-4 py-3">{{ totals.hos }}</td>
              <td class="px-4 py-3">{{ totals.fortex }}</td>
              <td :colspan="canEdit || canDelete ? 2 : 1" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {{ filtered.length }} rows
      </div>
    </div>
    </div>
    <Dialog v-model:open="editorOpen"
      ><DialogContent class="max-w-md"
        ><DialogHeader
          ><DialogTitle>{{ editingRow ? 'Edit row' : 'Add row' }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-3" @submit.prevent="saveRow">
          <label class="grid gap-1 text-sm"
            >Portal user<Select v-model="portalUserId"
              ><SelectTrigger><SelectValue placeholder="Select portal user" /></SelectTrigger
              ><SelectContent
                ><SelectItem v-for="user in users" :key="user.id" :value="user.id">{{
                  user.name
                }}</SelectItem></SelectContent
              ></Select
            ></label
          ><label class="grid gap-1 text-sm">Company<Input v-model="companyName" required /></label>
          <div class="grid grid-cols-3 gap-2">
            <label class="grid gap-1 text-sm"
              >Trucks<Input v-model.number="trucksCount" type="number" min="0" /></label
            ><label class="grid gap-1 text-sm"
              >HOS<Input v-model.number="trucksPerHosCount" type="number" min="0" /></label
            ><label class="grid gap-1 text-sm"
              >Fortex<Input v-model.number="fortexTrucksCount" type="number" min="0"
            /></label>
          </div>
          <label class="grid gap-1 text-sm">Month<CReportMonthField v-model="month" /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="editorOpen = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !portalUserId || !companyName.trim()"
              >Save</Button
            ></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
    <Dialog v-model:open="userEditorOpen"
      ><DialogContent class="max-w-sm"
        ><DialogHeader
          ><DialogTitle>{{
            editingUser ? 'Edit portal user' : 'Add portal user'
          }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-4" @submit.prevent="saveUser">
          <label class="grid gap-1 text-sm">Name<Input v-model="userName" required /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="userEditorOpen = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !userName.trim()"
              >Save</Button
            ></DialogFooter
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
        ><DialogHeader><DialogTitle>Delete this entry?</DialogTitle></DialogHeader
        ><DialogFooter
          ><Button variant="outline" @click="removing = null">Cancel</Button
          ><Button variant="destructive" :disabled="saving" @click="remove"
            >Delete</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
