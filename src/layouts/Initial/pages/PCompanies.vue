<!-- src/views/CompaniesView.vue -->
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
import CompaniesAccordion from '@/layouts/Initial/components/CompanyAccordion.vue'
import CreateCompanyModal from '@/layouts/Initial/components/CreateCompanyModal.vue'
import { useCompanies } from '@/layouts/Initial/composables/useCompanies.ts'

const {
  // State
  isLoading,
  error,
  isCreateModalOpen,
  providers,

  // Search
  searchCompany,
  searchUsdot,

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
  paginatedProviders,

  // Functions
  handleSort,
  getSortIcon,
  toggleCarrierStatus,
  handleCreateCompany,
  openCreateModal,
  closeCreateModal,
  refreshProviders,
} = useCompanies()

const handleEditCarrier = (providerId: string, carrierId: string) => {
  console.log('Edit carrier:', providerId, carrierId)
  // Open edit modal here
}

const handleModalSubmit = async () => {
  await refreshProviders()
}
</script>

<template>
  <div class="flex flex-col min-h-[calc(100vh-124px)] bg-white p-[16px_24px]">
    <!-- Header -->
    <div class="shrink-0 mb-5">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-foreground">Companies</h2>

        <div class="flex items-center gap-3">
          <!-- Search Company -->
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <Input
              v-model="searchCompany"
              placeholder="Search company"
              class="pl-9 w-64 border-border text-foreground"
              :disabled="isLoading"
            />
          </div>

          <!-- Search USDOT -->
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            />
            <Input
              v-model="searchUsdot"
              placeholder="Search USDOT"
              class="pl-9 w-64 border-border text-foreground"
              :disabled="isLoading"
            />
          </div>

          <!-- Create Carrier Button -->
          <Button
            @click="openCreateModal"
            :disabled="isLoading"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create Carrier
          </Button>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 min-h-0">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
        <Button
          @click="() => useCompanies().fetchProviders()"
          variant="outline"
          class="mt-4 border-border"
        >
          Try Again
        </Button>
      </div>

      <!-- Accordion -->
      <CompaniesAccordion
        v-else
        :providers="paginatedProviders"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @toggle-carrier-status="toggleCarrierStatus"
        @edit-carrier="handleEditCarrier"
      />
    </div>

    <!-- Footer -->
    <div class="mt-auto shrink-0 py-4 flex items-center justify-between">
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

  <!-- Create Carrier Modal -->
  <CreateCompanyModal
    :open="isCreateModalOpen"
    @close="closeCreateModal"
    @submit="handleModalSubmit"
  />
</template>
