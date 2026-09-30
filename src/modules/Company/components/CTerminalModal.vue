<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-[600px]">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">New Terminal</ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-4">
        <div class="space-y-2">
          <Label for="terminal-timezone">Carrier Time Zone</Label>
          <Select
            v-model="formData.timeZoneId"
            :disabled="isSubmitting"
            @update:model-value="(value) => {
              formData.timeZoneId = value
              const tz = timeZoneOptions.find(t => t.id === value)
              if (tz) formData.timeZone = tz.name
            }"
          >
            <SelectTrigger id="terminal-timezone">
              <SelectValue placeholder="Select time zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in timeZoneOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="terminal-address">Carrier Address</Label>
          <Input
            id="terminal-address"
            v-model="formData.address"
            placeholder="Carrier Address"
            :disabled="isSubmitting"
          />
        </div>

        <div class="space-y-2">
          <Label for="terminal-country">Country</Label>
          <Select
            v-model="terminalCountryId"
            :disabled="isSubmitting || isLoadingParents"
            @update:model-value="handleCountryChange"
          >
            <SelectTrigger id="terminal-country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in countryOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="terminal-state">State</Label>
          <Select
            v-model="terminalStateId"
            :disabled="isSubmitting || isLoadingStates || !terminalCountryId"
            @update:model-value="handleStateChange"
          >
            <SelectTrigger id="terminal-state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in stateOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="terminal-city">City code</Label>
          <Input
            id="terminal-city"
            v-model="formData.cityCode"
            placeholder="City code"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            :disabled="isSubmitting"
          >
            <span v-if="!isSubmitting">Add</span>
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
              Adding...
            </span>
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import type { TerminalFormData } from '@/modules/Company/types'
import { useCompany } from '@/modules/Company/composables/useCompany'

interface Props {
  open: boolean
  terminalIndex?: number
  terminalCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  terminalIndex: undefined,
  terminalCount: 0,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: TerminalFormData): void
}>()

const {
  countryOptions,
  stateOptions,
  timeZoneOptions,
  isLoadingParents,
  isLoadingStates,
  selectedCountryId,
  initializeData,
} = useCompany()

const nextTerminalName = computed(() => `Terminal ${props.terminalCount + 1}`)

const formData = ref<TerminalFormData>({
  name: '',
  timeZone: '',
  timeZoneId: '',
  address: '',
  address2: '',
  country: '',
  countryId: '',
  state: '',
  stateId: '',
  cityCode: '',
  zipCode: '',
  periodStartingTime: '',
})

const isSubmitting = ref(false)
const terminalCountryId = ref<string>('')
const terminalStateId = ref<string>('')

// Handle country change
const handleCountryChange = (value: any) => {
  if (!value || typeof value !== 'string') return
  terminalCountryId.value = value
  selectedCountryId.value = value
  formData.value.countryId = value
  const country = countryOptions.value.find((c) => c.id === value)
  if (country) {
    formData.value.country = country.name
  }
  // Reset state when country changes
  if (terminalStateId.value) {
    const stateExists = stateOptions.value.some((s) => s.id === terminalStateId.value)
    if (!stateExists) {
      terminalStateId.value = ''
      formData.value.state = ''
    }
  }
}

// Handle state change
const handleStateChange = (value: any) => {
  if (!value || typeof value !== 'string') return
  terminalStateId.value = value
  formData.value.stateId = value
  const state = stateOptions.value.find((s) => s.id === value)
  if (state) {
    formData.value.state = state.name
  }
}

// Watch for country changes to filter states
watch(
  () => terminalCountryId.value,
  (newCountryId) => {
    selectedCountryId.value = newCountryId
    // Reset state when country changes if current state is not valid
    if (terminalStateId.value && newCountryId) {
      const stateExists = stateOptions.value.some((s) => s.id === terminalStateId.value)
      if (!stateExists) {
        terminalStateId.value = ''
        formData.value.state = ''
      }
    }
  }
)

// Reset form when modal opens/closes
watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      resetForm()
    } else {
      // Initialize API data if not already loaded
      await initializeData()
      formData.value.name = nextTerminalName.value
    }
  }
)

const resetForm = () => {
  formData.value = {
    name: '',
    timeZone: '',
    timeZoneId: '',
    address: '',
    address2: '',
    country: '',
    countryId: '',
    state: '',
    stateId: '',
    cityCode: '',
    zipCode: '',
    periodStartingTime: '',
  }
  terminalCountryId.value = ''
  terminalStateId.value = ''
}

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    // Set the terminal name
    formData.value.name = nextTerminalName.value
    emit('save', { ...formData.value })
    resetForm()
  } catch (error) {
    console.error('Error saving terminal:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}
</script>
