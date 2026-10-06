<template>
  <Modal :open="open" @update:open="(value) => !value && handleClose()">
    <ModalContent
      :aria-describedby="undefined"
      class="max-w-150"
      :show-close="!isSubmitting"
      @escape-key-down="isSubmitting && $event.preventDefault()"
      @pointer-down-outside="isSubmitting && $event.preventDefault()"
    >
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold"> Generate IFTA Report </ModalTitle>
      </ModalHeader>
      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <div class="space-y-2">
          <Label>Vehicles <span class="text-red-500">*</span></Label>
          <CIftaMultiSelect
            v-model="selectedVehicleIds"
            :options="vehicleOptions"
            placeholder="Select vehicles"
            searchable
            show-chips
            search-placeholder="Search vehicles"
            :disabled="isSubmitting || isLoadingVehicles"
          />
          <p v-if="isLoadingVehicles" class="text-sm text-muted-foreground">Loading vehicles...</p>
          <div v-else-if="vehicleError" class="text-sm text-red-600" role="alert">
            {{ vehicleError }}
            <Button type="button" variant="link" size="sm" @click="emit('retry-vehicles')"
              >Retry</Button
            >
          </div>
          <p v-else-if="!vehicles.length" class="text-sm text-muted-foreground">
            No vehicles available for this company.
          </p>
        </div>
        <div class="space-y-2">
          <Label>Date range <span class="text-red-500">*</span></Label>
          <Popover v-model:open="isCalendarOpen">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                class="w-full justify-start text-left font-normal"
                :disabled="isSubmitting"
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ periodLabel }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <RangeCalendar v-model="dateRange" :number-of-months="2" />
            </PopoverContent>
          </Popover>
        </div>
        <div class="space-y-2">
          <Label>States (optional)</Label>
          <CIftaMultiSelect
            v-model="selectedStates"
            :options="IFTA_STATE_OPTIONS"
            placeholder="All states"
            searchable
            show-chips
            search-placeholder="Search states"
            :disabled="isSubmitting"
          />
          <p class="text-xs text-muted-foreground">
            Leave empty to include every state. Selected states are applied when the files are
            downloaded.
          </p>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting"
            >Cancel</Button
          >
          <Button
            type="submit"
            :disabled="!canSubmit || isSubmitting"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
          >
            <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
            {{ isSubmitting ? 'Generating...' : 'Generate' }}
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-vue-next'
import type { DateRange } from 'reka-ui'
import type { DateValue } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import CIftaMultiSelect from './CIftaMultiSelect.vue'
import { IFTA_STATE_OPTIONS } from '../constants/iftaStates'
import type { IftaVehicle, IftaGenerateForm } from '../types'

const props = defineProps<{
  open: boolean
  vehicles: IftaVehicle[]
  isSubmitting: boolean
  isLoadingVehicles: boolean
  vehicleError: string | null
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'retry-vehicles'): void
  (e: 'generate', data: IftaGenerateForm): void
}>()
const dateRange = shallowRef<DateRange>({ start: undefined, end: undefined })
const selectedVehicleIds = ref<string[]>([])
const selectedStates = ref<string[]>([])
const isCalendarOpen = ref(false)
const vehicleOptions = computed(() =>
  props.vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: [vehicle.name, vehicle.vin].filter(Boolean).join(' - ') || vehicle.id,
  }))
)
const canSubmit = computed(
  () =>
    !!dateRange.value.start &&
    !!dateRange.value.end &&
    selectedVehicleIds.value.length > 0 &&
    !props.isLoadingVehicles &&
    !props.vehicleError
)
function formatDate(date: DateValue) {
  return `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`
}
const periodLabel = computed(() =>
  dateRange.value.start && dateRange.value.end
    ? `${formatDate(dateRange.value.start)} — ${formatDate(dateRange.value.end)}`
    : 'Select a start and end date'
)
watch(
  () => props.open,
  (open) => {
    if (!open) return
    dateRange.value = { start: undefined, end: undefined }
    selectedVehicleIds.value = []
    selectedStates.value = []
    isCalendarOpen.value = false
  }
)
function handleClose() {
  if (!props.isSubmitting) emit('close')
}
function handleSubmit() {
  if (!canSubmit.value || props.isSubmitting || !dateRange.value.start || !dateRange.value.end)
    return
  emit('generate', {
    vehicleIds: selectedVehicleIds.value,
    fromDate: formatDate(dateRange.value.start),
    toDate: formatDate(dateRange.value.end),
    states: selectedStates.value,
  })
}
</script>
