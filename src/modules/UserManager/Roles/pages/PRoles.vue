<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RolesTable from '@/modules/UserManager/Roles/components/CRolesTable.vue'
import RolesModal from '@/modules/UserManager/Roles/components/CRolesModal.vue'
import DeleteConfirmation from '@/modules/UserManager/components/CDeleteConfirmation.vue'
import { useRoles } from '@/modules/UserManager/Roles/composables/useRoles'
import type { Role, RoleFormData } from '@/modules/UserManager/Roles/types'

const roles = useRoles()
const isModalOpen = ref(false)
const editingRole = ref<Role | null>(null)
const roleToDelete = ref<Role | null>(null)
const isDeleting = ref(false)

function openAddModal() {
  editingRole.value = null
  isModalOpen.value = true
}

function openEditModal(role: Role) {
  editingRole.value = role
  isModalOpen.value = true
}

async function saveRole(data: RoleFormData) {
  if (editingRole.value) await roles.updateRole(editingRole.value.id, data)
  else await roles.addRole(data)
  isModalOpen.value = false
  editingRole.value = null
}

async function confirmDeleteRole() {
  if (!roleToDelete.value) return
  isDeleting.value = true
  try {
    await roles.deleteRole(roleToDelete.value.id)
    roleToDelete.value = null
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background">
    <div class="mb-5 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-foreground">Roles</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage portal roles and the permissions assigned to each role.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="roles.searchQuery.value" placeholder="Search roles" class="w-64 pl-9" />
        </div>
        <Button @click="openAddModal">+ Add role</Button>
      </div>
    </div>

    <RolesTable
      class="min-h-0 flex-1"
      :roles="roles.paginatedRoles.value"
      :sort-key="roles.sortKey.value"
      :sort-order="roles.sortOrder.value"
      :loading="roles.isLoading.value"
      :error="roles.error.value"
      @sort="roles.handleSort"
      @edit="openEditModal"
      @delete="roleToDelete = $event"
    />

    <div class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="roles.itemsPerPage.value">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ roles.totalEntries.value }} entries</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden items-center gap-1 md:flex">
          <button
            v-for="page in roles.pageNumbers.value"
            :key="page"
            :disabled="page === '...'"
            :class="[
              'h-8 min-w-8 rounded px-2 text-sm transition-colors',
              page === roles.currentPage.value
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted',
            ]"
            @click="typeof page === 'number' && roles.goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ roles.totalEntries.value ? roles.currentPage.value : 0 }} of {{ roles.totalPages.value }} pages
        </span>
        <Button variant="outline" size="icon" class="h-8 w-8" :disabled="roles.currentPage.value <= 1" @click="roles.goToPage(roles.currentPage.value - 1)">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" class="h-8 w-8" :disabled="roles.currentPage.value >= roles.totalPages.value" @click="roles.goToPage(roles.currentPage.value + 1)">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <RolesModal
      :open="isModalOpen"
      :role="editingRole"
      :role-types="roles.roleTypes.value"
      :permissions="roles.permissions.value"
      @close="isModalOpen = false"
      @save="saveRole"
    />

    <DeleteConfirmation
      :open="Boolean(roleToDelete)"
      :is-deleting="isDeleting"
      title="Delete role"
      description="Are you sure you want to delete this role? This action cannot be undone."
      @close="roleToDelete = null"
      @confirm="confirmDeleteRole"
    />
  </div>
</template>
