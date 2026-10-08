<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-5 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Vehicles</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Vehicle details are synchronized from Route ELD.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <Input v-model="searchQuery" placeholder="Search" class="w-64 pl-9" />
        </div>
        <Select v-model="statusFilter">
          <SelectTrigger class="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <CVehicleTable
      class="min-h-0 flex-1"
      :vehicles="paginatedVehicles"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      @sort="handleSort"
    />

    <!-- Footer / Pagination -->
    <div
      class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <!-- Items per page -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-400">Display on page</span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="h-9 w-20">
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
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CVehicleTable from '../components/CVehicleTable.vue'
import { useVehicles } from '../composables/useVehicles'

const {
  searchQuery,
  statusFilter,
  itemsPerPage,
  currentPage,
  paginatedVehicles,
  totalPages,
  totalEntries,
  pageNumbers,
  handleSort,
  goToPage,
} = useVehicles()
</script>
