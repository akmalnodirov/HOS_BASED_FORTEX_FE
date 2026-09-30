<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">HOS Rules</h2>
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
              Add Hos Rules
            </Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <HOSRulesTable
        :hos-rules="paginatedHOSRules"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @edit="openEditModal"
        @delete="handleDeleteRule"
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
    <HOSRulesModal
      :open="isModalOpen"
      :hos-rule="editingRule"
      @close="closeModal"
      @save="handleSaveRule"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmation
      :open="isDeleteModalOpen"
      :is-deleting="isDeleting"
      title="Delete HOS rule"
      description="Are you sure you want to delete this HOS rule? This action cannot be undone."
      @close="isDeleteModalOpen = false"
      @confirm="confirmDeleteRule"
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
import HOSRulesTable from '@/modules/Configuration/HOSRules/components/CHOSRulesTable.vue'
import HOSRulesModal, { type HOSRuleFormData } from '@/modules/Configuration/HOSRules/components/CHOSRulesModal.vue'
import DeleteConfirmation from '@/modules/UserManager/components/CDeleteConfirmation.vue'
import { useHOSRules } from '@/modules/Configuration/HOSRules/composables/useHOSRules'
import type { HOSRule } from '@/modules/Configuration/HOSRules/components/CHOSRulesTable.vue'

const {
  searchQuery,
  itemsPerPage,
  currentPage,
  sortKey,
  sortOrder,
  paginatedHOSRules,
  totalPages,
  totalEntries,
  pageNumbers,
  handleSort,
  goToPage,
  addHOSRule,
  updateHOSRule,
  deleteHOSRule,
} = useHOSRules()

// Modal
const isModalOpen = ref(false)
const editingRule = ref<{ id?: string | number; name: string } | null>(null)

// Delete Modal
const isDeleteModalOpen = ref(false)
const ruleToDelete = ref<HOSRule | null>(null)
const isDeleting = ref(false)

const openAddModal = () => {
  editingRule.value = null
  isModalOpen.value = true
}

const openEditModal = (rule: HOSRule) => {
  editingRule.value = { 
    id: rule.id,
    name: rule.name,
  }
  isModalOpen.value = true
}

const handleSaveRule = async (data: HOSRuleFormData) => {
  try {
    if (editingRule.value && editingRule.value.id) {
      await updateHOSRule(editingRule.value.id, data)
    } else {
      await addHOSRule(data)
    }

    isModalOpen.value = false
    editingRule.value = null
  } catch (error) {
    console.error('Error saving HOS rule:', error)
  }
}

const handleDeleteRule = (rule: HOSRule) => {
  ruleToDelete.value = rule
  isDeleteModalOpen.value = true
}

const confirmDeleteRule = async () => {
  if (ruleToDelete.value) {
    isDeleting.value = true
    try {
      await deleteHOSRule(ruleToDelete.value.id)
      isDeleteModalOpen.value = false
      ruleToDelete.value = null
    } catch (error) {
      console.error('Error deleting HOS rule:', error)
    } finally {
      isDeleting.value = false
    }
  }
}

const closeModal = () => {
  isModalOpen.value = false
  editingRule.value = null
}
</script>
