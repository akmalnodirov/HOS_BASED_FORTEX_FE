<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { KeyRound, Pencil, RefreshCw, Search, ShieldCheck } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { useApi, getApiErrorMessage } from '@/composables/useAxiosService'
import { readTokenPermissions } from '@/router/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const authStore = useAuthStore()
const api = useApi()
const user = computed(() => authStore.user)
const isSystemAdmin = computed(() => readTokenPermissions(authStore.token).systemAdmin)
const refreshing = ref(false)
const editingProfile = ref(false)
const savingProfile = ref(false)
const profileError = ref('')
const permissionSearch = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const savingPassword = ref(false)
const profileForm = reactive({ firstName: '', lastName: '', email: '', phoneNumber: '' })

const fullName = computed(() =>
  [user.value?.firstName, user.value?.lastName].filter(Boolean).join(' ').trim() ||
  user.value?.userName || 'User'
)
const initials = computed(() =>
  [user.value?.firstName?.[0], user.value?.lastName?.[0]].filter(Boolean).join('').toUpperCase() ||
  user.value?.userName?.slice(0, 2).toUpperCase() || 'U'
)
const roles = computed(() => user.value?.roles ?? [])
const permissions = computed(() => {
  const values = user.value?.effectivePermissions ?? roles.value.flatMap(role => role.permissions ?? [])
  return [...new Map(values.map(permission => [permission.code, permission])).values()]
    .sort((first, second) => first.name.localeCompare(second.name))
})
const visiblePermissions = computed(() => {
  const query = permissionSearch.value.trim().toLowerCase()
  return query
    ? permissions.value.filter(permission =>
        `${permission.name} ${permission.code}`.toLowerCase().includes(query)
      )
    : permissions.value
})

function resetProfileForm() {
  profileForm.firstName = user.value?.firstName ?? ''
  profileForm.lastName = user.value?.lastName ?? ''
  profileForm.email = user.value?.email ?? ''
  profileForm.phoneNumber = user.value?.phoneNumber ?? ''
  profileError.value = ''
}

watch(user, resetProfileForm, { immediate: true })

async function refreshProfile() {
  refreshing.value = true
  try {
    await authStore.fetchCurrentUser()
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'Could not refresh your profile.'))
  } finally {
    refreshing.value = false
  }
}

async function saveProfile() {
  profileError.value = ''
  if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
    profileError.value = 'First and last name are required.'
    return
  }

  savingProfile.value = true
  try {
    await api.put('/api/users/current-user/profile', {
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim() || null,
      phoneNumber: profileForm.phoneNumber.trim() || null,
    }, { _skipErrorToast: true })
    if (user.value) authStore.setUser({
      ...user.value,
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim() || null,
      phoneNumber: profileForm.phoneNumber.trim() || null,
    })
    await authStore.fetchCurrentUser()
    editingProfile.value = false
    toast.success('Profile updated.')
  } catch (error) {
    profileError.value = getApiErrorMessage(error, 'Could not update your profile.')
  } finally {
    savingProfile.value = false
  }
}

function cancelProfileEdit() {
  resetProfileForm()
  editingProfile.value = false
}

