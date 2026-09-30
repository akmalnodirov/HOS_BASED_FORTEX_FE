<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="">
      <!-- Header -->
      <div class="pb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-semibold text-[#090909]">Users</h2>
            <!-- Search -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              />
              <Input
                v-model="searchQuery"
                placeholder="Search"
                class="pl-9 w-64 border-border text-foreground"
                :disabled="isLoading"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Status Filter -->
            <Select v-model="selectedStatus">
              <SelectTrigger class="w-40 border-border dark:bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>

            <!-- Add User Button -->
            <Button
              @click="openCreateModal"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span class="text-xl mr-1">+</span>
              Add user
            </Button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading && paginatedUsers.length === 0"
        class="flex items-center justify-center py-12"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
      </div>

      <!-- Table -->
      <UsersTable
        v-else
        :users="paginatedUsers"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        :get-status-badge="getStatusBadge"
        :get-status-badge-class="getStatusBadgeClass"
        @sort="handleSort"
        @toggle-status="openStatusModal"
        @edit="openEditModal"
        @delete="openDeleteModal"
      />

      <!-- Footer / Pagination -->
      <div
        v-if="paginatedUsers.length > 0 || totalEntries > 0"
        class="px-6 py-4 border-t border-border flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted-foreground">Display on page</span>
          <Select v-model="itemsPerPage">
            <SelectTrigger class="w-20 border-border dark:bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="10">10</SelectItem>
              <SelectItem :value="25">25</SelectItem>
              <SelectItem :value="50">50</SelectItem>
              <SelectItem :value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span class="text-sm text-muted-foreground"> {{ totalEntries }} entries </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1">
            <button
              v-for="page in pageNumbers"
              :key="page"
              @click="typeof page === 'number' && goToPage(page)"
              :disabled="page === '...'"
              :class="[
                'min-w-8 h-8 px-2 text-sm font-medium rounded transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground'
                  : page === '...'
                    ? 'text-muted-foreground/50 cursor-default'
                    : 'text-foreground hover:bg-accent',
              ]"
            >
              {{ page }}
            </button>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <span class="text-sm text-muted-foreground">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <div class="flex gap-1">
              <Button
                @click="goToPage(currentPage - 1)"
                :disabled="currentPage === 1"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronLeft class="w-4 h-4" />
              </Button>
              <Button
                @click="goToPage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                variant="outline"
                size="icon"
                class="h-8 w-8 border-border"
              >
                <ChevronRight class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Toggle Confirmation Modal -->
    <Dialog :open="isStatusModalOpen" @update:open="(v: boolean) => !v && closeStatusModal()">
      <DialogContent class="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>{{ statusModalUser?.isActive ? 'Disable' : 'Enable' }} User</DialogTitle>
          <DialogDescription>
            Do you really want to {{ statusModalUser?.isActive ? 'disable' : 'enable' }}
            <span class="font-semibold">
              {{ statusModalUser?.firstName }} {{ statusModalUser?.lastName }}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="closeStatusModal">Cancel</Button>
          <Button @click="submitToggleStatus">
            {{ statusModalUser?.isActive ? 'Disable' : 'Enable' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Modal -->
    <Dialog :open="isDeleteModalOpen" @update:open="(v: boolean) => !v && closeDeleteModal()">
      <DialogContent class="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Do you really want to delete
            <span class="font-semibold">
              {{ deleteModalUser?.firstName }} {{ deleteModalUser?.lastName }}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="closeDeleteModal">Cancel</Button>
          <Button variant="destructive" @click="submitDeleteUser">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Create User Modal -->
    <UserModal
      :open="isCreateModalOpen"
      :roles="providerRoles"
      :provider-id="providerId"
      :form-errors="formErrors"
      mode="create"
      @close="closeCreateModal"
      @submit="handleCreateSubmit"
    />

    <!-- Edit User Modal -->
    <UserModal
      :open="isEditModalOpen"
      :roles="providerRoles"
      :provider-id="providerId"
      :form-errors="formErrors"
      :user="selectedUser"
      mode="edit"
      @close="closeEditModal"
      @submit="handleEditSubmit"
    />
  </div>
</template>
<!-- src/views/UsersView.vue -->
<script setup lang="ts">
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
import UsersTable from '@/modules/Tools/Users/components/CUsersTable.vue'
import UserModal from '@/modules/Tools/Users/components/CUsersModal.vue'
import { useUsers } from '@/modules/Tools/Users/composables/useUsers'
import type { CreateUserRequest, UpdateUserRequest } from '@/modules/Tools/Users/types'

const {
  // State
  providerRoles,
  isLoading,
  error,

  // Search
  searchQuery,

  // Filters
  selectedStatus,

  // Modal state
  isCreateModalOpen,
  isEditModalOpen,
  selectedUser,
  isStatusModalOpen,
  statusModalUser,
  isDeleteModalOpen,
  deleteModalUser,

  // Sorting
  sortKey,
  sortOrder,

  // Pagination
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,

  // Computed
  paginatedUsers,

  // Validation
  formErrors,
  validateForm,

  // Functions
  handleSort,
  openCreateModal,
  closeCreateModal,
  openEditModal,
  closeEditModal,
  createUser,
  updateUser,
  openStatusModal,
  submitToggleStatus,
  closeStatusModal,
  openDeleteModal,
  submitDeleteUser,
  closeDeleteModal,
  getStatusBadge,
  getStatusBadgeClass,

  // Auth
  providerId,
} = useUsers()

const handleCreateSubmit = (data: CreateUserRequest | UpdateUserRequest) => {
  const formData = data as CreateUserRequest
  if (!validateForm(formData, false)) return
  createUser(formData)
}

const handleEditSubmit = (data: CreateUserRequest | UpdateUserRequest) => {
  if (!selectedUser.value) return
  const formData = data as UpdateUserRequest
  if (!validateForm(formData, true)) return
  updateUser(selectedUser.value.id, formData)
}
</script>
