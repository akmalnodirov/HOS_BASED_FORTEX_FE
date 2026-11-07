<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import TimePicker from '@/components/custom/time-picker/TimePicker.vue'
import CReportColorField from '@/modules/Report/components/CReportColorField.vue'
import CReportToolbar from '@/modules/Report/components/CReportToolbar.vue'
import { reportMoney } from '@/modules/Report/utils/money'

interface Performance {
  id: string
  name: string
  color: string
  sortOrder: number
}
interface Rate {
  performanceId: string
  userId: string
  dailySalary: number
}
interface Worker {
  userId: string
  userName: string
  firstName: string | null
  lastName: string | null
  roleName: string | null
  levelName: string | null
}
interface Category {
  id: string
  name: string
  color: string
  isActive: boolean
  isDirectory: boolean
  parentId: string | null
  description: string | null
  monthlyBudget: number | null
  perTruck: boolean
}
const api = useApi()
const auth = useAuthStore()
const canEdit = computed(() => hasPermission(auth.token, 'report.owner.settings.edit'))
const loading = ref(false)
const saving = ref(false)
const enabled = ref(true)
const clocksterEnabled = ref(false)
const eachPointValue = ref(0)
const lateGraceMinutes = ref(0)
const morningShiftStart = ref('09:00')
const afternoonShiftStart = ref('14:00')
const nightShiftStart = ref('22:00')
const performances = ref<Performance[]>([])
const rates = ref<Rate[]>([])
const workers = ref<Worker[]>([])
const categories = ref<Category[]>([])
const categoryOpen = ref(false)
const categoryDraft = ref<Category>({
  id: '',
  name: '',
  color: '#0ca593',
  isActive: true,
  isDirectory: false,
  parentId: null,
  description: '',
  monthlyBudget: null,
  perTruck: false,
})
const directories = computed(() => categories.value.filter((item) => item.isDirectory))
const ungrouped = computed(() =>
  categories.value.filter((item) => !item.isDirectory && !item.parentId)
)
function groupIsActive(parentId: string) {
  const items = children(parentId)
  return items.length === 0 || items.some((item) => item.isActive)
}
const categoryGroups = computed(() => [
  ...directories.value.map((item) => ({
    ...item,
    isActive: groupIsActive(item.id),
    legacy: false,
  })),
  ...(ungrouped.value.length
    ? [
        {
          id: '',
          name: 'Ungrouped categories',
          color: '#64748b',
          description: 'Existing categories can be moved into a directory.',
          isActive: groupIsActive(''),
          legacy: true,
        },
      ]
    : []),
])
function children(parentId: string) {
  return parentId
    ? categories.value.filter((item) => !item.isDirectory && item.parentId === parentId)
    : ungrouped.value
}

async function load() {
  loading.value = true
  try {
    const [settingsResponse, performanceResponse, categoryResponse, workerResponse] =
      await Promise.all([
        api.get<{
          successResult: {
            enabled: boolean
            clocksterEnabled: boolean
            eachPointValue: number
            lateGraceMinutes: number
            morningShiftStart: string
            afternoonShiftStart: string
            nightShiftStart: string
          }
        }>('/report/api/owner/settings'),
        api.get<{ successResult: { definitions: Performance[]; rates: Rate[] } }>(
          '/report/api/owner/performances'
        ),
        api.get<{ successResult: Category[] }>('/report/api/owner/expense-categories'),
        api.get<{ successResult: Worker[] }>('/report/api/owner/employees', {
          params: { month: new Date().toISOString().slice(0, 7) + '-01' },
        }),
      ])
    enabled.value = settingsResponse.data.successResult.enabled
    clocksterEnabled.value = settingsResponse.data.successResult.clocksterEnabled
    eachPointValue.value = settingsResponse.data.successResult.eachPointValue
    lateGraceMinutes.value = settingsResponse.data.successResult.lateGraceMinutes
    morningShiftStart.value = settingsResponse.data.successResult.morningShiftStart
    afternoonShiftStart.value = settingsResponse.data.successResult.afternoonShiftStart
    nightShiftStart.value = settingsResponse.data.successResult.nightShiftStart
    performances.value = performanceResponse.data.successResult.definitions
    rates.value = performanceResponse.data.successResult.rates
    workers.value = workerResponse.data.successResult
    categories.value = categoryResponse.data.successResult
  } catch {
    toast.error('Could not load Owner settings.')
  } finally {
    loading.value = false
  }
}

