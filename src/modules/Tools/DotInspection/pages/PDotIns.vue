<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ConfirmModal from '@/modules/Tools/DotInspection/components/CDotInsConfirmModal.vue'
import CreateDotModal from '@/modules/Tools/DotInspection/components/CDotInsModal.vue'
import DotInspectionTable from '@/modules/Tools/DotInspection/components/CDotInsTable.vue'
import { useDotIns } from '@/modules/Tools/DotInspection/composables/useDotIns'
import type { DotInspection } from '@/modules/Tools/DotInspection/types'

const {
  drivers,
  isLoading,
  isRefreshing,
  isConfirmLoading,
  error,
  searchQuery,
  selectedDriver,
  selectedStatus,
  sortKey,
  sortOrder,
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  paginatedDotInspections,
  isCreateModalOpen,
  isConfirmModalOpen,
  confirmModalConfig,
  handleSort,
  goToPage,
  fetchDotInspections,
  createDotInspection,
  openCreateModal,
  closeCreateModal,
  openConfirmModal,
  closeConfirmModal,
  handleConfirmAction,
} = useDotIns()

function toggleStatus(inspection: DotInspection) {
  openConfirmModal(inspection.isEnabled ? 'disable' : 'enable', inspection.id)
}
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-4 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">DOT inspections</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Manage Route ELD driver log freeze periods for the selected company.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input v-model="searchQuery" placeholder="Search inspections" class="w-56 pl-9" />
        </div>
        <Select v-model="selectedDriver">
          <SelectTrigger class="w-52"><SelectValue placeholder="All drivers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All drivers</SelectItem>
            <SelectItem v-for="driver in drivers" :key="driver.id" :value="driver.id">
              {{ driver.displayName }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="selectedStatus">
          <SelectTrigger class="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" :disabled="isRefreshing" @click="fetchDotInspections(true)">
          <RefreshCw :class="['mr-2 h-4 w-4', isRefreshing && 'animate-spin']" />
          Refresh
        </Button>
        <Button @click="openCreateModal()">
          <Plus class="mr-2 h-4 w-4" />
          Create
        </Button>
      </div>
    </div>
    <div
      v-if="error"
      class="mb-4 flex-none rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {{ error }}
    </div>
    <div
      v-if="isLoading && !paginatedDotInspections.length"
      class="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-border"
    >
      <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
    <DotInspectionTable
      v-else
      class="min-h-0 flex-1"
      :dot-inspections="paginatedDotInspections"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :sort-key="sortKey"
      :sort-order="sortOrder"
      @sort="handleSort"
      @toggle-status="toggleStatus"
      @delete="openConfirmModal('delete', $event)"
    />
    <div
      class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">
          {{ totalEntries.toLocaleString() }} entries
        </span>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden items-center gap-1 md:flex">
          <button
            v-for="page in pageNumbers"
            :key="page"
            :disabled="page === '...'"
            :class="[
              'h-8 min-w-8 rounded px-2 text-sm transition-colors',
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted',
            ]"
            @click="typeof page === 'number' && goToPage(page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ totalEntries ? currentPage : 0 }} of {{ totalPages }} pages
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
    <CreateDotModal
      :open="isCreateModalOpen"
      :drivers="drivers"
      @close="closeCreateModal"
      @submit="createDotInspection"
    />
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
