<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Issuer States</h2>
            <!-- Search -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
              />
              <Input v-model="searchQuery" placeholder="Search" class="pl-9 w-64" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Add Button -->
            <Button
              @click="openAddModal"
              class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            >
              <span class="text-xl mr-1">+</span>
              Add Issuer State
            </Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <IssuerStatesTable
        :issuer-states="paginatedIssuerStates"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @edit="openEditModal"
        @delete="handleDeleteState"
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

    <!-- Add/Edit Modal -->
    <IssuerStatesModal
      :open="isModalOpen"
      :issuer-state="editingState"
      :parent-options="parentIssuerStates"
      @close="closeModal"
      @save="handleSaveState"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmation
      :open="isDeleteModalOpen"
      :is-deleting="isDeleting"
      title="Delete issuer state"
      description="Are you sure you want to delete this issuer state? This action cannot be undone."
      @close="isDeleteModalOpen = false"
      @confirm="confirmDeleteState"
    />
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
import IssuerStatesTable from '@/modules/Configuration/IssuerStates/components/CIssuerStatesTable.vue'
import IssuerStatesModal, {
  type IssuerStateFormData,
} from '@/modules/Configuration/IssuerStates/components/CIssuerStatesModal.vue'
import DeleteConfirmation from '@/modules/UserManager/components/CDeleteConfirmation.vue'
import { useIssuerStates } from '@/modules/Configuration/IssuerStates/composables/useIssuerStates'
import type { IssuerState } from '@/modules/Configuration/IssuerStates/components/CIssuerStatesTable.vue'

const {
  searchQuery,
  itemsPerPage,
  currentPage,
  sortKey,
  sortOrder,
  paginatedIssuerStates,
  totalPages,
  totalEntries,
  pageNumbers,
  handleSort,
  goToPage,
  addIssuerState,
  updateIssuerState,
  deleteIssuerState,
  parentIssuerStates,
} = useIssuerStates()

// Modal
const isModalOpen = ref(false)
const editingState = ref<{
  id?: string | number
  name: string
  stateCode?: string
  parent?: string
} | null>(null)

// Delete Modal
const isDeleteModalOpen = ref(false)
const stateToDelete = ref<IssuerState | null>(null)
const isDeleting = ref(false)

const openAddModal = () => {
  editingState.value = null
  isModalOpen.value = true
}

const openEditModal = (state: IssuerState) => {
  editingState.value = {
    id: state.id,
    name: state.name,
    stateCode: (state as any).stateCode || '',
    parent: state.parent,
  }
  isModalOpen.value = true
}

const handleSaveState = async (data: IssuerStateFormData) => {
  try {
    if (editingState.value && editingState.value.id) {
      await updateIssuerState(editingState.value.id, data)
    } else {
      await addIssuerState(data)
    }

    isModalOpen.value = false
    editingState.value = null
  } catch (error) {
    console.error('Error saving issuer state:', error)
  }
}

const handleDeleteState = (state: IssuerState) => {
  stateToDelete.value = state
  isDeleteModalOpen.value = true
}

const confirmDeleteState = async () => {
  if (stateToDelete.value) {
    isDeleting.value = true
    try {
      await deleteIssuerState(stateToDelete.value.id)
      isDeleteModalOpen.value = false
      stateToDelete.value = null
    } catch (error) {
      console.error('Error deleting issuer state:', error)
    } finally {
      isDeleting.value = false
    }
  }
}

const closeModal = () => {
  isModalOpen.value = false
  editingState.value = null
}
</script>
