<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-125">
      <DialogHeader>
        <DialogTitle>{{ mode === 'create' ? 'Add User' : 'Edit User' }}</DialogTitle>
        <DialogDescription>
          {{ mode === 'create' ? 'Create a new user account.' : 'Update user information.' }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstName">First Name</Label>
            <Input
              id="firstName"
              v-model="form.firstName"
              placeholder="Enter first name"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="lastName">Last Name</Label>
            <Input id="lastName" v-model="form.lastName" placeholder="Enter last name" required />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="userName">Username</Label>
          <Input id="userName" v-model="form.userName" placeholder="Enter username" required />
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Enter password"
            :required="mode === 'create'"
          />
          <p v-if="form.password.length > 0 && form.password.length < 6" class="text-xs text-muted-foreground">
            Password must be at least 6 characters
          </p>
          <p v-if="formErrors?.password" class="text-xs text-destructive">
            {{ formErrors.password }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="passwordConfirm">Confirm Password</Label>
          <Input
            id="passwordConfirm"
            v-model="form.passwordConfirm"
            type="password"
            placeholder="Confirm password"
            :required="mode === 'create'"
          />
          <p v-if="formErrors?.passwordConfirm" class="text-xs text-destructive">
            {{ formErrors.passwordConfirm }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="role">Role</Label>
          <Select v-model="form.roleId">
            <SelectTrigger class="border-border dark:bg-card">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!--        <div class="flex items-center space-x-2">-->
        <!--          <Switch id="isActive" v-model="form.isActive" />-->
        <!--          <Label for="isActive">Active</Label>-->
        <!--        </div>-->

        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')" class="border-border">
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="!isFormValid"
          >
            {{ mode === 'create' ? 'Create' : 'Save Changes' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Role, User, CreateUserRequest, UpdateUserRequest } from '@/modules/Tools/Users/types'

interface Props {
  open: boolean
  roles: Role[]
  providerId: string
  user?: User | null
  mode: 'create' | 'edit'
  formErrors?: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', data: CreateUserRequest | UpdateUserRequest): void
}>()

const getInitialForm = () => ({
  firstName: '',
  lastName: '',
  userName: '',
  password: '',
  passwordConfirm: '',
  roleId: '',
  isActive: true,
})

const form = ref(getInitialForm())

// Watch for user changes (edit mode)
watch(
  () => props.user,
  (newUser) => {
    if (newUser && props.mode === 'edit') {
      form.value = {
        firstName: newUser.firstName || '',
        lastName: newUser.lastName || '',
        userName: newUser.userName || '',
        password: '',
        passwordConfirm: '',
        roleId: newUser.role?.id || '',
        isActive: newUser.isActive ?? true,
      }
    }
  },
  { immediate: true }
)

// Reset form when modal opens in create mode
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.mode === 'create') {
      form.value = getInitialForm()
    }
  }
)

const isFormValid = computed(() => {
  const f = form.value
  if (!f.firstName.trim() || !f.lastName.trim() || !f.userName.trim()) return false
  if (props.mode === 'create') {
    if (f.password.length < 6) return false
    if (f.password !== f.passwordConfirm) return false
  } else {
    if (f.password && f.password.length < 6) return false
    if (f.password && f.password !== f.passwordConfirm) return false
  }
  return true
})

const handleOpenChange = (value: boolean) => {
  if (!value) {
    emit('close')
  }
}

const handleSubmit = () => {
  const data = {
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    userName: form.value.userName,
    roleId: form.value.roleId,
    isActive: form.value.isActive,
    providerId: props.providerId,
    ...(props.mode === 'create' || form.value.password
      ? {
          password: form.value.password,
          passwordConfirm: form.value.passwordConfirm,
        }
      : {}),
  }

  emit('submit', data as CreateUserRequest | UpdateUserRequest)
}
</script>
