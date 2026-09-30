<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="">
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900">Alerts</h2>
            <!-- Search -->
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input v-model="searchQuery" placeholder="Search" class="pl-9 w-64" />
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <AlertsTable
        :alerts="paginatedAlerts"
        :sort-key="sortKey"
        :sort-order="sortOrder"
        @sort="handleSort"
        @send-alert="openSendAlertModal"
        @row-click="handleRowClick"
      />

      <!-- Footer / Pagination -->
      <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <!-- Items per page -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600">Display on page</span>
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
          <span class="text-sm text-gray-600"> {{ totalEntries.toLocaleString() }} entries </span>
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
                  ? 'bg-gray-900 text-white'
                  : page === '...'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 hover:bg-gray-100',
              ]"
            >
              {{ page }}
            </button>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <span class="text-sm text-gray-600"> {{ currentPage }} of {{ totalPages }} pages </span>
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

    <!-- Send Alert Modal -->
    <SendAlertModal
      :open="isModalOpen"
      :alert="selectedAlert"
      @close="closeModal"
      @send="handleSendAlert"
    />
  </div>
</template>
<!-- src/views/AlertsView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AlertsTable from '@/modules/Alerts/components/CAlertsTable.vue'
import SendAlertModal from '@/modules/Alerts/components/CAlertsModal.vue'
import { useAlerts } from '@/modules/Alerts/composables/useAlerts.ts'
import type { Alert, VolumeType } from '@/modules/Alerts/composables/useAlerts.ts'

const {
  searchQuery,
  itemsPerPage,
  currentPage,
  sortKey,
  sortOrder,
  paginatedAlerts,
  totalPages,
  totalEntries,
  pageNumbers,
  handleSort,
  goToPage,
} = useAlerts()

// Modal
const isModalOpen = ref(false)
const selectedAlert = ref<Alert | null>(null)

const openSendAlertModal = (alert: Alert) => {
  selectedAlert.value = alert
  isModalOpen.value = true
}

const handleRowClick = (alert: Alert) => {
  openSendAlertModal(alert)
}

const handleSendAlert = (volume: VolumeType) => {
  console.log('Sending alert with volume:', volume, 'to:', selectedAlert.value?.driverName)
  // Here you would make API call to send alert
  isModalOpen.value = false
  selectedAlert.value = null
}

const closeModal = () => {
  isModalOpen.value = false
  selectedAlert.value = null
}
</script>
