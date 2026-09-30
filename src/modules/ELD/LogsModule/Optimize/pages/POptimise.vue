<template>
  <div class="space-y-6 mb-5">
    <!-- Loading State -->
    <div v-if="loadingOptimizeEvents" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading optimize events...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="isOptimizeEventsLoaded">
      <!-- Optimize Categories Filters Section -->
      <section class="">
        <COptimiseFilters
          :options="optimizeCategories"
          :model-value="selectedOptimizeCategories"
          :select-all="selectAllOptimizeCategories"
          :disabled="isOptimizeEventsSubmitted || loading"
          @update:model-value="handleFilterChange"
          @update:select-all="selectAllOptimizeCategories = $event"
          class="bg-white dark:bg-card"
        />

        <!-- Progress Bar (TODO: Connect to real data) -->
        <div class="p-[16px_24px] my-1 bg-white dark:bg-card">
          <div class="w-full flex items-center gap-3">
            <div class="bg-gray-200 w-full h-2.5 rounded-full dark:bg-gray-700"></div>
            <div class="text-right text-xs text-gray-400">{{ detailList?.length || 0 }} events</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="bg-white dark:bg-card p-[16px_24px]">
          <div class="flex items-center justify-between">
            <p class="text-xl font-semibold">Events</p>
            <div class="flex gap-2">
              <Button
                v-if="selectedRows.length > 0 && canMultiDelete"
                :loading="loadingMultiDelete"
                @click="multiDeleteBoostEvents(selectedRows)"
                size="sm"
                class="bg-white border border-[#090909]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clip-path="url(#clip0_3574_42322)">
                    <path
                      d="M10.6667 4.00065V3.46732C10.6667 2.72058 10.6667 2.34721 10.5213 2.062C10.3935 1.81111 10.1895 1.60714 9.93865 1.47931C9.65344 1.33398 9.28007 1.33398 8.53333 1.33398H7.46667C6.71993 1.33398 6.34656 1.33398 6.06135 1.47931C5.81046 1.60714 5.60649 1.81111 5.47866 2.062C5.33333 2.34721 5.33333 2.72058 5.33333 3.46732V4.00065M6.66667 7.66732V11.0007M9.33333 7.66732V11.0007M2 4.00065H14M12.6667 4.00065V11.4673C12.6667 12.5874 12.6667 13.1475 12.4487 13.5753C12.2569 13.9516 11.951 14.2576 11.5746 14.4493C11.1468 14.6673 10.5868 14.6673 9.46667 14.6673H6.53333C5.41323 14.6673 4.85318 14.6673 4.42535 14.4493C4.04903 14.2576 3.74307 13.9516 3.55132 13.5753C3.33333 13.1475 3.33333 12.5874 3.33333 11.4673V4.00065"
                      stroke="#090909"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_3574_42322">
                      <rect width="16" height="16" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </Button>
              <Button
                :disabled="
                  !detailList ||
                    !detailList.some(
                      (event) => event.errorTitles?.length || event.warningTitles?.length
                  )
                "
                @click="showAllErrorsAndWarningsModal = true"
                size="sm"
                variant="outline"
                class="border border-[#666666] dark:border-border bg-white dark:bg-card text-sm text-[#090909] dark:text-foreground"
              >
                (Errors / Warnings)
              </Button>
              <Button
                :loading="loading"
                :disabled="isOptimizeEventsSubmitted || loading || !hasSelectedCategories"
                @click="submitOptimizeCategories"
                variant="default"
                size="sm"
              >
                Optimize
              </Button>
              <Button
                @click="submitOptimizeEvents"
                :disabled="!canSubmitEvents || isOptimizeEventsSubmitted"
                size="sm"
                variant="default"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </section>

      <!-- Events Table Section -->
      <section>
        <COptimiseEventsTable
          :events="detailList"
          :columns="columns"
          :selected-rows="selectedRows"
          :loading="loadingTable"
          :is-submitted="isOptimizeEventsSubmitted"
          :tabs="tabs"
          :selected-tab="selectedTab"
          @row-select="tableRowSelect"
          @edit="openEditOptimizeEvent"
          @copy="copyOptimizeEvent"
          @revert="revertOptimizeEvent"
          @delete="deleteOptimizeEvent"
          class="bg-white dark:bg-card"
        />
      </section>
    </div>

    <!-- Edit Event Modal -->
    <COptimiseEditModal
      v-model:open="editStatusModal"
      :edit-status="editStatus"
      :loading="loading"
      :disabled="isOptimizeDisabled"
      @submit="submitEditOptimizeEvent"
      @copy-location="copyLongLat"
      @paste-location="pasteLongLat"
    />

    <!-- Errors & Warnings Modal -->
    <COptimiseErrorsModal
      v-model:open="showAllErrorsAndWarningsModal"
      :events="detailList"
      :columns="errorAndWarningColumns"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-vue-next'
import COptimiseFilters from '../components/COptimiseFilters.vue'
import COptimiseEventsTable from '../components/COptimiseEventsTable.vue'
import COptimiseEditModal from '../components/COptimiseEditModal.vue'
import COptimiseErrorsModal from '../components/COptimiseErrorsModal.vue'
import { useOptimize } from '../composables/useOptimize'

const route = useRoute()
const driverId = route.params.id as string

// Use optimize composable
const {
  // State
  loading,
  loadingOptimizeEvents,
  loadingTable,
  loadingMultiDelete,

  // Modals
  editStatusModal,
  showAllErrorsAndWarningsModal,

  // Optimize categories
  optimizeCategories,
  selectedOptimizeCategories,
  selectAllOptimizeCategories,

  // Events
  detailList,
  isOptimizeEventsLoaded,
  isOptimizeEventsSubmitted,

  // Selection
  selectedRows,

  // Edit form
  editStatus,

  // Tabs
  tabs,
  selectedTab,

  // Computed
  columns,
  errorAndWarningColumns,
  isOptimizeDisabled,

  // Methods
  submitOptimizeCategories,
  submitOptimizeEvents,
  tableRowSelect,
  openEditOptimizeEvent,
  submitEditOptimizeEvent,
  copyOptimizeEvent,
  revertOptimizeEvent,
  deleteOptimizeEvent,
  multiDeleteBoostEvents,
  copyLongLat,
  pasteLongLat,
} = useOptimize(driverId)

// Computed
const hasSelectedCategories = computed(() => {
  return Object.values(selectedOptimizeCategories.value).some((v) => v === true)
})

const canSubmitEvents = computed(() => {
  return tabs.value.some((tab) => tab.type !== 0 && tab.type !== 1) && tabs.value.length > 1
})

const canMultiDelete = computed(() => {
  if (!selectedTab.value || !tabs.value.length) return false
  const lastTab = tabs.value[tabs.value.length - 1]
  return (
    lastTab.id === selectedTab.value.id &&
    selectedTab.value.type !== 0 &&
    lastTab.type !== 5 &&
    lastTab.type !== 6
  )
})

// Handle filter change
const handleFilterChange = (filters: Record<string, boolean>) => {
  selectedOptimizeCategories.value = filters
}
</script>
