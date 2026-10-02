<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <!-- Header -->
      <div class="mb-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">IFTA</h2>
          </div>

          <div class="flex items-center gap-3">
            <!-- Download All (shown when rows are selected) -->
            <Button
              v-if="selectedIds.length > 0"
              @click="handleDownloadAll"
              variant="outline"
              class="border-primary text-primary hover:bg-primary/10"
            >
              <Download class="w-4 h-4 mr-2" />
              Download All ({{ selectedIds.length }})
            </Button>

            <!-- Generate Report Button -->
            <Button
              @click="openAddModal"
              class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            >
              <span class="text-xl mr-1">+</span>
              Add Ifta
            </Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <IftaTable
        :records="iftaRecords"
        :is-loading="isLoading"
        @download-pdf="downloadReport"
        @download-csv="downloadReport"
        @update:selected="selectedIds = $event"
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

    <!-- Generate Report Modal -->
    <IftaModal
      :open="isAddModalOpen"
      :vehicles="vehicles"
      :is-submitting="isSubmitting"
      @close="closeAddModal"
      @generate="handleGenerate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, ChevronRight, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import IftaTable from '@/modules/Ifta/components/CIftaTable.vue'
import IftaModal from '@/modules/Ifta/components/CIftaModal.vue'
import { useIfta } from '@/modules/Ifta/composables/useIfta'
import { getCompanyId } from '@/utils/company'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import dayjs from 'dayjs'
import { ApiEndpoints } from '@/api/endpoints'
import { useApi } from '@/composables/useAxiosService'
import { toast } from 'vue-sonner'

const companyId = getCompanyId() || ''

const {
  iftaRecords,
  vehicles,
  isLoading,
  isSubmitting,
  isAddModalOpen,
  openAddModal,
  closeAddModal,
  currentPage,
  itemsPerPage,
  totalPages,
  totalEntries,
  pageNumbers,
  goToPage,
  downloadReport,
  fetchIfta,
} = useIfta({ companyId, autoFetch: true })

const api = useApi()
const { formatToUTC, getStartOf, getEndOf } = useTimeZoneHelper()

// Selected rows tracking
const selectedIds = ref<string[]>([])

const handleDownloadAll = () => {
  const selected = iftaRecords.value.filter((r) => selectedIds.value.includes(r.id))
  selected.forEach((r) => {
    if (r.pdfPath) downloadReport(r.pdfPath)
  })
}

const handleGenerate = async (data: {
  vehicleIds: string[]
  startDate: string
  endDate: string
}) => {
  isSubmitting.value = true
  try {
    await api.post(ApiEndpoints.IFTA_GENERATE, {
      vehicleIds: data.vehicleIds,
      startDate: formatToUTC(getStartOf(dayjs(data.startDate))),
      endDate: formatToUTC(getEndOf(dayjs(data.endDate))),
      companyId,
    })
    toast.success('IFTA report generated successfully')
    closeAddModal()
    await fetchIfta()
  } catch (err: any) {
    console.error('Error generating IFTA:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>
