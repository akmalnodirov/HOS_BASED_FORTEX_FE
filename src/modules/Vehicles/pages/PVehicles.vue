<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="mb-5 flex items-center gap-3">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Vehicles</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Vehicle details are synchronized from Route ELD.
        </p>
      </div>
      <div class="relative ml-auto">
        <Search
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        />
        <Input v-model="searchQuery" placeholder="Search" class="w-64 pl-9" />
      </div>
    </div>

    <CVehicleTable
      v-model:items-per-page="itemsPerPage"
      :current-page="currentPage"
      :paginated-vehicles="paginatedVehicles"
      :total-pages="totalPages"
      :total-entries="totalEntries"
      :page-numbers="pageNumbers"
      @sort="handleSort"
      @go-to-page="goToPage"
    />
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import CVehicleTable from '../components/CVehicleTable.vue'
import { useVehicles } from '../composables/useVehicles'

const {
  searchQuery,
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
