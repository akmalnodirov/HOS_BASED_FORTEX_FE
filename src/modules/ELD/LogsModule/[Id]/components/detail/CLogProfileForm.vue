<template>
  <div>
    <div class="grid grid-cols-2 border border-border rounded-lg">
      <div
        v-for="field in profileFields"
        :key="field.label"
        class="py-2.5 px-4 space-y-1 border-r border-b border-border even:border-r-0 last:border-b-0"
      >
        <p class="text-sm uppercase text-muted-foreground tracking-wide font-normal">
          {{ field.label }}
        </p>
        <p class="text-sm uppercase font-medium tracking-wide text-foreground">
          {{ field.value || '&nbsp;' }}
        </p>
      </div>
    </div>

    <Modal v-model:open="isEditModalOpen">
      <ModalContent class="sm:max-w-[440px]">
        <ModalHeader>
          <ModalTitle>Edit Profile Form</ModalTitle>
        </ModalHeader>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground"> Co-Drivers </label>
            <div class="relative">
              <Select v-model="editForm.coDrivers">
                <SelectTrigger>
                  <SelectValue placeholder="Select Co-Drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="driver in driverOptions" :key="driver.id" :value="driver.id">
                    {{ driver.fullname }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                v-if="editForm.coDrivers"
                type="button"
                variant="ghost"
                size="sm"
                @click="editForm.coDrivers = null"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
            <p v-if="errors['co-drivers']" class="text-xs text-red-500">
              {{ errors['co-drivers'] }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground"> Shipping Docs </label>
            <Input
              v-model="editForm.shippingDocs"
              placeholder="Edit Shipping Docs"
              maxlength="100"
              @input="editForm.shippingDocs = (editForm.shippingDocs || '').slice(0, 100)"
            />
            <p v-if="errors['shipping-docs']" class="text-xs text-red-500">
              {{ errors['shipping-docs'] }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground"> Trailers </label>
            <Input
              v-model="editForm.trailers"
              placeholder="Edit Trailers"
              maxlength="100"
              @input="editForm.trailers = (editForm.trailers || '').slice(0, 100)"
            />
            <p v-if="errors['trailers']" class="text-xs text-red-500">
              {{ errors['trailers'] }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground"> Signature Path </label>
            <div class="relative">
              <Input
                v-model="editForm.signaturePath"
                placeholder="Signature Path"
                @click="showPathSelector = true"
                @focus="showPathSelector = true"
                @input="searchQuery = editForm.signaturePath"
              />
              <Button
                v-if="editForm.signaturePath"
                type="button"
                variant="ghost"
                size="sm"
                @click="editForm.signaturePath = ''"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition"
              >
                <X class="w-4 h-4" />
              </Button>

              <div
                v-if="showPathSelector && filteredPaths.length > 0"
                class="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                <ul>
                  <li
                    v-for="option in filteredPaths"
                    :key="option"
                    @click="selectSignature(option)"
                    class="px-3 py-2 text-sm cursor-pointer hover:bg-accent truncate"
                  >
                    {{ option }}
                  </li>
                </ul>
              </div>
            </div>
            <p v-if="errors['signature']" class="text-xs text-red-500">
              {{ errors['signature'] }}
            </p>
          </div>

          <div class="flex items-center justify-end gap-x-3 pt-4 border-t">
            <Button type="button" variant="outline" @click="handleCancel" class="w-28">
              Cancel
            </Button>
            <Button type="submit" :disabled="disableEditDailyForm" :loading="loading" class="w-28">
              Send
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import type { DriverDailyFormResponse, DriverOption } from '../../types/driverDailyForm.ts'
import { useDriverDailyForm } from '../../composables/useDriverDailyForm.ts'
import type { Dayjs } from 'dayjs'

interface Props {
  driverDailyForm: DriverDailyFormResponse | null
  drivers?: DriverOption[]
  driverId: string
  formDate: Dayjs | string
  certifiedDate: Dayjs | string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update'): void
}>()

const {
  editForm,
  loading,
  showPathSelector,
  searchQuery,
  filteredPaths,
  disableEditDailyForm,
  initializeEditForm,
  updateDriverDailyForm,
  validateEditForm,
  selectSignature,
  togglePathSelector,
} = useDriverDailyForm()

const isEditModalOpen = ref(false)
const errors = ref<Record<string, string>>({})

watch(
  () => props.driverDailyForm,
  (newForm) => {
    if (newForm) {
      editForm.value.coDrivers = newForm.coDriver?.id || null
      editForm.value.shippingDocs = newForm.shippingDocuments.join(',') || ''
      editForm.value.trailers = newForm.trailers.join(',') || ''
      editForm.value.signaturePath = newForm.signaturePath || ''
      editForm.value.signaturePaths = newForm.signaturePaths || []
    }
  },
  { immediate: true }
)

const profileFields = computed(() => {
  const form = props.driverDailyForm
  return [
    {
      label: 'Driver',
      value: form?.driver?.user
        ? `${form.driver.user.firstName || ''} ${form.driver.user.lastName || ''}`.trim()
        : '',
    },
    {
      label: 'Company',
      value: form?.carrier?.name || '',
    },
    {
      label: 'Co-Drivers',
      value: form?.coDriver?.user
        ? `${form.coDriver.user.firstName || ''} ${form.coDriver.user.lastName || ''}`.trim()
        : '',
    },
    {
      label: 'DOT number',
      value: form?.carrier?.usdotNumber || '',
    },
    {
      label: 'Trailers',
      value: form?.trailers?.join(', ') || '',
    },
    {
      label: 'Main office',
      value: form?.driver?.mainOffice || '',
    },
    {
      label: 'Shipping Docs',
      value: form?.shippingDocuments?.join(', ') || '',
    },
  ]
})

const driverOptions = computed(() => {
  return props.drivers || []
})

const handleEdit = () => {
  initializeEditForm()
  isEditModalOpen.value = true
  errors.value = {}
}

const handleCancel = () => {
  isEditModalOpen.value = false
  errors.value = {}
  if (props.driverDailyForm) {
    editForm.value.coDrivers = props.driverDailyForm.coDriver?.id || null
    editForm.value.shippingDocs = props.driverDailyForm.shippingDocuments.join(',') || ''
    editForm.value.trailers = props.driverDailyForm.trailers.join(',') || ''
    editForm.value.signaturePath = props.driverDailyForm.signaturePath || ''
  }
}

const handleSubmit = async () => {
  const validationErrors = validateEditForm()
  if (validationErrors.length > 0) {
    errors.value = {}
    validationErrors.forEach((error) => {
      errors.value[error.path] = error.message
    })
    return
  }

  try {
    await updateDriverDailyForm(props.driverId, props.formDate, props.certifiedDate)
    isEditModalOpen.value = false
    errors.value = {}
    emit('update')
  } catch (error) {
    console.error('Error updating driver daily form:', error)
  }
}

watch(showPathSelector, (isOpen) => {
  if (isOpen) {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.relative')) {
        showPathSelector.value = false
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }
})

defineExpose({
  handleEdit,
})
</script>
