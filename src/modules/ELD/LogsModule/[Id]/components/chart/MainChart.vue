<template>
  <div
    class="relative bg-white dark:bg-card"
    ref="parentDiv"
    @mousemove="onEditMouseMove"
    @mouseleave="editMovingController = false"
    @mouseup="editControllerReleased"
    :style="{ cursor: editControllerStart || editControllerEnd ? 'grabbing' : '' }"
  >
    <div class="w-full flex">
      <LabelsForDutiesSingleDay
        :edit="props.edit || props.add"
        :height="height"
        :top-offset="topOffset"
      />
      <div
        ref="svgContainer"
        dir="rtl"
        :style="{ paddingBottom: props.edit || props.add ? `35px` : `10px` }"
        :class="[
          props.edit || props.add || dutyTimesCopy?.dayNames?.length < 2
            ? 'overflow-x-hidden'
            : 'overflow-x-auto',
        ]"
        class="overflow-y-hidden flex-1 relative pt-2.5"
        id="chartid"
      >
        <svg
          v-if="dutyTimesCopy?.dayNames"
          ref="mySvg"
          xmlns="http://www.w3.org/2000/svg"
          :viewBox="`0 0 ${actualSvgViewBox} ${height * 4 + topOffset + 10}`"
          :width="actualSvgWidth"
          class="event-chart duration-300"
          height="100%"
          @mousemove="onMouseMove"
          @mouseenter="isMovingDetailsVisible = true"
          @mouseleave="isMovingDetailsVisible = false"
          @click="handleChartClick"
        >
          <g transform="translate(0, 0)" pointer-events="all">
            <LabelsForDays
              :edit="props.edit || props.add"
              :distance="distance"
              :day-names="dutyTimesCopy?.dayNames ? dutyTimesCopy.dayNames : []"
              :count="actualHours"
            />
            <HorizontalStrokes
              :height="height"
              :top-offset="topOffset"
              :distance="distance"
              :count="actualHours"
            />
            <LongestVerticalSeparatingColumn
              :height="height"
              :top-offset="topOffset"
              :distance="distance"
              :count="actualHours"
              class="day-separator"
            />
            <DaySeparator
              :height="height"
              :top-offset="topOffset"
              :distance="distance"
              :count="actualHours"
              class="day-separator"
              ref="daySeparatorComponent"
            />
            <OneMiddleVerticalStroke
              :height="height"
              :top-offset="topOffset"
              :distance="distance"
              :count="actualHours"
            />
            <TwoShorterVerticalStrokes
              :height="height"
              :top-offset="topOffset"
              :distance="distance"
              :count="actualHours * 2"
            />
            <TwoShortestVerticalStrokes
              :height="height"
              :top-offset="topOffset"
              :distance="distance"
              :count="actualHours * 2"
            />

            <!-- DUTY EVENTS -->
            <g v-for="(dutyGroup, dutyIndex) in dutyTimesCopy?.duties" :key="dutyIndex">
              <template v-for="(item, key) in dutyGroup" :key="key">
                <text
                  :x="(item.x1 + item.x2) / 2"
                  :y="verticalEventPosition(+dutyIndex) - (props.edit || props.add ? 4 : 6)"
                  text-anchor="middle"
                  :font-size="props.edit || props.add ? 10 : 12"
                  :fill="mainColor"
                  font-weight="500"
                  v-if="
                    canBeDisplayed(item.x1, item.x2, item.duration) && (!props.edit || !props.add)
                  "
                >
                  {{ formatDuration(item.duration) }}
                </text>
                <text
                  :x="(item.x1 + item.x2) / 2"
                  :y="verticalEventPosition(+dutyIndex) + (props.edit || props.add ? 22 : 27)"
                  text-anchor="middle"
                  :font-size="props.edit || props.add ? 10 : 12"
                  :fill="mainColor"
                  font-weight="500"
                  v-if="
                    canBeDisplayed(item.x1, item.x2, item.duration) &&
                      (!props.edit || !props.add) &&
                      item.speedMph &&
                      item.speedMph > 0 &&
                      item.eventCode == 3
                  "
                >
                  {{ item.speedMph + 'm/h' }}
                </text>
                <text
                  :x="(item.x1 + item.x2) / 2"
                  :y="verticalEventPosition(+dutyIndex) + (props.edit || props.add ? 13 : 15)"
                  text-anchor="middle"
                  :font-size="props.edit || props.add ? 10 : 12"
                  :fill="mainColor"
                  font-weight="500"
                  v-if="
                    canBeDisplayed(item.x1, item.x2, item.duration) &&
                      (!props.edit || !props.add) &&
                      item.distanceMiles &&
                      item.distanceMiles > 0
                  "
                >
                  {{ formatMiles(item.distanceMiles) + 'mi' }}
                </text>
                <line
                  :id="'HosEvent-' + dutyIndex + '-' + key"
                  :x1="item.x1 + (item.x2 - item.x1 <= 5 ? 0 : 2)"
                  :x2="item.x2 - (item.x2 - item.x1 <= 5 ? 0 : 2)"
                  :y1="verticalEventPosition(+dutyIndex)"
                  :y2="verticalEventPosition(+dutyIndex)"
                  :stroke-width="item.x2 - item.x1 <= 5 ? 2 : 5"
                  :stroke-linecap="item.x2 - item.x1 <= 5 ? 'butt' : 'round'"
                  stroke-opacity="1"
                  :stroke="mainColor"
                  :stroke-dasharray="+dutyIndex === 6 || +dutyIndex === 5 ? '8' : ''"
                  @mouseenter="+dutyIndex === 3 ? drivingMouse : null"
                ></line>
              </template>
            </g>
            <g v-for="(dutyGroup, dutyIndex) in reassignDutyTimesCopy?.duties" :key="dutyIndex">
              <template v-for="(item, key) in dutyGroup" :key="key">
                <text
                  :x="(item.x1 + item.x2) / 2"
                  :y="verticalEventPosition(+dutyIndex) - (props.edit || props.add ? 4 : 6)"
                  text-anchor="middle"
                  :font-size="props.edit || props.add ? 10 : 12"
                  :fill="inactiveColor"
                  font-weight="500"
                  v-if="
                    canBeDisplayed(item.x1, item.x2, item.duration) && (!props.edit || !props.add)
                  "
                >
                  {{ formatDuration(item.duration) }}
                </text>
                <text
                  :x="(item.x1 + item.x2) / 2"
                  :y="verticalEventPosition(+dutyIndex) + (props.edit || props.add ? 22 : 27)"
                  text-anchor="middle"
                  :font-size="props.edit || props.add ? 10 : 12"
                  :fill="inactiveColor"
                  font-weight="500"
                  v-if="
                    canBeDisplayed(item.x1, item.x2, item.duration) &&
                      (!props.edit || !props.add) &&
                      item.speedMph &&
                      item.speedMph > 0 &&
                      item.eventCode == 3
                  "
                >
                  {{ item.speedMph + 'm/h' }}
                </text>
                <text
                  :x="(item.x1 + item.x2) / 2"
                  :y="verticalEventPosition(+dutyIndex) + (props.edit || props.add ? 13 : 15)"
                  text-anchor="middle"
                  :font-size="props.edit || props.add ? 10 : 12"
                  :fill="inactiveColor"
                  font-weight="500"
                  v-if="
                    canBeDisplayed(item.x1, item.x2, item.duration) &&
                      (!props.edit || !props.add) &&
                      item.distanceMiles &&
                      item.distanceMiles > 0
                  "
                >
                  {{ formatMiles(item.distanceMiles) + 'mi' }}
                </text>
                <line
                  :id="'HosEvent-' + dutyIndex + '-' + key"
                  :x1="item.x1 + (item.x2 - item.x1 <= 5 ? 0 : 2)"
                  :x2="item.x2 - (item.x2 - item.x1 <= 5 ? 0 : 2)"
                  :y1="verticalEventPosition(+dutyIndex)"
                  :y2="verticalEventPosition(+dutyIndex)"
                  :stroke-width="item.x2 - item.x1 <= 5 ? 2 : 5"
                  :stroke-linecap="item.x2 - item.x1 <= 5 ? 'butt' : 'round'"
                  stroke-opacity="1"
                  :stroke="inactiveColor"
                  :stroke-dasharray="+dutyIndex === 6 || +dutyIndex === 5 ? '8' : ''"
                  @mouseenter="+dutyIndex === 3 ? drivingMouse : null"
                ></line>
              </template>
            </g>

            <!-- VERTICAL LINES -->
            <line
              v-for="(item, key) in dutyTimesCopy?.verticalLines"
              :key="key"
              id="HosEvent:ZIJ8jxerCn-0-vertical"
              :x1="item.x1"
              :x2="item.x2"
              :y1="verticalEventPosition(item.eventOrders[0])"
              :y2="verticalEventPosition(item.eventOrders[1])"
              stroke-width="1"
              stroke-opacity="1"
              :stroke="mainColor"
            ></line>
            <line
              v-for="(item, key) in reassignDutyTimesCopy?.verticalLines"
              :key="key"
              id="HosEvent:ZIJ8jxerCn-0-vertical1"
              :x1="item.x1"
              :x2="item.x2"
              :y1="verticalEventPosition(item.eventOrders[0])"
              :y2="verticalEventPosition(item.eventOrders[1])"
              stroke-width="1"
              stroke-opacity="1"
              :stroke="inactiveColor"
            ></line>

            <!-- VIOLATIONS -->
            <line
              v-for="(violation, ind) in props?.violations"
              :key="ind"
              :x1="Array.isArray(violation) ? violation[0].position : violation?.position"
              :y1="topOffset"
              :x2="Array.isArray(violation) ? violation[0].position : violation?.position"
              :y2="height * 5"
              stroke-width="2"
              :stroke="errorColor"
            ></line>

            <!-- EDIT EVENT LINES and RECTS -->
            <!-- top border -->
            <line
              v-if="props.edit || props.add"
              :x1="editEvent.x1"
              :y1="topOffset"
              :x2="editEvent.x2"
              :y2="topOffset"
              stroke-width="2"
              :stroke="editColor"
              stroke-dasharray="4"
              stroke-linecap="round"
            ></line>

            <!-- two borders -->
            <line
              v-if="props.edit || props.add"
              :x1="editEvent.x1"
              :y1="topOffset"
              :x2="editEvent.x1"
              :y2="topOffset + height * 5"
              stroke-width="2"
              :stroke="editColor"
            ></line>
            <line
              v-if="props.edit || props.add"
              :x1="editEvent.x2"
              :y1="topOffset"
              :x2="editEvent.x2"
              :y2="topOffset + height * 5"
              stroke-width="2"
              :stroke="editColor"
            ></line>

            <rect
              v-if="props.edit || props.add"
              :stroke="editColor"
              :x="editEvent.x1"
              :y="topOffset"
              :width="editEvent.x2 - editEvent.x1"
              :fill="editColor"
              opacity="0.1"
              :height="height * 4"
            ></rect>

            <!-- HORIZONTAL 2 RECTS -->
            <rect
              :stroke="mainColor"
              :x="0"
              :y="topOffset + height"
              :width="distance * actualHours"
              :fill="mainColor"
              opacity="0.04"
              :height="height"
            ></rect>
            <rect
              :stroke="mainColor"
              :x="0"
              :y="topOffset + height * 3"
              :width="distance * actualHours"
              :fill="mainColor"
              opacity="0.04"
              :height="height"
            ></rect>

            <!--MOVING VERTICAL LINE AND CIRCLE-->
            <line
              :x1="dynamicLine.x1"
              :y1="topOffset"
              :x2="dynamicLine.x2"
              :y2="height * 5"
              stroke-width="2"
              :stroke="mainColor"
              v-if="isMovingDetailsVisible && !props.edit && !props.add"
            ></line>
            <circle
              :cx="circleObj.x"
              :cy="circleObj.y"
              r="5"
              :fill="mainColor"
              :stroke="mainColor"
              stroke-width="1"
              pointer-events="none"
              v-if="isMovingDetailsVisible && !props.edit && !props.add && rectObj.width"
            ></circle>
            <template v-for="freeTime in freeTimes" :key="freeTime.eventId">
              <rect
                class="duration-200"
                :stroke="mainColor"
                :x="freeTime.startPosition"
                :y="topOffset"
                :width="freeTime.endPosition - freeTime.startPosition"
                fill="#0AD406"
                opacity="0.15"
                :height="height * 4"
              ></rect>
            </template>

            <template v-for="event in selectedEvents" :key="event.eventId">
              <rect
                class="duration-200"
                :stroke="mainColor"
                :x="event.x1"
                :y="topOffset"
                :width="event.x2 - event.x1"
                :fill="mainColor"
                opacity="0.1"
                :height="height * 4"
              ></rect>
            </template>

            <template v-if="selectedEvent">
              <rect
                class="duration-200"
                :stroke="mainColor"
                :x="selectedEvent.x1"
                :y="topOffset"
                :width="selectedEvent.x2 - selectedEvent.x1"
                :fill="mainColor"
                opacity="0.1"
                :height="height * 4"
              ></rect>
            </template>

            <template v-if="props.allViolations?.length">
              <g v-for="violationGroup in props.allViolations" :key="violationGroup.stringType">
                <rect
                  v-for="(block, index) in violationGroup.violationBlocks"
                  :key="index"
                  class="duration-200"
                  :x="block[0]"
                  :width="block[1]"
                  :y="topOffset"
                  :height="height * 4"
                  fill="#f77963"
                  fill-opacity="0.4"
                />
              </g>
            </template>

            <rect
              v-if="!props.edit && !props.add"
              class="duration-200"
              :stroke="mainColor"
              :x="rectObj.x"
              :y="topOffset"
              :width="rectObj.width"
              :fill="mainColor"
              opacity="0.1"
              :height="height * 4"
              @mousedown="handleMouseDown"
              @contextmenu.prevent
              @click="handleBlockClick"
            ></rect>
          </g>
        </svg>

        <!-- VIOLATIONS -->
        <template v-if="!props.edit && !props.add">
          <div
            v-for="(violation, ind) in props.violations"
            :key="ind"
            :style="{
              left: `calc(100% - ${dutyTimesCopy?.svgWidth - (Array.isArray(violation) ? violation?.[0]?.position : violation?.position)}px - 1px)`,
            }"
            class="absolute duration-300 bg-[#F7EDED] border-[1px] text-[#AF4B4B] border-[#AF4B4B] top-2.5 z-[10] bg-red-1 h-5 px-1.5 w-fit whitespace-nowrap rounded-full rounded-bl-none text-[10px] flex items-center justify-center"
          >
            {{ Array.isArray(violation) ? violation?.[0]?.description : violation?.description }}
          </div>
        </template>

        <div
          v-if="loading"
          class="absolute top-0 left-0 z-50 bg-white dark:bg-card flex justify-center items-center w-full h-full"
        >
          <Loader2 class="animate-spin text-[#222222B2] text-3xl" />
        </div>
      </div>
      <LabelsForDutyHoursSingleDay
        ref="labelsForDutyHours"
        :edit="props.edit || props.add"
        :height="height"
        :top-offset="topOffset"
        :day-name="separatorDate?.format('MMM D') ?? ''"
        :daily-summary="dailySummary"
      />
    </div>
    <div
      v-if="!props.edit && !props.add && rectObj.width"
      :style="{
        left: detailsToolTip + 'px',
        opacity: isMovingDetailsVisible ? 1 : 0,
        pointerEvents: isMovingDetailsVisible ? 'auto' : 'none',
        boxShadow: isDarkMode
          ? '0 0 15px -5px rgba(0,0,0,0.5)'
          : '0 0 15px -5px rgba(146,149,161,0.5)',
      }"
      class="absolute -translate-x-1/2 duration-200 top-42 z-21! bg-card border border-border rounded-xl px-4 py-2 text-xs text-foreground"
    >
      <div
        style="clip-path: polygon(50% 0, 100% 100%, 0 100%)"
        class="absolute left-1/2 -translate-x-1/2 -top-1.5 w-6 h-2 bg-card"
      ></div>
      <p class="text-center">
        <strong>{{ lineToolTipCurrentTime }}</strong>
      </p>
      <div class="space-y-2 mt-5 font-bold">
        <p class="flex gap-x-10 justify-between">
          <span class="uppercase">STATUS</span><span
            class="uppercase"
            :style="{ color: events.find((n) => n.key === lineToolTipStatus)?.color }"
          >{{ events.find((n) => n.key === lineToolTipStatus)?.label }}</span>
        </p>
        <p class="flex gap-x-10 justify-between whitespace-nowrap">
          <span class="uppercase">EVENT TIME</span><span>{{ lineToolTipEventTime }}</span>
        </p>
        <p class="flex gap-x-10 justify-between">
          <span class="uppercase">DURATION</span><span>{{ lineToolTipDuration }}</span>
        </p>
        <p class="flex gap-x-10 justify-between" v-if="lineToolTipMiles">
          <span class="uppercase">MILES</span><span>{{ lineToolTipMiles }}</span>
        </p>
        <p class="flex gap-x-10 justify-between" v-if="lineToolTipSpeed">
          <span class="uppercase">SPEED</span><span>{{ lineToolTipSpeed }}</span>
        </p>
      </div>
    </div>

    <!-- EDIT EVENT -->
    <!-- edit event controller -->
    <div
      v-if="props.edit || props.add"
      :style="{ left: `${editEvent.x1 + 47}px`, width: `${2 + (editEvent.x2 - editEvent.x1)}px` }"
      class="absolute top-35.25 z-20 border-x-2 border-primary h-8.5"
    >
      <Button
        @mousedown="((editMovingController = true), (editControllerStart = true))"
        @mouseup="((editMovingController = false), (editControllerStart = false))"
        variant="default"
        size="default"
        class="bg-primary h-5.5 w-5.5 group hover:bg-primary/90 active:bg-primary absolute -left-3.5 bottom-0 -translate-x-1/2 cursor-grab! active:cursor-grabbing! rounded-sm"
        :class="{ 'opacity-50 cursor-not-allowed!': blockEventTimeEdit }"
        :disabled="blockEventTimeEdit"
      >
        <!--        <ArrowLeft-->
        <!--          class="w-4 h-4 text-primary-foreground !cursor-grab group-active:!cursor-grabbing"-->
        <!--        />-->
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 5.83268L10.8333 9.99935L15 14.166M9.16667 5.83268L5 9.99935L9.16667 14.166"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
      <Button
        @mousedown="((editMovingController = true), (editControllerEnd = true))"
        @mouseup="((editMovingController = false), (editControllerEnd = false))"
        variant="default"
        size="default"
        class="bg-primary w-5.5 h-5.5 group hover:bg-primary/90 active:bg-primary absolute -right-3.5 bottom-0 translate-x-1/2 cursor-grab! active:cursor-grabbing! rounded-sm"
        :class="{ 'opacity-50 cursor-not-allowed!': blockEventTimeEdit }"
        :disabled="blockEventTimeEdit"
      >
        <!--        <ArrowRight-->
        <!--          class="w-4 h-4 text-primary-foreground !cursor-grab group-active:!cursor-grabbing"-->
        <!--        />-->
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 14.1673L9.16667 10.0007L5 5.83398M10.8333 14.1673L15 10.0007L10.8333 5.83398"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Button>
    </div>

    <!-- edit event top tooltip -->
    <div
      v-if="props.edit || props.add"
      :style="{ left: `${editEvent.x1 + (editEvent.x2 - editEvent.x1) / 2 + 47}px` }"
      class="top-1 -translate-x-1/2 absolute rounded-lg bg-primary px-2 py-1"
    >
      <p class="text-xs text-primary-foreground">
        {{ formatDuration(editEvent.duration, true) || '0h 0m' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, nextTick } from 'vue'

// ICONS
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-vue-next'

// DAYJS
import dayjs, { Dayjs } from 'dayjs'

// STORES
import { storeToRefs } from 'pinia'
import { useTimeZoneHelper } from '@/composables/useTimezone.ts'
import { useSidebarStore } from '@/modules/ELD/LogsModule/[Id]/store/sidebar.ts'
import { useChartStore } from '@/modules/ELD/LogsModule/[Id]/store/chart.ts'

// COMPONENTS
import LabelsForDutiesSingleDay from './LabelsForDutiesSingleDay.vue'
import LabelsForDays from './LabelsForDays.vue'
import LabelsForDutyHoursSingleDay from './LabelsForDutyHoursSingleDay.vue'
import HorizontalStrokes from './HorizontalStrokes.vue'
import DaySeparator from './DaySeparator.vue'
import LongestVerticalSeparatingColumn from './LongestVerticalSeparatingColumn.vue'
import OneMiddleVerticalStroke from './OneMiddleVerticalStroke.vue'
import TwoShorterVerticalStrokes from './TwoShorterVerticalStrokes.vue'
import TwoShortestVerticalStrokes from './TwoShortestVerticalStrokes.vue'
import { Button } from '@/components/ui/button'

// UTILITIES
import { deepClone } from '@/utils/object.ts'
import { formatTime, formatDuration, convertPixelstoSeconds } from '@/utils/time.ts'
import {
  convertDateToPixel,
  contains,
  intersectsPos,
  firstFoundEventAfterPos,
  lastFoundEventBeforePos,
} from '@/utils/hos.ts'
import { getDutyOrder, getEventCodeText, isDrivingEvent, events } from '@/utils/events.ts'

// COMPOSABLES
import { useCurrentTime } from '@/composables/useCurrentTime.ts'
import { useDarkMode } from '@/composables/useDarkMode.ts'
import { useRoute } from 'vue-router'

// TYPES
import type {
  GraphResponse,
  DailySummaryResponse,
  DailyDictionarySummaryResponse,
  ViolationPixelResponse,
  BoostFreeTime,
  GraphDuties,
  DaySeparatorComponent,
} from '@/modules/ELD/LogsModule/[Id]/types/chart.ts'

// EMITS
const emits = defineEmits([
  'container:update',
  'dutyEvent:update',
  'update:block-event-time-edit',
  'oncesetprev:update',
  'selectedEvents',
  'selectedEvent',
  'updateReverseEvents',
])

// PROPS
const props = defineProps({
  edit: {
    type: Boolean,
    default: false,
  },
  add: {
    type: Boolean,
    default: false,
  },
  eventId: {
    type: String,
  },
  eventTime: {
    type: Object as () => Dayjs,
  },
  eventType: {
    type: [String, Number],
    default: '1',
  },
  eventCode: {
    type: [String, Number],
    default: '1',
  },
  eventOncesetprev: {
    type: Boolean,
    default: false,
  },
  blockEventTimeEdit: {
    type: Boolean,
    default: false,
  },
  chartData: {
    type: Object as () => GraphResponse,
    required: false,
  },
  reassignsData: {
    type: Object as () => GraphResponse,
    required: false,
  },
  dailySummaries: {
    type: Object as () => DailyDictionarySummaryResponse,
    required: false,
  },
  dailySummary: {
    type: Object as () => DailySummaryResponse,
    required: false,
  },
  violations: {
    type: Array as () => ViolationPixelResponse[],
    required: false,
  },
  allViolations: {
    type: Array as () => {
      stringType: string
      violationBlocks: [number, number][]
    }[],
    required: false,
  },
  x1: {
    type: [Number, String],
    required: false,
  },
  x2: {
    type: [Number, String],
    required: false,
  },
  freeTimes: {
    type: Array as () => BoostFreeTime[],
    required: false,
  },
  ableToBoost: {
    type: Boolean,
    required: false,
    default: false,
  },
  ableToSelect: {
    type: Boolean,
    required: false,
    default: false,
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const editEventType = computed(() => props.eventType)
const editEventCode = computed(() => props.eventCode)
const editEventMapper = computed(() => getDutyOrder(+editEventType.value, +editEventCode.value))
const editOnceSetPrev = computed({
  get() {
    return props.eventOncesetprev
  },
  set(newVal: boolean) {
    console.log('once set prev updated', newVal)
    emits('oncesetprev:update', newVal)
  },
})

// dark
const { isDarkMode } = useDarkMode()
// route
const route = useRoute()

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + (255 - (num >> 16)) * percent)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * percent)
  const b = Math.min(255, (num & 0x0000ff) + (255 - (num & 0x0000ff)) * percent)

  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// CONSTANTAS
const secondInPixel = ref<number>(0)
const mainColor = computed(() => (isDarkMode.value ? '#7588BF' : '#465a95'))
const inactiveColor = computed(() => lightenColor(mainColor.value, 0.3)) // 30% lighter
const errorColor = '#AD1F38'
const editColor = '#56463D'

// chart
const chartStore = useChartStore()
const sidebarStore = useSidebarStore()

// store to refs
const { sidebar } = storeToRefs(sidebarStore)
const { heightInPixel, topOffset, editHeightInPixel, screenResolution } = storeToRefs(chartStore)

// properties of chart
const height = computed(() =>
  props.edit || props.add ? editHeightInPixel.value : heightInPixel.value
)
const distance = computed(() => secondInPixel.value * 3600)

// Calculate actual hours based on backend data (svgWidth) instead of days * 24
// This ensures the chart only shows up to where the backend endDate is
// Backend calculates svgWidth based on actual data range and screenResolution
const actualHours = computed(() => {
  if (!dutyTimesCopy.value) {
    return 0
  }

  // If svgWidth is available, calculate hours based on it
  // Backend sends svgWidth which represents the actual width of data
  // Backend calculates: svgWidth = (actualHours / 24) * screenResolution
  // So: actualHours = (svgWidth * 24) / screenResolution
  if (dutyTimesCopy.value.svgWidth && screenResolution.value && screenResolution.value > 0) {
    const hours = (dutyTimesCopy.value.svgWidth * 24) / screenResolution.value
    return Math.ceil(hours) // Round up to ensure we show all data
  }

  // Fallback: use distance if screenResolution is not available
  if (dutyTimesCopy.value.svgWidth && distance.value && distance.value > 0) {
    const hours = dutyTimesCopy.value.svgWidth / distance.value
    return Math.ceil(hours)
  }

  // Final fallback to days * 24 if svgWidth is not available
  return dutyTimesCopy.value.days ? dutyTimesCopy.value.days * 24 : 0
})

// Use backend's svgWidth directly to limit chart display to actual data range
// This ensures the chart only shows up to where the backend endDate is
const actualSvgWidth = computed(() => {
  // Use backend's svgWidth if available, as it's already calculated based on actual data
  if (dutyTimesCopy.value?.svgWidth) {
    return dutyTimesCopy.value.svgWidth
  }
  // Fallback to calculated width based on days
  if (distance.value && dutyTimesCopy.value?.days) {
    return distance.value * dutyTimesCopy.value.days * 24
  }
  return 1438
})

// Use backend's svgViewBox directly to limit chart display to actual data range
const actualSvgViewBox = computed(() => {
  // Use backend's svgViewBox if available, as it's already calculated based on actual data
  if (dutyTimesCopy.value?.svgViewBox) {
    return dutyTimesCopy.value.svgViewBox
  }
  // Fallback to calculated viewBox based on days
  if (distance.value && dutyTimesCopy.value?.days) {
    return distance.value * dutyTimesCopy.value.days * 24
  }
  return 1738
})

// free times
const freeTimes = computed(() => props.freeTimes)

// time zone
const { convertToTimeZone, getStartOf, acceptAsTimeZone } = useTimeZoneHelper()

const iterateAndRoundMiles = (chartData?: GraphResponse) => {
  if (!chartData) return chartData
  const newChartData = deepClone(chartData)
  for (const lst of Object.values(newChartData.duties)) {
    for (const event of lst as Array<any>) {
      event.distanceMiles = Math.round(event.distanceMiles ?? 0)
      event.speedMph = Math.round(event.speedMph ?? 0)
    }
  }
  return newChartData
}

// duty times
const dutyTimes = computed(() => iterateAndRoundMiles(props.chartData) ?? ({} as GraphResponse))
const dutyTimesCopy = ref<GraphResponse>(dutyTimes.value)
const dutyTimesCopyPrev = ref<GraphResponse>(dutyTimes.value)

const reassignDutyTimesCopy = computed(
  () => iterateAndRoundMiles(props.reassignsData) ?? ({} as GraphResponse)
)

// current time composable
const timeCompose = useCurrentTime()

// current time
const currentTime = ref<Dayjs>(convertToTimeZone(timeCompose.currentTime.value))
watch(
  () => timeCompose.currentTime.value,
  () => {
    currentTime.value = convertToTimeZone(timeCompose.currentTime.value)
  }
)

// edit event time
const editEventTime = ref<Dayjs>(props.eventTime!)

// if edit is true, search for eventId
// For add mode, initialize with small range (both at same position) to avoid affecting existing duties
const getInitialX1 = () => {
  if (props.x1) return parseInt(props.x1 as string)
  // For add mode, start at a small offset instead of 0 to avoid covering all duties from start
  return props.add ? 50 : 0
}
const getInitialX2 = () => {
  if (props.x2) return parseInt(props.x2 as string)
  // For add mode, start with same position as x1 (will expand when user drags)
  return props.add ? 52 : 100
}

const editEvent = reactive({
  x1: getInitialX1(),
  x2: getInitialX2(),
  y1: 0,
  y2: 0,
  eventCode: props.edit || props.add ? parseInt(props.eventCode as string) : 0,
  eventType: props.edit || props.add ? parseInt(props.eventType as string) : 0,
  duration: 0,
  eventId: 'edit_event_changing_id',
  eventTime: dayjs() as Dayjs,
  eventOrders: [] as number[],
  recordOrigin: 2,
  recordStatus: 1,
})

// block editing event, if the first event after the editing event is auto driving
const blockEventTimeEdit = computed({
  get() {
    return props.blockEventTimeEdit
  },
  set(newVal: boolean) {
    emits('update:block-event-time-edit', newVal)
    console.log('block edit event updated', newVal)
  },
})

// parentDiv
const parentDiv = ref<HTMLElement | undefined>()

const labelsForDutyHours = ref<HTMLElement | null>(null)
const separatorDayOrder = ref<number>(0)
const separatorDate = ref<Dayjs>(dayjs())

// daily summaries
const dailySummary = ref<DailySummaryResponse>(
  (props.dailySummary as DailySummaryResponse) ||
    (props.dailySummaries?.[
      formatTime(separatorDate.value, 'YYYY-MM-DDT00:00:00')
    ] as DailySummaryResponse)
)

watch(
  () => [props.dailySummary, props.dailySummaries, separatorDate.value],
  () => {
    dailySummary.value =
      (props.dailySummary as DailySummaryResponse) ||
      (props.dailySummaries?.[
        formatTime(separatorDate.value, 'YYYY-MM-DDT00:00:00')
      ] as DailySummaryResponse)
  }
)

const dynamicLine = ref({
  x1: 12000.000019221086,
  x2: 12000.000019221086,
  y1: topOffset.value,
  y2: topOffset.value * 4 + topOffset.value,
})
const rectObj = ref<{
  x: number
  y1: number
  y2: number
  width: number
  lineId: string | number
}>({
  x: 0,
  y1: 0,
  y2: 0,
  width: 0,
  lineId: '',
})
const circleObj = ref({
  x: 0,
  y: 0,
})
const isClickedBlock = ref<boolean>(false)
const isManualScroll = ref<boolean>(false)
const detailsToolTip = ref(0)
const lineToolTip = ref({
  duration: 100,
  status: 1,
  eventTime: dayjs(),
  currentTime: dayjs(),
  distanceMiles: 0,
  speedMph: 0,
})

// dynamic moving lines
const isMovingDetailsVisible = ref<boolean>(false)
const editMovingController = ref<boolean>(false)
const editControllerStart = ref<boolean>(false)
const editControllerEnd = ref<boolean>(false)

const daySeparatorComponent = ref<DaySeparatorComponent | null>(null)
const svgContainer = ref<HTMLElement | any>(null)
const previousScrollLeft = ref<number>(0)
const mySvg = ref<any>(null)

// Vertical Position Based on Event Code
function verticalEventPosition(code: number) {
  switch (code) {
    case 0:
    case 1:
    case 6:
      return topOffset.value + height.value / 2
    case 2:
      return topOffset.value + (height.value * 3) / 2
    case 3:
      return topOffset.value + (height.value * 5) / 2
    case 4:
    case 5:
      return topOffset.value + (height.value * 7) / 2
    default:
      return 1
  }
}

// tooltip
const lineToolTipDuration = computed(() => {
  const duration: number = lineToolTip.value.duration
  const h: number = Math.floor(duration / 3600)
  const m: number = Math.floor((duration % 3600) / 60)
  const s: number = Math.floor((duration % 3600) % 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})
const lineToolTipMiles = computed(() => {
  const miles: number = lineToolTip.value.distanceMiles
  return miles > 0 ? `${miles} miles` : 0
})
const lineToolTipSpeed = computed(() => {
  const speed: number = lineToolTip.value.speedMph
  return speed > 0 ? `${speed} m/h` : 0
})

const lineToolTipStatus = computed(() => {
  switch (lineToolTip?.value.status) {
    case 1:
      return 'offduty'
    case 2:
      return 'sleeper'
    case 3:
      return 'driving'
    case 4:
      return 'onduty'
    case 5:
      return 'ym'
    case 6:
      return 'pc'
    default:
      return 'offduty'
  }
})

const dutyTimesXCoordinatesSorted = computed(() => {
  if (!dutyTimes.value?.duties) return [] as GraphDuties[]
  const arr = Object.values(dutyTimes.value.duties).flat() as GraphDuties[]
  arr.sort((a, b) => (a.x1 != b.x1 ? a.x1 - b.x1 : a.x2 - b.x2))
  return arr
})

const formatMiles = (miles: number): string => {
  if (miles >= 1000) {
    return `${(miles / 1000).toFixed(1)}k`
  } else if (miles >= 100) {
    return `${Math.round(miles)}`
  } else if (miles >= 10) {
    return `${miles.toFixed(1)}`
  } else {
    return `${miles.toFixed(2)}`
  }
}

const lineToolTipEventTime = computed(() => {
  return formatTime(lineToolTip.value.eventTime, 'MMM DD, hh:mm:ss A')
})

const lineToolTipCurrentTime = computed(() => {
  return formatTime(lineToolTip.value.currentTime, 'MMM DD, hh:mm:ss A')
})

function changeBlockBackground() {
  // Circle x coordinate handling
  circleObj.value.x = dynamicLine.value.x1

  let l: number = 0,
    r: number = dutyTimesXCoordinatesSorted.value.length - 1,
    mid: number

  // Binary search to find the segment containing the dynamicLine
  while (l <= r) {
    mid = Math.floor((l + r) / 2)
    const segment = dutyTimesXCoordinatesSorted.value[mid]

    if (dynamicLine.value.x1 >= segment.x1 && dynamicLine.value.x1 <= segment.x2) {
      // We've found the correct segment
      rectObj.value.x = segment.x1
      rectObj.value.width = segment.x2 - segment.x1
      rectObj.value.y1 = segment.y1
      rectObj.value.y2 = segment.y2

      if (isClickedBlock.value) {
        if (rectObj.value.lineId !== segment.eventId) {
          rectObj.value.lineId = segment.eventId
        }
      }

      circleObj.value.y = verticalEventPosition(segment?.eventCode)

      lineToolTip.value.status = segment?.eventCode ?? 1
      lineToolTip.value.duration = segment?.duration ?? 100
      lineToolTip.value.distanceMiles = segment?.distanceMiles ?? 0
      lineToolTip.value.speedMph = segment?.speedMph ?? 0
      lineToolTip.value.eventTime = dayjs(segment?.eventTime) ?? dayjs()
      lineToolTip.value.currentTime = dayjs(segment?.eventTime).add(
        ((dynamicLine.value.x1 - segment.x1) / secondInPixel.value) * 1000,
        'milliseconds'
      )
      return segment
    } else if (dynamicLine.value.x1 < segment.x1) {
      r = mid - 1
    } else {
      l = mid + 1
    }
  }

  const lastDutyTime = dutyTimesXCoordinatesSorted.value.at(-1)?.eventTime
  const lastX1 = dutyTimesXCoordinatesSorted.value.at(-1)?.x1

  lineToolTip.value.currentTime =
    lastDutyTime && lastX1 !== undefined
      ? dayjs(lastDutyTime).add(
          (1000 * (dynamicLine.value.x1 - lastX1)) / secondInPixel.value,
          'milliseconds'
        )
      : dayjs()

  rectObj.value = { x: 0, width: 0, y1: 0, y2: 0, lineId: '' }
  return null
}

watch(
  () => dutyTimes.value,
  () => {
    if (dutyTimes?.value) {
      hosScrollHandling()
    }

    dutyTimesCopy.value = dutyTimes.value
    dutyTimesCopyPrev.value = dutyTimes.value

    if (props.edit || props.add) {
      console.log(
        editEventType.value,
        editEventCode.value,
        editEventMapper.value,
        'edit event type and code'
      )
      const dutyEvent = dutyTimes.value.duties![
        editEventMapper.value.toString() as keyof typeof dutyTimes.value.duties
      ]?.find((event: GraphDuties) => event.eventId === props.eventId)
      editEvent.x1 = dutyEvent?.x1 || 1
      editEvent.x2 = dutyEvent?.x2 || 3
      editEvent.duration = dutyEvent?.duration || 0

      const nextEvent = props.eventId
        ? dutyTimesXCoordinatesSorted.value.find(
            (event: GraphDuties) => event.eventId !== props.eventId && event.x1 >= editEvent.x2
          )
        : undefined
      if (nextEvent && isDrivingEvent(nextEvent) && nextEvent.recordOrigin == 1) {
        blockEventTimeEdit.value = true
      } else {
        blockEventTimeEdit.value = false
      }

      emitDutyEventUpdate()
    }

    separatorDayOrder.value = dutyTimes.value?.dayNames.length ?? 0
  }
)

const hosScrollHandling = () => {
  const labelsForDutyHoursEl = labelsForDutyHours.value
  const separatorComponent = daySeparatorComponent.value

  if (separatorComponent && separatorComponent.separatorRefs.length && labelsForDutyHoursEl) {
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    })

    separatorComponent.separatorRefs.forEach((separator: SVGPathElement) => {
      observer.observe(separator)
    })

    if (labelsForDutyHoursEl instanceof HTMLElement) {
      observer.observe(labelsForDutyHoursEl)
    }
  }
}

const handleIntersection = (entries: IntersectionObserverEntry[]) => {
  entries.forEach((entry: IntersectionObserverEntry) => {
    if (entry.isIntersecting && entry.intersectionRatio === 1) {
      const dataKey = entry.target.getAttribute('data-key')
      console.log(`Intersection detected between vertical separator and labels.${dataKey}`)
    }
  })
}

const drivingMouse = (event: MouseEvent) => {
  console.log('im here baby')
  console.log('im here baby')
}

// selected events
const selectedEvents = ref<GraphDuties[]>([])
const selectedEvent = ref<GraphDuties | null>(null)

const handleBlockClick = (event: MouseEvent) => {
  let result = onMouseMove(event)
  console.log('clicked rect event', result)
  if (!props.ableToSelect) {
    if (result) {
      emits('selectedEvent', result, true)
    }
  }
  console.log('EventId', result?.eventId)
  console.log('eventTime', result?.eventTime)
  if (props.ableToBoost && result) {
    if (!selectedEvents.value.some((evt: GraphDuties) => evt.eventId === result.eventId)) {
      selectedEvents.value.push(result)
      if (selectedEvents.value.length > 2) selectedEvents.value.shift()
    } else if (selectedEvents.value.some((evt: GraphDuties) => evt.eventId === result.eventId)) {
      selectedEvents.value = selectedEvents.value.filter(
        (evt: GraphDuties) => evt.eventId !== result.eventId
      )
    }

    let min = Math.min(...selectedEvents.value.map((evt: GraphDuties) => evt.x1))
    let max = Math.max(...selectedEvents.value.map((evt: GraphDuties) => evt.x1))

    console.log(
      selectedEvents.value,
      selectedEvents.value.length >= 2 &&
        selectedEvents.value[0]?.eventTime
          ?.toString()
          .localeCompare(selectedEvents.value[1]?.eventTime?.toString()) >= 1
    )
    if (
      selectedEvents.value.length <= 1 ||
      selectedEvents.value[0]?.eventTime
        ?.toString()
        .localeCompare(selectedEvents.value[1]?.eventTime?.toString()) <= -1
    ) {
      emits('updateReverseEvents', false)
    } else if (selectedEvents.value.length >= 2) {
      emits('updateReverseEvents', true)
    }

    let twoEvents: GraphDuties[] = dutyTimesXCoordinatesSorted.value.filter(
      (event: GraphDuties) => min <= event.x1 && max >= event.x1
    )
    if (twoEvents.length > 1) twoEvents = [twoEvents[0], twoEvents[twoEvents.length - 1]]
    else if (twoEvents.length > 0) twoEvents = [twoEvents[0]]

    const selectedMoveEvensDurations: number[] = []
    const nextEventAfterFirstEvent = dutyTimesXCoordinatesSorted.value.find(
      (event: GraphDuties) => event?.x1 > twoEvents[0]?.x1
    )
    if (nextEventAfterFirstEvent?.eventTime && twoEvents[0]?.eventTime) {
      selectedMoveEvensDurations.push(
        Math.abs(dayjs(nextEventAfterFirstEvent.eventTime).diff(dayjs(twoEvents[0].eventTime))) /
          1000
      )
    }

    if (twoEvents.length > 1 && twoEvents[1]) {
      const nextEventAfterSecondEvent = dutyTimesXCoordinatesSorted.value.find(
        (event: GraphDuties) => event.x1 > twoEvents[1]!.x1
      )
      if (nextEventAfterSecondEvent?.eventTime && twoEvents[1]?.eventTime) {
        selectedMoveEvensDurations.push(
          Math.abs(dayjs(nextEventAfterSecondEvent.eventTime).diff(dayjs(twoEvents[1].eventTime))) /
            1000
        )
      }
    }

    emits('selectedEvents', twoEvents, selectedMoveEvensDurations)
  }

  if (props.ableToSelect) {
    if (result && (!selectedEvent.value || selectedEvent.value.eventId !== result.eventId)) {
      selectedEvent.value = result
    } else if (result && selectedEvent.value && selectedEvent.value.eventId === result.eventId) {
      selectedEvent.value = null
    }

    emits('selectedEvent', selectedEvent.value, result?.eventTime)
  }
}

const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 2 && !props.ableToSelect) {
    let result = onMouseMove(event)
    if (result) {
      emits('selectedEvent', result)
    }
  } else if (event.button === 1 && props.ableToSelect) {
    handleBlockClick(event)
  }
}

