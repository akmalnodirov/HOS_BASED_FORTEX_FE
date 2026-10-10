<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PortalUsersTable from '@/modules/Users/components/CUsersTable.vue'
import PortalUsersModal from '@/modules/Users/components/CUsersModal.vue'
import { usePortalUsers } from '@/modules/Users/composables/useUsers'
import type { User, UserFormData } from '@/modules/Users/types'

const users = usePortalUsers()
const isModalOpen = ref(false)
const editingUser = ref<User | null>(null)
const deleteUser = ref<User | null>(null)
const deleting = ref(false)

function openAddModal() {
  editingUser.value = null
  isModalOpen.value = true
}

function openEditModal(user: User) {
  editingUser.value = user
  isModalOpen.value = true
}

async function saveUser(data: UserFormData) {
  if (editingUser.value) await users.updateUser(editingUser.value.id, data, editingUser.value.status)
  else await users.addUser(data)
  isModalOpen.value = false
  editingUser.value = null
}

async function confirmDelete() {
  if (!deleteUser.value) return
  deleting.value = true
  try {
    await users.removeUser(deleteUser.value)
    deleteUser.value = null
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background">
    <div class="mb-5 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-foreground">Uers</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage Route ELD dispatchers, roles, and company access.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="users.searchQuery.value" placeholder="Search" class="w-64 pl-9" />
        </div>
        <Select v-model="users.statusFilter.value">
          <SelectTrigger class="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button @click="openAddModal">+ Add user</Button>
      </div>
    </div>

    <PortalUsersTable
      class="min-h-0 flex-1"
      :users="users.paginatedUsers.value"
      :sort-key="users.sortKey.value"
      :sort-order="users.sortOrder.value"
      @sort="users.handleSort"
      @toggle-status="users.openStatusModal"
      @edit="openEditModal"
      @delete="deleteUser = $event"
    />

    <div class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="users.itemsPerPage.value">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ users.totalEntries.value }} entries</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden items-center gap-1 md:flex">
          <button
            v-for="page in users.pageNumbers.value"
            :key="page"
            :disabled="page === '...'"
            :class="[
              'h-8 min-w-8 rounded px-2 text-sm transition-colors',
              page === users.currentPage.value
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted',
            ]"
            @click="typeof page === 'number' && users.goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ users.totalEntries.value ? users.currentPage.value : 0 }} of {{ users.totalPages.value }} pages
        </span>
        <Button variant="outline" size="icon" class="h-8 w-8" :disabled="users.currentPage.value <= 1" @click="users.goToPage(users.currentPage.value - 1)">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" class="h-8 w-8" :disabled="users.currentPage.value >= users.totalPages.value" @click="users.goToPage(users.currentPage.value + 1)">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <PortalUsersModal
      :open="isModalOpen"
      :user="editingUser"
      :roles="users.roles.value"
      :companies="users.companies.value"
      :is-loading-roles="users.isLoadingRoles.value"
      @close="isModalOpen = false"
      @save="saveUser"
    />

    <Dialog :open="users.isStatusModalOpen.value" @update:open="(value) => !value && users.closeStatusModal()">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ users.statusModalUser.value?.status ? 'Deactivate' : 'Activate' }} user</DialogTitle>
          <DialogDescription>
            This changes login access for {{ users.statusModalUser.value?.name }}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="users.closeStatusModal">Cancel</Button>
          <Button :disabled="users.isStatusChanging.value" @click="users.submitToggleStatus">
            {{ users.isStatusChanging.value ? 'Saving...' : 'Confirm' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="Boolean(deleteUser)" @update:open="(value) => !value && (deleteUser = null)">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove user</DialogTitle>
          <DialogDescription>
            Remove login access for {{ deleteUser?.name }}? Existing audit history will be retained.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="deleteUser = null">Cancel</Button>
          <Button variant="destructive" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Removing...' : 'Remove' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
