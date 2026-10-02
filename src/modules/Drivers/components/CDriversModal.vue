<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import type { Driver, RouteEldDriverUpdateFormData } from '@/modules/Drivers/types'

interface Props {
  open: boolean
  driver: Driver | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'save', data: RouteEldDriverUpdateFormData): void
}>()

const formData = ref<RouteEldDriverUpdateFormData>({
  password: '',
  confirmPassword: '',
  hasVan: false,
  trailers: '',
  disableSleeperBerth: false,
})
const errors = ref<Partial<Record<keyof RouteEldDriverUpdateFormData, string>>>({})
const isSubmitting = ref(false)
const fullName = computed(() => props.driver?.name || '')

watch(
  () => [props.open, props.driver] as const,
  ([isOpen, driver]) => {
    if (!isOpen || !driver) return
    formData.value = {
      password: '',
      confirmPassword: '',
      hasVan: driver.hasVan ?? false,
      trailers: driver.trailers ?? '',
      disableSleeperBerth: driver.disableSleeperBerth ?? false,
    }
    errors.value = {}
  },
  { immediate: true }
)

const validate = () => {
  errors.value = {}
  if (!formData.value.password && !formData.value.confirmPassword) return true
  if (formData.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
  }
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
  }
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  isSubmitting.value = true
  try {
    emit('save', { ...formData.value })
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  if (!isSubmitting.value) emit('close')
}
</script>

<template>
  <Modal :open="open" @update:open="handleClose">
    <ModalContent class="max-w-[620px]">
      <ModalHeader>
        <ModalTitle class="text-2xl font-semibold">Edit driver</ModalTitle>
      </ModalHeader>

      <form class="mt-4 space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-lg border bg-muted/30 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs text-muted-foreground">Driver</p>
              <p class="font-medium">{{ fullName || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Login</p>
              <p class="font-medium">{{ driver?.username || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Email</p>
              <p class="font-medium">{{ driver?.email || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Phone</p>
              <p class="font-medium">{{ driver?.phoneNumber || '—' }}</p>
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="password">New mobile password</Label>
            <Input
              id="password"
              v-model="formData.password"
              type="password"
              placeholder="Leave blank to keep current"
              :class="errors.password && 'border-red-500'"
              :disabled="isSubmitting"
            />
            <p v-if="errors.password" class="text-sm text-red-600">{{ errors.password }}</p>
          </div>
          <div class="space-y-2">
            <Label for="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              v-model="formData.confirmPassword"
              type="password"
              placeholder="Confirm new password"
              :class="errors.confirmPassword && 'border-red-500'"
              :disabled="isSubmitting"
            />
            <p v-if="errors.confirmPassword" class="text-sm text-red-600">
              {{ errors.confirmPassword }}
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <Label>DashCam permissions</Label>
          <div class="grid gap-3 sm:grid-cols-2">
            <Label for="hasVan" class="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <Checkbox id="hasVan" v-model:checked="formData.hasVan" :disabled="isSubmitting" />
              <span class="font-normal">VAN permission</span>
            </Label>
            <Label
              for="disableSleeperBerth"
              class="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
            >
              <Checkbox
                id="disableSleeperBerth"
                v-model:checked="formData.disableSleeperBerth"
                :disabled="isSubmitting"
              />
              <span class="font-normal">Disable sleeper berth</span>
            </Label>
          </div>
          <div v-if="formData.hasVan" class="space-y-2">
            <Label for="trailers">Trailers</Label>
            <Input
              id="trailers"
              v-model="formData.trailers"
              placeholder="Trailer numbers"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="handleClose">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">Save</Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>
