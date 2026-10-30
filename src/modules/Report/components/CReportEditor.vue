<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ record ? 'Edit' : 'Create' }} {{ title }}</DialogTitle>
        <DialogDescription>Save changes to the Report workspace.</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="save">
        <label class="grid gap-1.5 text-sm">
          Driver
          <CReportSearchSelect v-model="form.driverId" :options="drivers" placeholder="Select driver" :empty-label="kind === 'checker' ? 'No driver' : undefined" empty-value="none" />
        </label>
        <label v-if="kind !== 'activity'" class="grid gap-1.5 text-sm">
          Company
          <Input v-if="selectedCompany" :model-value="selectedCompany.name" readonly class="h-10" />
          <CReportSearchSelect v-else v-model="form.companyId" :options="companies" placeholder="Select company" />
        </label>
        <label v-if="kind === 'checker'" class="grid gap-1.5 text-sm">
          Employee
          <Select v-model="form.logBookerId">
            <SelectTrigger class="h-10"><SelectValue placeholder="Select employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="user in users" :key="user.id" :value="user.id">
                {{ user.firstName }} {{ user.lastName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label class="grid gap-1.5 text-sm">
          Status
          <Select v-model="form.status">
            <SelectTrigger class="h-10"><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in statuses" :key="item.value" :value="String(item.value)" :disabled="record?.status !== undefined && kind !== 'activity' && kind !== 'checker' && item.value <= record.status">
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label v-if="kind === 'activity'" class="grid gap-1.5 text-sm">
          Date
          <Popover v-model:open="calendarOpen">
            <PopoverTrigger as-child>
              <Button type="button" variant="outline" class="h-10 justify-start font-normal">{{ form.date }}</Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <Calendar v-model="calendarDate" initial-focus />
            </PopoverContent>
          </Popover>
        </label>
        <label v-if="kind === 'activity'" class="grid gap-1.5 text-sm">
          Column
          <Input v-model="form.colNumber" type="number" min="1" required class="h-10" />
        </label>
        <label v-if="kind !== 'activity'" class="grid gap-1.5 text-sm">
          Note
          <Textarea v-model="form.note" rows="3" />
        </label>
        <div class="flex justify-end gap-2">
          <Button v-if="record?.id && canDelete" type="button" variant="destructive" class="mr-auto" :disabled="saving" @click="deleteOpen = true">Delete</Button>
          <Button type="button" variant="outline" @click="emit('update:open', false)">Cancel</Button>
          <Button type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
  <Dialog v-model:open="deleteOpen">
    <DialogContent class="max-w-sm"><DialogHeader><DialogTitle>Delete this {{ title }}?</DialogTitle></DialogHeader><div class="flex justify-end gap-2"><Button variant="outline" @click="deleteOpen = false">Cancel</Button><Button variant="destructive" :disabled="saving" @click="remove">Delete</Button></div></DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarDate } from '@internationalized/date'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CReportSearchSelect from '@/modules/Report/components/CReportSearchSelect.vue'
import { useReportOperations } from '@/modules/Report/composables/useReportOperations'
import { activityStatuses, checkerStatuses, routeTaskStatuses } from '@/modules/Report/utils/operations'
import type { ReportOperationCompany, ReportOperationDriver, ReportOperationUser } from '@/modules/Report/types'

type Kind = 'task' | 'assistant' | 'checker' | 'activity'
type RecordValue = {
  id?: string
  driver?: { id: string }
  company?: { id: string }
  logBooker?: { id: string }
  status?: number
  notes?: string
  note?: string
  date?: string
  colNumber?: number
  startTime?: string
  endTime?: string
}
const props = defineProps<{
  open: boolean
  kind: Kind
  record?: RecordValue | null
  companies: ReportOperationCompany[]
  drivers: ReportOperationDriver[]
  users: ReportOperationUser[]
  canDelete?: boolean
}>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void; (event: 'saved'): void }>()
const operations = useReportOperations()
const saving = ref(false)
const deleteOpen = ref(false)
const calendarOpen = ref(false)
const form = reactive({
  driverId: '',
  companyId: '',
  logBookerId: '',
  status: '0',
  note: '',
  date: dayjs().format('YYYY-MM-DD'),
  colNumber: 1,
})
const title = computed(() => ({
  task: 'task',
  assistant: 'assistant task',
  checker: 'checker task',
  activity: 'activity',
})[props.kind])
const selectedCompany = computed(() => props.drivers.find((driver) => driver.id === form.driverId)?.company)
const calendarDate = computed({
  get: () => {
    const [year, month, day] = form.date.split('-').map(Number)
    return new CalendarDate(year, month, day)
  },
  set: (value: CalendarDate) => {
    form.date = `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
    calendarOpen.value = false
  },
})
const statuses = computed(() => props.kind === 'activity'
  ? activityStatuses.map((label, value) => ({ label, value }))
  : props.kind === 'checker'
    ? checkerStatuses
    : props.kind === 'assistant'
      ? routeTaskStatuses.slice(3)
      : routeTaskStatuses.slice(0, 4))

const isRecordLocked = computed(() => props.kind === 'assistant'
  ? props.record?.status === 5
  : props.kind === 'task'
    ? props.record?.status === 2 || props.record?.status === 4 || props.record?.status === 5
    : props.kind === 'checker' && props.record?.status === 2)

watch(() => [props.open, props.record, props.kind] as const, () => {
  if (!props.open) return
  form.driverId = props.record?.driver?.id ?? (props.kind === 'checker' ? 'none' : '')
  form.companyId = props.record?.company?.id ?? ''
  form.logBookerId = props.record?.logBooker?.id ?? ''
  form.status = String(props.record?.status ?? (props.kind === 'assistant' ? 3 : props.kind === 'activity' ? 9 : 0))
  form.note = props.record?.notes ?? props.record?.note ?? ''
  form.date = props.record?.date?.slice(0, 10) ?? dayjs().format('YYYY-MM-DD')
  form.colNumber = props.record?.colNumber ?? 1
})

watch(() => form.driverId, (id) => {
  const companyId = props.drivers.find((driver) => driver.id === id)?.company?.id
  if (companyId && props.kind !== 'activity') form.companyId = companyId
})


async function save() {
  if (isRecordLocked.value) return
  if (props.record?.status !== undefined && props.kind !== 'checker' && props.kind !== 'activity' && Number(form.status) < props.record.status) return
  if ((props.kind === 'task' && form.status === '2' || props.kind === 'assistant' && form.status === '5') && !form.note.trim()) {
    toast.error('Add a note before completing the task')
    return
  }
  if ((!form.driverId || form.driverId === 'none') && props.kind !== 'checker') {
    toast.error('Select a driver')
    return
  }
  if (props.kind !== 'activity' && !form.companyId) {
    toast.error('Select a company')
    return
  }
  if (props.kind === 'checker' && !form.logBookerId) {
    toast.error('Select an employee')
    return
  }
  saving.value = true
  try {
    if (props.kind === 'activity') {
      const body = {
        driverId: form.driverId,
        date: `${form.date}T00:00:00Z`,
        status: Number(form.status),
        colNumber: Number(form.colNumber),
      }
      if (props.record?.id) await operations.updateActivity(props.record.id, body)
      else await operations.createActivity(body)
    } else if (props.kind === 'checker') {
      const body = {
        logBookerId: form.logBookerId,
        companyId: form.companyId,
        status: Number(form.status),
        note: form.note,
        driverId: form.driverId === 'none' ? null : form.driverId,
      }
      if (props.record?.id) await operations.updateCheckerTask(props.record.id, body)
      else await operations.createCheckerTask(body)
    } else {
      const body = {
        driverId: form.driverId,
        companyId: form.companyId,
        status: Number(form.status),
        notes: form.note,
        startTime: props.record?.startTime ?? null,
        endTime: props.record?.endTime ?? null,
        logBookerId: props.record?.logBooker?.id ?? null,
      }
      if (props.kind === 'assistant') {
        if (props.record?.id) await operations.updateAssistantTask(props.record.id, body)
        else await operations.createAssistantTask(body)
      } else if (props.record?.id) await operations.updateTask(props.record.id, body)
      else await operations.createTask(body)
    }
    emit('saved')
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (isRecordLocked.value) return
  if (!props.record?.id || !props.canDelete) return
  saving.value = true
  try {
    if (props.kind === 'checker') await operations.deleteCheckerTask(props.record.id)
    else if (props.kind === 'activity') await operations.deleteActivity(props.record.id)
    else await operations.deleteTask(props.record.id)
    emit('saved')
    emit('update:open', false)
    deleteOpen.value = false
  } finally {
    saving.value = false
  }
}
</script>

