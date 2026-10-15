<template>
  <section
    :class="embedded ? 'min-w-0 bg-transparent' : 'border-y border-border bg-background px-6 py-4'"
  >
    <div :class="embedded ? 'min-w-0' : 'rounded-lg border border-border bg-card p-4'">
      <div class="flex min-w-0 items-center justify-between gap-2">
        <h2 class="truncate text-sm font-semibold text-foreground">Daily Log &amp; Profile Form</h2>
        <div class="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="View daily log details"
            :disabled="!selectedForm"
            @click="detailsOpen = true"
          >
            <Eye class="h-4 w-4" />
            <span class="sr-only">Details</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            title="Edit profile form"
            :disabled="!selectedForm || !canEdit"
            @click="edit"
          >
            <Pencil class="h-4 w-4" />
            <span class="sr-only">Edit form</span>
          </Button>
          <Select v-model="selectedDate">
            <SelectTrigger class="h-8 w-39 text-xs">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent :body-lock="false">
              <SelectItem v-for="form in displayForms" :key="form.logDate" :value="form.logDate">
                {{ formatDate(form.logDate) }} · {{ timeZone || 'CT' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        v-if="selectedForm"
        :class="
          embedded
            ? 'mt-2 grid grid-cols-4 divide-x divide-border rounded-md bg-muted/35 px-1 py-1.5'
            : 'mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4'
        "
      >
        <div :class="embedded ? 'min-w-0 px-2' : 'rounded-md border border-border p-3'">
          <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Co-driver
          </p>
          <p class="mt-0.5 break-words text-xs font-medium">
            {{ selectedForm.coDriverName || '—' }}
          </p>
        </div>
        <div :class="embedded ? 'min-w-0 px-2' : 'rounded-md border border-border p-3'">
          <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Trailers
          </p>
          <p class="mt-0.5 break-words text-xs font-medium">{{ joined(selectedForm.trailers) }}</p>
        </div>
        <div :class="embedded ? 'min-w-0 px-2' : 'rounded-md border border-border p-3'">
          <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Documents
          </p>
          <p class="mt-0.5 break-words text-xs font-medium">
            {{ joined(selectedForm.shippingDocuments) }}
          </p>
        </div>
        <div :class="embedded ? 'min-w-0 px-2' : 'rounded-md border border-border p-3'">
          <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Signature
          </p>
          <span
            class="mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold"
            :class="isSigned ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
          >
            {{ isSigned ? 'SIGNED' : 'NOT SIGNED' }}
          </span>
        </div>
      </div>
      <div
        v-else
        :class="
          embedded
            ? 'mt-2 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground'
            : 'mt-3 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'
        "
      >
        No daily profile form is available for this session.
      </div>

      <div v-if="!embedded" class="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" :disabled="!selectedForm" @click="detailsOpen = true">
          <Eye class="mr-2 h-4 w-4" /> Details
        </Button>
        <Button variant="outline" size="sm" :disabled="!selectedForm || !canEdit" @click="edit">
          <Pencil class="mr-2 h-4 w-4" /> Edit form
        </Button>
      </div>
    </div>
  </section>

  <Dialog v-model:open="detailsOpen">
    <DialogContent class="flex max-h-[88vh] flex-col overflow-hidden sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>Daily Log &amp; Profile Form</DialogTitle>
        <DialogDescription v-if="selectedForm">
          {{ formatDate(selectedForm.logDate) }}
        </DialogDescription>
      </DialogHeader>
      <div
        v-if="selectedForm"
        class="grid min-h-0 grid-cols-1 gap-3 overflow-y-auto pr-1 text-sm md:grid-cols-2 xl:grid-cols-3"
      >
        <Detail label="Driver" :value="selectedLog?.driverName || driverName || '—'" />
        <Detail label="Driver ID" :value="externalDriverId || '—'" />
        <Detail
          label="License"
          :value="
            [selectedLog?.driverLicenseState, selectedLog?.driverLicense]
              .filter(Boolean)
              .join(' · ') || '—'
          "
        />
        <Detail label="Exempt driver" :value="selectedLog?.isExempt ? 'Yes' : 'No'" />
        <Detail label="Company / carrier" :value="selectedLog?.carrierName || companyName || '—'" />
        <Detail label="Main office" :value="selectedLog?.mainOffice || '—'" />
        <Detail label="Home terminal" :value="selectedLog?.homeTerminal || '—'" />
        <Detail label="DOT number" :value="selectedLog?.dotNumber || '—'" />
        <Detail
          label="Co-driver"
          :value="selectedForm.coDriverName || selectedLog?.coDriverName || '—'"
        />
        <Detail
          label="Co-driver ID"
          :value="selectedForm.coDriverId || selectedLog?.coDriverId || '—'"
        />
        <Detail
          label="Trailers"
          :value="
            joined(
              selectedForm.trailers.length ? selectedForm.trailers : selectedLog?.trailers || []
            )
          "
        />
        <Detail
          label="Shipping documents"
          :value="
            joined(
              selectedForm.shippingDocuments.length
                ? selectedForm.shippingDocuments
                : selectedLog?.shippingDocuments || []
            )
          "
        />
        <Detail
          label="ELD serial / MAC"
          :value="
            [selectedLog?.eldSerialNumber, selectedLog?.eldMacAddress]
              .filter(Boolean)
              .join(' · ') || '—'
          "
        />
        <Detail label="ELD registration" :value="selectedLog?.eldRegistrationId || '—'" />
        <Detail label="ELD identifier" :value="selectedLog?.eldIdentifier || '—'" />
        <Detail label="Provider" value="Route ELD" />
        <Detail
          label="Diagnostic indicator"
          :value="selectedLog?.hasDiagnosticIndicator ? 'Yes' : 'No'"
        />
        <Detail
          label="Malfunction indicator"
          :value="selectedLog?.hasMalfunctionIndicator ? 'Yes' : 'No'"
        />
        <Detail
          label="Signature file"
          :value="displayFileName(selectedForm.signatureFileName || selectedLog?.signature)"
        />
        <Detail label="Change state" :value="selectedForm.isModified ? 'Modified' : 'Unchanged'" />
        <Detail
          label="Submission state"
          :value="
            selectedForm.isSubmitted
              ? 'Submitted'
              : selectedForm.isRolledBack
                ? 'Rolled back'
                : 'Draft'
          "
        />
        <div class="rounded-md border border-border p-3 md:col-span-2 xl:col-span-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Driver signature
          </p>
          <div class="mt-2 flex min-h-28 items-center justify-center rounded border bg-white p-2">
            <img
              v-if="selectedForm.signatureUrl"
              :src="selectedForm.signatureUrl"
              alt="Driver signature"
              class="max-h-28 max-w-full object-contain"
            />
            <span v-else class="text-xs text-muted-foreground">
              {{ selectedForm.signatureFileName ? 'Signature unavailable' : 'Not signed' }}
            </span>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="detailsOpen = false">Close</Button>
        <Button v-if="canEdit" @click="edit">Edit form</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { Eye, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { RouteEldDailyLogDetail, RouteEldProfileForm } from '../types/boost'

const props = withDefaults(
  defineProps<{
    forms?: RouteEldProfileForm[]
    dailyLogs?: RouteEldDailyLogDetail[]
    driverName?: string
    externalDriverId?: string
    companyName?: string
    canEdit?: boolean
    embedded?: boolean
    timeZone?: string | null
  }>(),
  {
    forms: () => [],
    dailyLogs: () => [],
    driverName: '',
    externalDriverId: '',
    companyName: '',
    canEdit: false,
    embedded: false,
    timeZone: 'CT',
  }
)
const emit = defineEmits<{ edit: [date: string] }>()
const selectedDate = ref('')
const detailsOpen = ref(false)
const normalizedDate = (value: string) => {
  const parts = value.trim().split(/[./-]/)
  if (parts.length >= 3) {
    if (parts[0].length === 4)
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}`
    if (parts[2].slice(0, 4).length === 4)
      return `${parts[2].slice(0, 4)}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }
  return value.replaceAll('/', '-').slice(0, 10)
}
const displayForms = computed<RouteEldProfileForm[]>(() => {
  const forms = new Map<string, RouteEldProfileForm>()
  for (const log of props.dailyLogs) {
    const key = normalizedDate(log.logDate)
    forms.set(key, {
      logDate: log.logDate,
      coDriverId: log.coDriverId,
      coDriverName: log.coDriverName,
      trailers: log.trailers,
      shippingDocuments: log.shippingDocuments,
      signatureFileName: log.signature,
      signatureUrl: null,
      isModified: false,
      isSubmitted: false,
      isRolledBack: false,
    })
  }
  for (const form of props.forms) {
    const key = normalizedDate(form.logDate)
    const log = forms.get(key)
    forms.set(key, {
      ...log,
      ...form,
      coDriverId: form.coDriverId ?? log?.coDriverId ?? null,
      coDriverName: form.coDriverName ?? log?.coDriverName ?? null,
      trailers: form.trailers.length ? form.trailers : (log?.trailers ?? []),
      shippingDocuments: form.shippingDocuments.length
        ? form.shippingDocuments
        : (log?.shippingDocuments ?? []),
      signatureFileName: form.signatureFileName ?? log?.signatureFileName ?? null,
    })
  }
  return Array.from(forms.values()).sort((left, right) =>
    normalizedDate(left.logDate).localeCompare(normalizedDate(right.logDate))
  )
})
const selectedForm = computed(
  () =>
    displayForms.value.find((form) => form.logDate === selectedDate.value) ??
    displayForms.value.at(-1) ??
    null
)
const selectedLog = computed(
  () =>
    props.dailyLogs.find(
      (log) => normalizedDate(log.logDate) === normalizedDate(selectedForm.value?.logDate ?? '')
    ) ?? null
)
const isSigned = computed(() =>
  Boolean(selectedForm.value?.signatureFileName || selectedForm.value?.signatureUrl)
)

watch(
  displayForms,
  (forms) => {
    if (!forms.some((form) => form.logDate === selectedDate.value)) {
      selectedDate.value = forms.at(-1)?.logDate ?? ''
    }
  },
  { immediate: true }
)

const formatDate = (value: string) => dayjs(normalizedDate(value)).format('MMM D, YYYY')
const joined = (values: string[]) => (values.length ? values.join(', ') : '—')
const displayFileName = (value?: string | null) => {
  if (!value) return '—'
  const clean = value.split(/[?#]/)[0]
  const fileName = clean.split(/[\\/]/).at(-1) ?? clean
  try {
    return decodeURIComponent(fileName)
  } catch {
    return fileName
  }
}
const edit = () => {
  if (!selectedForm.value) return
  detailsOpen.value = false
  emit('edit', selectedForm.value.logDate)
}

const Detail = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  setup(detailProps) {
    return () =>
      h('div', { class: 'rounded-md border border-border p-3' }, [
        h(
          'p',
          { class: 'text-[10px] font-medium uppercase tracking-wide text-muted-foreground' },
          detailProps.label
        ),
        h('p', { class: 'mt-1 break-words font-medium text-foreground' }, detailProps.value),
      ])
  },
})
</script>
