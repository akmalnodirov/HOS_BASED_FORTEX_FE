<template>
  <div class="flex items-center justify-between border-b border-border pb-0">
    <Tabs v-model="activeTab" class="w-auto">
      <TabsList class="bg-transparent h-10 lg:h-11 2xl:h-12 p-0 gap-3 lg:gap-4 2xl:gap-6">
        <TabsTrigger
          v-for="tab in tabs"
          :key="tab"
          :value="tab"
          class="px-0 py-0 h-full text-[10px] lg:text-xs 2xl:text-sm text-[#727272] dark:text-muted-foreground font-medium uppercase tracking-wide cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground transition-all bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {{ tab }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- Right Side Toolbar -->
    <div class="flex items-center gap-1.5 lg:gap-2 2xl:gap-3 mb-1">
      <!-- Date Picker -->
      <Popover v-model:open="isCalendarOpen">
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            class="h-8 lg:h-9 2xl:h-10 justify-start text-left font-normal px-2 min-w-45 lg:min-w-50 2xl:min-w-55"
          >
            <span v-if="date && date.start" class="text-xs lg:text-sm 2xl:text-base text-[#666666] dark:text-muted-foreground">
              {{ formatDate(date.start) }} -
              {{ date.end ? formatDate(date.end) : formatDate(date.start) }}
            </span>

            <span v-else class="text-[10px] lg:text-xs 2xl:text-sm text-muted-foreground"
              >Pick a date</span
            >
            <CalendarIcon class="ml-auto w-3.5 h-3.5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="end">
          <RangeCalendar v-model="date" :number-of-months="2" initial-focus />
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import dayjs, { type Dayjs } from 'dayjs'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'

const props = defineProps<{
  modelValue: [Dayjs, Dayjs]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: [Dayjs, Dayjs]]
}>()

const router = useRouter()
const route = useRoute()

const tabs = ['ALL', 'AI', 'BOOST', 'HISTORY', 'OPTIMIZE', 'TRACKING', 'INSERT INFO LOG']
const activeTab = ref('OPTIMIZE')

const isCalendarOpen = ref(false)

const date = computed({
  get: () => {
    const start = props.modelValue[0]
    const end = props.modelValue[1]
    return {
      start: new CalendarDate(start.year(), start.month() + 1, start.date()),
      end: new CalendarDate(end.year(), end.month() + 1, end.date()),
    }
  },
  set: (val: any) => {
    if (!val || !val.start || !val.end) return
    const start = dayjs()
      .year(val.start.year)
      .month(val.start.month - 1)
      .date(val.start.day)
      .startOf('day')
    const end = dayjs()
      .year(val.end.year)
      .month(val.end.month - 1)
      .date(val.end.day)
      .endOf('day')
    emit('update:modelValue', [start, end])
  },
})

function formatDate(d: any) {
  if (!d) return ''
  return `${String(d.day).padStart(2, '0')}.${String(d.month).padStart(2, '0')}.${d.year}`
}

// Watch for tab changes and navigate accordingly
watch(activeTab, (newTab) => {
  const driverId = route.params.id

  if (!driverId) return

  // Use route query date if available, otherwise undefined
  const dateParam = route.query.date as string

  switch (newTab) {
    case 'ALL':
      router.push({
        name: 'ELDLogDetail',
        params: { id: driverId },
        query: dateParam ? { date: dateParam } : undefined,
      })
      break

    case 'BOOST':
      router.push({
        name: 'ELDBoost',
        params: { id: driverId },
        query: dateParam ? { date: dateParam } : undefined,
      })
      break

    case 'HISTORY':
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
