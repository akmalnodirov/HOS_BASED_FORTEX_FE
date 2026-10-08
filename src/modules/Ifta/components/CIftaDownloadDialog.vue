<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="font-heading">Download report</DialogTitle>
      </DialogHeader>

      <div v-if="report" class="space-y-4">
        <div class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <div class="font-medium">Vehicle {{ report.vehicleName || report.vehicleId }}</div>
          <div class="text-xs text-muted-foreground">
            {{ report.fromDate }} - {{ report.toDate }}
          </div>
        </div>

        <div>
          <div class="mb-1 text-sm font-medium text-foreground">Format</div>
          <div class="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              class="h-9 flex-1 text-sm transition-colors"
              :class="
                format === 'pdf'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground dark:bg-card'
              "
              @click="format = 'pdf'"
            >
              PDF
            </button>
            <button
              type="button"
              class="h-9 flex-1 border-l border-border text-sm transition-colors"
              :class="
                format === 'csv'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground dark:bg-card'
              "
              @click="format = 'csv'"
            >
              CSV
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
          <div class="mt-1 text-xs text-muted-foreground">
            Leave empty to include every state. Total miles is recalculated for the selected states.
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!report || downloading" @click="download">
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
import CIftaMultiSelect from './CIftaMultiSelect.vue'
import { IFTA_STATE_OPTIONS, downloadIftaReport } from '../utils/iftaDownload'
import type { IftaApiResponse as IftaReport } from '../types'

const props = defineProps<{
  open: boolean
  report: IftaReport | null
  companyName: string
  fetchCsv: (url: string) => Promise<string>
}>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()

const format = ref<'pdf' | 'csv'>('pdf')
const states = ref<string[]>([])
const downloading = ref(false)
const stateOptions = IFTA_STATE_OPTIONS

watch(
  () => props.open,
  (open) => {
    if (!open || !props.report) return
    format.value = 'pdf'
    states.value = [...props.report.states]
  }
)

async function download() {
  if (!props.report) return
  downloading.value = true
  try {
    await downloadIftaReport({
      report: props.report,
      companyName: props.companyName,
      states: states.value,
      format: format.value,
      fetchCsv: props.fetchCsv,
    })
    emit('update:open', false)
  } catch {
    toast.error('The report file could not be prepared')
  } finally {
    downloading.value = false
  }
}
</script>
