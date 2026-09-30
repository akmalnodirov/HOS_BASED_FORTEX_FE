<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class="mb-5">
      <!-- Header -->
      <div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Vehicles</h2>
            <!-- Search -->
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input v-model="searchQuery" placeholder="Search" class="pl-9 w-64" />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Add Vehicle Button -->
            <Button
              @click="openAddModal"
              class="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            >
              <span class="text-xl mr-1">+</span>
              Add vehicle
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Component -->
    <CVehicleTable
      v-model:items-per-page="itemsPerPage"
      :current-page="currentPage"
      :paginated-vehicles="paginatedVehicles"
      :total-pages="totalPages"
      :total-entries="totalEntries"
      :page-numbers="pageNumbers"
      @sort="handleSort"
      @go-to-page="goToPage"
      @toggle-status="openStatusModal"
      @edit="openEditModal"
    />

    <!-- Add/Edit Vehicle Modal -->
    <CVehicleModal
      :open="isModalOpen"
      :vehicle="editingVehicle"
      :vehicle-details="vehicleDetails"
      :fuels="fuels"
      :eld-connections="eldConnections"
      :issuer-states="issuerStates"
      :vin-decoding-loading="vinDecodingLoading"
      :vin-error="vinError"
      :decode-vin="decodeVin"
      @close="closeModal"
      @save="handleSaveVehicle"
    />

    <!-- Status Confirm Modal -->
    <Dialog :open="isStatusConfirmOpen" @update:open="(v) => !v && cancelToggleStatus()">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {{ pendingStatusVehicle?.status ? 'Deactivate' : 'Activate' }} Vehicle
          </DialogTitle>
          <DialogDescription>
            Do you want to {{ pendingStatusVehicle?.status ? 'deactivate' : 'activate' }}
            <span class="font-medium">{{ pendingStatusVehicle?.unit }}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="cancelToggleStatus">Cancel</Button>
          <Button :disabled="isStatusChanging" @click="confirmToggleStatus">
            <span v-if="isStatusChanging" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving...
            </span>
            <span v-else>{{ pendingStatusVehicle?.status ? 'Deactivate' : 'Activate' }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CVehicleTable from '../components/CVehicleTable.vue'
import CVehicleModal from '../components/CVehicleModal.vue'
import { useVehicles } from '../composables/useVehicles'

const {
  searchQuery,
  isModalOpen,
  editingVehicle,
  vehicleDetails,
  itemsPerPage,
  currentPage,
  paginatedVehicles,
  totalPages,
  totalEntries,
  pageNumbers,
  fuels,
  eldConnections,
  issuerStates,
  vinDecodingLoading,
  vinError,
  isStatusConfirmOpen,
  pendingStatusVehicle,
  isStatusChanging,
  handleSort,
  goToPage,
  openAddModal,
  openEditModal,
  closeModal,
  handleSaveVehicle,
  decodeVin,
  openStatusModal,
  confirmToggleStatus,
  cancelToggleStatus,
} = useVehicles()
</script>
