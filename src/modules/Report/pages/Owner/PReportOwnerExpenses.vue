<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronDown, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
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
import { reportMoney } from '@/modules/Report/utils/money'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(value: string) {
  const [year, month] = value.slice(0, 7).split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
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
interface Entry {
  id: string
  categoryId: string
  categoryName: string
  categoryColor: string
  amount: number
  spentAt: string
  vendor: string | null
  description: string | null
  truckCount: number | null
  perTruck: boolean
}
interface SalaryEntry {
  userId: string
  workerName: string
  amount: number
}
interface ExpenseData {
  entries: Entry[]
  salaryEntries: SalaryEntry[]
  salaryTotal: number
  total: number
  totalTrucks: number
  perTruck: number
}
const api = useApi()
const auth = useAuthStore()
const canCreate = computed(() => hasPermission(auth.token, 'report.owner.expenses.create'))
const canEdit = computed(() => hasPermission(auth.token, 'report.owner.expenses.edit'))
const canDelete = computed(() => hasPermission(auth.token, 'report.owner.expenses.delete'))
const month = ref(currentMonth())
const categories = ref<Category[]>([])
const data = ref<ExpenseData>({
  entries: [],
  salaryEntries: [],
  salaryTotal: 0,
  total: 0,
  totalTrucks: 0,
  perTruck: 0,
})
const search = ref('')
const selectedCategoryId = ref('')
const expandedDirectories = ref<string[]>([])
const initializedDirectories = ref(false)
const loading = ref(false)
const saving = ref(false)
const editor = ref(false)
const editingId = ref<string | null>(null)
const form = ref({
  directoryId: 'none',
  categoryId: '',
  amount: 0,
  expenseMonth: currentMonth(),
  vendor: '',
  description: '',
  truckCount: '',
})
const selectedEntryCategory = computed(() =>
  categories.value.find((item) => item.id === form.value.categoryId)
)
const filtered = computed(() =>
  data.value.entries.filter(
    (item) =>
      (!selectedCategoryId.value || item.categoryId === selectedCategoryId.value) &&
      `${item.categoryName} ${item.vendor ?? ''} ${item.description ?? ''}`
        .toLowerCase()
        .includes(search.value.toLowerCase())
  )
)
const activeCategories = computed(() =>
  categories.value.filter((item) => item.isActive && !item.isDirectory)
)
const hasActiveUngrouped = computed(() => activeCategories.value.some((item) => !item.parentId))
const activeDirectories = computed(() =>
  categories.value.filter(
    (item) =>
      item.isActive &&
      item.isDirectory &&
      activeCategories.value.some((category) => category.parentId === item.id)
  )
)
const hasAvailableCategory = computed(
  () => hasActiveUngrouped.value || activeDirectories.value.length > 0
)
const selectableCategories = computed(() =>
  activeCategories.value.filter((item) => (item.parentId ?? 'none') === form.value.directoryId)
)
const duplicateInView = computed(
  () =>
    form.value.expenseMonth === month.value &&
    data.value.entries.some(
      (item) => item.categoryId === form.value.categoryId && item.id !== editingId.value
    )
)
const categoryGroups = computed(() => {
  const directories = categories.value.filter((item) => item.isDirectory && item.isActive)
  const groups = directories.map((directory) => ({
    ...directory,
    children: activeCategories.value.filter((item) => item.parentId === directory.id),
  }))
  const ungrouped = activeCategories.value.filter(
    (item) => !item.parentId || !directories.some((directory) => directory.id === item.parentId)
  )
  if (ungrouped.length)
    groups.push({
      id: 'ungrouped',
      name: 'Other expenses',
      color: '#64748b',
      isActive: true,
      isDirectory: true,
      parentId: null,
      description: null,
      monthlyBudget: null,
      perTruck: false,
      children: ungrouped,
    })
  if (data.value.salaryEntries.length)
    groups.unshift({
      id: 'salary',
      name: 'Salary',
      color: '#64748b',
      isActive: true,
      isDirectory: true,
      parentId: null,
      description: null,
      monthlyBudget: null,
      perTruck: false,
      children: data.value.salaryEntries.map((item) => ({
        id: `salary:${item.userId}`,
        name: item.workerName,
        color: '#64748b',
        isActive: true,
        isDirectory: false,
        parentId: 'salary',
        description: null,
        monthlyBudget: null,
        perTruck: false,
        isSystem: true,
      })),
    })
  return groups
})
function categoryAmount(categoryId: string) {
  if (categoryId.startsWith('salary:'))
    return (
      data.value.salaryEntries.find((item) => `salary:${item.userId}` === categoryId)?.amount ?? 0
    )
  return data.value.entries
    .filter((item) => item.categoryId === categoryId)
    .reduce((sum, item) => sum + item.amount, 0)
}
function categoryTruckCount(categoryId: string) {
  return data.value.entries.find((item) => item.categoryId === categoryId)?.truckCount ?? 0
}
function toggleDirectory(id: string) {
  expandedDirectories.value = expandedDirectories.value.includes(id)
    ? expandedDirectories.value.filter((value) => value !== id)
    : [...expandedDirectories.value, id]
}
async function load() {
  loading.value = true
  try {
    const [expenseResponse, categoryResponse] = await Promise.all([
      api.get<{ successResult: ExpenseData }>('/report/api/owner/expenses', {
        params: { month: `${month.value}-01` },
      }),
      api.get<{ successResult: Category[] }>('/report/api/owner/expense-categories'),
    ])
    data.value = expenseResponse.data.successResult
    categories.value = categoryResponse.data.successResult
    if (!initializedDirectories.value) {
      expandedDirectories.value = categoryGroups.value.map((group) => group.id)
      initializedDirectories.value = true
    }
  } catch {
    toast.error('Could not load expenses.')
  } finally {
    loading.value = false
  }
}

function openEditor(item?: Entry) {
  editingId.value = item?.id ?? null
  form.value = {
    directoryId: item
      ? (categories.value.find((category) => category.id === item.categoryId)?.parentId ?? 'none')
      : hasActiveUngrouped.value
        ? 'none'
        : (activeDirectories.value[0]?.id ?? ''),
    categoryId: item?.categoryId ?? '',
    amount: item?.amount ?? 0,
    expenseMonth: item?.spentAt.slice(0, 7) ?? currentMonth(),
    vendor: item?.vendor ?? '',
    description: item?.description ?? '',
    truckCount: item?.truckCount == null ? '' : String(item.truckCount),
  }
  editor.value = true
}

function openCategoryEditor(category: Category) {
  const entry = data.value.entries.find((item) => item.categoryId === category.id)
  openEditor(entry)
  form.value.directoryId = category.parentId ?? 'none'
  form.value.categoryId = category.id
  if (!entry) form.value.expenseMonth = month.value
}

async function saveEntry() {
  if (
    !form.value.categoryId ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.value.expenseMonth) ||
    duplicateInView.value ||
    (selectedEntryCategory.value?.perTruck &&
      (!form.value.truckCount || Number(form.value.truckCount) <= 0)) ||
    form.value.amount < 0
  )
    return
  saving.value = true
  try {
    const body = {
      categoryId: form.value.categoryId,
      amount: form.value.amount,
      spentAt: `${form.value.expenseMonth}-01T00:00:00Z`,
      vendor: form.value.vendor,
      description: form.value.description,
      truckCount: selectedEntryCategory.value?.perTruck ? Number(form.value.truckCount) : null,
    }
    if (editingId.value) await api.put(`/report/api/owner/expenses/${editingId.value}`, body)
    else await api.post('/report/api/owner/expenses', body)
    editor.value = false
    if (month.value === form.value.expenseMonth) await load()
    else month.value = form.value.expenseMonth
    toast.success('Expense saved.')
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    toast.error(
      status === 409
        ? 'Only one expense is allowed per category and month. Edit the existing entry.'
        : 'Could not save expense.'
    )
  } finally {
    saving.value = false
  }
}

