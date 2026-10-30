<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CReportSearchSelect from '@/modules/Report/components/CReportSearchSelect.vue'
import CReportDateField from '@/modules/Report/components/CReportDateField.vue'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'

interface Company { id: string; name: string }
interface Driver { id: string; name: string; company?: Company; companyId?: string; licenseNumber?: string; dateOfBirth?: string; licenseClass?: string; inspectionDate?: string; expiryDate?: string; street?: string; city?: string; zipCode?: string; state?: string; endorsement?: string; documentDiscriminator?: string; height?: number; weight?: number; eyesColor?: string; gender?: number }
interface ApiResult<T> { successResult: T }
const api = useApi()
const auth = useAuthStore()
const canCreate = computed(() => hasPermission(auth.token, 'report.drivers.create'))
const canEdit = computed(() => hasPermission(auth.token, 'report.drivers.edit'))
const canDelete = computed(() => hasPermission(auth.token, 'report.drivers.delete'))
const drivers = ref<Driver[]>([])
const companies = ref<Company[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const companyFilter = ref('all')
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const deleting = ref<Driver | null>(null)
const page = ref(1)
const pageSize = 20
const blank = () => ({ name: '', companyId: '', licenseNumber: '', dateOfBirth: '', licenseClass: '', inspectionDate: '', expiryDate: '', street: '', city: '', zipCode: '', state: '', endorsement: '', documentDiscriminator: '', height: '', weight: '', eyesColor: '', gender: '' })
const form = reactive(blank())
const filtered = computed(() => drivers.value.filter(driver =>
  (companyFilter.value === 'all' || driver.company?.id === companyFilter.value || driver.companyId === companyFilter.value) &&
  `${driver.name} ${driver.company?.name ?? ''} ${driver.licenseNumber ?? ''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [driverResult, companyResult] = await Promise.all([
      api.get<ApiResult<Driver[]>>('/report/api/board-drivers'),
      api.get<ApiResult<Company[]>>('/report/api/board-companies'),
    ])
    drivers.value = driverResult.data.successResult ?? []
    companies.value = companyResult.data.successResult ?? []
  } catch {
    error.value = 'Could not load board drivers.'
  } finally {
    loading.value = false
  }
}

function openForm(driver?: Driver) {
  Object.assign(form, blank())
  editingId.value = driver?.id ?? null
  if (driver) {
    for (const key of Object.keys(form) as (keyof typeof form)[]) {
      const value = key === 'companyId' ? driver.company?.id ?? driver.companyId : driver[key]
      form[key] = key.endsWith('Date') || key === 'dateOfBirth' ? String(value ?? '').slice(0, 10) : String(value ?? '')
    }
  }
  dialogOpen.value = true
}

async function save() {
  if (!form.name.trim() || !form.companyId) return
  saving.value = true
  const body = {
    ...form,
    name: form.name.trim(),
    dateOfBirth: form.dateOfBirth ? `${form.dateOfBirth}T00:00:00Z` : null,
    inspectionDate: form.inspectionDate ? `${form.inspectionDate}T00:00:00Z` : null,
    expiryDate: form.expiryDate ? `${form.expiryDate}T00:00:00Z` : null,
    height: form.height ? Number(form.height) : null,
    weight: form.weight ? Number(form.weight) : null,
    gender: form.gender ? Number(form.gender) : null,
  }
  try {
    if (editingId.value) await api.put(`/report/api/board-drivers/${editingId.value}`, body)
    else await api.post('/report/api/board-drivers', body)
    dialogOpen.value = false
    toast.success('Driver saved')
    await load()
  } catch {
    toast.error('Could not save driver.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!deleting.value) return
  saving.value = true
  try {
    await api.delete(`/report/api/board-drivers/${deleting.value.id}`)
    deleting.value = null
    toast.success('Driver deleted')
    await load()
  } catch {
    toast.error('Could not delete driver.')
  } finally {
    saving.value = false
  }
}

watch([search, companyFilter], () => { page.value = 1 })
onMounted(load)
</script>

<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background">
    <CReportAdminHeader v-model:search="search" title="Drivers" subtitle="Manage Report board drivers." placeholder="Search drivers">
      <Select v-model="companyFilter">
        <SelectTrigger class="w-52" aria-label="Filter by company"><SelectValue placeholder="All companies" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All companies</SelectItem>
          <SelectItem v-for="company in companies" :key="company.id" :value="company.id">{{ company.name }}</SelectItem>
        </SelectContent>
      </Select>
      <Button v-if="canCreate" @click="openForm()"><Plus class="mr-2 h-4 w-4" />Add driver</Button>
    </CReportAdminHeader>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"><div class="min-h-0 flex-1 overflow-auto"><table class="w-full min-w-[800px] text-left text-sm"><thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50"><tr class="h-11"><th class="w-20 px-4 py-3 font-medium">No</th><th class="px-4 py-3 font-medium">Driver</th><th class="px-4 py-3 font-medium">Company</th><th class="px-4 py-3 font-medium">License number</th><th class="px-4 py-3 font-medium">Expiry date</th><th v-if="canEdit || canDelete" class="w-28 px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody><tr v-for="(driver, index) in visible" :key="driver.id" class="h-12 border-t border-border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"><td class="px-4 py-3 text-muted-foreground">{{ (page - 1) * pageSize + index + 1 }}</td><td class="px-4 py-3 font-medium">{{ driver.name }}</td><td class="px-4 py-3">{{ driver.company?.name ?? '—' }}</td><td class="px-4 py-3">{{ driver.licenseNumber || '—' }}</td><td class="px-4 py-3">{{ driver.expiryDate?.slice(0, 10) || '—' }}</td><td v-if="canEdit || canDelete" class="px-4 py-3"><div class="flex justify-end gap-1"><Button v-if="canEdit" size="icon-sm" variant="ghost" title="Edit" aria-label="Edit" @click="openForm(driver)"><Pencil class="h-4 w-4" /></Button><Button v-if="canDelete" size="icon-sm" variant="ghost" title="Delete" aria-label="Delete" @click="deleting = driver"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></td></tr><tr v-if="loading"><td colspan="6" class="px-4 py-12 text-center"><Loader2 class="mx-auto h-5 w-5 animate-spin" /></td></tr><tr v-else-if="error"><td colspan="6" class="px-4 py-12 text-center text-destructive">{{ error }}</td></tr><tr v-else-if="!visible.length"><td colspan="6" class="px-4 py-12 text-center text-muted-foreground">No drivers found.</td></tr></tbody></table></div><div class="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>{{ filtered.length }} drivers</span><div class="flex items-center gap-2"><Button size="sm" variant="outline" :disabled="page <= 1" @click="page--">Previous</Button><span>{{ page }} / {{ pageCount }}</span><Button size="sm" variant="outline" :disabled="page >= pageCount" @click="page++">Next</Button></div></div></div>
    <Dialog v-model:open="dialogOpen"><DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{{ editingId ? 'Edit driver' : 'Add driver' }}</DialogTitle></DialogHeader><form class="grid gap-4" @submit.prevent="save"><div class="grid gap-4 sm:grid-cols-2"><label class="grid gap-1.5 text-sm">Name<Input v-model="form.name" required /></label><label class="grid gap-1.5 text-sm">Company<CReportSearchSelect v-model="form.companyId" :options="companies" placeholder="Select company" /></label><label class="grid gap-1.5 text-sm">License number<Input v-model="form.licenseNumber" /></label><label class="grid gap-1.5 text-sm">License class<Input v-model="form.licenseClass" /></label><label class="grid gap-1.5 text-sm">Date of birth<CReportDateField v-model="form.dateOfBirth" /></label><label class="grid gap-1.5 text-sm">Inspection date<CReportDateField v-model="form.inspectionDate" /></label><label class="grid gap-1.5 text-sm">Expiry date<CReportDateField v-model="form.expiryDate" /></label><label class="grid gap-1.5 text-sm">City<Input v-model="form.city" /></label><label class="grid gap-1.5 text-sm">State<Input v-model="form.state" /></label><label class="grid gap-1.5 text-sm">Zip code<Input v-model="form.zipCode" /></label><label class="grid gap-1.5 text-sm sm:col-span-2">Street<Input v-model="form.street" /></label><label class="grid gap-1.5 text-sm">Endorsement<Input v-model="form.endorsement" /></label><label class="grid gap-1.5 text-sm">Document discriminator<Input v-model="form.documentDiscriminator" /></label><label class="grid gap-1.5 text-sm">Height<Input v-model="form.height" type="number" step="0.01" /></label><label class="grid gap-1.5 text-sm">Weight<Input v-model="form.weight" type="number" step="0.01" /></label><label class="grid gap-1.5 text-sm">Eyes color<Input v-model="form.eyesColor" /></label></div><DialogFooter><Button type="button" variant="outline" @click="dialogOpen = false">Cancel</Button><Button type="submit" :disabled="saving || !form.name.trim() || !form.companyId">{{ saving ? 'Saving…' : 'Save' }}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog :open="!!deleting" @update:open="value => { if (!value) deleting = null }"><DialogContent class="max-w-sm"><DialogHeader><DialogTitle>Delete {{ deleting?.name }}?</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" @click="deleting = null">Cancel</Button><Button variant="destructive" :disabled="saving" @click="remove">Delete</Button></DialogFooter></DialogContent></Dialog>
  </div>
</template>
