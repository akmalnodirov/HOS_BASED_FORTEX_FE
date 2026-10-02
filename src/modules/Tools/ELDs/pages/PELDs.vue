<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="">
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-foreground">ELDs</h2>
            <!-- Search -->
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              />
              <Input
                placeholder="Search"
                class="pl-9 w-64 border-border text-foreground"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <Select v-model="connectionFilter">
              <SelectTrigger class="w-40 dark:bg-card border-border">
                <SelectValue placeholder="Connection status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        ></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
      </div>

      <!-- Table -->
      <CELDTables
        v-else
        :elds="elds"
        :current-page="currentPage"
        :items-per-page="itemsPerPage"
        @select="openUpdateModal"
      />

      <!-- Footer / Pagination -->
      <div
        v-if="elds.length > 0 || totalEntries > 0"
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

          <div class="flex items-center gap-2 ml-4">
            <span class="text-sm text-muted-foreground">
              {{ currentPage }} of {{ totalPages }} pages
            </span>
            <div class="flex gap-1">
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

    <!-- Update ELD Modal -->
    <CELDModal
      :open="isUpdateModalOpen"
      :eld="selectedEld"
      :is-loading="isLoading"
      @close="closeUpdateModal"
      @save="updateEldFile"
    />
  </div>
</template>

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
import CELDTables from '@/modules/Tools/ELDs/components/CELDTables.vue'
import CELDModal from '@/modules/Tools/ELDs/components/CELDModal.vue'
import { useELDs } from '@/modules/Tools/ELDs/composables/useELDs'
import { getCompanyId } from '@/utils/company'
import { computed } from 'vue'

const companyId = getCompanyId() || '' // fallback to empty, assuming auth validation happens elsewhere or mock

const {
  // State
  elds,
  isLoading,
  error,
  connectionFilter,

  // Pagination
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  nextPage,
  previousPage,

  // Modal
  isUpdateModalOpen,
  selectedEld,
  openUpdateModal,
  closeUpdateModal,

  // Actions
  updateEldFile,
} = useELDs({
  companyId,
  autoFetch: true,
})
</script>

<style scoped></style>
