<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent max-width="3xl">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">Create company</ModalTitle>
      </ModalHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 mt-4">
        <!-- Provider Select - First Row -->
        <div class="space-y-2">
          <Label for="provider">Provider</Label>
          <Select
            v-model="formData.providerId"
            :disabled="isSubmitting || isLoadingProviders"
            @update:model-value="clearError('providerId')"
          >
            <SelectTrigger id="provider" :class="errors.providerId && 'border-destructive'">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="provider in providers"
                :key="provider.providerId"
                :value="provider.providerId"
              >
                {{ provider.providerName }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.providerId" class="text-sm text-destructive">
            {{ errors.providerId }}
          </p>
        </div>

        <!-- Row 1 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="name">Company name</Label>
            <Input
              id="name"
              v-model="formData.name"
              placeholder="Company name"
              :class="errors.name && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('name')"
            />
            <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
          </div>

          <div class="space-y-2">
            <Label for="phone">Phone</Label>
            <Input
              id="phone"
              v-model="formData.phone"
              placeholder="+1 (XXX) XXX-XXXX"
              type="tel"
              maxlength="17"
              :class="errors.phone && 'border-destructive'"
              :disabled="isSubmitting"
              @input="handlePhoneInput"
            />
            <p v-if="errors.phone" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.phone }}
            </p>
          </div>
        </div>

        <!-- Row 2 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="usdot">USDOT</Label>
            <Input
              id="usdot"
              v-model="formData.usdot"
              placeholder="USDOT"
              :class="errors.usdot && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('usdot')"
            />
            <p v-if="errors.usdot" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.usdot }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="street">Street</Label>
            <Input
              id="street"
              v-model="formData.street"
              placeholder="Street"
              :class="errors.street && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('street')"
            />
            <p v-if="errors.street" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.street }}
            </p>
          </div>
        </div>

        <!-- Row 2.5 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="city">City</Label>
            <Input
              id="city"
              v-model="formData.city"
              placeholder="City"
              :class="errors.city && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('city')"
            />
            <p v-if="errors.city" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.city }}
            </p>
          </div>
        </div>

        <!-- Row 3 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="homeTerminalAddress">Home terminal address</Label>
            <Input
              id="homeTerminalAddress"
              v-model="formData.homeTerminalAddress"
              placeholder="Home terminal address"
              :disabled="isSubmitting"
            />
          </div>

          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              v-model="formData.email"
              type="email"
              placeholder="Email"
              :class="errors.email && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('email')"
            />
            <p v-if="errors.email" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.email }}
            </p>
          </div>
        </div>

        <!-- Row 4 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="issuerStateParent">Issuer state parent</Label>
            <Select
              v-model="formData.issuerStateParent"
              :disabled="isSubmitting || isLoadingParents"
              @update:model-value="handleParentChange"
            >
              <SelectTrigger id="issuerStateParent" class="border-border dark:bg-card">
                <SelectValue placeholder="Select parent state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="parent in issuerStateParents"
                  :key="parent.id"
                  :value="parent.id"
                >
                  {{ parent.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="issuerState">Issuer State</Label>
            <Select
              v-model="formData.issuerState"
              :disabled="isSubmitting || isLoadingStates || !formData.issuerStateParent"
            >
              <SelectTrigger id="issuerState" class="border-border dark:bg-card">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="state in filteredIssuerStates" :key="state.id" :value="state.id">
                  {{ state.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Row 5 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="zipcode">Zipcode</Label>
            <Input
              id="zipcode"
              v-model="formData.zipcode"
              placeholder="Zipcode"
              :class="errors.zipcode && 'border-destructive'"
              :disabled="isSubmitting"
              @input="clearError('zipcode')"
            />
            <p v-if="errors.zipcode" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.zipcode }}
            </p>
          </div>
        </div>

        <!-- Home terminal timezone -->
        <div class="space-y-3">
          <Label>Home terminal</Label>
          <RadioGroup v-model="formData.timezone" :disabled="isSubmitting">
            <div class="grid grid-cols-5 gap-3">
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="EDT" id="edt" />
                <Label for="edt" class="cursor-pointer">EDT</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="MDT" id="mdt" />
                <Label for="mdt" class="cursor-pointer">MDT</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="PDT" id="pdt" />
                <Label for="pdt" class="cursor-pointer">PDT</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="CDT" id="cdt" />
                <Label for="cdt" class="cursor-pointer">CDT</Label>
              </div>
              <div class="flex items-center space-x-2">
                <RadioGroupItem value="UST" id="ust" />
                <Label for="ust" class="cursor-pointer">UST</Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <!-- Actions -->
        <ModalFooter class="pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            @click="handleClose"
            :disabled="isSubmitting"
            class="border-border"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="isSubmitting"
          >
            <span v-if="!isSubmitting">Save</span>
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
              Saving...
            </span>
          </Button>
        </ModalFooter>
      </form>
    </ModalContent>
  </Modal>
</template>
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from '@/components/custom/modal'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
}

interface Provider {
  providerId: string
  providerName: string
  carriers: any[]
}

interface IssuerStateParent {
  id: string
  name: string
  parentId: null | string
  stateCode: string
}

interface IssuerState {
  id: string
  name: string
  parentId: string
  stateCode: string
}

interface FormData {
  providerId: string
  name: string
  phone: string
  usdot: string
  street: string
  city: string
  homeTerminalAddress: string
  email: string
  issuerStateParent: string
  issuerState: string
  zipcode: string
  timezone: string
}

interface CarrierRequest {
  providerId: string
  name: string
  usdotNumber: string
  timeZoneId: string
  phoneNumber: string
  email: string
  street: string
  city: string
  zipCode: string
  issuerStateId: string
  carrierTerminals: any[]
  carrierDriverLogSetting: null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const api = useApi()

const formData = ref<FormData>({
  providerId: '',
  name: '',
  phone: '',
  usdot: '',
  street: '',
  city: '',
  homeTerminalAddress: '',
  email: '',
  issuerStateParent: '',
  issuerState: '',
  zipcode: '',
  timezone: 'EDT',
})

const errors = ref<Partial<Record<keyof FormData, string>>>({})
const isSubmitting = ref(false)

// Providers data
const providers = ref<Provider[]>([])
const isLoadingProviders = ref(false)

// Issuer state data
const issuerStateParents = ref<IssuerStateParent[]>([])
const issuerStates = ref<IssuerState[]>([])
const filteredIssuerStates = ref<IssuerState[]>([])
const isLoadingParents = ref(false)
const isLoadingStates = ref(false)

// Fetch providers
const fetchProviders = async () => {
  isLoadingProviders.value = true
  try {
    const response = await api.get<{ successResult: Provider[] }>('/api/providers/providers/filter')
    providers.value = response.data?.successResult || []
  } catch (error: any) {
    console.error('Error fetching providers:', error)
    toast.error('Failed to load providers')
  } finally {
    isLoadingProviders.value = false
  }
}

// Fetch issuer state parents
const fetchIssuerStateParents = async () => {
  isLoadingParents.value = true
  try {
    const response = await api.get<{ successResult: IssuerStateParent[] }>(
      '/api/issuer-states/parents'
    )
    issuerStateParents.value = response.data?.successResult || []
  } catch (error: any) {
    console.error('Error fetching issuer state parents:', error)
    toast.error('Failed to load issuer state parents')
  } finally {
    isLoadingParents.value = false
  }
}

// Fetch issuer states
const fetchIssuerStates = async () => {
  isLoadingStates.value = true
  try {
    const response = await api.get<{ successResult: { data: IssuerState[] } }>('/api/issuer-states')
    issuerStates.value = response.data?.successResult?.data || []
    filterIssuerStates()
  } catch (error: any) {
    console.error('Error fetching issuer states:', error)
    toast.error('Failed to load issuer states')
  } finally {
    isLoadingStates.value = false
  }
}

// Filter issuer states by selected parent
const filterIssuerStates = () => {
  if (!formData.value.issuerStateParent) {
    filteredIssuerStates.value = []
    formData.value.issuerState = ''
    return
  }

  filteredIssuerStates.value = issuerStates.value.filter(
    (state) => state.parentId === formData.value.issuerStateParent
  )

  // Reset issuer state if current selection is not in filtered list
  if (
    formData.value.issuerState &&
    !filteredIssuerStates.value.some((s) => s.id === formData.value.issuerState)
  ) {
    formData.value.issuerState = ''
  }
}

const handleParentChange = () => {
  filterIssuerStates()
}

// Reset form when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      fetchProviders()
      fetchIssuerStateParents()
      fetchIssuerStates()
    } else {
      resetForm()
    }
  }
)

