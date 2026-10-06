<template>
  <Modal :open="open" @update:open="(value) => !value && close()">
    <ModalContent
      :aria-describedby="undefined"
      :show-close="!downloading"
      @escape-key-down="downloading && $event.preventDefault()"
      @pointer-down-outside="downloading && $event.preventDefault()"
    >
      <ModalHeader
        ><ModalTitle class="text-2xl font-semibold"
          >Download selected reports</ModalTitle
        ></ModalHeader
      >
      <form class="space-y-6 mt-4" @submit.prevent="download">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ reports.length }} ready reports selected
        </div>
        <fieldset class="space-y-2" :disabled="downloading">
          <legend class="text-sm font-medium">Format</legend>
          <div class="flex overflow-hidden rounded-md border border-input">
            <label
              v-for="option in ['pdf', 'csv', 'all']"
              :key="option"
              class="relative flex min-w-0 flex-1"
            >
              <input
                v-model="format"
                type="radio"
                name="ifta-bulk-format"
                :value="option"
                class="peer sr-only"
              />
              <span
                class="flex min-h-9 w-full items-center justify-center px-2 py-2 text-center text-sm text-foreground transition-colors cursor-pointer hover:bg-muted peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:peer-checked:bg-gray-100 dark:peer-checked:text-gray-900"
              >
                {{ option === 'all' ? 'ALL (PDF & CSV)' : option.toUpperCase() }}
              </span>
            </label>
          </div>
        </fieldset>
        <div class="space-y-2">
          <Label>States</Label>
          <CIftaMultiSelect
            v-model="states"
            :options="IFTA_STATE_OPTIONS"
            placeholder="All states"
            searchable
            show-chips
            search-placeholder="Search states"
            :disabled="downloading"
          />
          <p class="text-xs text-muted-foreground">
            Leave empty to include every available state. Total miles is recalculated for the
            selected states.
          </p>
        </div>
        <div class="flex items-start justify-between gap-4">
          <div>
            <Label for="ifta-merge">Merge by vehicles</Label>
            <p class="mt-1 text-xs text-muted-foreground">
              Create one table with vehicles as rows and selected states as mileage columns.
            </p>
          </div>
          <Switch id="ifta-merge" v-model="mergeByVehicles" :disabled="downloading" />
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" :disabled="downloading" @click="close"
            >Cancel</Button
          >
          <Button
            type="submit"
            :disabled="downloading || !canDownload"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
          >
            <Loader2 v-if="downloading" class="h-4 w-4 animate-spin" />
            <Download v-else class="h-4 w-4" /> Download
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import { Switch } from '@/components/ui/switch'
import CIftaMultiSelect from './CIftaMultiSelect.vue'
import { IFTA_STATE_OPTIONS } from '../constants/iftaStates'
import { useIftaService } from '../services/iftaService'
import { downloadIftaReportsZip } from '../utils/iftaExport'
import type { IftaReport, IftaDownloadFormat } from '../types'

const props = defineProps<{
  open: boolean
  reports: IftaReport[]
  companyId: string
  companyName: string
}>()
const emit = defineEmits<{ (e: 'update:open', value: boolean): void }>()
const service = useIftaService()
const format = ref<IftaDownloadFormat>('pdf')
const states = ref<string[]>([])
const downloading = ref(false)
const mergeByVehicles = ref(false)
const canDownload = computed(() => !!props.companyId && props.reports.length > 0)
watch(
  () => props.open,
  (open) => {
    if (!open) return
    format.value = 'pdf'
    states.value = [...new Set(props.reports.flatMap((report) => report.states))]
    mergeByVehicles.value = false
  }
)
function close() {
  if (!downloading.value) emit('update:open', false)
}
async function download() {
  if (!canDownload.value || downloading.value) return
  const companyId = props.companyId
  downloading.value = true
  try {
    await downloadIftaReportsZip({
      reports: [...props.reports],
      companyName: props.companyName,
      states: [...states.value],
      format: format.value,
      mergeByVehicles: mergeByVehicles.value,
      shouldDownload: () => props.open && companyId === props.companyId,
      fetchCsv: (url) => {
        if (!props.open || companyId !== props.companyId) throw new Error('Company changed')
        return service.getFile(companyId, url)
      },
    })
    if (companyId === props.companyId) emit('update:open', false)
  } catch {
    if (props.open && companyId === props.companyId)
      toast.error('The reports could not be prepared')
  } finally {
    downloading.value = false
  }
}
</script>
