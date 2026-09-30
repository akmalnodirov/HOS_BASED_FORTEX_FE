<template>
  <div class="flex items-center justify-between border-b border-border pb-0">
    <Tabs v-model="activeTab" class="w-auto">
      <TabsList class="bg-transparent h-10 lg:h-11 2xl:h-12 p-0 gap-3 lg:gap-4 2xl:gap-6">
        <TabsTrigger
          v-for="tab in tabs"
          :key="tab"
          :value="tab"
          class="px-0 py-0 h-full text-[10px] lg:text-xs 2xl:text-sm text-[#727272] font-medium uppercase tracking-wide cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {{ tab }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- Right Side Toolbar -->
    <div class="flex items-center gap-1.5 lg:gap-2 2xl:gap-3 mb-1">
      <!-- Booster Toggle -->
      <div class="flex items-center bg-[#F0F0F0] dark:bg-muted rounded p-1 h-8 lg:h-9 2xl:h-10">
        <button
          v-for="b in ['booster 1', 'booster 2', 'booster 3']"
          :key="b"
          @click="selectedBooster = b"
          :class="[
            'px-2 lg:px-2.5 2xl:px-3 py-1 lg:py-1.5 2xl:py-2 text-[10px] lg:text-xs 2xl:text-sm font-medium rounded-sm transition-all capitalize cursor-pointer',
            selectedBooster === b
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          ]"
        >
          {{ b }}
        </button>
      </div>

      <!-- Search -->
      <Button
        variant="outline"
        size="icon"
        class="h-8 w-8 lg:h-9 w-9 2xl:h-10 w-10"
        @click="$emit('search-click')"
      >
        <Search class="w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
      </Button>

      <!-- Date Picker -->
      <Popover v-model:open="isCalendarOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            class="h-8 lg:h-9 2xl:h-10 justify-start text-left font-normal px-2 min-w-[180px] lg:min-w-[200px] 2xl:min-w-[220px]"
          >
            <span v-if="date && date.start" class="text-[10px] lg:text-xs 2xl:text-sm">
              {{ formatDate(date.start) }} -
              {{ date.end ? formatDate(date.end) : formatDate(date.start) }}
            </span>
            <span v-else class="text-[10px] lg:text-xs 2xl:text-sm text-muted-foreground"
              >Pick a date</span
            >
            <CalendarIcon
              class="ml-auto w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 opacity-50"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="end">
          <RangeCalendar v-model="date" initial-focus />
        </PopoverContent>
      </Popover>

      <!-- Create Button -->
      <Button
        class="h-8 lg:h-9 2xl:h-10 bg-[#111] dark:bg-foreground text-white dark:text-background hover:bg-[#111]/90 text-[10px] lg:text-xs 2xl:text-sm px-3 lg:px-4"
      >
        Create
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CalendarDate } from '@internationalized/date'
import { Search, Calendar as CalendarIcon } from 'lucide-vue-next'
import type { Dayjs } from 'dayjs'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  headerDate?: [Dayjs, Dayjs]
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()

const tabs = ['ALL', 'AI', 'BOOST', 'HISTORY', 'OPTIMIZE', 'TRACKING', 'INSERT INFO LOG']
const activeTab = ref('BOOST')

defineEmits<{
  (e: 'search-click'): void
}>()

// Right Toolbar State
const selectedBooster = ref('booster 1')
const selectedVehicle = ref('all')
const isCalendarOpen = ref(false)

const date = ref<any>({
  start: new CalendarDate(2024, 8, 14),
  end: new CalendarDate(2024, 9, 14),
})

function formatDate(date: any) {
  if (!date) return ''
  return `${String(date.month).padStart(2, '0')}.${String(date.day).padStart(2, '0')}.${date.year}`
}

// Watch for tab changes and navigate accordingly
watch(activeTab, (newTab) => {
  const driverId = route.params.id

  if (!driverId) return

  // Get date from props or use current route query
  const dateParam = props.headerDate?.[0]?.format('YYYY-MM-DD') || (route.query.date as string)

  switch (newTab) {
    case 'ALL':
      // Navigate back to logs detail page
      router.push({
        name: 'ELDLogDetail',
        params: { id: driverId },
        query: dateParam ? { date: dateParam } : undefined,
      })
      break

    case 'OPTIMIZE':
      router.push({
        name: 'ELDOptimise',
        params: { id: driverId },
        query: dateParam ? { date: dateParam } : undefined,
      })
      break

    case 'HISTORY':
      // Navigate to logs detail page with history mode
      router.push({
        name: 'ELDLogDetail',
        params: { id: driverId },
        query: {
          tab: 'history',
          ...(dateParam && { date: dateParam }),
        },
      })
      break
  }
})
</script>
