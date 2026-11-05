<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { FileDown, Pencil, Plus, Trash2 } from 'lucide-vue-next'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import CReportDateField from '@/modules/Report/components/CReportDateField.vue'
import { reportMoney } from '@/modules/Report/utils/money'
import CReportAdminHeader from '@/modules/Report/components/CReportAdminHeader.vue'

interface Contract {
  id: string
  name: string
  trucksCount: number
  price: number
  periodMonths: number
  signedDate: string | null
  startDate: string | null
  endDate: string | null
  withDashCam: boolean
  plan: string | null
  fileUrl: string | null
}
const api = useApi()
const auth = useAuthStore()
const canCreate = computed(() => hasPermission(auth.token, 'report.contracts.create'))
const canEdit = computed(() => hasPermission(auth.token, 'report.contracts.edit'))
const canDelete = computed(() => hasPermission(auth.token, 'report.contracts.delete'))
const rows = ref<Contract[]>([])
const search = ref('')
const loading = ref(false)
const saving = ref(false)
const dialogOpen = ref(false)
const editing = ref<Contract | null>(null)
const removing = ref<Contract | null>(null)
const name = ref('')
const trucksCount = ref(0)
const price = ref(0)
const periodMonths = ref(0)
const signedDate = ref('')
const withDashCam = ref(false)
const plan = ref('')
const file = ref<File | null>(null)
const filtered = computed(() =>
  rows.value.filter((item) => item.name.toLowerCase().includes(search.value.trim().toLowerCase()))
)

async function load() {
  loading.value = true
  try {
    const response = await api.get<{ successResult: Contract[] }>('/report/api/contracts')
    rows.value = response.data.successResult ?? []
  } catch {
    toast.error('Could not load contracts.')
  } finally {
    loading.value = false
  }
}

function openEditor(item: Contract | null = null) {
  editing.value = item
  name.value = item?.name ?? ''
  trucksCount.value = item?.trucksCount ?? 0
  price.value = item?.price ?? 0
  periodMonths.value = item?.periodMonths ?? 0
  signedDate.value = item?.signedDate?.slice(0, 10) ?? ''
  withDashCam.value = item?.withDashCam ?? false
  plan.value = item?.plan ?? ''
  file.value = null
  dialogOpen.value = true
}

async function save() {
  if (!name.value.trim()) return
  saving.value = true
  try {
    const body = new FormData()
    body.append('Name', name.value.trim())
    body.append('TrucksCount', String(trucksCount.value))
    body.append('Price', String(price.value))
    body.append('PeriodMonths', String(periodMonths.value))
    body.append('WithDashCam', String(withDashCam.value))
    body.append('Plan', plan.value)
    if (signedDate.value) body.append('SignedDate', `${signedDate.value}T00:00:00Z`)
    if (file.value) body.append('file', file.value)
    if (editing.value) await api.put(`/report/api/contracts/${editing.value.id}`, body)
    else await api.post('/report/api/contracts', body)
    dialogOpen.value = false
    toast.success('Contract saved.')
    await load()
  } catch {
    toast.error('Could not save the contract.')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!removing.value) return
  saving.value = true
  try {
    await api.delete(`/report/api/contracts/${removing.value.id}`)
    removing.value = null
    toast.success('Contract deleted.')
    await load()
  } catch {
    toast.error('Could not delete the contract.')
  } finally {
    saving.value = false
  }
}

