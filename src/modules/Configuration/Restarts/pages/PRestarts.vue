<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Restarts</h2>
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
              Add Restart
            </Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <RestartsTable
        :restarts="paginatedRestarts"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @edit="openEditModal"
        @delete="handleDeleteRestart"
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
    <RestartsModal
      :open="isModalOpen"
      :restart="editingRestart"
      @close="closeModal"
      @save="handleSaveRestart"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmation
      :open="isDeleteModalOpen"
      :is-deleting="isDeleting"
      title="Delete restart"
      description="Are you sure you want to delete this restart? This action cannot be undone."
      @close="isDeleteModalOpen = false"
      @confirm="confirmDeleteRestart"
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
import RestartsTable from '@/modules/Configuration/Restarts/components/CRestartsTable.vue'
import RestartsModal, { type RestartFormData } from '@/modules/Configuration/Restarts/components/CRestartsModal.vue'
import DeleteConfirmation from '@/modules/UserManager/components/CDeleteConfirmation.vue'
import { useRestarts } from '@/modules/Configuration/Restarts/composables/useRestarts'
import type { Restart } from '@/modules/Configuration/Restarts/components/CRestartsTable.vue'

const {
  searchQuery,
  itemsPerPage,
  currentPage,
  sortKey,
  sortOrder,
  paginatedRestarts,
  totalPages,
  totalEntries,
  pageNumbers,
  handleSort,
  goToPage,
  addRestart,
  updateRestart,
  deleteRestart,
} = useRestarts()

// Modal
const isModalOpen = ref(false)
const editingRestart = ref<{ id?: string | number; name: string } | null>(null)

// Delete Modal
const isDeleteModalOpen = ref(false)
const restartToDelete = ref<Restart | null>(null)
const isDeleting = ref(false)

const openAddModal = () => {
  editingRestart.value = null
  isModalOpen.value = true
}

const openEditModal = (restart: Restart) => {
  editingRestart.value = { 
    id: restart.id,
    name: restart.name,
  }
  isModalOpen.value = true
}

const handleSaveRestart = async (data: RestartFormData) => {
  try {
    if (editingRestart.value && editingRestart.value.id) {
      await updateRestart(editingRestart.value.id, data)
    } else {
      await addRestart(data)
    }

    isModalOpen.value = false
    editingRestart.value = null
  } catch (error) {
    console.error('Error saving restart:', error)
  }
}

const handleDeleteRestart = (restart: Restart) => {
  restartToDelete.value = restart
  isDeleteModalOpen.value = true
}

const confirmDeleteRestart = async () => {
  if (restartToDelete.value) {
    isDeleting.value = true
    try {
      await deleteRestart(restartToDelete.value.id)
      isDeleteModalOpen.value = false
      restartToDelete.value = null
    } catch (error) {
      console.error('Error deleting restart:', error)
    } finally {
      isDeleting.value = false
    }
  }
}

const closeModal = () => {
  isModalOpen.value = false
  editingRestart.value = null
}
</script>
