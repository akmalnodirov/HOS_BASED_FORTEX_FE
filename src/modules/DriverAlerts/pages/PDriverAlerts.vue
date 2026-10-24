<script setup lang="ts">
import { ref } from 'vue'
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
import DriverAlertsTable from '@/modules/DriverAlerts/components/CDriverAlertsTable.vue'
import SendAlertModal from '@/modules/DriverAlerts/components/CSendAlertModal.vue'
import { useDriverAlerts } from '@/modules/DriverAlerts/composables/useDriverAlerts'
import type { AlertDriver, AlertMusicType } from '@/modules/DriverAlerts/types'

const {
  drivers,
  isLoading,
  isSending,
  error,
  searchQuery,
  handleSort,
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  paginatedDrivers,
  sendAlert,
} = useDriverAlerts()

const isModalOpen = ref(false)
const modalDriver = ref<AlertDriver | null>(null)

const openModal = (driver: AlertDriver) => {
  modalDriver.value = driver
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  modalDriver.value = null
}

const handleSend = async (payload: { driver: AlertDriver; musicType: AlertMusicType }) => {
  if (await sendAlert(payload.driver, payload.musicType)) closeModal()
}
</script>

<template>
  <div
    class="flex h-[calc(100vh-65px)] min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
  >
    <div class="mb-5 flex flex-none items-center gap-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Alerts</h2>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          v-model="searchQuery"
          placeholder="Search"
          aria-label="Search drivers"
          class="w-64 pl-9"
        />
      </div>
    </div>
    <DriverAlertsTable
      class="min-h-0 flex-1"
      :drivers="paginatedDrivers"
      :current-page="currentPage"
      :items-per-page="itemsPerPage"
      :is-loading="isLoading"
      :error="error"
      @sort="handleSort"
      @send="openModal"
    />
    <div
      class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-400"> Display on page </span>
        <Select v-model="itemsPerPage">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
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
          aria-label="Previous page"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          aria-label="Next page"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
    <SendAlertModal
      :open="isModalOpen"
      :driver="modalDriver"
      :drivers="drivers"
      :is-sending="isSending"
      @close="closeModal"
      @send="handleSend"
    />
  </div>
</template>
