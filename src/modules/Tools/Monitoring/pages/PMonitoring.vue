<template>
  <div class="min-h-screen bg-white p-[16px_24px]">
    <div class=" ">
      <!-- Header -->
      <div class="">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold text-foreground">Monitoring</h2>

          <div class="flex items-center gap-3">
            <!-- Carrier Filter -->
            <Select v-model="selectedCarrier">
              <SelectTrigger class="w-48 dark:bg-card border-border">
                <SelectValue placeholder="All carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in carrierOptions" :key="option.id" :value="option.id">
                  {{ option.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- Sync Button -->
            <Button
              @click="handleSync"
              :disabled="isLoading"
              variant="default"
              class="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <!--              <RefreshCw :class="['w-4 h-4 mr-2', isLoading && 'animate-spin']" />-->
              Sync
            </Button>
          </div>
        </div>

        <!-- Progress Bar -->
        <ProgressBar :completed="94" :total="120" :problems="15" />
      </div>

      <!-- Loading State -->
      <div
        v-if="isLoading && filteredCarriers.length === 0"
        class="flex items-center justify-center py-12"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="px-6 py-12 text-center">
        <p class="text-destructive">{{ error }}</p>
      </div>

      <!-- Accordion -->
      <div v-else class="py-6">
        <MonitoringAccordion
          :carriers="filteredCarriers"
          :get-carrier-stats="getCarrierStats"
          :get-event-name="getEventName"
          :get-event-badge-class="getEventBadgeClass"
          :format-duration="formatDuration"
        />
      </div>
    </div>
  </div>
</template>
<!-- src/views/MonitoringView.vue -->
<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ProgressBar from '@/modules/Tools/Monitoring/components/CMonitoringProgressBar.vue'
import MonitoringAccordion from '@/modules/Tools/Monitoring/components/CMonitoringAccordion.vue'
import { useMonitoring } from '@/modules/Tools/Monitoring/composables/useMonitoring'

// TODO: Get providerId from auth/route
const providerId = '019a9110-6ac5-73ea-8f1c-af3bebbd7c2d'

const {
  // State
  isLoading,
  error,
  carrierOptions,

  // Filters
  selectedCarrier,

  // Computed
  filteredCarriers,
  getProgressSegments,

  // Functions
  getCarrierStats,
  getEventName,
  getEventBadgeClass,
  formatDuration,
  handleSync,
} = useMonitoring({ providerId })
</script>