function addPerformance() {
  performances.value.push({
    id: crypto.randomUUID(),
    name: '',
    color: '#16a34a',
    sortOrder: performances.value.length,
  })
}

function removePerformance(id: string) {
  performances.value = performances.value.filter((item) => item.id !== id)
  rates.value = rates.value.filter((item) => item.performanceId !== id)
}

function rateValue(performanceId: string, userId: string) {
  return (
    rates.value.find((item) => item.performanceId === performanceId && item.userId === userId)
      ?.dailySalary ?? ''
  )
}

function setRate(performanceId: string, userId: string, value: string | number) {
  rates.value = rates.value.filter(
    (item) => item.performanceId !== performanceId || item.userId !== userId
  )
  if (value !== '' && Number.isFinite(Number(value)))
    rates.value.push({ performanceId, userId, dailySalary: Number(value) })
}

function workerName(worker: Worker) {
  return [worker.firstName, worker.lastName].filter(Boolean).join(' ') || worker.userName
}

function openCategory(isDirectory: boolean, parentId: string | null = null, item?: Category) {
  categoryDraft.value = item
    ? { ...item }
    : {
        id: crypto.randomUUID(),
        name: '',
        color: '#0ca593',
        isActive: true,
        isDirectory,
        parentId,
        description: '',
        monthlyBudget: null,
        perTruck: false,
      }
  categoryOpen.value = true
}

function saveCategoryDraft() {
  if (!categoryDraft.value.name.trim()) return
  categoryDraft.value.name = categoryDraft.value.name.trim()
  const index = categories.value.findIndex((item) => item.id === categoryDraft.value.id)
  if (index >= 0) categories.value[index] = { ...categoryDraft.value }
  else categories.value.push({ ...categoryDraft.value })
  categoryOpen.value = false
}

function deactivateCategory(item: Category) {
  item.isActive = false
}