async function changePassword() {
  passwordError.value = ''
  if (newPassword.value.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match.'
    return
  }
  if (newPassword.value === currentPassword.value) {
    passwordError.value = 'Choose a different password.'
    return
  }

  savingPassword.value = true
  try {
    await api.put('/api/users/current-user/password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    }, { _skipErrorToast: true })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.success('Password changed. Sign in with your new password.')
    await authStore.logout()
  } catch (error) {
    passwordError.value = getApiErrorMessage(error, 'Could not change password.')
  } finally {
    savingPassword.value = false
  }
}

onMounted(refreshProfile)
</script>

<template>
  <div class="flex h-[calc(100dvh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background">
    <div class="mb-5 flex flex-none flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-foreground">Profile</h1>
        <p class="mt-1 text-sm text-muted-foreground">Manage your account, security, and access.</p>
      </div>
      <Button variant="outline" :disabled="refreshing" @click="refreshProfile">
        <RefreshCw class="mr-2 h-4 w-4" :class="refreshing && 'animate-spin'" />Refresh
      </Button>
    </div>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
      <div class="grid gap-4 xl:grid-cols-2">
        <section class="min-w-0 rounded-lg border border-border bg-card">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 class="text-sm font-semibold">Account details</h2>
              <p class="mt-1 text-xs text-muted-foreground">Your name and contact details are shown across Vectorium.</p>
            </div>
            <Button v-if="!editingProfile" variant="outline" size="sm" @click="editingProfile = true">
              <Pencil class="mr-2 h-4 w-4" />Edit
            </Button>
          </div>
          <form class="space-y-5 p-5" @submit.prevent="saveProfile">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{{ initials }}</div>
              <div class="min-w-0">
                <p class="truncate text-base font-semibold">{{ fullName }}</p>
                <p class="text-xs text-muted-foreground">{{ user?.userName || '—' }}</p>
              </div>
              <span class="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{{ user?.state === 1 ? 'Inactive' : 'Active' }}</span>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="min-w-0">
                <p class="text-xs text-muted-foreground">Username</p>
                <p class="mt-1 break-all text-sm font-medium">{{ user?.userName || '—' }}</p>
              </div>
              <div class="min-w-0">
                <p class="text-xs text-muted-foreground">User ID</p>
                <p class="mt-1 break-all font-mono text-xs">{{ user?.id || '—' }}</p>
              </div>
              <label class="grid gap-1.5 text-sm">
                First name
                <Input v-if="editingProfile" v-model="profileForm.firstName" autocomplete="given-name" maxlength="100" required :disabled="savingProfile" />
                <span v-else class="font-medium">{{ user?.firstName || '—' }}</span>
              </label>
              <label class="grid gap-1.5 text-sm">
                Last name
                <Input v-if="editingProfile" v-model="profileForm.lastName" autocomplete="family-name" maxlength="100" required :disabled="savingProfile" />
                <span v-else class="font-medium">{{ user?.lastName || '—' }}</span>
              </label>
              <label class="grid gap-1.5 text-sm">
                Email
                <Input v-if="editingProfile" v-model="profileForm.email" type="email" autocomplete="email" maxlength="256" :disabled="savingProfile" />
                <span v-else class="break-all font-medium">{{ user?.email || '—' }}</span>
              </label>
              <label class="grid gap-1.5 text-sm">
                Phone number
                <Input v-if="editingProfile" v-model="profileForm.phoneNumber" type="tel" autocomplete="tel" maxlength="64" :disabled="savingProfile" />
                <span v-else class="font-medium">{{ user?.phoneNumber || '—' }}</span>
              </label>
            </div>

            <div class="border-t border-border pt-4">
              <p class="mb-2 text-xs text-muted-foreground">Roles</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="role in roles" :key="role.id" class="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium">{{ role.name }}</span>
                <span v-if="!roles.length" class="text-sm text-muted-foreground">No role assigned</span>
              </div>
            </div>

            <p v-if="profileError" role="alert" class="text-sm text-destructive">{{ profileError }}</p>
            <div v-if="editingProfile" class="flex justify-end gap-2">
              <Button type="button" variant="outline" :disabled="savingProfile" @click="cancelProfileEdit">Cancel</Button>
              <Button type="submit" :disabled="savingProfile">{{ savingProfile ? 'Saving…' : 'Save changes' }}</Button>
            </div>
          </form>
        </section>

        <section id="password" class="min-w-0 rounded-lg border border-border bg-card">
          <div class="border-b border-border px-5 py-4">
            <h2 class="flex items-center gap-2 text-sm font-semibold"><KeyRound class="h-4 w-4" />Change password</h2>
            <p class="mt-1 text-xs text-muted-foreground">Changing your password signs out all sessions.</p>
          </div>
          <form class="space-y-4 p-5" @submit.prevent="changePassword">
            <label class="grid gap-1.5 text-sm">
              Current password
              <Input v-model="currentPassword" type="password" autocomplete="current-password" required :disabled="savingPassword" />
            </label>
            <label class="grid gap-1.5 text-sm">
              New password
              <Input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required :disabled="savingPassword" />
            </label>
            <label class="grid gap-1.5 text-sm">
              Confirm new password
              <Input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required :disabled="savingPassword" />
            </label>
            <p class="text-xs text-muted-foreground">Use at least 8 characters and a password you have not used for this account.</p>
            <p v-if="passwordError" role="alert" class="text-sm text-destructive">{{ passwordError }}</p>
            <div class="flex justify-end">
              <Button type="submit" :disabled="savingPassword">{{ savingPassword ? 'Saving…' : 'Change password' }}</Button>
            </div>
          </form>
        </section>
      </div>

      <section class="overflow-hidden rounded-lg border border-border bg-card">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold">Access &amp; permissions</h2>
            <p class="mt-1 text-xs text-muted-foreground">{{ isSystemAdmin ? 'System admin has full access to Vectorium.' : 'These are the permissions currently granted to your account.' }}</p>
          </div>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="permissionSearch" placeholder="Search permissions" class="w-64 pl-9" />
          </div>
        </div>
        <div v-if="isSystemAdmin" class="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3 text-sm">
          <ShieldCheck class="h-4 w-4 text-emerald-600" />Full access is granted by the SystemAdmin role.
        </div>
        <div class="max-h-88 overflow-auto">
          <table v-if="visiblePermissions.length" class="w-full text-left text-sm">
            <thead class="sticky top-0 bg-muted text-muted-foreground">
              <tr><th class="px-5 py-3 font-medium">Permission</th><th class="px-5 py-3 font-medium">Code</th></tr>
            </thead>
            <tbody>
              <tr v-for="permission in visiblePermissions" :key="permission.id || permission.code" class="border-t border-border">
                <td class="px-5 py-3 font-medium">{{ permission.name }}</td>
                <td class="break-all px-5 py-3 font-mono text-xs text-muted-foreground">{{ permission.code }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="px-5 py-10 text-center text-sm text-muted-foreground">
            {{ refreshing ? 'Loading permissions…' : permissionSearch ? 'No matching permissions.' : isSystemAdmin ? 'Full access is active.' : 'No permissions assigned.' }}
          </p>
        </div>
        <div class="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {{ visiblePermissions.length }} of {{ permissions.length }} permissions
        </div>
      </section>
    </div>
  </div>
</template>
