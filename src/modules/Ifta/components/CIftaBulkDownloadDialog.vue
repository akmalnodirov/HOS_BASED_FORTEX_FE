<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="border-none bg-white p-6 dark:bg-[#18181A] sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="font-heading">Download selected reports</DialogTitle>
      </DialogHeader>

      <div class="space-y-5">
        <div class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <div class="font-medium">{{ reports.length }} ready reports selected</div>
          <div class="text-xs text-muted-foreground">
            Choose the output layout and states to include.
          </div>
        </div>

        <div>
          <div class="mb-1 text-sm font-medium text-foreground">Format</div>
          <div class="flex overflow-hidden rounded-md border border-border">
            <button
              v-for="option in formatOptions"
              :key="option.value"
              type="button"
              class="h-9 flex-1 border-l border-border text-sm transition-colors first:border-l-0"
              :class="
                format === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground dark:bg-card'
              "
              @click="format = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div>
          <div class="mb-1 text-sm font-medium text-foreground">States</div>
          <CIftaMultiSelect
            v-model="states"
            :options="stateOptions"
            placeholder="All states"
            searchable
            show-chips
            search-placeholder="Search states"
          />
          <p class="mt-1 text-xs text-muted-foreground">
            Leave empty to include every state found in the selected reports.
          </p>
        </div>

        <div class="flex items-start justify-between gap-4 rounded-md border border-border p-3">
          <div>
            <label for="ifta-merge-by-vehicles" class="text-sm font-medium text-foreground">
              Merge by vehicles
            </label>
            <p class="mt-0.5 text-xs text-muted-foreground">
              Create one table with vehicles as rows and selected states as mileage columns.
            </p>
          </div>
          <Switch id="ifta-merge-by-vehicles" v-model="mergeByVehicles" class="mt-0.5 shrink-0" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="downloading" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button :disabled="!reports.length || downloading" @click="download">
          <Loader2 v-if="downloading" class="mr-2 h-4 w-4 animate-spin" />
          <Download v-else class="mr-2 h-4 w-4" />
          Download
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import CIftaMultiSelect from './CIftaMultiSelect.vue'
import { IFTA_STATE_OPTIONS, downloadIftaReportsZip } from '../utils/iftaDownload'
import type { IftaApiResponse as IftaReport } from '../types'

type DownloadFormat = 'pdf' | 'csv' | 'all'

const props = defineProps<{
  open: boolean
  reports: IftaReport[]
  companyName: string
  fetchCsv: (url: string) => Promise<string>
}>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const format = ref<DownloadFormat>('pdf')
const states = ref<string[]>([])
const mergeByVehicles = ref(false)
const downloading = ref(false)
const stateOptions = IFTA_STATE_OPTIONS
const formatOptions: { value: DownloadFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'all', label: 'ALL' },
]

watch(
  () => props.open,
  (open) => {
    if (!open) return
    format.value = 'pdf'
    mergeByVehicles.value = false
    states.value = [...new Set(props.reports.flatMap((report) => report.states))]
  }
)

async function download() {
  if (!props.reports.length) return
  downloading.value = true
  try {
    await downloadIftaReportsZip({
      reports: props.reports,
      companyName: props.companyName,
      states: states.value,
      mergeByVehicles: mergeByVehicles.value,
      format: format.value,
      fetchCsv: props.fetchCsv,
    })
    emit('update:open', false)
  } catch {
    toast.error('The reports could not be prepared')
  } finally {
    downloading.value = false
  }
}
</script>
