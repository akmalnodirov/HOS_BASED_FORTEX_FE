<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div>
      <div class="mb-3">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">IFTA</h2>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <CIftaMultiSelect
              v-model="statusFilter"
              :options="statusOptions"
              placeholder="All statuses"
              class="w-48"
            />
            <Button
              variant="outline"
              class="border-primary text-primary hover:bg-primary/10"
              :disabled="!selectedReadyReports.length"
              @click="bulkDownloadOpen = true"
            >
              <Download class="w-4 h-4 mr-2" /> Download selected ({{
                selectedReadyReports.length
              }})
            </Button>
            <Button variant="outline" :disabled="isFetching || !companyId" @click="fetchIfta()">
              <RefreshCw :class="['w-4 h-4 mr-2', isFetching && 'animate-spin']" /> Refresh
            </Button>
            <Button
              :disabled="!companyId || isSubmitting"
              @click="openAddModal"
              class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            >
              <span class="text-xl mr-1">+</span> Generate report(s)
            </Button>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            class="rounded-md border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="text-xs text-gray-500 dark:text-gray-400">Reports</div>
            <strong
              class="block text-2xl font-semibold leading-7 text-gray-900 dark:text-gray-100"
              >{{ iftaRecords.length }}</strong
            >
          </div>
          <div
            class="rounded-md border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="text-xs text-gray-500 dark:text-gray-400">Ready</div>
            <strong
              class="block text-2xl font-semibold leading-7 text-green-600 dark:text-green-300"
              >{{ counts.ready }}</strong
            >
          </div>
          <div
            class="rounded-md border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="text-xs text-gray-500 dark:text-gray-400">Processing</div>
            <strong
              class="block text-2xl font-semibold leading-7 text-gray-900 dark:text-gray-100"
              >{{ counts.processing }}</strong
            >
          </div>
          <div
            class="rounded-md border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="text-xs text-gray-500 dark:text-gray-400">Waiting</div>
            <strong
              class="block text-2xl font-semibold leading-7 text-amber-600 dark:text-amber-300"
              >{{ counts.waiting }}</strong
            >
          </div>
        </div>
      </div>
      <div
        v-if="companyError || error"
        class="mb-4 flex items-center gap-3 text-sm text-red-600"
        role="alert"
      >
        {{ companyError || error }}
        <Button
          variant="outline"
          size="sm"
          :disabled="isLoadingCompany || isFetching"
          @click="companyError ? resolveCompany() : fetchIfta()"
          >Retry</Button
        >
      </div>
      <IftaTable
        :records="visibleReports"
        :is-loading="isLoading || isLoadingCompany"
        :selected-ids="selectedIds"
        :all-selected="allSelected"
        :sort-key="sortKey"
        :empty-message="companyError || error || 'No IFTA reports found'"
        @sort="handleSort"
        @select-row="toggleRow"
        @select-all="toggleSelectAll"
        @download="openDownload"
      />
      <div
        class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3"
      >
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ filteredReports.length.toLocaleString() }} entries
        </span>
        <Button
          v-if="visibleReports.length < filteredReports.length"
          variant="outline"
          @click="visibleCount += 20"
          >Load More</Button
        >
      </div>
    </div>
    <IftaModal
      :open="isAddModalOpen"
      :vehicles="vehicles"
      :is-submitting="isSubmitting"
      :is-loading-vehicles="isLoadingVehicles"
      :vehicle-error="vehicleError"
      @close="closeAddModal"
      @generate="generateIfta"
      @retry-vehicles="fetchVehicles"
    />
    <CIftaDownloadModal
      v-model:open="downloadOpen"
      :report="downloadReport"
      :company-id="companyId"
      :company-name="companyName"
    />
    <CIftaBulkDownloadModal
      v-model:open="bulkDownloadOpen"
      :reports="selectedReadyReports"
      :company-id="companyId"
      :company-name="companyName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import IftaTable from '../components/CIftaTable.vue'
import IftaModal from '../components/CIftaModal.vue'
import CIftaMultiSelect from '../components/CIftaMultiSelect.vue'
import CIftaDownloadModal from '../components/CIftaDownloadModal.vue'
import CIftaBulkDownloadModal from '../components/CIftaBulkDownloadModal.vue'
import { useIfta } from '../composables/useIfta'
import type { IftaReport } from '../types'

const {
  companyId,
  companyName,
  localCompanyId,
  isLoadingCompany,
  companyError,
  resolveCompany,
  iftaRecords,
  vehicles,
  counts,
  isLoading,
  isFetching,
  isLoadingVehicles,
  isSubmitting,
  error,
  vehicleError,
  statusFilter,
  sortKey,
  visibleCount,
  filteredReports,
  visibleReports,
  selectedIds,
  selectedReadyReports,
  allSelected,
  handleSort,
  toggleRow,
  toggleSelectAll,
  isAddModalOpen,
  openAddModal,
  closeAddModal,
  fetchIfta,
  fetchVehicles,
  generateIfta,
} = useIfta()
const statusOptions = [
  { value: 'READY', label: 'Ready' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'ERROR', label: 'Error' },
]
const downloadOpen = ref(false)
const bulkDownloadOpen = ref(false)
const downloadReport = ref<IftaReport | null>(null)
function openDownload(report: IftaReport) {
  downloadReport.value = report
  downloadOpen.value = true
}
watch([localCompanyId, companyId], () => {
  downloadOpen.value = false
  bulkDownloadOpen.value = false
  downloadReport.value = null
})
</script>
