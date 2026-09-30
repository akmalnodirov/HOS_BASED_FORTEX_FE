<template>
  <div>
    <!-- Tracking Section -->
    <CLogTracking
      :daily-trackings="dailyTrackings"
      :every-trackings="everyTrackings"
      :selected-event="selectedEvent"
      :tracking-tooltips="trackingTooltips"
      :map-center="mapCenter"
      :zoom-map="zoomMap"
      :tracking-collapse="trackingCollapse"
      :directions-segments="directionsSegments"
      :render-route-on-map="renderRouteOnMap"
      @select-event="selectEvent"
      @toggle-collapse="toggleTrackingCollapse"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'

// Page Components
import CLogTracking from '@/modules/ELD/LogsModule/[Id]/components/detail/CLogTracking.vue'

// Inject shared data from layout
const logDetail = inject('logDetail') as ReturnType<typeof import('@/modules/ELD/LogsModule/[Id]/composables/useELDLogDetail.ts').useELDLogDetail>

const {
  // Tracking
  dailyTrackings,
  everyTrackings,
  selectedEvent,
  trackingTooltips,
  trackingCollapse,
  mapCenter,
  zoomMap,
  selectEvent,
  toggleTrackingCollapse,
  directionsSegments,
  renderRouteOnMap,
} = logDetail
</script>
