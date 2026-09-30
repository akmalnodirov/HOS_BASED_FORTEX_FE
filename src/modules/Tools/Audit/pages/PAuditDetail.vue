<template>
  <main class="min-h-screen bg-white p-[16px_24px]">
    <!-- Edit Profile Modal -->
    <Dialog v-model:open="editProfileModal">
      <DialogContent class="sm:max-w-110">
        <DialogHeader>
          <DialogTitle>Edit Profile Form</DialogTitle>
        </DialogHeader>
        <Separator />
        <form @submit.prevent="submitEditDriverDailyForm" class="space-y-6">
          <div class="space-y-4">
            <div class="space-y-1.5">
              <Label>Co-Drivers</Label>
              <Select v-model="editForm.coDrivers!">
                <SelectTrigger>
                  <SelectValue placeholder="Select Co-Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="d in drivers" :key="d.id" :value="d.id">
                    {{ d.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label>Shipping Docs</Label>
              <Input v-model="editForm.shippingDocs" placeholder="Edit Shipping Docs" />
            </div>
            <div class="space-y-1.5">
              <Label>Trailers</Label>
              <Input v-model="editForm.trailers" placeholder="Edit Trailers" />
            </div>
            <div class="space-y-1.5">
              <Label>Signature Path</Label>
              <Input v-model="editForm.signaturePath" placeholder="Edit Signature Path" />
            </div>
          </div>
          <Separator />
          <div class="flex items-center justify-end gap-x-3">
            <Button type="button" variant="outline" @click="editProfileModal = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="disableEditDailyForm" :loading="loading">
              Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Page Header -->
    <section class="rounded-lg border border-border bg-card p-4 flex justify-between items-center">
      <h1 class="text-lg font-bold uppercase tracking-wide">Audit</h1>
      <div class="flex items-center gap-x-2">
        <template v-if="tracking">
          <Button v-for="n in tripNumbers" :key="n" class="h-8 w-8" variant="secondary" size="icon">
            {{ n }}
          </Button>
        </template>
        <Button size="sm" @click="tracking = !tracking">
          {{ tracking ? 'Process' : 'Tracking' }}
        </Button>
      </div>
    </section>

    <!-- Process View -->
    <template v-if="!tracking">
      <!-- Chart Section -->
      <section class="mt-3">
        <CAuditChart
          :chart-data="auditChartData"
          :daily-summary="auditDailySummary"
          :pixel-violations="dailyPixelViolations"
          :weekly-violations="auditWeeklyViolations || []"
          :header-date="headerDate"
          :today="convertToTimeZone()"
          @container:update="getChartWidth"
          @date-select="headerDate = acceptAsTimeZone($event as string)"
          @prev-day="headerDate = subtract(headerDate, 1, 'day')"
          @next-day="headerDate = add(headerDate, 1, 'day')"
        />
      </section>

      <!-- Events Table -->
      <section class="mt-3">
        <CAuditEventsTable :columns="columns" :rows="detailList" />
      </section>

      <!-- Signature + Profile Form -->
      <section class="mt-3">
        <CAuditProfileForm :driver-daily-form="driverDailyForm" @edit="openEditProfileModal" />
      </section>
    </template>

    <!-- Tracking View -->
    <template v-else>
      <section class="mt-3">
        <CAuditTrackingMap
          ref="trackingMapRef"
          :trackings="auditTrackings || []"
          :active-tooltips="activeTooltips"
          :tooltip-positions="tooltipPositions"
          @toggle-tooltip="toggleTooltip"
          @close-tooltip="closeTooltip"
          @open-google-maps="openGoogleMaps"
          @map-ready="onMapReady"
        />
        <!-- :weight-stations="auditWeightStations || []" -->
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CAuditChart from '../components/CAuditChart.vue'
import CAuditEventsTable from '../components/CAuditEventsTable.vue'
import CAuditProfileForm from '../components/CAuditProfileForm.vue'
import CAuditTrackingMap from '../components/CAuditTrackingMap.vue'
import { useAuditDetail } from '../composables/useAuditDetail'

const {
  // State
  loading,
  tracking,
  headerDate,
  editProfileModal,
  tripNumbers,
  activeTooltips,
  tooltipPositions,

  // Store refs
  auditChartData,
  auditDailySummary,
  auditWeeklyViolations,
  // auditWeightStations,
  auditTrackings,
  dailyPixelViolations,

  // Driver daily form
  driverDailyForm,
  editForm,
  disableEditDailyForm,
  drivers,

  // Computed
  columns,
  detailList,

  // Methods
  getChartWidth,
  openEditProfileModal,
  submitEditDriverDailyForm,
  toggleTooltip,
  closeTooltip,
  openGoogleMaps,

  // Timezone helpers
  acceptAsTimeZone,
  convertToTimeZone,
  add,
  subtract,

  // Map
  mapInstance,
} = useAuditDetail()

const trackingMapRef = ref<any>(null)

function onMapReady(mapComponent: any) {
  mapInstance.value = mapComponent
}

// Fallback: set mapInstance directly from child's exposed mapRef (same as old project's ref="mapInstance")
watch(
  () => trackingMapRef.value?.mapRef,
  (googleMapRef: any) => {
    if (googleMapRef && !mapInstance.value) {
      mapInstance.value = googleMapRef
    }
  }
)
</script>
