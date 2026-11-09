<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CReportSearchSelect from '@/modules/Report/components/CReportSearchSelect.vue'
import CReportDateField from '@/modules/Report/components/CReportDateField.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'

interface Company {
  id: string
  name: string
}
interface Driver {
  id: string
  name: string
  company?: Company
}
interface InspectionUpload {
  id: string
  fileType?: string
}
interface Inspection {
  id: string
  type: number
  driverName: string
  companyName: string
  inspectionDate: string
  reasonNote?: string
  uploads: InspectionUpload[]
  createdDate: string
}
interface ApiResult<T> {
  successResult: T
}
const api = useApi()
const route = useRoute()
const auth = useAuthStore()
const isViolation = computed(() => route.path.endsWith('/violation'))
const type = computed(() => (isViolation.value ? 0 : 1))
const permission = computed(
  () => `report.inspection.${isViolation.value ? 'violation' : 'no_violation'}`
)
const canCreate = computed(() => hasPermission(auth.token, `${permission.value}.create`))
const canEdit = computed(() => hasPermission(auth.token, `${permission.value}.edit`))
const canDelete = computed(() => hasPermission(auth.token, `${permission.value}.delete`))
const rows = ref<Inspection[]>([])
const companies = ref<Company[]>([])
const drivers = ref<Driver[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const range = ref({
  startTime: dayjs().startOf('month').format('YYYY-MM-DD'),
  endTime: dayjs().endOf('month').format('YYYY-MM-DD'),
})
const ready = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = 25
const dialogOpen = ref(false)
const editing = ref<Inspection | null>(null)
const deleting = ref<Inspection | null>(null)
const companyId = ref('')
const driverId = ref('')
const inspectionDate = ref(dayjs().format('YYYY-MM-DD'))
const reasonNote = ref('')
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const visibleDrivers = computed(() =>
  drivers.value.filter((driver) => driver.company?.id === companyId.value)
)
const filtered = computed(() =>
  rows.value.filter((item) =>
    `${item.driverName} ${item.companyName} ${item.reasonNote ?? ''}`
      .toLowerCase()
      .includes(search.value.trim().toLowerCase())
  )
)
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visibleRows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize)
)
const columnCount = computed(
  () => 6 + Number(isViolation.value) + Number(canEdit.value || canDelete.value)
)
function periodRange() {
  return { from: range.value.startTime, to: range.value.endTime }
}

function onRange(value: { startTime: string; endTime: string }) {
  range.value = value
  page.value = 1
  if (ready.value) void load()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [inspectionResult, companyResult, driverResult] = await Promise.all([
      api.get<ApiResult<Inspection[]>>('/report/api/inspections', {
        params: { type: type.value, ...periodRange() },
      }),
      api.get<ApiResult<Company[]>>('/report/api/companies'),
      api.get<ApiResult<Driver[]>>('/report/api/drivers'),
    ])
    rows.value = inspectionResult.data.successResult ?? []
    page.value = Math.min(page.value, pageCount.value)
    companies.value = companyResult.data.successResult ?? []
    drivers.value = driverResult.data.successResult ?? []
  } catch {
    error.value = 'Could not load inspections.'
  } finally {
    loading.value = false
  }
}

function openForm(item: Inspection | null = null) {
  editing.value = item
  companyId.value = companies.value.find((company) => company.name === item?.companyName)?.id ?? ''
  driverId.value =
    drivers.value.find(
      (driver) => driver.name === item?.driverName && driver.company?.id === companyId.value
    )?.id ?? ''
  inspectionDate.value = item?.inspectionDate?.slice(0, 10) ?? dayjs().format('YYYY-MM-DD')
  reasonNote.value = item?.reasonNote ?? ''
  files.value = []
  dialogOpen.value = true
}

function onFiles(event: Event) {
  files.value = Array.from((event.target as HTMLInputElement).files ?? [])
}