async function download(item: Contract) {
  try {
    const response = await api.get<Blob>(`/report/api/contracts/${item.id}/file`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${item.name}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Could not download the contract file.')
  }
}

onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <CReportAdminHeader
      v-model:search="search"
      title="Contracts"
      subtitle="Manage Report contracts."
      placeholder="Search contracts"
      ><Button v-if="canCreate" @click="openEditor()"
        ><Plus class="mr-2 h-4 w-4" />Add contract</Button
      ></CReportAdminHeader
    >
    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full min-w-[850px] text-left text-sm">
          <thead class="sticky top-0 z-20 bg-[#f0f0f0] text-muted-foreground dark:bg-muted/50">
            <tr class="h-11">
              <th class="px-4 font-medium">No</th>
              <th class="px-4 font-medium">Name</th>
              <th class="px-4 font-medium">Trucks</th>
              <th class="px-4 font-medium">Price</th>
              <th class="px-4 font-medium">Period</th>
              <th class="px-4 font-medium">Signed</th>
              <th class="px-4 font-medium">DashCam</th>
              <th class="px-4 font-medium">File</th>
              <th v-if="canEdit || canDelete" class="px-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in filtered"
              :key="item.id"
              class="h-12 border-t border-border"
            >
              <td class="px-4 text-muted-foreground">{{ index + 1 }}</td>
              <td class="px-4 font-medium">{{ item.name }}</td>
              <td class="px-4">{{ item.trucksCount }}</td>
              <td class="px-4">{{ reportMoney(item.price) }}</td>
              <td class="px-4">{{ item.periodMonths }} months</td>
              <td class="px-4">{{ item.signedDate?.slice(0, 10) || '—' }}</td>
              <td class="px-4">{{ item.withDashCam ? 'Yes' : 'No' }}</td>
              <td class="px-4">
                <Button
                  v-if="item.fileUrl"
                  size="icon-sm"
                  variant="ghost"
                  title="Download"
                  @click="download(item)"
                  ><FileDown class="h-4 w-4" /></Button
                ><span v-else>—</span>
              </td>
              <td v-if="canEdit || canDelete" class="px-4">
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="canEdit"
                    size="icon-sm"
                    variant="ghost"
                    title="Edit"
                    @click="openEditor(item)"
                    ><Pencil class="h-4 w-4" /></Button
                  ><Button
                    v-if="canDelete"
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
                :colspan="canEdit || canDelete ? 9 : 8"
                class="px-4 py-12 text-center text-muted-foreground"
              >
                {{ loading ? 'Loading…' : 'No contracts found.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {{ filtered.length }} contracts
      </div>
    </div>
    <Dialog v-model:open="dialogOpen"
      ><DialogContent class="max-w-lg"
        ><DialogHeader
          ><DialogTitle>{{ editing ? 'Edit contract' : 'Add contract' }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-3" @submit.prevent="save">
          <label class="grid gap-1 text-sm">Name<Input v-model="name" required /></label>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm"
              >Trucks<Input v-model.number="trucksCount" type="number" min="0" /></label
            ><label class="grid gap-1 text-sm"
              >Price ($)<Input v-model.number="price" type="number" min="0" step="0.01" /></label
            ><label class="grid gap-1 text-sm"
              >Period (months)<Input v-model.number="periodMonths" type="number" min="0" /></label
            ><label class="grid gap-1 text-sm"
              >Signed date<CReportDateField v-model="signedDate"
            /></label>
          </div>
          <label class="flex items-center gap-2 text-sm"
            ><Switch v-model="withDashCam" />With DashCam</label
          ><label class="grid gap-1 text-sm"
            >Plan<Select v-model="plan"
              ><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger
              ><SelectContent
                ><SelectItem value="LITE">LITE</SelectItem
                ><SelectItem value="STANDARD">STANDARD</SelectItem
                ><SelectItem value="BUSINESS/PREMIUM">BUSINESS/PREMIUM</SelectItem
                ><SelectItem value="VIP">VIP</SelectItem></SelectContent
              ></Select
            ></label
          ><label class="grid gap-1 text-sm"
            >PDF file<Input
              type="file"
              accept="application/pdf"
              @change="
                (event) => (file = (event.target as HTMLInputElement).files?.[0] ?? null)
              " /></label
          ><DialogFooter
            ><Button type="button" variant="outline" @click="dialogOpen = false">Cancel</Button
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
          ><Button variant="destructive" :disabled="saving" @click="remove"
            >Delete</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
