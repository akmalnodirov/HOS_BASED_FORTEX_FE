<template>
  <div
    class="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none"
  >
    <!-- Top Left: Map Layer Button -->
    <div class="pointer-events-auto">
      <div ref="menuRef" class="relative">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 flex items-center">
          <button
            class="flex cursor-pointer items-center gap-2 px-2.5 py-1 h-8 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="showMapMenu = !showMapMenu"
          >
            <Layers class="w-4 h-4" />
            Map
          </button>
        </div>

        <!-- Dropdown Menu -->
        <div
          v-if="showMapMenu"
          class="absolute top-11 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50"
        >
          <div class="px-3 pb-2 border-b border-gray-100 dark:border-gray-700">
            <h3 class="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">Layers</h3>
            <div class="space-y-2">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  :name="groupName"
                  value="roadmap"
                  :checked="mapType === 'roadmap'"
                  class="w-3.5 h-3.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  @change="emit('update:mapType', 'roadmap')"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">Map</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  :name="groupName"
                  value="terrain"
                  :checked="mapType === 'terrain'"
                  class="w-3.5 h-3.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  @change="emit('update:mapType', 'terrain')"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">Terrain</span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  :name="groupName"
                  value="satellite"
                  :checked="mapType === 'satellite'"
                  class="w-3.5 h-3.5 text-gray-900 border-gray-300 focus:ring-gray-900"
                  @change="emit('update:mapType', 'satellite')"
                />
                <span class="text-xs text-gray-700 dark:text-gray-300">Satellite</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Center: Status Filters -->
    <div class="pointer-events-auto overflow-x-auto max-w-[60%] scrollbar-hide">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 flex items-center space-x-1 whitespace-nowrap"
      >
        <button
          v-for="option in filterOptions"
          :key="option.id"
          @click="emit('update:currentFilter', option.id)"
          class="flex cursor-pointer items-center gap-1.5 px-2.5 py-1 h-8 text-xs font-medium rounded-md transition-colors border"
          :class="[
            currentFilter === option.id
              ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
              : 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
          ]"
        >
          <span
            v-if="option.id !== 'all'"
            class="w-2 h-2 rounded-full"
            :class="option.colorClass"
          ></span>
          {{ option.label }}
          <span class="ml-0.5 text-xs opacity-70">{{ option.count }}</span>
        </button>
      </div>
    </div>

    <!-- Top Right: Traffic + Fullscreen -->
    <div class="pointer-events-auto flex items-center gap-2">
      <!-- Traffic -->
      <button
        @click="emit('toggle-traffic')"
        class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
        :class="[
          isTrafficActive
            ? 'text-white bg-[#3D3D3D]'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
        ]"
        title="Traffic"
      >
        <TrafficCone class="w-4 h-4" />
      </button>

      <!-- Fullscreen -->
      <button
        @click="emit('toggle-fullscreen')"
        class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
        :class="[
          isFullscreen
            ? 'text-white bg-[#3D3D3D]'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
        ]"
        title="Fullscreen"
      >
        <Maximize class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Layers, TrafficCone, Maximize } from 'lucide-vue-next'

export interface MapFilterOption {
  id: string
  label: string
  count: number
  colorClass?: string
}

const props = defineProps<{
  mapType: 'roadmap' | 'terrain' | 'satellite'
  filterOptions: MapFilterOption[]
  currentFilter: string
  isTrafficActive: boolean
  isFullscreen: boolean
}>()

const emit = defineEmits<{
  'update:mapType': [value: 'roadmap' | 'terrain' | 'satellite']
  'update:currentFilter': [value: string]
  'toggle-traffic': []
  'toggle-fullscreen': []
}>()

// Unique radio group name per component instance
const groupName = `mapLayer-${Math.random().toString(36).slice(2)}`

// Dropdown state
const showMapMenu = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    showMapMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