async function save() {
  const company = companies.value.find((item) => item.id === companyId.value)
  const driver = drivers.value.find((item) => item.id === driverId.value)
  if (
    !company ||
    !driver ||
    !inspectionDate.value ||
    (isViolation.value && !reasonNote.value.trim())
  )
    return
  const body = new FormData()
  body.append('Type', String(type.value))
  body.append('DriverName', driver.name)
  body.append('CompanyName', company.name)
  body.append('InspectionDate', inspectionDate.value)
  if (isViolation.value) body.append('ReasonNote', reasonNote.value.trim())
  files.value.forEach((file) => body.append('files', file))
  saving.value = true
  try {
    if (editing.value) await api.put(`/report/api/inspections/${editing.value.id}`, body)
    else await api.post('/report/api/inspections', body)
    dialogOpen.value = false
    toast.success('Inspection saved')
    await load()
  } catch {
    toast.error('Could not save inspection.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!deleting.value) return
  saving.value = true
  try {
    await api.delete(`/report/api/inspections/${deleting.value.id}`)
    deleting.value = null
    toast.success('Inspection deleted')
    await load()
  } catch {
    toast.error('Could not delete inspection.')
  } finally {
    saving.value = false
  }
}

async function openUpload(item: Inspection, upload: InspectionUpload) {
  try {
    const response = await api.get<Blob>(
      `/report/api/inspections/${item.id}/uploads/${upload.id}/file`,
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(response.data)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch {
    toast.error('Could not open file.')
  }
}

watch(type, () => {
  page.value = 1
  void load()
})
watch(search, () => {
  page.value = 1
})
onMounted(() => {
  ready.value = true
  void load()
})
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      :title="isViolation ? 'Violation' : 'No Violation'"
      subtitle="Route Report inspections"
      default-period="month"
      full-periods
      @change="onRange"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="search" class="w-64 pl-9" placeholder="Search inspections" />
          </div>
          <Button v-if="canCreate" @click="openForm()"
            ><Plus class="mr-2 h-4 w-4" />New inspection</Button
          >
        </div>
      </template>
    </CReportToolbar>
    <div class="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
      <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50">
            <tr class="h-11">
              <th class="w-20 px-4 py-3 font-medium">No</th>
              <th class="px-4 py-3 font-medium">Driver</th>
              <th class="px-4 py-3 font-medium">Company</th>
              <th class="px-4 py-3 font-medium">Inspection date</th>
              <th v-if="isViolation" class="px-4 py-3 font-medium">Reason note</th>
              <th class="px-4 py-3 font-medium">Files</th>
              <th class="px-4 py-3 font-medium">Created</th>
              <th v-if="canEdit || canDelete" class="w-28 px-4 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in visibleRows"
              :key="item.id"
              class="h-12 border-t border-border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td class="px-4 py-3 text-muted-foreground">
                {{ (page - 1) * pageSize + index + 1 }}
              </td>
              <td class="px-4 py-3 font-medium">{{ item.driverName }}</td>
              <td class="px-4 py-3">{{ item.companyName }}</td>
              <td class="px-4 py-3">{{ item.inspectionDate?.slice(0, 10) }}</td>
              <td v-if="isViolation" class="px-4 py-3">{{ item.reasonNote || '—' }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <Button
                    v-for="(upload, fileIndex) in item.uploads"
                    :key="upload.id"
                    size="icon-sm"
                    variant="ghost"
                    :title="`Open file ${fileIndex + 1}`"
                    :aria-label="`Open file ${fileIndex + 1}`"
                    @click="openUpload(item, upload)"
                    ><FileText class="h-4 w-4" /></Button
                  ><span v-if="!item.uploads.length">—</span>
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ dayjs(item.createdDate).format('MM/DD/YYYY HH:mm') }}
              </td>
              <td v-if="canEdit || canDelete" class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="canEdit"
                    size="icon-sm"
                    variant="ghost"
                    title="Edit"
                    aria-label="Edit"
                    @click="openForm(item)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    v-if="canDelete"
                    size="icon-sm"
                    variant="ghost"
                    title="Delete"
                    aria-label="Delete"
                    @click="deleting = item"
                    ><Trash2 class="h-4 w-4 text-destructive"
                  /></Button>
                </div>
              </td>
            </tr>
            <tr v-if="loading">
              <td :colspan="columnCount" class="px-4 py-12 text-center">
                <Loader2 class="mx-auto h-5 w-5 animate-spin" />
              </td>
            </tr>
            <tr v-else-if="error">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-destructive">
                {{ error }}
              </td>
            </tr>
            <tr v-else-if="!visibleRows.length">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-muted-foreground">
                No inspections found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        class="mt-4 flex flex-none items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
      >
        <span>{{ filtered.length }} entries</span>
        <div class="flex items-center gap-3">
          <span>{{ filtered.length ? page : 0 }} of {{ pageCount }} pages</span
          ><Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="page <= 1"
            aria-label="Previous page"
            @click="page--"
            ><ChevronLeft class="h-4 w-4" /></Button
          ><Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :disabled="page >= pageCount"
            aria-label="Next page"
            @click="page++"
            ><ChevronRight class="h-4 w-4"
          /></Button>
        </div>
      </div>
    </div>
    <Dialog v-model:open="dialogOpen"
      ><DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto"
        ><DialogHeader
          ><DialogTitle>{{
            editing ? 'Edit inspection' : 'New inspection'
          }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-4" @submit.prevent="save">
          <label class="grid gap-1.5 text-sm"
            >Company<CReportSearchSelect
              v-model="companyId"
              :options="companies"
              placeholder="Select company"
              @update:model-value="driverId = ''" /></label
          ><label class="grid gap-1.5 text-sm"
            >Driver<CReportSearchSelect
              v-model="driverId"
              :options="visibleDrivers"
              placeholder="Select driver"
              :disabled="!companyId" /></label
          ><label class="grid gap-1.5 text-sm"
            >Inspection date<CReportDateField v-model="inspectionDate" /></label
          ><label v-if="isViolation" class="grid gap-1.5 text-sm"
            >Reason note<Textarea v-model="reasonNote" rows="3" required
          /></label>
          <div>
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept="image/*,application/pdf"
              multiple
              @change="onFiles"
            /><Button type="button" variant="outline" @click="fileInput?.click()"
              ><Upload class="mr-2 h-4 w-4" />Attach files</Button
            ><span class="ml-2 text-xs text-muted-foreground">{{ files.length }} selected</span>
          </div>
          <div v-if="editing?.uploads.length" class="flex items-center gap-1 text-sm">
            <span class="mr-2 text-muted-foreground">Existing files</span
            ><Button
              v-for="(upload, index) in editing.uploads"
              :key="upload.id"
              type="button"
              size="icon-sm"
              variant="ghost"
              :title="`Open file ${index + 1}`"
              @click="editing && openUpload(editing, upload)"
              ><FileText class="h-4 w-4"
            /></Button>
          </div>
          <DialogFooter
            ><Button type="button" variant="outline" @click="dialogOpen = false">Cancel</Button
            ><Button
              type="submit"
              :disabled="
                saving ||
                !companyId ||
                !driverId ||
                !inspectionDate ||
                (isViolation && !reasonNote.trim())
              "
              >{{ saving ? 'Saving…' : 'Save' }}</Button
            ></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
    <Dialog
      :open="!!deleting"
      @update:open="
        (value) => {
          if (!value) deleting = null
        }
      "
      ><DialogContent class="max-w-sm"
        ><DialogHeader><DialogTitle>Delete inspection?</DialogTitle></DialogHeader
        ><DialogFooter
          ><Button variant="outline" @click="deleting = null">Cancel</Button
          ><Button variant="destructive" :disabled="saving" @click="remove"
            >Delete</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
