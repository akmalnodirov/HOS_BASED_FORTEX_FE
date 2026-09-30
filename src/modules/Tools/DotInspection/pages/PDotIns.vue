<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="">
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-semibold text-foreground">DOT Inspection</h2>

          <div class="flex items-center gap-3">
            <!-- Carrier Filter -->
            <Select v-model="selectedCarrier">
              <SelectTrigger class="w-48 dark:bg-card border-border">
                <SelectValue placeholder="Company search" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in carrierOptions" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Driver Filter -->
            <Select v-model="selectedDriver">
              <SelectTrigger class="w-48 dark:bg-card border-border">
                <SelectValue placeholder="Driver search" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in driverOptions" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
                <div v-if="!driverOptions.length" class="py-2 px-3 text-sm text-muted-foreground">
                  No drivers
                </div>
              </SelectContent>
            </Select>

            <!-- Tag Filter -->
            <Select v-model="selectedTag">
              <SelectTrigger class="w-32 dark:bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            <!-- Create Button -->
            <Button
              @click="openCreateModal"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create
            </Button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading && paginatedDotInspections.length === 0"
        class="flex items-center justify-center py-12"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        ></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
      </div>

      <!-- Table -->
      <DotInspectionTable
        v-else
        :dot-inspections="paginatedDotInspections"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        :get-status-badge="getStatusBadge"
        :get-status-badge-class="getStatusBadgeClass"
        @sort="handleSort"
        @toggle-status="handleToggleStatus"
        @delete="handleDelete"
      />

      <!-- Footer / Pagination -->
      <div
        v-if="paginatedDotInspections.length > 0"
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

        <div class="flex items-center gap-4">
          <div class="flex gap-1">
            <button
              v-for="page in pageNumbers"
              :key="page"
              @click="typeof page === 'number' && goToPage(page)"
              :disabled="page === '...'"
              :class="[
                'min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors',
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

          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <Button
              @click="previousPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="icon"
              class="h-8 w-8 border-border"
            >
              <ChevronLeft class="w-4 h-4" />
            </Button>
            <Button
              @click="nextPage"
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

    <!-- Create Dot Modal -->
    <CreateDotModal
      :open="isCreateModalOpen"
      :carriers="carriers"
      @close="closeCreateModal"
      @submit="createDotInspection"
    />

    <!-- Confirm Modal -->
    <ConfirmModal
      v-if="confirmModalConfig"
      :open="isConfirmModalOpen"
      :message="confirmModalConfig.message"
      :loading="isConfirmLoading"
      @close="closeConfirmModal"
      @confirm="handleConfirmAction"
    />
  </div>
</template>
<!-- src/views/DotInspectionView.vue -->
<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DotInspectionTable from '@/modules/Tools/DotInspection/components/CDotInsTable.vue'
import CreateDotModal from '@/modules/Tools/DotInspection/components/CDotInsModal.vue'
import ConfirmModal from '@/modules/Tools/DotInspection/components/CDotInsConfirmModal.vue'
import { useDotIns } from '@/modules/Tools/DotInspection/composables/useDotIns'

const {
  // State
  isLoading,
  error,
  carriers,
  drivers,
  carrierOptions,
  driverOptions,

  // Filters
  selectedCarrier,
  selectedDriver,
  selectedTag,

  // Modal state
  isCreateModalOpen,
  isConfirmModalOpen,
  isConfirmLoading,
  confirmModalConfig,

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
  nextPage,
  previousPage,

  // Computed
  paginatedDotInspections,

  // Functions
  handleSort,
  openCreateModal,
  closeCreateModal,
  createDotInspection,
  openConfirmModal,
  closeConfirmModal,
  handleConfirmAction,
  getStatusBadge,
  getStatusBadgeClass,
} = useDotIns()

const handleToggleStatus = (dotId: string, currentStatus: number) => {
  const type = currentStatus === 0 ? 'disable' : 'enable'
  openConfirmModal(type, dotId)
}

const handleDelete = (dotId: string) => {
  openConfirmModal('delete', dotId)
}
</script>