async function deleteEntry(item: Entry) {
  if (!confirm(`Delete ${item.categoryName} expense?`)) return
  try {
    await api.delete(`/report/api/owner/expenses/${item.id}`)
    await load()
    toast.success('Expense deleted.')
  } catch {
    toast.error('Could not delete expense.')
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <div
    class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white dark:bg-background"
  >
    <CReportToolbar
      title="Expenses"
      subtitle="Operating expenses and monthly category amounts"
      :show-filters="false"
      ><template #actions
        ><div class="relative">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          /><Input v-model="search" class="w-56 pl-9" placeholder="Search expenses" />
        </div>
        <CReportMonthField v-model="month" /><Button
          v-if="canCreate && hasAvailableCategory"
          @click="openEditor()"
          ><Plus class="mr-2 h-4 w-4" />Add entry</Button
        ></template
      ></CReportToolbar
    >
    <div class="min-h-0 flex-1 space-y-5 overflow-auto p-4 sm:p-6">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />Loading expenses…
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="card in [
            { label: 'Total expenses', value: reportMoney(data.total), color: 'text-red-600' },
            { label: 'Total Number of Trucks', value: data.totalTrucks, color: 'text-foreground' },
            {
              label: 'Expense per truck',
              value: reportMoney(data.perTruck),
              color: 'text-amber-600',
            },
          ]"
          :key="card.label"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="text-xs text-muted-foreground">{{ card.label }}</div>
          <strong class="mt-2 block text-2xl" :class="card.color">{{ card.value }}</strong>
        </div>
      </div>
      <section class="overflow-hidden rounded-xl border border-border bg-card">
        <div class="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 class="text-sm font-semibold">Monthly expense categories</h2>
          </div>
          <strong class="text-sm">Monthly total {{ reportMoney(data.total) }}</strong>
        </div>
        <div class="space-y-3 p-4">
          <div
            v-for="group in categoryGroups"
            :key="group.id"
            class="overflow-hidden rounded-xl border border-border bg-card"
          >
            <button
              type="button"
              class="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40"
              @click="toggleDirectory(group.id)"
            >
              <span class="flex items-center gap-2"
                ><ChevronDown
                  class="h-4 w-4 text-muted-foreground transition-transform"
                  :class="expandedDirectories.includes(group.id) && 'rotate-180'"
                /><span
                  class="h-3 w-3 rounded-full"
                  :style="{ backgroundColor: group.color }"
                /><strong class="text-sm uppercase">{{ group.name }}</strong
                ><span class="text-xs text-muted-foreground"
                  >{{ group.children.length }} subcategories</span
                ></span
              >
              <strong class="text-sm text-red-600">{{
                reportMoney(
                  group.children.reduce((sum, category) => sum + categoryAmount(category.id), 0)
                )
              }}</strong>
            </button>
            <div v-if="expandedDirectories.includes(group.id)" class="px-4 pb-4">
              <div v-if="group.children.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  v-for="category in group.children"
                  :key="category.id"
                  type="button"
                  :disabled="'isSystem' in category"
                  class="rounded-lg border p-3 text-left transition-colors hover:border-muted-foreground/40"
                  :class="
                    selectedCategoryId === category.id
                      ? 'border-foreground ring-1 ring-foreground/10'
                      : 'border-border'
                  "
                  @click="
                    selectedCategoryId = selectedCategoryId === category.id ? '' : category.id
                  "
                >
                  <span class="flex items-center justify-between gap-2"
                    ><span class="flex min-w-0 items-center gap-2"
                      ><span
                        class="h-2.5 w-2.5 shrink-0 rounded-full"
                        :style="{ backgroundColor: category.color }"
                      /><span class="truncate text-sm uppercase">{{ category.name }}</span></span
                    ><Pencil
                      v-if="canEdit && !('isSystem' in category)"
                      class="h-4 w-4 shrink-0 text-muted-foreground"
                      :title="`Edit ${category.name} entry`"
                      @click.stop="openCategoryEditor(category)"
                  /></span>
                  <strong class="mt-2 block text-lg text-red-600">{{
                    reportMoney(categoryAmount(category.id))
                  }}</strong>
                  <p
                    v-if="category.monthlyBudget != null"
                    class="mt-1 text-xs text-muted-foreground"
                  >
                    Budget {{ reportMoney(category.monthlyBudget) }}
                  </p>
                  <p v-if="category.perTruck" class="mt-1 text-xs text-muted-foreground">
                    {{ categoryTruckCount(category.id) }} trucks ·
                    {{
                      categoryTruckCount(category.id)
                        ? reportMoney(categoryAmount(category.id) / categoryTruckCount(category.id))
                        : '—'
                    }}
                    per truck
                  </p>
                  <p
                    v-if="category.description"
                    class="mt-1 truncate text-xs text-muted-foreground"
                  >
                    {{ category.description }}
                  </p>
                </button>
              </div>
              <p v-else class="text-sm text-muted-foreground">No subcategories yet.</p>
            </div>
          </div>
          <p v-if="!categoryGroups.length" class="text-sm text-muted-foreground">
            No expense categories configured.
          </p>
        </div>
      </section>
      <section class="overflow-hidden rounded-xl border border-border bg-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold">Expense entries ({{ filtered.length }})</h2>
            <Button
              v-if="selectedCategoryId"
              size="sm"
              variant="outline"
              @click="selectedCategoryId = ''"
              >Clear category</Button
            >
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[750px] text-left text-sm">
            <thead class="bg-muted text-muted-foreground">
              <tr>
                <th class="px-4 py-2 font-medium">Month</th>
                <th class="px-4 py-2 font-medium">Category</th>
                <th class="px-4 py-2 font-medium">Vendor</th>
                <th class="px-4 py-2 font-medium">Description</th>
                <th class="px-4 py-2 font-medium">Trucks</th>
                <th class="px-4 py-2 font-medium">Amount</th>
                <th class="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filtered" :key="item.id" class="border-t border-border">
                <td class="px-4 py-2">{{ formatMonth(item.spentAt) }}</td>
                <td class="px-4 py-2">
                  <span
                    class="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: item.categoryColor }"
                  />{{ item.categoryName }}
                </td>
                <td class="px-4 py-2">{{ item.vendor || '—' }}</td>
                <td class="px-4 py-2">{{ item.description || '—' }}</td>
                <td class="px-4 py-2">{{ item.perTruck ? (item.truckCount ?? '—') : '—' }}</td>
                <td class="px-4 py-2 font-semibold text-red-600">{{ reportMoney(item.amount) }}</td>
                <td class="px-4 py-2">
                  <div class="flex gap-1">
                    <Button
                      v-if="canEdit"
                      variant="ghost"
                      size="icon-sm"
                      title="Edit"
                      @click="openEditor(item)"
                      ><Pencil class="h-4 w-4" /></Button
                    ><Button
                      v-if="canDelete"
                      variant="ghost"
                      size="icon-sm"
                      title="Delete"
                      @click="deleteEntry(item)"
                      ><Trash2 class="h-4 w-4 text-destructive"
                    /></Button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filtered.length">
                <td colspan="7" class="px-4 py-12 text-center text-muted-foreground">
                  No manual expense entries for this month.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <Dialog v-model:open="editor"
      ><DialogContent class="max-w-lg"
        ><DialogHeader
          ><DialogTitle>{{ editingId ? 'Edit expense' : 'Add expense' }}</DialogTitle></DialogHeader
        >
        <form class="grid gap-3" @submit.prevent="saveEntry">
          <label class="grid gap-1 text-sm"
            >Directory
            <Select
              :model-value="form.directoryId"
              @update:model-value="
                (value) => {
                  form.directoryId = String(value)
                  form.categoryId = ''
                }
              "
            >
              <SelectTrigger><SelectValue placeholder="Select directory" /></SelectTrigger>
              <SelectContent
                ><SelectItem v-if="hasActiveUngrouped" value="none">Ungrouped</SelectItem
                ><SelectItem v-for="item in activeDirectories" :key="item.id" :value="item.id">{{
                  item.name
                }}</SelectItem></SelectContent
              >
            </Select>
          </label>
          <label class="grid gap-1 text-sm"
            >Category<Select v-model="form.categoryId"
              ><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger
              ><SelectContent
                ><SelectItem v-for="item in selectableCategories" :key="item.id" :value="item.id">{{
                  item.name
                }}</SelectItem></SelectContent
              ></Select
            ></label
          >
          <p v-if="duplicateInView" class="text-xs text-destructive">
            An expense already exists for this category and month. Edit the existing entry.
          </p>
          <div class="grid grid-cols-2 gap-3">
            <label class="grid gap-1 text-sm"
              >Amount ($)<Input
                v-model.number="form.amount"
                type="number"
                min="0"
                step="0.01"
                required /></label
            ><label class="grid gap-1 text-sm"
              >Month<CReportMonthField v-model="form.expenseMonth"
            /></label>
          </div>
          <label class="grid gap-1 text-sm">Vendor<Input v-model="form.vendor" /></label
          ><label class="grid gap-1 text-sm">Description<Input v-model="form.description" /></label>
          <label v-if="selectedEntryCategory?.perTruck" class="grid gap-1 text-sm">
            Number of trucks<Input v-model="form.truckCount" type="number" min="1" required />
          </label>
          <DialogFooter
            ><Button type="button" variant="outline" @click="editor = false">Cancel</Button
            ><Button type="submit" :disabled="saving || !form.categoryId || duplicateInView"
              >Save</Button
            ></DialogFooter
          >
        </form></DialogContent
      ></Dialog
    >
  </div>
</template>
