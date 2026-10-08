<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-150">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">Generate IFTA Report</ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <!-- Vehicle Selection -->
        <div class="space-y-2">
          <Label>Vehicles</Label>
          <Select
            v-model="selectedVehicle"
            :disabled="isSubmitting"
            @update:model-value="addVehicle"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              <SelectItem
                v-for="vehicle in availableVehicles"
                :key="vehicle.id"
                :value="vehicle.id"
              >
                {{ vehicle.name || vehicle.vin || vehicle.id }}
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- Selected vehicles chips -->
          <div v-if="localSelectedIds.length > 0" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="id in localSelectedIds"
              :key="id"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            >
              {{ getVehicleName(id) }}
              <button
                type="button"
                @click="removeVehicle(id)"
                class="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                &times;
              </button>
            </span>
          </div>
        </div>

        <!-- Date Range -->
        <div class="space-y-2">
          <Label>Date range</Label>
          <Popover v-model:open="isCalendarOpen">
            <PopoverTrigger as-child>
              <Button
                type="button"
                variant="outline"
                class="w-full justify-start text-left font-normal"
                :disabled="isSubmitting"
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ localStartDate }} — {{ localEndDate }}
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <RangeCalendar
                v-model="calendarRange"
                :number-of-months="2"
                :max-value="todayCalendarDate"
                @update:model-value="onRangeSelect"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div class="space-y-2">
          <Label>States (optional)</Label>
          <CIftaMultiSelect
            v-model="selectedStates"
            :options="stateOptions"
            placeholder="All states"
            searchable
            show-chips
            search-placeholder="Search states"
          />
          <p class="text-xs text-muted-foreground">
            Leave empty to include every state. Selected states are applied when files are
            downloaded.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            :disabled="isSubmitting || localSelectedIds.length === 0"
          >
            <span v-if="!isSubmitting">Generate</span>
            <span v-else class="flex items-center gap-2">
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating...
            </span>
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import type { VehicleOption } from '@/modules/Ifta/types'
import CIftaMultiSelect from '@/modules/Ifta/components/CIftaMultiSelect.vue'
import { IFTA_STATE_OPTIONS } from '@/modules/Ifta/utils/iftaDownload'
import type { DateRange } from 'reka-ui'
import { CalendarDate } from '@internationalized/date'
import dayjs from 'dayjs'

interface Props {
  open: boolean
  vehicles: VehicleOption[]
  isSubmitting: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'generate',
    data: {
      vehicleIds: string[]
      startDate: string
      endDate: string
      states: string[]
    }
  ): void
}>()

const selectedVehicle = ref<string>('')
const localSelectedIds = ref<string[]>([])
const selectedStates = ref<string[]>([])
const stateOptions = IFTA_STATE_OPTIONS

// Initial: start = yesterday, end = today
const localStartDate = ref(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
const localEndDate = ref(dayjs().format('YYYY-MM-DD'))

const isCalendarOpen = ref(false)

const toCalendarDate = (dateStr: string): CalendarDate => {
  const d = dayjs(dateStr)
  return new CalendarDate(d.year(), d.month() + 1, d.date())
}

// Today as CalendarDate — used as maxValue to disable future dates
const todayCalendarDate = computed(() => {
  const now = dayjs()
  return new CalendarDate(now.year(), now.month() + 1, now.date())
})

const calendarRange = computed<DateRange>({
  get: () => ({
    start: toCalendarDate(localStartDate.value),
    end: toCalendarDate(localEndDate.value),
  }),
  set: (val) => {
    if (val?.start)
      localStartDate.value = dayjs(
        new Date(val.start.year, val.start.month - 1, val.start.day)
      ).format('YYYY-MM-DD')
    if (val?.end)
      localEndDate.value = dayjs(new Date(val.end.year, val.end.month - 1, val.end.day)).format(
        'YYYY-MM-DD'
      )
  },
})

const onRangeSelect = (val: DateRange) => {
  if (val?.start)
    localStartDate.value = dayjs(
      new Date(val.start.year, val.start.month - 1, val.start.day)
    ).format('YYYY-MM-DD')
  if (val?.end) {
    localEndDate.value = dayjs(new Date(val.end.year, val.end.month - 1, val.end.day)).format(
      'YYYY-MM-DD'
    )
    isCalendarOpen.value = false
  }
}

// Available vehicles = all minus already selected
const availableVehicles = computed(() =>
  props.vehicles.filter((v) => !localSelectedIds.value.includes(v.id))
)

const getVehicleName = (id: string) => {
  const vehicle = props.vehicles.find((v) => v.id === id)
  return vehicle?.name || vehicle?.vin || id
}

const addVehicle = (vehicleId: string) => {
  if (vehicleId === 'all') {
    // Add all vehicles that are not yet selected
    const allIds = props.vehicles.map((v) => v.id)
    const merged = [...new Set([...localSelectedIds.value, ...allIds])]
    localSelectedIds.value = merged
  } else if (vehicleId && !localSelectedIds.value.includes(vehicleId)) {
    localSelectedIds.value.push(vehicleId)
  }
  selectedVehicle.value = ''
}

const removeVehicle = (id: string) => {
  localSelectedIds.value = localSelectedIds.value.filter((v) => v !== id)
}

const handleSubmit = () => {
  emit('generate', {
    vehicleIds: localSelectedIds.value,
    startDate: localStartDate.value,
    endDate: localEndDate.value,
    states: selectedStates.value,
  })
}

const handleClose = () => {
  if (!props.isSubmitting) {
    emit('close')
  }
}

// Reset form when modal closes
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      localSelectedIds.value = []
      selectedStates.value = []
      selectedVehicle.value = ''
      localStartDate.value = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
      localEndDate.value = dayjs().format('YYYY-MM-DD')
      isCalendarOpen.value = false
    }
  }
)
</script>
