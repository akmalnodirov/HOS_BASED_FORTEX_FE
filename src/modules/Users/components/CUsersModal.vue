<template>
  <Modal :open="open" @update:open="(value) => !value && handleClose()">
    <ModalContent class="max-w-[620px]">
      <ModalHeader>
        <ModalTitle class="text-lg font-semibold">
          {{ isEditMode ? 'Edit user' : 'Add user' }}
        </ModalTitle>
      </ModalHeader>

      <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="portal-name">Name</Label>
            <Input id="portal-name" v-model="form.name" placeholder="Full name" :disabled="saving" />
            <p v-if="errors.name" class="text-xs text-destructive">{{ errors.name }}</p>
          </div>
          <div class="space-y-2">
            <Label for="portal-email">Email</Label>
            <Input
              id="portal-email"
              v-model="form.email"
              type="email"
              placeholder="name@company.com"
              :disabled="saving"
            />
            <p v-if="errors.email" class="text-xs text-destructive">{{ errors.email }}</p>
          </div>
          <div class="space-y-2">
            <Label for="portal-password">
              Password <span v-if="isEditMode" class="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="portal-password" v-model="form.password" type="password" :disabled="saving" />
            <p v-if="errors.password" class="text-xs text-destructive">{{ errors.password }}</p>
          </div>
          <div class="space-y-2">
            <Label for="portal-confirm">Confirm password</Label>
            <Input id="portal-confirm" v-model="form.confirmPassword" type="password" :disabled="saving" />
            <p v-if="errors.confirmPassword" class="text-xs text-destructive">
              {{ errors.confirmPassword }}
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="portal-role">Role</Label>
          <Select v-model="form.roleId" :disabled="saving || isLoadingRoles">
            <SelectTrigger id="portal-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="errors.roleId" class="text-xs text-destructive">{{ errors.roleId }}</p>
          <p v-if="selectedRole" class="text-xs text-muted-foreground">
            {{ selectedRole.permissions.length }} Route ELD permissions assigned through this role.
          </p>
        </div>

        <div class="space-y-2">
          <Label>Companies</Label>
          <CIftaMultiSelect
            v-model="form.companyIds"
            :options="companyOptions"
            placeholder="Select companies"
            search-placeholder="Search companies"
            searchable
            show-chips
            show-select-all
          />
          <p v-if="errors.companyIds" class="text-xs text-destructive">{{ errors.companyIds }}</p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" :disabled="saving" @click="handleClose">Cancel</Button>
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Saving...' : isEditMode ? 'Save changes' : 'Add user' }}
          </Button>
        </div>
      </form>
    </ModalContent>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/custom/modal'
import CIftaMultiSelect from '@/modules/Ifta/components/CIftaMultiSelect.vue'
import type {
  DispatcherCompany,
  User,
  UserFormData,
  Role,
} from '@/modules/Users/types'

const props = withDefaults(
  defineProps<{
    open: boolean
    user?: User | null
    roles?: Role[]
    companies?: DispatcherCompany[]
    isLoadingRoles?: boolean
  }>(),
  { user: null, roles: () => [], companies: () => [], isLoadingRoles: false }
)
const emit = defineEmits<{
  (event: 'close'): void
  (event: 'save', data: UserFormData): void
}>()

const blank = (): UserFormData => ({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  roleId: '',
  companyIds: [],
})
const form = reactive<UserFormData>(blank())
const errors = ref<Partial<Record<keyof UserFormData, string>>>({})
const saving = ref(false)
const isEditMode = computed(() => Boolean(props.user))
const companyOptions = computed(() => props.companies.map((item) => ({ value: item.id, label: item.name })))
const selectedRole = computed(() => props.roles.find((role) => role.id === form.roleId))

watch(
  [() => props.open, () => props.user],
  ([open, user]) => {
    if (!open) return
    Object.assign(
      form,
      user
        ? {
            name: user.name,
            email: user.email,
            password: '',
            confirmPassword: '',
            roleId: user.roleId,
            companyIds: user.companies.map((company) => company.id),
          }
        : blank()
    )
    errors.value = {}
  },
  { immediate: true }
)

function validate() {
  const next: Partial<Record<keyof UserFormData, string>> = {}
  if (!form.name.trim()) next.name = 'Name is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.'
  if (!isEditMode.value && form.password.length < 6) next.password = 'Use at least 6 characters.'
  if (form.password && form.password.length < 6) next.password = 'Use at least 6 characters.'
  if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.'
  if (!form.roleId) next.roleId = 'Role is required.'
  if (!form.companyIds.length) next.companyIds = 'Select at least one company.'
  errors.value = next
  return Object.keys(next).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    emit('save', { ...form, companyIds: [...form.companyIds] })
  } finally {
    saving.value = false
  }
}

function handleClose() {
  if (!saving.value) emit('close')
}
</script>
