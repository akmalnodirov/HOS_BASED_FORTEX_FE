<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { FileText, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
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
import CReportDateField from '@/modules/Report/components/CReportDateField.vue'

interface Company {
  id: string
  name: string
}
interface Driver {
  id: string
  name: string
  company?: Company
}
interface Inspection {
  id: string
  type: number
  driverName: string
  companyName: string
  inspectionDate: string
  reasonNote: string | null
  uploads: { id: string }[]
}
const api = useApi()
const auth = useAuthStore()
const type = ref('all')
const formType = ref('0')
const canCreate = computed(
  () =>
    hasPermission(auth.token, 'report.owner.inspections.create') ||
    hasPermission(auth.token, 'report.inspection.violation.create') ||
    hasPermission(auth.token, 'report.inspection.no_violation.create')
)
const rows = ref<Inspection[]>([])
const companies = ref<Company[]>([])
const drivers = ref<Driver[]>([])
const search = ref('')
const range = ref({
  startTime: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString(),
  endTime: new Date().toISOString(),
})
const loading = ref(false)
const saving = ref(false)
const editor = ref(false)
const editing = ref<Inspection | null>(null)
const companyId = ref('')
const driverId = ref('')
const inspectionDate = ref(new Date().toISOString().slice(0, 10))
const reason = ref('')
const files = ref<File[]>([])
const visible = computed(() =>
  rows.value.filter(
    (item) =>
      (type.value === 'all' || item.type === Number(type.value)) &&
      `${item.companyName} ${item.driverName} ${item.reasonNote ?? ''}`
        .toLowerCase()
        .includes(search.value.toLowerCase())
  )
)
const visibleDrivers = computed(() =>
  drivers.value.filter((item) => item.company?.id === companyId.value)
)
function actionPermission(item: Inspection, action: string) {
  return (
    hasPermission(auth.token, `report.owner.inspections.${action}`) ||
    hasPermission(
      auth.token,
      `report.inspection.${item.type === 0 ? 'violation' : 'no_violation'}.${action}`
    )
  )
}

async function load() {
  loading.value = true
  try {
    const [inspectionResponse, companyResponse, driverResponse] = await Promise.all([
      api.get<{ successResult: Inspection[] }>('/report/api/inspections', {
        params: { from: range.value.startTime, to: range.value.endTime },
      }),
      api.get<{ successResult: Company[] }>('/report/api/companies'),
      api.get<{ successResult: Driver[] }>('/report/api/drivers'),
    ])
    rows.value = inspectionResponse.data.successResult ?? []
    companies.value = companyResponse.data.successResult ?? []
    drivers.value = driverResponse.data.successResult ?? []
  } catch {
    toast.error('Could not load inspections.')
  } finally {
    loading.value = false
  }
}

function openForm(item?: Inspection) {
  editing.value = item ?? null
  formType.value = item
    ? String(item.type)
    : type.value !== 'all' &&
        (hasPermission(auth.token, 'report.owner.inspections.create') ||
          hasPermission(
            auth.token,
            `report.inspection.${type.value === '0' ? 'violation' : 'no_violation'}.create`
          ))
      ? type.value
      : hasPermission(auth.token, 'report.owner.inspections.create') ||
          hasPermission(auth.token, 'report.inspection.violation.create')
        ? '0'
        : '1'
  companyId.value = companies.value.find((value) => value.name === item?.companyName)?.id ?? ''
  driverId.value =
    drivers.value.find(
      (value) => value.name === item?.driverName && value.company?.id === companyId.value
    )?.id ?? ''
  inspectionDate.value = item?.inspectionDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  reason.value = item?.reasonNote ?? ''
  files.value = []
  editor.value = true
}

async function save() {
  if (
    !hasPermission(auth.token, `report.owner.inspections.${editing.value ? 'edit' : 'create'}`) &&
    !hasPermission(
      auth.token,
      `report.inspection.${formType.value === '0' ? 'violation' : 'no_violation'}.${editing.value ? 'edit' : 'create'}`
    )
  )
    return
  const company = companies.value.find((item) => item.id === companyId.value)
  const driver = drivers.value.find((item) => item.id === driverId.value)
  if (!company || !driver || (formType.value === '0' && !reason.value.trim())) return
  const body = new FormData()
  body.append('Type', formType.value)
  body.append('CompanyName', company.name)
  body.append('DriverName', driver.name)
  body.append('InspectionDate', inspectionDate.value)
  if (formType.value === '0') body.append('ReasonNote', reason.value.trim())
  files.value.forEach((file) => body.append('files', file))
  saving.value = true
  try {
    if (editing.value) await api.put(`/report/api/inspections/${editing.value.id}`, body)
    else await api.post('/report/api/inspections', body)
    editor.value = false
    await load()
    toast.success('Inspection saved.')
  } catch {
    toast.error('Could not save inspection.')
  } finally {
    saving.value = false
  }
}

async function remove(item: Inspection) {
  if (!confirm(`Delete inspection for ${item.driverName}?`)) return
  try {
    await api.delete(`/report/api/inspections/${item.id}`)
    await load()
  } catch {
    toast.error('Could not delete inspection.')
  }
}

async function openFile(item: Inspection, uploadId: string) {
  try {
    const result = await api.get<Blob>(
      `/report/api/inspections/${item.id}/uploads/${uploadId}/file`,
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(result.data)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch {
    toast.error('Could not open file.')
  }
}

function onRange(value: { startTime: string; endTime: string }) {
  range.value = value
  void load()
}
watch(companyId, () => {
  if (driverId.value && !visibleDrivers.value.some((item) => item.id === driverId.value))
    driverId.value = ''
})
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      title="Inspections"
      subtitle="Violations and no violation inspections"
      default-period="month"
      @change="onRange"
      ><template #actions
        ><div class="relative">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          /><Input v-model="search" class="w-56 pl-9" placeholder="Search inspections" />
        </div>
        <Button v-if="canCreate" @click="openForm()"
          ><Plus class="mr-2 h-4 w-4" />New inspection</Button
        ></template
      ></CReportToolbar
    >
    <div class="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <div class="flex w-fit gap-1 rounded-lg bg-muted p-1">
        <button
          v-for="option in [
            { value: 'all', label: 'All' },
            { value: '0', label: 'Violation' },
            { value: '1', label: 'No violation' },
          ]"
          :key="option.value"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm"
          :class="
            type === option.value
              ? 'bg-background font-semibold shadow-sm'
              : 'text-muted-foreground'
          "
          @click="type = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading inspections…
      </div>
      <section
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
      >
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full min-w-[800px] text-left text-sm">
            <thead class="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th class="px-4 py-2 font-medium">Driver</th>
                <th class="px-4 py-2 font-medium">Company</th>
                <th class="px-4 py-2 font-medium">Type</th>
                <th class="px-4 py-2 font-medium">Date</th>
                <th class="px-4 py-2 font-medium">Reason</th>
                <th class="px-4 py-2 font-medium">Files</th>
                <th class="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in visible" :key="item.id" class="border-t border-border">
                <td class="px-4 py-2">{{ item.driverName }}</td>
                <td class="px-4 py-2">{{ item.companyName }}</td>
                <td class="px-4 py-2">
                  <span
                    class="rounded-md px-2 py-1 text-xs"
                    :class="
                      item.type === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    "
                    >{{ item.type === 0 ? 'Violation' : 'No violation' }}</span
                  >
                </td>
                <td class="px-4 py-2">{{ item.inspectionDate.slice(0, 10) }}</td>
                <td class="px-4 py-2">{{ item.reasonNote || '—' }}</td>
                <td class="px-4 py-2">
                  <Button
                    v-for="upload in item.uploads"
                    :key="upload.id"
                    variant="ghost"
                    size="icon-sm"
                    title="Open file"
                    @click="openFile(item, upload.id)"
                    ><FileText class="h-4 w-4"
                  /></Button>
                </td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    <Button
                      v-if="actionPermission(item, 'edit')"
                      variant="ghost"
                      size="icon-sm"
                      title="Edit"
                      @click="openForm(item)"
                      ><Pencil class="h-4 w-4" /></Button
                    ><Button
                      v-if="actionPermission(item, 'delete')"
                      variant="ghost"
                      size="icon-sm"
                      title="Delete"
                      @click="remove(item)"
                      ><Trash2 class="h-4 w-4 text-destructive"
                    /></Button>
                  </div>
                </td>
              </tr>
              <tr v-if="!visible.length">
                <td colspan="7" class="px-4 py-12 text-center text-muted-foreground">
                  No inspections in this period.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {{ visible.length }} inspections
        </div>
      </section>
    </div>
    <Dialog v-model:open="editor"
      ><DialogContent class="max-w-lg"
        ><DialogHeader
          ><DialogTitle>{{
            editing ? 'Edit inspection' : 'New inspection'
          }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-3" @submit.prevent="save">
          <label class="grid gap-1 text-sm"
            >Type<Select v-model="formType"
              ><SelectTrigger><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="0">Violation</SelectItem
                ><SelectItem value="1">No violation</SelectItem></SelectContent
              ></Select
            ></label
          ><label class="grid gap-1 text-sm"
            >Company<Select v-model="companyId"
              ><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger
              ><SelectContent
                ><SelectItem v-for="item in companies" :key="item.id" :value="item.id">{{
                  item.name
                }}</SelectItem></SelectContent
              ></Select
            ></label
          ><label class="grid gap-1 text-sm"
            >Driver<Select v-model="driverId"
              ><SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger
              ><SelectContent
                ><SelectItem v-for="item in visibleDrivers" :key="item.id" :value="item.id">{{
                  item.name
                }}</SelectItem></SelectContent
              ></Select
            ></label
          ><label class="grid gap-1 text-sm"
            >Inspection date<CReportDateField v-model="inspectionDate" /></label
          ><label v-if="formType === '0'" class="grid gap-1 text-sm"
            >Reason<Input v-model="reason" required /></label
          ><label class="grid gap-1 text-sm"
            >Files<Input
              type="file"
              multiple
              @change="
                files = Array.from(($event.target as HTMLInputElement).files ?? [])
              " /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="editor = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !companyId || !driverId"
              >Save</Button
            ></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
  </div>
</template>
