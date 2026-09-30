<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Portal users</h2>
            <!-- Search -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
              />
              <Input v-model="searchQuery" placeholder="Search" class="pl-9 w-64" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Status Filter -->
            <Select v-model="statusFilter">
              <SelectTrigger class="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <!-- Add User Button -->
            <Button
              @click="openAddModal"
              class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            >
              <span class="text-xl mr-1">+</span>
              Add user
            </Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <PortalUsersTable
        :users="paginatedUsers"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @toggle-status="openStatusModal"
        @edit="openEditModal"
      />

      <!-- Footer / Pagination -->
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between"
      >
        <!-- Items per page -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600 dark:text-gray-400">Display on page</span>
          <Select v-model="itemsPerPage">
            <SelectTrigger class="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="10">10</SelectItem>
              <SelectItem :value="25">25</SelectItem>
              <SelectItem :value="50">50</SelectItem>
              <SelectItem :value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ totalEntries.toLocaleString() }} entries
          </span>
        </div>

        <!-- Pagination -->
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              v-for="page in pageNumbers"
              :key="page"
              @click="typeof page === 'number' && goToPage(page)"
              :disabled="page === '...'"
              :class="[
                'min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors',
                page === currentPage
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : page === '...'
                    ? 'text-gray-400 dark:text-gray-500 cursor-default'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
            >
              {{ page }}
            </button>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <div class="flex gap-1">
              <Button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                variant="outline"
                size="icon"
                class="h-8 w-8"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                variant="outline"
                size="icon"
                class="h-8 w-8"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit User Modal -->
    <PortalUsersModal
      :open="isModalOpen"
      :user="editingUser"
      :roles="roles"
      :is-loading-roles="isLoadingRoles"
      @close="closeModal"
      @save="handleSaveUser"
    />

    <!-- Status Confirm Modal -->
    <Dialog :open="isStatusModalOpen" @update:open="(v) => !v && closeStatusModal()">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ statusModalUser?.status ? 'Deactivate' : 'Activate' }} User</DialogTitle>
          <DialogDescription>
            Do you want to {{ statusModalUser?.status ? 'deactivate' : 'activate' }}
            <span class="font-medium">{{ statusModalUser?.name }}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="closeStatusModal">Cancel</Button>
          <Button :disabled="isStatusChanging" @click="submitToggleStatus">
            <span v-if="isStatusChanging" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </span>
            <span v-else>{{ statusModalUser?.status ? 'Deactivate' : 'Activate' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PortalUsersTable from '@/modules/PortalUsers/components/CPortalUsersTable.vue'
import PortalUsersModal from '@/modules/PortalUsers/components/CPortalUsersModal.vue'
import { usePortalUsers } from '@/modules/PortalUsers/composables/usePortalUsers'
import type { PortalUser, PortalUserFormData } from '@/modules/PortalUsers/types'

const {
  searchQuery,
  statusFilter,
  itemsPerPage,
  currentPage,
  sortKey,
  sortOrder,
  paginatedUsers,
  totalPages,
  totalEntries,
  pageNumbers,
  roles,
  isLoadingRoles,
  handleSort,
  goToPage,
  openStatusModal,
  closeStatusModal,
  submitToggleStatus,
  isStatusModalOpen,
  statusModalUser,
  isStatusChanging,
  addUser,
  updateUser,
} = usePortalUsers()

// Add/Edit modal
const isModalOpen = ref(false)
const editingUser = ref<PortalUser | null>(null)

const openAddModal = () => {
  editingUser.value = null
  isModalOpen.value = true
}

const openEditModal = (user: PortalUser) => {
  editingUser.value = { ...user }
  isModalOpen.value = true
}

const handleSaveUser = async (userData: PortalUserFormData) => {
  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, userData)
    } else {
      await addUser(userData)
    }
    isModalOpen.value = false
    editingUser.value = null
  } catch (error) {
    console.error('Error saving user:', error)
  }
}

const closeModal = () => {
  isModalOpen.value = false
  editingUser.value = null
}
</script>
