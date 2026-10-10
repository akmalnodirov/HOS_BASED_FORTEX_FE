<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PermissionsTable, { type Permission } from '@/modules/UserManager/Permissions/components/CPermissionsTable.vue'
import PermissionsModal, { type PermissionFormData } from '@/modules/UserManager/Permissions/components/CPermissionsModal.vue'
import { usePermissions } from '@/modules/UserManager/Permissions/composables/usePermissions'

const permissions = usePermissions()
const isModalOpen = ref(false)
const editingPermission = ref<Permission | null>(null)

function openEditModal(permission: Permission) {
  editingPermission.value = permission
  isModalOpen.value = true
}

async function savePermission(data: PermissionFormData) {
  if (!editingPermission.value) return
  await permissions.updatePermission(editingPermission.value.id, data)
  isModalOpen.value = false
  editingPermission.value = null
}
</script>

<template>
  <div class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background">
    <div class="mb-5 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-foreground">Permissions</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Review permission keys and update their display names.
        </p>
      </div>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="permissions.searchQuery.value" placeholder="Search permissions" class="w-64 pl-9" />
      </div>
    </div>

    <PermissionsTable
      class="min-h-0 flex-1"
      :permissions="permissions.paginatedPermissions.value"
      :sort-key="permissions.sortKey.value"
      :sort-order="permissions.sortOrder.value"
      :loading="permissions.isLoading.value"
      :error="permissions.error.value"
      @sort="permissions.handleSort"
      @edit="openEditModal"
    />

    <div class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="permissions.itemsPerPage.value">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ permissions.totalEntries.value }} entries</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden items-center gap-1 md:flex">
          <button
            v-for="page in permissions.pageNumbers.value"
            :key="page"
            :disabled="page === '...'"
            :class="[
              'h-8 min-w-8 rounded px-2 text-sm transition-colors',
              page === permissions.currentPage.value
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted',
            ]"
            @click="typeof page === 'number' && permissions.goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ permissions.totalEntries.value ? permissions.currentPage.value : 0 }} of {{ permissions.totalPages.value }} pages
        </span>
        <Button variant="outline" size="icon" class="h-8 w-8" :disabled="permissions.currentPage.value <= 1" @click="permissions.goToPage(permissions.currentPage.value - 1)">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" class="h-8 w-8" :disabled="permissions.currentPage.value >= permissions.totalPages.value" @click="permissions.goToPage(permissions.currentPage.value + 1)">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <PermissionsModal
      :open="isModalOpen"
      :permission="editingPermission"
      @close="isModalOpen = false"
      @save="savePermission"
    />
  </div>
</template>
