<template>
  <div class="flex w-full" style="height: calc(100vh - 72px)">
    <!-- Left Panel: Overview (hidden in fullscreen) -->
    <div v-if="!isFullscreen" class="flex p-4 w-1/3 flex-col space-y-4 bg-white">
      <!-- Header with Search -->
      <div class="space-y-3">
        <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Overview</h1>
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
          />
          <Input
            v-model="searchQuery"
            placeholder="Search"
            class="pl-9 w-full"
            @input="handleSearch"
          />
        </div>
      </div>

      <!-- Drivers List -->
      <div class="flex-1 space-y-3 overflow-y-auto pr-2">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="text-sm text-gray-500 dark:text-gray-400">Loading drivers...</div>
        </div>

        <div v-else-if="error" class="flex items-center justify-center py-8">
          <div class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>
        </div>

        <div v-else-if="filteredDrivers.length === 0" class="flex items-center justify-center py-8">
          <div class="text-sm text-gray-500 dark:text-gray-400">No drivers found</div>
        </div>

        <DriverCard
          v-for="driver in filteredDrivers"
          :key="driver.driverId"
          :driver="driver"
          :get-event-name="getEventName"
          :get-event-badge-class="getEventBadgeClass"
          :get-status-color="getStatusColor"
          @click="handleDriverClick(driver)"
        />
      </div>
    </div>

    <!-- Right Panel: Map -->
    <div class="relative flex flex-col" :class="isFullscreen ? 'w-full' : 'w-2/3'">
      <!-- Map Controls -->
      <CMapControls
        v-model:map-type="mapType"
        v-model:current-filter="currentStatusFilter"
        :filter-options="driverStatuses"
        :is-traffic-active="isTrafficActive"
        :is-fullscreen="isFullscreen"
        @toggle-traffic="toggleTraffic"
        @toggle-fullscreen="toggleFullscreen"
      />

      <!-- Google Map -->
      <GoogleMap
        ref="mapInstance"
        :api-key="apiKey"
        :center="center"
        :zoom="zoom"
        :map-type-id="mapType"
        :styles="mapStyles"
        style="width: 100%; height: 100%"
        :disable-default-ui="true"
        @ready="onMapReady"
      >
        <Marker
          v-for="marker in filteredMarkers"
          :key="marker.driverId"
          :options="{
            position: marker.position,
            title: marker.title,
            icon: marker.icon,
          }"
        />
      </GoogleMap>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { GoogleMap, Marker } from 'vue3-google-map'
import { Search } from 'lucide-vue-next'
import CMapControls from '@/components/custom/CMapControls.vue'
import { Input } from '@/components/ui/input'
import { getCompanyId } from '@/utils/company'
import { mapStyles } from '@/utils/maps'
import { useDriverLogs } from '../composables/useDriverLogs'
import DriverCard from '../components/DriverCard.vue'
import type { MonitoringDriver } from '../types'

// Router
const router = useRouter()

// Google Maps setup
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const center = ref({ lat: 39.8283, lng: -98.5795 }) // USA center
const zoom = ref(4)

// Map controls state
const mapInstance = ref<any>(null)
const rawMapInstance = ref<any>(null)
const trafficLayer = ref<any>(null)
const mapType = ref<'roadmap' | 'terrain' | 'satellite'>('roadmap')
const isTrafficActive = ref(false)
const isFullscreen = ref(false)
const currentStatusFilter = ref('all')

const {
  drivers,
  isLoading,
  error,
  searchQuery,
  fetchDriverLogs,
  handleSearch,
  getEventName,
  getEventBadgeClass,
  getStatusColor,
} = useDriverLogs()

// Map ready handler
const onMapReady = async (instance: any) => {
  rawMapInstance.value = instance
  await nextTick()
}

const getMapWrapper = () => {
  if (mapInstance.value?.map) return mapInstance.value
  if (rawMapInstance.value) return { map: rawMapInstance.value }
  return null
}

// Toggle traffic layer
const toggleTraffic = () => {
  isTrafficActive.value = !isTrafficActive.value
  const mapWrapper = getMapWrapper()
  if (!mapWrapper?.map) return
  if (isTrafficActive.value) {
    if (!trafficLayer.value && window.google?.maps) {
      trafficLayer.value = new (window.google.maps as any).TrafficLayer()
    }
    trafficLayer.value?.setMap(mapWrapper.map)
  } else {
    trafficLayer.value?.setMap(null)
  }
}

// Toggle fullscreen
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// Get marker color based on driver status
const getMarkerColor = (eventCode: number, eventType: number): string => {
  if (eventCode === 1 && eventType !== 1) return '#F97316' // Off duty PC - Orange
  const colorMap: Record<number, string> = {
    1: '#EF4444', // Off duty - Red
    2: '#A855F7', // Sleep - Purple
    3: '#22C55E', // Driving - Green
    4: '#3B82F6', // On duty - Blue
  }
  return colorMap[eventCode] || '#6B7280' // Default - Gray
}

