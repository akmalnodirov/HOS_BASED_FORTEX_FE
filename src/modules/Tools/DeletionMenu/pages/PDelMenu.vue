<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-semibold text-[#090909]">Deletion Menu</h2>
            <div class="relative w-64">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="search"
                placeholder="Search"
                class="pl-9 bg-white dark:bg-card border-border"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Sync Button -->
            <Button
              @click="handleSync"
              :disabled="isLoading"
              variant="default"
              class="bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white px-6"
            >
              Sync
            </Button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && rows.length === 0" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
      </div>

      <!-- Table -->
      <DeletionMenuTable v-else :rows="rows" :is-loading="isLoading" @edit-driver="openEditModal" />

      <!-- Edit Driver Modal -->
      <CDelMenuEditModal
        v-model:open="isModalOpen"
        :drivers="currentDrivers"
        :initial-driver-id="selectedDriverId"
        :is-loading="isLoading"
        @save="handleSaveDriver"
      />

      <!-- Footer / Pagination -->
      <div
        v-if="rows.length > 0"
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
  </div>
</template>
<!-- src/views/DeletionMenuView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DeletionMenuTable from '@/modules/Tools/DeletionMenu/components/CDelMenuTable.vue'
import CDelMenuEditModal from '@/modules/Tools/DeletionMenu/components/CDelMenuEditModal.vue'
import { useDelMenu } from '@/modules/Tools/DeletionMenu/composables/useDelMenu'
import type { Driver } from '@/modules/Tools/DeletionMenu/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from '@/components/ui/select'

const {
  // State
  isLoading,
  error,

  // Table
  rows,
  search,

  // Pagination
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,

  // Functions
  assignDriver,
  handleSync,
} = useDelMenu()

// Modal State
const isModalOpen = ref(false)
const selectedRowId = ref<string | null>(null)
const selectedDriverId = ref<string | null>(null)
const currentDrivers = ref<Driver[]>([])

const openEditModal = (row: any) => {
  selectedRowId.value = row.id
  currentDrivers.value = row.drivers
  selectedDriverId.value = row.drivers.find((d: Driver) => d.isTestDriver)?.driverId || null
  isModalOpen.value = true
}

const handleSaveDriver = async (driverId: string) => {
  if (selectedRowId.value) {
    await assignDriver(driverId, selectedRowId.value)
    isModalOpen.value = false
  }
}
</script>