// Load data on mount
onMounted(() => {
  if (props.open) {
    fetchProviders()
    fetchIssuerStateParents()
    fetchIssuerStates()
  }
})

const resetForm = () => {
  formData.value = {
    providerId: '',
    name: '',
    phone: '',
    usdot: '',
    street: '',
    city: '',
    homeTerminalAddress: '',
    email: '',
    issuerStateParent: '',
    issuerState: '',
    zipcode: '',
    timezone: 'EDT',
  }
  errors.value = {}
  filteredIssuerStates.value = []
}

const validateForm = (): boolean => {
  errors.value = {}
  let isValid = true

  // Required fields
  if (!formData.value.providerId) {
    errors.value.providerId = 'Provider is required'
    isValid = false
  }

  if (!formData.value.name.trim()) {
    errors.value.name = 'Company name is required'
    isValid = false
  }

  if (!formData.value.usdot.trim()) {
    errors.value.usdot = 'USDOT is required'
    isValid = false
  } else if (!/^\d+$/.test(formData.value.usdot)) {
    errors.value.usdot = 'USDOT must be numeric'
    isValid = false
  }

  if (!formData.value.street.trim()) {
    errors.value.street = 'Street is required'
    isValid = false
  }

  if (!formData.value.city.trim()) {
    errors.value.city = 'City is required'
    isValid = false
  }

  // Email validation if provided
  if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Invalid email format'
    isValid = false
  }

  // Phone validation if provided - US format: +1 (XXX) XXX-XXXX or (XXX) XXX-XXXX
  if (formData.value.phone && !/^(\+1 )?\(\d{3}\) \d{3}-\d{4}$/.test(formData.value.phone)) {
    errors.value.phone = 'Phone must be in format +1 (XXX) XXX-XXXX or (XXX) XXX-XXXX'
    isValid = false
  }

  // Zipcode validation if provided
  // if (formData.value.zipcode && !/^\d{5}(-\d{4})?$/.test(formData.value.zipcode)) {
  //   errors.value.zipcode = 'Invalid zipcode format'
  //   isValid = false
  // }

  // Required fields for carrier
  if (!formData.value.issuerStateParent) {
    errors.value.issuerStateParent = 'Issuer state parent is required'
    isValid = false
  }

  if (!formData.value.issuerState) {
    errors.value.issuerState = 'Issuer state is required'
    isValid = false
  }

  if (!formData.value.phone) {
    errors.value.phone = 'Phone is required'
    isValid = false
  }

  if (!formData.value.email) {
    errors.value.email = 'Email is required'
    isValid = false
  }

  if (!formData.value.zipcode) {
    errors.value.zipcode = 'Zipcode is required'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  if (!formData.value.providerId) {
    toast.error('Provider ID is required')
    return
  }

  isSubmitting.value = true

  try {
    // Remove formatting from phone number
    const phoneNumber = formData.value.phone.replace(/\D/g, '')

    const carrierRequest: CarrierRequest = {
      providerId: formData.value.providerId,
      name: formData.value.name,
      usdotNumber: formData.value.usdot,
      timeZoneId: formData.value.timezone,
      phoneNumber: phoneNumber,
      email: formData.value.email,
      street: formData.value.street,
      city: formData.value.city,
      zipCode: formData.value.zipcode,
      issuerStateId: formData.value.issuerState,
      carrierTerminals: [],
      carrierDriverLogSetting: null,
    }

    await api.post('/api/carriers', carrierRequest, {
      _showSuccessToast: true,
      _successMessage: 'Carrier created successfully',
    })

    emit('submit')
    handleClose()
  } catch (error: any) {
    console.error('Error creating carrier:', error)
    const errorMessage = error.response?.data?.message || 'Failed to create carrier'
    toast.error(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) {
    emit('close')
  }
}

const clearError = (field: keyof FormData) => {
  delete errors.value[field]
}

// Format phone number to US format: +1 (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')

  // Remove leading 1 if present (country code)
  let phoneDigits = digits
  if (digits.length > 0 && digits[0] === '1') {
    phoneDigits = digits.slice(1)
  }

  // Limit to 10 digits for phone number
  const limitedDigits = phoneDigits.slice(0, 10)

  // Always format with +1 prefix
  if (limitedDigits.length === 0) {
    return '+1 '
  } else if (limitedDigits.length <= 3) {
    return `+1 (${limitedDigits}`
  } else if (limitedDigits.length <= 6) {
    return `+1 (${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`
  } else {
    return `+1 (${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`
  }
}

const handlePhoneInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const formatted = formatPhoneNumber(target.value)
  formData.value.phone = formatted
  clearError('phone')
}
</script>
