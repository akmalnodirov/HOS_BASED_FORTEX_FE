<template>
  <div
    class="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none"
  >
    <!-- Top Left: Map Button -->
    <div class="pointer-events-auto">
      <div class="relative">
        <div class="flex items-center gap-1">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 flex items-center">
            <button
              class="flex cursor-pointer items-center gap-2 px-2.5 py-1 h-8 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              @click="showMapMenu = !showMapMenu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-layers"
              >
                <path
                  d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
                />
                <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
                <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
              </svg>
              Map
            </button>
          </div>
          <button
            @click="$emit('toggle:isLiveTracking', !isFocusLiveTracking)"
            class="bg-white cursor-pointer dark:bg-gray-800 w-10 h-10 flex items-center justify-center rounded-lg shadow-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Live Tracking"
          >
            <span
              class="border-[1.5px] border-black dark:border-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <span
                v-if="isFocusLiveTracking"
                class="w-2 h-2 rounded-full bg-black dark:bg-white"
              ></span>
            </span>
          </button>
          <!-- Fuel Type -->
          <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md px-2 h-10 flex items-center gap-1.5"
          >
            <label class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Fuel type
            </label>
            <select
              :value="fuelType"
              @change="$emit('update:fuelType', +($event.target as HTMLSelectElement).value)"
              class="h-full text-xs border-0 bg-transparent text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none pr-1"
            >
              <option v-for="option in fuelOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Radius -->
          <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md px-2 h-10 flex items-center gap-1.5"
          >
            <label class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Radius (mi)
            </label>
            <input
              type="number"
              min="1"
              :value="radius"
              @input="$emit('update:radius', +($event.target as HTMLInputElement).value)"
              class="w-14 text-xs border-0 bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none"
              placeholder="50"
            />
          </div>
        </div>

        <!-- Dropdown Menu -->
        <div
          v-if="showMapMenu"
          class="absolute top-11 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50"
        >
          <!-- Layers -->
          <div class="px-3 pb-2 border-b border-gray-100 dark:border-gray-700">
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Layers</h3>
            <div class="space-y-2">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mapLayer"
                  value="roadmap"
                  v-model="selectedMapLayer"
                  class="w-3.5 h-3.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  @change="$emit('update:mapLayer', 'roadmap')"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">Map</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mapLayer"
                  value="terrain"
                  v-model="selectedMapLayer"
                  class="w-3.5 h-3.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  @change="$emit('update:mapLayer', 'terrain')"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">Terrain</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mapLayer"
                  value="satellite"
                  v-model="selectedMapLayer"
                  class="w-3.5 h-3.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  @change="$emit('update:mapLayer', 'satellite')"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">Satellite</span>
              </label>
            </div>
          </div>

          <!-- Weather -->
          <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Weather</h3>
            <div class="space-y-2">
              <label
                v-for="weather in weatherOptions"
                :key="weather.id"
                class="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  v-model="weather.checked"
                  class="w-3.5 h-3.5 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                  @change="$emit('toggle:weather', weather.id, weather.checked)"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ weather.label }}</span>
              </label>
            </div>
          </div>

          <!-- Weight Stations -->
          <div class="px-3 py-2">
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Stations</h3>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="weightStations"
                class="w-3.5 h-3.5 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                @change="$emit('toggle:stations', weightStations)"
              />
              <span class="text-xs text-gray-700 dark:text-gray-300">Weight Stations</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Right: Action Buttons -->
    <div class="pointer-events-auto flex items-center gap-2">
      <!-- Traffic -->
      <button
        @click="$emit('toggle:traffic')"
        class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
        :class="[
          isTrafficActive
            ? 'text-white'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
        ]"
        :style="isTrafficActive ? { backgroundColor: '#3D3D3D' } : {}"
        title="Traffic"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-traffic-cone"
        >
          <path d="M9.3 6.2a4.55 4.55 0 0 0 5.4 0" />
          <path d="M7.9 10.7c.9.8 2.4 1.3 4.1 1.3s3.2-.5 4.1-1.3" />
          <path
            d="M13.9 3.5a1.93 1.93 0 0 0-3.8-.1l-3 10c-.1.3-.1.6-.1.9 0 2.4 2.2 4.3 5 4.3 2.8 0 5-1.9 5-4.3 0-.3 0-.6-.1-.9Z"
          />
        </svg>
      </button>

      <!-- Parking -->
      <button
        @click="$emit('toggle:parking')"
        class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
        :class="[
          isParkingActive
            ? 'text-white'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
        ]"
        :style="isParkingActive ? { backgroundColor: '#3D3D3D' } : {}"
        title="Parking"
      >
        <span class="font-bold text-sm">P</span>
      </button>

      <!-- Routes -->
      <button
        @click="$emit('toggle:routing')"
        class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
        :class="[
          isRoutingActive
            ? 'text-white'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
        ]"
        :style="isRoutingActive ? { backgroundColor: '#3D3D3D' } : {}"
        title="Routes"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.5 5H11.9344C14.9816 5 16.5053 5 17.0836 5.54729C17.5836 6.02037 17.8051 6.71728 17.6702 7.39221C17.514 8.17302 16.2701 9.05285 13.7823 10.8125L9.71772 13.6875C7.2299 15.4471 5.98599 16.327 5.82984 17.1078C5.69486 17.7827 5.91642 18.4796 6.41636 18.9527C6.99474 19.5 8.51836 19.5 11.5656 19.5H12.5M8 5C8 6.65685 6.65685 8 5 8C3.34315 8 2 6.65685 2 5C2 3.34315 3.34315 2 5 2C6.65685 2 8 3.34315 8 5ZM22 19C22 20.6569 20.6569 22 19 22C17.3431 22 16 20.6569 16 19C16 17.3431 17.3431 16 19 16C20.6569 16 22 17.3431 22 19Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- Fullscreen -->
      <button
        @click="$emit('toggle:fullscreen')"
        class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
        :class="[
          isFullscreenActive
            ? 'text-white'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
        ]"
        :style="isFullscreenActive ? { backgroundColor: '#3D3D3D' } : {}"
        title="Fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-maximize"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const fuelOptions = [
  { value: 0, label: 'Diesel' },
  { value: 1, label: 'Unleaded' },
  { value: 2, label: 'Premium' },
  { value: 3, label: 'DEF' },
  { value: 4, label: 'Midgrade' },
  { value: 5, label: 'Propane' },
  { value: 6, label: 'Super' },
  { value: 7, label: 'Unleaded Plus' },
]

defineProps({
  fuelType: {
    type: Number,
    default: 0,
  },
  radius: {
    type: Number,
    default: 50,
  },
  isFocusLiveTracking: {
    type: Boolean,
    default: false,
  },
  isTrafficActive: {
    type: Boolean,
    default: false,
  },
  isParkingActive: {
    type: Boolean,
    default: false,
  },
  isFullscreenActive: {
    type: Boolean,
    default: false,
  },
  isRoutingActive: {
    type: Boolean,
    default: false,
  },
})

const weatherOptions = ref([
  { id: 'rain', label: 'Rain', checked: false },
  { id: 'snow', label: 'Snow', checked: false },
  { id: 'wind', label: 'Wind', checked: false },
  { id: 'temp', label: 'Temperature', checked: false },
])

const showMapMenu = ref(false)
const selectedMapLayer = ref('roadmap')
const weightStations = ref(false)

defineEmits([
  'update:fuelType',
  'update:radius',
  'update:mapLayer',
  'toggle:traffic',
  'toggle:parking',
  'toggle:fullscreen',
  'toggle:routing',
  'toggle:isLiveTracking',
  'toggle:weather',
  'toggle:stations',
])
</script>