const clearSelectedEvents = () => {
  selectedEvents.value = []
}

const clearSelectedEvent = () => {
  selectedEvent.value = null
}

// handle chart click to move buttons
const handleChartClick = (event: MouseEvent) => {
  // Only handle clicks in edit or add mode
  if (!props.edit && !props.add) return

  // Ignore if event time editing is blocked
  if (blockEventTimeEdit.value) return

  if (!mySvg.value || !svgContainer.value) return

  // Get SVG coordinates for comparison
  const svg: any = mySvg.value
  const point = svg?.createSVGPoint()
  point.x = event?.clientX
  point.y = event?.clientY
  const cursorPoint = point?.matrixTransform(svg?.getScreenCTM().inverse())

  const clickX = cursorPoint.x
  const leftButtonX = editEvent.x1
  const rightButtonX = editEvent.x2

  // Check if click is to the right of both buttons
  if (clickX > rightButtonX) {
    // Move right button to click position
    editMovingController.value = true
    editControllerEnd.value = true

    const containerRect = svgContainer.value.getBoundingClientRect()
    const mockEvent = {
      pageX: clickX + containerRect.left,
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent

    onEditMouseMove(mockEvent, false)

    editMovingController.value = false
    editControllerEnd.value = false
  }
  // Check if click is to the left of both buttons
  else if (clickX < leftButtonX) {
    // Move left button to click position
    editMovingController.value = true
    editControllerStart.value = true

    const containerRect = svgContainer.value.getBoundingClientRect()
    const mockEvent = {
      pageX: clickX + containerRect.left,
      clientX: event.clientX,
      clientY: event.clientY,
    } as MouseEvent

    onEditMouseMove(mockEvent, true)

    editMovingController.value = false
    editControllerStart.value = false
  }
  // Click is between buttons - use midpoint logic
  else {
    const midpoint = (leftButtonX + rightButtonX) / 2
    const containerRect = svgContainer.value.getBoundingClientRect()

    // If click is to the right of midpoint, move right button
    if (clickX >= midpoint) {
      editMovingController.value = true
      editControllerEnd.value = true

      const mockEvent = {
        pageX: clickX + containerRect.left,
        clientX: event.clientX,
        clientY: event.clientY,
      } as MouseEvent

      onEditMouseMove(mockEvent, false)

      editMovingController.value = false
      editControllerEnd.value = false
    }
    // If click is to the left of midpoint, move left button
    else {
      editMovingController.value = true
      editControllerStart.value = true

      const mockEvent = {
        pageX: clickX + containerRect.left,
        clientX: event.clientX,
        clientY: event.clientY,
      } as MouseEvent

      onEditMouseMove(mockEvent, true)

      editMovingController.value = false
      editControllerStart.value = false
    }
  }
}

// dynamic moving lines handle func
const onMouseMove = (event: MouseEvent) => {
  if (!mySvg.value) return
  const svg: any = mySvg.value
  const point = svg?.createSVGPoint()
  point.x = event?.clientX
  point.y = event?.clientY
  const cursorPoint = point?.matrixTransform(svg?.getScreenCTM().inverse())

  dynamicLine.value.x1 = cursorPoint.x
  dynamicLine.value.x2 = cursorPoint.x
  dynamicLine.value.y1 = cursorPoint.y
  dynamicLine.value.y2 = cursorPoint.y

  detailsToolTip.value = event.clientX - (sidebar.value === 'open' ? 274 : 104)
  return changeBlockBackground()
}

let prevX1 = ref<number>(editEvent.x1)
let prevX2 = ref<number>(editEvent.x2)

const onEditMouseMove = (event: MouseEvent | string | number, isLeft: boolean = false) => {
  if ((!props.edit && !props.add) || !dutyTimes.value || !dutyTimes.value.duties) return
  const originDutyEvent: any = props.edit
    ? deepClone(
        Object.values(dutyTimes.value.duties)
          .flat()
          .find((duty: any) => duty.eventId === props.eventId)
      )
    : { x1: 0, x2: distance.value }

  if (editMovingController.value) {
    if (typeof event !== 'number' && typeof event !== 'string') {
      let relativeX = event.pageX - svgContainer.value?.getBoundingClientRect()?.left

      if (editControllerStart.value) {
        editEvent.x1 = Math.min(Math.max(relativeX, 0), dutyTimes.value.svgWidth)
        if (editEvent.x2 <= 0) {
          editMovingController.value = false
          editControllerStart.value = false
        }
        if (editEvent.x1 > editEvent.x2)
          editEvent.x2 = Math.min(editEvent.x1 + 2, dutyTimes.value.svgWidth)
      }
      if (editControllerEnd.value) {
        editEvent.x2 =
          relativeX < dutyTimes.value.svgWidth ? Math.max(relativeX, 0) : dutyTimes.value.svgWidth
        if (editEvent.x2 >= dutyTimes.value.svgWidth) {
          editMovingController.value = false
          editControllerEnd.value = false
        }
        if (editEvent.x1 > editEvent.x2) editEvent.x1 = Math.max(editEvent.x2 - 2, 0)
      }
    } else {
      // In this case we are passing event as date, so we need to convert it to pixel via screenResolution
      event = convertDateToPixel(svgContainer.value.clientWidth, event as string) as number

      if (
        isLeft &&
        +event <= editEvent.x2 &&
        intersectsPos(+event, editEvent.x2, originDutyEvent.x1, originDutyEvent.x2) != -1
      ) {
        editEvent.x1 = +event
      } else if (
        editEvent.x1 <= +event &&
        intersectsPos(editEvent.x1, +event, originDutyEvent.x1, originDutyEvent.x2) != -1
      ) {
        editEvent.x2 = +event
      }
    }

    changeEditHos()
  } else if (typeof event === 'number' || typeof event === 'string') {
    // In this case we are passing event as date, so we need to convert it to pixel via screenResolution
    event = convertDateToPixel(svgContainer.value.clientWidth, event as string) as number

    if (isLeft) {
      editEvent.x1 = +event
    } else {
      editEvent.x2 = +event
    }
    if (editEvent.x1 > editEvent.x2) editEvent.x1 = Math.max(editEvent.x2 - 2, 0)

    changeEditHos()
  }
}

// checking converted event time by endX pixels to date does exceed over given 'time' dayjs
const doesExceed = (endX: number, time: Dayjs) => {
  const seconds = convertPixelstoSeconds(svgContainer.value.clientWidth, endX)
  const convertedTime = getStartOf(editEventTime.value).add(seconds, 'seconds')

  const exceeds = convertedTime.isAfter(time)
  if (exceeds) {
    console.log('Exceeds the reference time')
  }

  return exceeds
}

const changeEditHos = () => {
  // Not found compatible event with given id
  if (
    props.edit &&
    ((editEvent.x1 === 1 && editEvent.x2 === 3) ||
      !Object.values(dutyTimes.value.duties)
        .flat()
        .find((duty: any) => duty.eventId === props.eventId))
  ) {
    console.error('Broken because edit event id has not been found')
    return
  }

  const originDutyEvent =
    !props.edit || editOnceSetPrev.value
      ? editEvent
      : deepClone(
          Object.values(dutyTimes.value.duties)
            .flat()
            .find((duty: any) => duty.eventId === props.eventId)
        )

  // previous origin duty event before compatible event
  let prevOriginDutyEvent: any = Object.values(dutyTimes.value.duties)
    .flat()
    .filter((duty: any) => duty.x2 >= originDutyEvent.x1)
    .reduce((acc: any, duty: any) => (acc === null || duty.x2 < acc.x2 ? duty : acc), null)

  if (prevOriginDutyEvent) {
    prevOriginDutyEvent = deepClone(prevOriginDutyEvent)
  }

  // next origin duty event before compatible event
  let nextOriginDutyEvent: any = Object.values(dutyTimes.value.duties)
    .flat()
    .filter((duty: any) => duty.x1 <= originDutyEvent.x2)
    .reduce((acc: any, duty: any) => (acc === null || duty.x1 > acc.x1 ? duty : acc), null)

  if (nextOriginDutyEvent) {
    nextOriginDutyEvent = deepClone(nextOriginDutyEvent)
  }

  // edit ending range cannot be higher than driving bound because in case
  // when this is high than driving range it can affect driving range
  const drivingDuty = '3'
  let drivingMinBoundX = firstFoundEventAfterPos(originDutyEvent.x2, dutyTimes.value, drivingDuty)
  let drivingMaxBoundX = lastFoundEventBeforePos(originDutyEvent.x1, dutyTimes.value, drivingDuty)

  // edit event should be intersecting with editing origin event
  // should not affect driving events also
  // should not exceed over current time
  if (
    (drivingMinBoundX && editEvent.x2 > drivingMinBoundX) ||
    (drivingMaxBoundX && editEvent.x1 < drivingMaxBoundX) ||
    doesExceed(editEvent.x2, currentTime.value)
  ) {
    if (!editOnceSetPrev.value) {
      editEvent.x1 = originDutyEvent.x1
      editEvent.x2 = originDutyEvent.x2
    } else {
      editEvent.x1 = prevX1.value
      editEvent.x2 = prevX2.value
    }
    emitDutyEventUpdate()
    return
  }
  editOnceSetPrev.value = true
  prevX1.value = editEvent.x1
  prevX2.value = editEvent.x2

  console.log('edit event', editEvent)

  editEvent.duration = (3599 * (editEvent.x2 - editEvent.x1)) / distance.value

  if (prevOriginDutyEvent) {
    editEvent.eventTime = acceptAsTimeZone(prevOriginDutyEvent.eventTime).add(
      convertPixelstoSeconds(svgContainer.value.clientWidth, editEvent.x1 - prevOriginDutyEvent.x1),
      'seconds'
    )
  } else if (nextOriginDutyEvent) {
    editEvent.eventTime = acceptAsTimeZone(nextOriginDutyEvent.eventTime).subtract(
      convertPixelstoSeconds(svgContainer.value.clientWidth, nextOriginDutyEvent.x1 - editEvent.x1),
      'seconds'
    )
  }

  // freeing up dutyTimeCopy because after processing all events we push all of them to this object arrays
  dutyTimesCopy.value = deepClone(dutyTimes.value)
  for (let i = 1; i <= 6; i++) {
    dutyTimesCopy.value.duties[String(i) as keyof typeof dutyTimesCopy.value.duties] = []
  }
  dutyTimesCopy.value.verticalLines = []

  for (const i in dutyTimes.value.duties) {
    for (const duty of dutyTimes.value.duties[i as keyof typeof dutyTimes.value.duties]) {
      const dutyEvent = deepClone(duty)

      // iterating event range is covering editing event range
      let covering: boolean = contains(dutyEvent.x1, dutyEvent.x2, editEvent.x1, editEvent.x2)
      if (covering) {
        const newDutyEvent = deepClone(dutyEvent)
        const mappedDuty = getDutyOrder(newDutyEvent.eventType, newDutyEvent.eventCode)

        console.log('Iterating graph event is covering edit event', newDutyEvent, mappedDuty)

        dutyEvent.x2 = originDutyEvent.x1
        dutyTimesCopy.value.duties[`${mappedDuty}` as keyof typeof dutyTimesCopy.value.duties].push(
          dutyEvent
        )

        newDutyEvent.x1 = originDutyEvent.x2
        dutyTimesCopy.value.duties[`${mappedDuty}` as keyof typeof dutyTimesCopy.value.duties].push(
          newDutyEvent
        )
        continue
      }

      // previous event
      if (
        prevOriginDutyEvent &&
        dutyEvent.eventId === prevOriginDutyEvent.eventId &&
        !contains(editEvent.x1, editEvent.x2, prevOriginDutyEvent.x1, prevOriginDutyEvent.x2)
      ) {
        dutyEvent.x2 = editEvent.x1
        dutyTimesCopy.value.duties[i as keyof typeof dutyTimesCopy.value.duties].push(dutyEvent)
        continue
      }

      // next event
      if (
        nextOriginDutyEvent &&
        dutyEvent.eventId === nextOriginDutyEvent.eventId &&
        !contains(editEvent.x1, editEvent.x2, nextOriginDutyEvent.x1, nextOriginDutyEvent.x2)
      ) {
        dutyEvent.x1 = editEvent.x2
        dutyTimesCopy.value.duties[i as keyof typeof dutyTimesCopy.value.duties].push(dutyEvent)
        continue
      }

      // iterating event range is between editing event range
      let doesContain: boolean = contains(editEvent.x1, editEvent.x2, dutyEvent.x1, dutyEvent.x2)
      if (doesContain) {
        continue
      }

      // intersecting position between edit event and iterating event
      let intersectPos: number = intersectsPos(
        editEvent.x1,
        editEvent.x2,
        dutyEvent.x1,
        dutyEvent.x2
      )
      console.log('intersect pos', intersectPos)
      if (intersectPos === 1) {
        dutyEvent.x2 = editEvent.x1
      } else if (intersectPos === 2) {
        dutyEvent.x1 = editEvent.x2
      }
      dutyTimesCopy.value.duties[i as keyof typeof dutyTimesCopy.value.duties].push(dutyEvent)
    }
  }

  // Vertical lines should not been inside edit event block
  for (const verticalItem of dutyTimes.value.verticalLines) {
    const verticalLine = deepClone(verticalItem)
    if (
      contains(editEvent.x1, editEvent.x2, verticalLine.x1, verticalLine.x2) ||
      intersectsPos(editEvent.x1, editEvent.x2, verticalLine.x1, verticalLine.x2) != -1
    ) {
      continue
    }
    dutyTimesCopy.value.verticalLines.push(verticalLine)
  }

  // add new event to duty times because this graph segment does not exists till now
  if (props.add || props.edit) {
    const mappedDuty = getDutyOrder(editEvent.eventType, editEvent.eventCode)
    dutyTimesCopy.value.duties[`${mappedDuty}` as keyof typeof dutyTimesCopy.value.duties].push(
      editEvent
    )
  }

  emitDutyEventUpdate()
  updateDailySummary()
}

// Helper function to emit dutyEvent:update with eventStart and eventEnd TimeObjects
const emitDutyEventUpdate = () => {
  const svgWidth = svgContainer.value?.clientWidth || 1440
  const startSeconds = convertPixelstoSeconds(svgWidth, editEvent.x1)
  const endSeconds = convertPixelstoSeconds(svgWidth, editEvent.x2)
  const startTime = getStartOf(editEventTime.value).add(startSeconds, 'seconds')
  const endTime = getStartOf(editEventTime.value).add(endSeconds, 'seconds')

  const eventStart = {
    hours: startTime.hour(),
    minutes: startTime.minute(),
    seconds: startTime.second(),
  }
  const eventEnd = {
    hours: endTime.hour(),
    minutes: endTime.minute(),
    seconds: endTime.second(),
  }

  emits('dutyEvent:update', { ...editEvent, eventStart, eventEnd })
}

// Update daily summary when edit graph changed
type NumericDailySummaryKeys = 'dailyOffDuty' | 'dailySleeperBerth' | 'dailyDriving' | 'dailyOnDuty'

const updateDailySummary = () => {
  const editEventDutyText = getEventCodeText(getDutyOrder(editEvent.eventType, editEvent.eventCode))
  const keys: NumericDailySummaryKeys[] = [
    'dailyOffDuty',
    'dailySleeperBerth',
    'dailyDriving',
    'dailyOnDuty',
  ]

  for (const key of keys) {
    dailySummary.value[key] = 0
  }

  const editKeyText = ('daily' + editEventDutyText) as NumericDailySummaryKeys
  dailySummary.value[editKeyText] = convertPixelstoSeconds(
    svgContainer.value.clientWidth,
    editEvent.x2 - editEvent.x1
  ) as number

  for (const i in dutyTimesCopy.value.duties) {
    for (const duty of dutyTimesCopy.value.duties[i as keyof typeof dutyTimesCopy.value.duties]) {
      const eventDutyText = ('daily' +
        getEventCodeText(getDutyOrder(duty.eventType, duty.eventCode))) as NumericDailySummaryKeys
      if (editKeyText === eventDutyText) {
        if (editEvent.eventType !== duty.eventType) {
          dailySummary.value[eventDutyText] += convertPixelstoSeconds(
            svgContainer.value.clientWidth,
            duty.x2 - duty.x1
          )
        }
      } else {
        dailySummary.value[eventDutyText] += convertPixelstoSeconds(
          svgContainer.value.clientWidth,
          duty.x2 - duty.x1
        )
      }
    }
  }
}

const editControllerReleased = (event: any) => {
  event.target.style.cursor = 'default'
  editControllerStart.value = false
  editControllerEnd.value = false
}

const getTextWidthApprox = (text: string, fontSize: number = 16) => {
  const averageCharWidth = 0.6 * fontSize
  return text.length * averageCharWidth
}

const canBeDisplayed = (x1: number, x2: number, duration: number): boolean => {
  if (duration <= 60 * 30) {
    return false
  }
  const content = formatDuration(duration)
  const contentWidth = getTextWidthApprox(content.toString(), props.edit || props.add ? 12 : 14)
  return x2 - x1 - contentWidth >= 6
}

const scrollToSegment = () => {
  if (!rectObj.value.lineId) {
    console.error('lineId is undefined or invalid:', rectObj.value.lineId)
    return Promise.reject('lineId is undefined or invalid')
  }
  for (let i = 0; i < dutyTimesXCoordinatesSorted.value.length; i++) {
    const segment = dutyTimesXCoordinatesSorted.value[i]
    if (segment.eventId === rectObj.value.lineId) {
      if (
        typeof segment.x1 !== 'number' ||
        typeof segment.x2 !== 'number' ||
        segment.x2 <= segment.x1
      ) {
        console.error('Invalid segment dimensions:', segment)
        continue
      }

      rectObj.value = {
        ...rectObj.value,
        x: segment.x1,
        width: segment.x2 - segment.x1,
        y1: segment.y1,
        y2: segment.y2,
      }

      if (svgContainer?.value) {
        const scrollTarget =
          segment.x1 -
          mySvg.value?.clientWidth +
          distance.value * 24 -
          svgContainer.value.clientWidth / 2 +
          (segment.x2 - segment.x1) / 2
        return new Promise((resolve, reject) => {
          const onScroll = () => {
            const scrollLeft = svgContainer.value.scrollLeft
            if (Math.abs(scrollLeft - scrollTarget) < 1) {
              svgContainer.value.removeEventListener('scroll', onScroll)
              resolve(undefined)
            }
          }

          svgContainer.value.addEventListener('scroll', onScroll)

          svgContainer.value.scroll({
            left: scrollTarget,
            top: 0,
            behavior: 'smooth',
          })
        })
      } else {
        console.warn('svgContainer is not defined or invalid.')
        return Promise.reject('svgContainer is not defined or invalid.')
      }
    }
  }

  return Promise.reject('No matching segment found.')
}

const handleSelectedLineId = async (newLineId: number) => {
  rectObj.value.lineId = newLineId
  svgContainer.value.removeEventListener('scroll', svgScrollHorizontalWithScroll)
  await scrollToSegment()
  svgContainer.value.addEventListener('scroll', svgScrollHorizontalWithScroll)
}

watch(
  () => isMovingDetailsVisible.value,
  (newValue: boolean) => {
    if (!newValue) {
      rectObj.value.x = 0
      rectObj.value.width = 0
      rectObj.value.y1 = 0
      rectObj.value.y2 = 0
    }
  }
)

const svgScrollHorizontallyWithMouseWheel = (event: WheelEvent) => {
  event.preventDefault()

  if (svgContainer.value) {
    const isRTL = getComputedStyle(svgContainer.value).direction === 'rtl'
    const deltaX = (event.deltaX || (isRTL ? -event.deltaY : event.deltaY)) * 1.5
    const deltaY = event.deltaY * 1.5

    if (Math.abs(deltaX) > 0) {
      svgContainer.value.scrollLeft += isRTL ? -deltaX : deltaX
      previousScrollLeft.value =
        mySvg.value.clientWidth + svgContainer.value.scrollLeft - svgContainer.value.clientWidth
    }

    if (Math.abs(deltaY) > 0) {
      svgContainer.value.scrollTop += deltaY
    }

    isMovingDetailsVisible.value = false
    separatorDayOrder.value = Math.floor(
      (previousScrollLeft.value + svgContainer?.value.clientWidth * 0.8) / 24 / distance.value
    )
    if (route.query?.fromDate) {
      separatorDate.value = acceptAsTimeZone(route.query.fromDate as string).add(
        separatorDayOrder.value,
        'day'
      )
    }
    nextTick(() => {
      isMovingDetailsVisible.value = true
    })
  }
}

function svgScrollHorizontalWithScroll(event: Event) {
  if (isManualScroll.value) {
    return
  }
  const target = event.target as HTMLElement
  if (svgContainer.value && target) {
    svgContainer.value.scrollLeft = target.scrollLeft
    previousScrollLeft.value =
      mySvg.value.clientWidth + svgContainer.value.scrollLeft - svgContainer.value.clientWidth
  }
  isMovingDetailsVisible.value = false
  separatorDayOrder.value = Math.floor(
    (previousScrollLeft.value + svgContainer?.value.clientWidth * 0.8) / 24 / distance.value
  )
  if (route.query?.fromDate) {
    separatorDate.value = acceptAsTimeZone(route.query.fromDate as string).add(
      separatorDayOrder.value,
      'day'
    )
  }
  nextTick(() => {
    isMovingDetailsVisible.value = true
  })
}

watch(svgContainer, (newValue: HTMLElement | null, oldValue: HTMLElement | null) => {
  if (newValue) {
    newValue.addEventListener('wheel', svgScrollHorizontallyWithMouseWheel)
    newValue.addEventListener('scroll', svgScrollHorizontalWithScroll)
  }

  if (oldValue) {
    oldValue.removeEventListener('wheel', svgScrollHorizontallyWithMouseWheel)
    oldValue.removeEventListener('scroll', svgScrollHorizontalWithScroll)
  }
})

watch(sidebar, async () => {
  setTimeout(() => {
    secondInPixel.value = svgContainer.value?.clientWidth / (24 * 3600)
    emits('container:update', svgContainer.value.clientWidth)
  }, 300)
})

watch(
  () => svgContainer.value,
  async (newValue: HTMLElement | null) => {
    if (newValue) {
      secondInPixel.value = newValue.clientWidth / (24 * 3600)
      emits('container:update', newValue.clientWidth)
    }
  }
)

watch(
  () => [props.x1, props.x2],
  ([x1, x2]) => {
    editEvent.x1 = x1 !== undefined ? parseInt(x1.toString()) : 0
    editEvent.x2 = x2 !== undefined ? parseInt(x2.toString()) : 0
    editEvent.duration = (3600 * (editEvent.x2 - editEvent.x1)) / distance.value
  }
)

watch(
  () => [props.eventType, props.eventCode],
  () => {
    if (!dutyTimesCopy.value?.duties) return
    editEvent.eventType = props.edit || props.add ? parseInt(editEventType.value as string) : 0
    editEvent.eventCode = props.edit || props.add ? parseInt(editEventCode.value as string) : 0
    changeEditHos()
  }
)

defineExpose({
  secondInPixel,
  onEditMouseMove,
  handleSelectedLineId,
  clearSelectedEvents,
  clearSelectedEvent,
})
</script>