// Create SVG marker data URL with given color
const createSvgMarkerUrl = (color: string): string => {
  const svg = `<svg width="48" height="48" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 51C37.5 41.8 47 33.562 47 23.4C47 13.238 38.4934 5 28 5C17.5066 5 9 13.238 9 23.4C9 33.562 18.5 41.8 28 51Z" fill="${color}"/><circle cx="28" cy="24" r="16" fill="white"/><path d="M31.6663 27.6667V18.6833C31.6663 17.6566 31.6663 17.1432 31.4665 16.751C31.2908 16.4061 31.0103 16.1256 30.6653 15.9498C30.2732 15.75 29.7598 15.75 28.733 15.75H21.7663C20.7396 15.75 20.2262 15.75 19.834 15.9498C19.4891 16.1256 19.2086 16.4061 19.0328 16.751C18.833 17.1432 18.833 17.6566 18.833 18.6833V24.7333C18.833 25.7601 18.833 26.2735 19.0328 26.6656C19.2086 27.0106 19.4891 27.2911 19.834 27.4668C20.2262 27.6667 20.7396 27.6667 21.7663 27.6667H31.6663ZM31.6663 27.6667H35.6997C36.2131 27.6667 36.4697 27.6667 36.6658 27.5668C36.8383 27.4789 36.9785 27.3386 37.0664 27.1662C37.1663 26.9701 37.1663 26.7134 37.1663 26.2V23.6908C37.1663 23.4666 37.1663 23.3545 37.141 23.249C37.1186 23.1555 37.0815 23.0661 37.0313 22.9841C36.9746 22.8916 36.8953 22.8123 36.7368 22.6538L34.8459 20.7629C34.6874 20.6044 34.6081 20.5251 34.5156 20.4684C34.4336 20.4182 34.3442 20.3811 34.2506 20.3587C34.1451 20.3333 34.033 20.3333 33.8088 20.3333H31.6663M25.2497 29.9583C25.2497 31.224 24.2237 32.25 22.958 32.25C21.6924 32.25 20.6663 31.224 20.6663 29.9583C20.6663 28.6927 21.6924 27.6667 22.958 27.6667C24.2237 27.6667 25.2497 28.6927 25.2497 29.9583ZM35.333 29.9583C35.333 31.224 34.307 32.25 33.0413 32.25C31.7757 32.25 30.7497 31.224 30.7497 29.9583C30.7497 28.6927 31.7757 27.6667 33.0413 27.6667C34.307 27.6667 35.333 28.6927 35.333 29.9583Z" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Filtered drivers list (same filter as map markers)
const filteredDrivers = computed(() => {
  const filterMap: Record<string, number> = { offDuty: 1, sleeper: 2, driving: 3, onDuty: 4 }
  if (currentStatusFilter.value === 'all') return drivers.value
  return drivers.value.filter((d) => d.eventCode === filterMap[currentStatusFilter.value])
})

// Driver status filters
const driverStatuses = computed(() => {
  const all = drivers.value
  return [
    { id: 'all', label: 'All', count: all.length, colorClass: '' },
    {
      id: 'offDuty',
      label: 'Off Duty',
      count: all.filter((d) => d.eventCode === 1).length,
      colorClass: 'bg-red-500',
    },
    {
      id: 'sleeper',
      label: 'Sleep',
      count: all.filter((d) => d.eventCode === 2).length,
      colorClass: 'bg-purple-500',
    },
    {
      id: 'driving',
      label: 'Driving',
      count: all.filter((d) => d.eventCode === 3).length,
      colorClass: 'bg-green-500',
    },
    {
      id: 'onDuty',
      label: 'On Duty',
      count: all.filter((d) => d.eventCode === 4).length,
      colorClass: 'bg-blue-500',
    },
  ]
})

// Filtered markers based on status
const filteredMarkers = computed(() => {
  const filterMap: Record<string, number> = { offDuty: 1, sleeper: 2, driving: 3, onDuty: 4 }
  const filtered =
    currentStatusFilter.value === 'all'
      ? drivers.value
      : drivers.value.filter((d) => d.eventCode === filterMap[currentStatusFilter.value])

  return filtered
    .filter((d) => d.latitude && d.longitude)
    .map((d) => ({
      position: { lat: d.latitude, lng: d.longitude },
      title: d.driverName,
      driverId: d.driverId,
      icon: createSvgMarkerUrl(getMarkerColor(d.eventCode, d.eventType)),
    }))
})

// Navigate to driver detail page
const handleDriverClick = (driver: MonitoringDriver) => {
  router.push(`/overview/${driver.driverId}`)
}

onMounted(() => {
  const companyId = getCompanyId()
  if (companyId) {
    fetchDriverLogs()
  }
})

onUnmounted(() => {
  trafficLayer.value?.setMap(null)
})
</script>

<style scoped></style>
