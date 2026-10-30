<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useAxiosService'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'

interface CatalogItem { id: string; name: string; code?: number; createdDate?: string; updatedDate?: string }
interface ApiResult<T> { successResult: T }
const levels = ['Trainee', 'Junior', 'Middle', 'Senior', 'Lead']
const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const kind = computed(() => route.path.endsWith('/levels') ? 'levels' : 'companies')
const title = computed(() => kind.value === 'levels' ? 'Levels' : 'Companies')
const entityLabel = computed(() => kind.value === 'levels' ? 'level' : 'company')
const endpoint = computed(() => `/report/api/${kind.value === 'levels' ? 'levels' : 'board-companies'}`)
const canCreate = computed(() => hasPermission(auth.token, `report.${kind.value}.create`))
const canEdit = computed(() => hasPermission(auth.token, `report.${kind.value}.edit`))
const canDelete = computed(() => hasPermission(auth.token, `report.${kind.value}.delete`))
const rows = ref<CatalogItem[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const page = ref(1)
const pageSize = 20
const dialogOpen = ref(false)
const editing = ref<CatalogItem | null>(null)
const deleting = ref<CatalogItem | null>(null)
const formName = ref('')
const formCode = ref('0')
const filtered = computed(() => rows.value.filter(item => item.name.toLowerCase().includes(search.value.trim().toLowerCase())))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visibleRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get<ApiResult<CatalogItem[]>>(endpoint.value)
    rows.value = response.data.successResult ?? []
  } catch {
    error.value = `Could not load ${title.value.toLowerCase()}.`
  } finally {
    loading.value = false
  }
}

function openForm(item: CatalogItem | null = null) {
  editing.value = item
  formName.value = item?.name ?? ''
  formCode.value = String(item?.code ?? 0)
  dialogOpen.value = true
}

async function save() {
  if (!formName.value.trim()) return
  saving.value = true
  try {
    const body = kind.value === 'levels'
      ? { name: formName.value.trim(), code: Number(formCode.value) }
      : { name: formName.value.trim() }
    if (editing.value) await api.put(`${endpoint.value}/${editing.value.id}`, body)
    else await api.post(endpoint.value, body)
    dialogOpen.value = false
    toast.success(`${entityLabel.value} saved`)
    await load()
  } catch {
    toast.error(`Could not save ${title.value.toLowerCase()}.`)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!deleting.value) return
  saving.value = true
  try {
    await api.delete(`${endpoint.value}/${deleting.value.id}`)
    deleting.value = null
    toast.success('Deleted')
    await load()
  } catch {
    toast.error('Could not delete this item.')
  } finally {
    saving.value = false
  }
}

watch(kind, () => { rows.value = []; page.value = 1; void load() })
watch(search, () => { page.value = 1 })
onMounted(load)
</script>

<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background">
    <CReportAdminHeader v-model:search="search" :title="title" :subtitle="kind === 'levels' ? 'Manage Report user levels.' : 'Manage Report board companies.'" :placeholder="`Search ${title.toLowerCase()}`">
      <Button v-if="canCreate" @click="openForm()"><Plus class="mr-2 h-4 w-4" />Add {{ entityLabel }}</Button>
    </CReportAdminHeader>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full min-w-[680px] text-left text-sm"><thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50"><tr class="h-11"><th class="w-20 px-4 py-3 font-medium">No</th><th class="px-4 py-3 font-medium">Name</th><th v-if="kind === 'levels'" class="w-48 px-4 py-3 font-medium">Code</th><th v-if="kind === 'companies'" class="w-48 px-4 py-3 font-medium">Created</th><th v-if="canEdit || canDelete" class="w-28 px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody><tr v-for="(item, index) in visibleRows" :key="item.id" class="h-12 border-t border-border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"><td class="px-4 py-2 text-muted-foreground">{{ (page - 1) * pageSize + index + 1 }}</td><td class="px-4 py-2 font-medium">{{ item.name }}</td><td v-if="kind === 'levels'" class="px-4 py-2">{{ levels[item.code ?? 0] ?? '—' }}</td><td v-if="kind === 'companies'" class="px-4 py-2 text-muted-foreground">{{ item.createdDate ? new Date(item.createdDate).toLocaleDateString() : '—' }}</td><td v-if="canEdit || canDelete" class="px-4 py-2"><div class="flex justify-end gap-1"><Button v-if="canEdit" size="icon-sm" variant="ghost" title="Edit" aria-label="Edit" @click="openForm(item)"><Pencil class="h-4 w-4 text-muted-foreground" /></Button><Button v-if="canDelete" size="icon-sm" variant="ghost" title="Delete" aria-label="Delete" @click="deleting = item"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></td></tr>
              <tr v-if="loading"><td :colspan="kind === 'levels' ? 4 : 4" class="px-4 py-12 text-center"><Loader2 class="mx-auto h-5 w-5 animate-spin" /></td></tr><tr v-else-if="error"><td colspan="4" class="px-4 py-12 text-center text-destructive">{{ error }}</td></tr><tr v-else-if="!visibleRows.length"><td colspan="4" class="px-4 py-12 text-center text-muted-foreground">No {{ title.toLowerCase() }} found.</td></tr></tbody></table>
        </div>
        <div class="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>{{ filtered.length }} {{ title.toLowerCase() }}</span><div class="flex items-center gap-2"><Button size="sm" variant="outline" :disabled="page <= 1" @click="page--">Previous</Button><span>{{ page }} / {{ pageCount }}</span><Button size="sm" variant="outline" :disabled="page >= pageCount" @click="page++">Next</Button></div></div>
      </div>
    <Dialog v-model:open="dialogOpen"><DialogContent class="max-w-md"><DialogHeader><DialogTitle>{{ editing ? 'Edit' : 'Add' }} {{ entityLabel }}</DialogTitle></DialogHeader><form class="grid gap-4" @submit.prevent="save"><label class="grid gap-1.5 text-sm">Name<Input v-model="formName" required maxlength="200" /></label><label v-if="kind === 'levels'" class="grid gap-1.5 text-sm">Code<Select v-model="formCode"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem v-for="(level, index) in levels" :key="level" :value="String(index)">{{ level }}</SelectItem></SelectContent></Select></label><DialogFooter><Button type="button" variant="outline" @click="dialogOpen = false">Cancel</Button><Button type="submit" :disabled="saving || !formName.trim()">{{ saving ? 'Saving…' : 'Save' }}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog :open="!!deleting" @update:open="value => { if (!value) deleting = null }"><DialogContent class="max-w-sm"><DialogHeader><DialogTitle>Delete {{ deleting?.name }}?</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" @click="deleting = null">Cancel</Button><Button variant="destructive" :disabled="saving" @click="remove">Delete</Button></DialogFooter></DialogContent></Dialog>
  </div>
</template>