async function save() {
  saving.value = true
  try {
    await api.put('/report/api/owner/settings', {
      enabled: enabled.value,
      clocksterEnabled: clocksterEnabled.value,
      eachPointValue: Number(eachPointValue.value),
      lateGraceMinutes: Number(lateGraceMinutes.value),
      morningShiftStart: morningShiftStart.value,
      afternoonShiftStart: afternoonShiftStart.value,
      nightShiftStart: nightShiftStart.value,
    })
    await api.put('/report/api/owner/performances', {
      definitions: performances.value,
      rates: rates.value,
    })
    await api.put('/report/api/owner/expense-categories', categories.value)
    toast.success('Owner settings saved.')
    window.dispatchEvent(new Event('report-features-updated'))
    await load()
  } catch {
    toast.error('Could not save Owner settings. Check names and existing assignments.')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      title="Owner settings"
      subtitle="KPI, performances and expense directories"
      :show-filters="false"
    >
      <template #actions
        ><Button v-if="canEdit" :disabled="saving || loading" @click="save"
          ><Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />Save settings</Button
        ></template
      >
    </CReportToolbar>
    <div class="min-h-0 flex-1 space-y-5 overflow-auto p-4 sm:p-6">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading settings…
      </div>
      <section class="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div>
          <h2 class="text-sm font-semibold">KPI calculation and shifts</h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Shared with Board attendance and salary calculations.
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label class="grid gap-1 text-xs"
            >Value per point ($)<Input
              v-model.number="eachPointValue"
              type="number"
              min="0"
              step="0.01"
              :disabled="!canEdit"
          /></label>
          <label class="grid gap-1 text-xs"
            >Late grace (minutes)<Input
              v-model.number="lateGraceMinutes"
              type="number"
              min="0"
              :disabled="!canEdit"
          /></label>
          <label class="grid gap-1 text-xs"
            >Morning shift start<TimePicker v-model="morningShiftStart" :disabled="!canEdit"
          /></label>
          <label class="grid gap-1 text-xs"
            >Afternoon shift start<TimePicker v-model="afternoonShiftStart" :disabled="!canEdit"
          /></label>
          <label class="grid gap-1 text-xs"
            >Night shift start<TimePicker v-model="nightShiftStart" :disabled="!canEdit"
          /></label>
        </div>
      </section>
      <section class="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold">Performances</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Define performance levels and their colors.
            </p>
          </div>
          <Button v-if="canEdit" variant="outline" @click="addPerformance"
            ><Plus class="mr-2 h-4 w-4" />Add performance</Button
          >
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="performance in performances"
            :key="performance.id"
            class="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3"
          >
            <CReportColorField
              v-model="performance.color"
              :disabled="!canEdit"
              label="Performance color"
            />
            <Input v-model="performance.name" placeholder="Good, Bad…" :disabled="!canEdit" />
            <Button
              v-if="canEdit"
              variant="ghost"
              size="icon-sm"
              title="Remove performance"
              @click="removePerformance(performance.id)"
              ><Trash2 class="h-4 w-4 text-destructive"
            /></Button>
          </div>
        </div>
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="bg-muted text-muted-foreground">
              <tr>
                <th class="px-3 py-2 font-medium">Worker</th>
                <th class="px-3 py-2 font-medium">Role</th>
                <th class="px-3 py-2 font-medium">Level</th>
                <th
                  v-for="performance in performances"
                  :key="performance.id"
                  class="px-3 py-2 font-medium"
                >
                  <span
                    class="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: performance.color }"
                  />{{ performance.name || 'New performance' }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="worker in workers" :key="worker.userId" class="border-t border-border">
                <th class="px-3 py-2 font-medium">{{ workerName(worker) }}</th>
                <td class="px-3 py-2">{{ worker.roleName || '—' }}</td>
                <td class="px-3 py-2">{{ worker.levelName || '—' }}</td>
                <td v-for="performance in performances" :key="performance.id" class="px-3 py-2">
                  <Input
                    :model-value="rateValue(performance.id, worker.userId)"
                    type="number"
                    min="0"
                    step="0.01"
                    class="h-8 w-28"
                    :disabled="!canEdit"
                    @update:model-value="(value) => setRate(performance.id, worker.userId, value)"
                  />
                </td>
              </tr>
              <tr v-if="!workers.length">
                <td
                  :colspan="3 + performances.length"
                  class="px-3 py-8 text-center text-muted-foreground"
                >
                  No workers available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-muted-foreground">
          Values are each worker's daily salary in dollars. Empty cells use the existing daily rate.
        </p>
      </section>
      <section class="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold">Directories &amp; categories</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Group expense subcategories as in DashCam. Monthly budgets are shown alongside the
              actual monthly amounts.
            </p>
          </div>
          <Button v-if="canEdit" size="sm" @click="openCategory(true)"
            ><Plus class="mr-2 h-4 w-4" />Add directory</Button
          >
        </div>
        <div
          v-for="group in categoryGroups"
          :key="group.id || 'ungrouped'"
          class="space-y-3 rounded-lg border border-border p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: group.color }" />
                <strong class="text-sm uppercase">{{ group.name }}</strong>
                <span
                  v-if="!group.isActive"
                  class="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >Inactive</span
                >
              </div>
              <p v-if="group.description" class="mt-1 text-xs text-muted-foreground">
                {{ group.description }}
              </p>
            </div>
            <div v-if="canEdit" class="flex items-center gap-1">
              <Button size="sm" variant="outline" @click="openCategory(false, group.id || null)"
                ><Plus class="mr-1 h-4 w-4" />Subcategory</Button
              >
              <Button
                v-if="!group.legacy"
                size="icon-sm"
                variant="ghost"
                title="Edit directory"
                @click="
                  openCategory(
                    true,
                    null,
                    categories.find((item) => item.id === group.id)
                  )
                "
                ><Pencil class="h-4 w-4"
              /></Button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table v-if="children(group.id).length" class="w-full min-w-[600px] text-left text-sm">
              <thead class="border-b border-border text-muted-foreground">
                <tr>
                  <th class="py-2 pr-3 font-medium">Subcategory</th>
                  <th class="py-2 pr-3 font-medium">Description</th>
                  <th class="py-2 pr-3 font-medium">Monthly budget</th>
                  <th class="py-2 pr-3 font-medium">Per Truck</th>
                  <th class="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="category in children(group.id)"
                  :key="category.id"
                  class="border-b border-border/60 last:border-b-0"
                >
                  <td class="py-2 pr-3">
                    <span class="inline-flex items-center gap-2"
                      ><span
                        class="h-2.5 w-2.5 rounded-full"
                        :style="{ backgroundColor: category.color }"
                      />{{ category.name
                      }}<span v-if="!category.isActive" class="text-xs text-muted-foreground"
                        >Inactive</span
                      ></span
                    >
                  </td>
                  <td class="py-2 pr-3">{{ category.description || '—' }}</td>
                  <td class="py-2 pr-3">
                    {{ category.monthlyBudget == null ? '—' : reportMoney(category.monthlyBudget) }}
                  </td>
                  <td class="py-2 pr-3">{{ category.perTruck ? 'Yes' : 'No' }}</td>
                  <td class="whitespace-nowrap py-2 text-right">
                    <Button
                      v-if="canEdit"
                      size="icon-sm"
                      variant="ghost"
                      title="Edit subcategory"
                      @click="openCategory(false, category.parentId, category)"
                      ><Pencil class="h-4 w-4"
                    /></Button>
                    <Button
                      v-if="canEdit && category.isActive"
                      size="icon-sm"
                      variant="ghost"
                      title="Deactivate subcategory"
                      @click="deactivateCategory(category)"
                      ><Trash2 class="h-4 w-4 text-destructive"
                    /></Button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-xs text-muted-foreground">No subcategories yet.</p>
          </div>
        </div>
        <p v-if="!categoryGroups.length" class="text-sm text-muted-foreground">
          Add a directory to organize expense categories.
        </p>
      </section>
    </div>
    <Dialog v-model:open="categoryOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>{{
            categoryDraft.isDirectory ? 'Expense directory' : 'Expense subcategory'
          }}</DialogTitle>
          <p class="text-sm text-muted-foreground">
            {{
              categoryDraft.isDirectory
                ? 'Organize related expense categories.'
                : 'Set up a monthly expense category.'
            }}
          </p>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="saveCategoryDraft">
          <div class="space-y-4">
            <label class="grid gap-1.5 text-sm font-medium">
              Name
              <Input v-model="categoryDraft.name" class="h-10" required />
            </label>
            <label v-if="!categoryDraft.isDirectory" class="grid gap-1.5 text-sm font-medium">
              Directory
              <Select
                :model-value="categoryDraft.parentId ?? 'none'"
                @update:model-value="
                  (value) => (categoryDraft.parentId = value === 'none' ? null : String(value))
                "
              >
                <SelectTrigger class="h-10"
                  ><SelectValue placeholder="Select directory"
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ungrouped</SelectItem>
                  <SelectItem
                    v-for="directory in directories"
                    :key="directory.id"
                    :value="directory.id"
                  >
                    {{ directory.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label class="grid gap-1.5 text-sm font-medium">
              <span class="flex items-center gap-2"
                >Description
                <span class="text-xs font-normal text-muted-foreground">Optional</span></span
              >
              <Input
                :model-value="categoryDraft.description ?? ''"
                class="h-10"
                @update:model-value="(value) => (categoryDraft.description = String(value))"
              />
            </label>
            <div class="grid gap-4" :class="!categoryDraft.isDirectory && 'sm:grid-cols-2'">
              <label v-if="!categoryDraft.isDirectory" class="grid gap-1.5 text-sm font-medium">
                <span class="flex items-center gap-2"
                  >Monthly budget
                  <span class="text-xs font-normal text-muted-foreground">Optional</span></span
                >
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >$</span
                  >
                  <Input
                    :model-value="categoryDraft.monthlyBudget ?? ''"
                    type="number"
                    min="0"
                    step="0.01"
                    class="h-10 pl-7"
                    @update:model-value="
                      (value) => (categoryDraft.monthlyBudget = value === '' ? null : Number(value))
                    "
                  />
                </div>
              </label>
              <div class="grid gap-1.5 text-sm font-medium">
                Color
                <div class="flex h-10 items-center gap-2">
                  <CReportColorField v-model="categoryDraft.color" label="Category color" />
                  <span class="text-xs text-muted-foreground">{{ categoryDraft.color }}</span>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="!categoryDraft.isDirectory"
            class="divide-y divide-border rounded-lg border border-border bg-muted/20 px-3"
          >
            <div class="flex items-center justify-between gap-4 py-3">
              <div>
                <p class="text-sm font-medium">Per Truck</p>
                <p class="text-xs text-muted-foreground">
                  Require a truck count for monthly entries.
                </p>
              </div>
              <Switch v-model="categoryDraft.perTruck" aria-label="Per Truck" />
            </div>
            <div class="flex items-center justify-between gap-4 py-3">
              <div>
                <p class="text-sm font-medium">Active</p>
                <p class="text-xs text-muted-foreground">Available when adding an expense.</p>
              </div>
              <Switch v-model="categoryDraft.isActive" aria-label="Active" />
            </div>
          </div>
          <DialogFooter class="border-t border-border pt-4">
            <Button type="button" variant="outline" @click="categoryOpen = false">Cancel</Button>
            <Button type="submit" :disabled="!categoryDraft.name.trim()">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
