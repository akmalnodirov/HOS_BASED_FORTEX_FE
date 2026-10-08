<template>
  <div class="space-y-4 bg-white dark:bg-card mt-1 px-6 py-4">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div
      v-else-if="!events.length"
      class="flex flex-col items-center justify-center py-12 text-center border rounded-lg"
    >
      <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <PackageOpen class="w-8 h-8 text-[#666666] dark:text-muted-foreground" />
      </div>
      <p class="text-sm font-medium text-foreground mb-1">No events available</p>
      <p class="text-sm text-[#666666] dark:text-muted-foreground">
        Events will appear here when available.
      </p>
    </div>

    <div
      v-else
      ref="scrollContainer"
      class="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg"
    >
      <div class="min-w-450 select-none">
        <div class="bg-[#f0f0f0] rounded-lg dark:bg-muted/50 sticky top-0 z-10 mb-1">
          <div
            class="grid grid-cols-[40px_60px_130px_150px_80px_150px_200px_80px_100px_100px_150px_90px_100px_120px_100px] gap-2 px-4 py-3"
          >
            <div class="flex items-center">
              <CCustomCheckbox :checked="isAllSelected" @update:checked="toggleSelectAll" />
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >No</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Driver</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Time (CDT)</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Duration</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Event</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Location</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >System</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Odometer</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Engine Hrs</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Notes</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Status</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Trailer</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
                >Document</span
              >
            </div>
            <div
              class="flex items-center justify-end sticky right-0 bg-[#f0f0f0] dark:bg-muted/50 z-10 border-l border-border"
            >
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase pr-3"
                >Actions</span
              >
            </div>
          </div>
        </div>

        <Accordion type="multiple" v-model="openItems" class="w-full">
          <AccordionItem v-for="group in events" :key="group.date" :value="`group-${group.date}`">
            <div class="border rounded-sm mb-1 transition-colors">
              <AccordionTrigger
                class="hover:no-underline border-0 px-4 py-2.5 cursor-pointer w-full bg-[#f0f0f0] dark:bg-muted sticky top-11 z-9"
              >
                <div class="w-full flex items-center gap-12.5 min-w-0">
                  <div class="flex items-center gap-2 shrink-0">
                    <ChevronDown
                      :class="[
                        'h-4 w-4 shrink-0 transition-transform duration-200 text-[#666666] dark:text-muted-foreground',
                        isGroupOpen(group.date) ? 'rotate-180' : '',
                      ]"
                    />
                    <span class="text-sm font-semibold text-foreground">
                      {{ formatDateOnly(group.date) }}
                    </span>
                    <span class="text-xs text-muted-foreground"> ({{ group.events.length }}) </span>
                  </div>

                  <div class="w-225">
                    <div
                      class="flex items-center justify-between flex-1 min-w-0 text-xs text-foreground"
                    >
                      <div class="flex items-center gap-1 min-w-0">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9.33398 4.66699H10.8922C11.0552 4.66699 11.1367 4.66699 11.2135 4.68541C11.2815 4.70174 11.3465 4.72868 11.4062 4.76523C11.4735 4.80646 11.5311 4.86411 11.6464 4.97941L14.3549 7.68791C14.4702 7.80321 14.5278 7.86086 14.5691 7.92814C14.6056 7.98778 14.6326 8.05281 14.6489 8.12084C14.6673 8.19756 14.6673 8.27909 14.6673 8.44215V10.3337C14.6673 10.6443 14.6673 10.7996 14.6166 10.9221C14.5489 11.0855 14.4191 11.2152 14.2558 11.2829C14.1333 11.3337 13.9779 11.3337 13.6673 11.3337M10.334 11.3337H9.33398M9.33398 11.3337V4.80033C9.33398 4.05359 9.33398 3.68022 9.18866 3.395C9.06083 3.14412 8.85685 2.94015 8.60597 2.81232C8.32076 2.66699 7.94739 2.66699 7.20065 2.66699H3.46732C2.72058 2.66699 2.34721 2.66699 2.062 2.81232C1.81111 2.94015 1.60714 3.14412 1.47931 3.395C1.33398 3.68022 1.33398 4.05359 1.33398 4.80033V10.0003C1.33398 10.7367 1.93094 11.3337 2.66732 11.3337M9.33398 11.3337H6.66732M6.66732 11.3337C6.66732 12.4382 5.77189 13.3337 4.66732 13.3337C3.56275 13.3337 2.66732 12.4382 2.66732 11.3337M6.66732 11.3337C6.66732 10.2291 5.77189 9.33366 4.66732 9.33366C3.56275 9.33366 2.66732 10.2291 2.66732 11.3337M13.6673 11.667C13.6673 12.5875 12.9211 13.3337 12.0007 13.3337C11.0802 13.3337 10.334 12.5875 10.334 11.667C10.334 10.7465 11.0802 10.0003 12.0007 10.0003C12.9211 10.0003 13.6673 10.7465 13.6673 11.667Z"
                            stroke="#6082E0"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                      <div class="flex items-center gap-1 min-w-0">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9.33268 1.5127V4.26639C9.33268 4.63976 9.33268 4.82644 9.40534 4.96905C9.46926 5.09449 9.57125 5.19648 9.69669 5.26039C9.8393 5.33305 10.026 5.33305 10.3993 5.33305H13.153M10.666 8.66634H5.33268M10.666 11.333H5.33268M6.66602 5.99967H5.33268M9.33268 1.33301H5.86602C4.74591 1.33301 4.18586 1.33301 3.75803 1.55099C3.38171 1.74274 3.07575 2.0487 2.884 2.42503C2.66602 2.85285 2.66602 3.4129 2.66602 4.53301V11.4663C2.66602 12.5864 2.66602 13.1465 2.884 13.5743C3.07575 13.9506 3.38171 14.2566 3.75803 14.4484C4.18586 14.6663 4.74591 14.6663 5.86602 14.6663H10.1327C11.2528 14.6663 11.8128 14.6663 12.2407 14.4484C12.617 14.2566 12.9229 13.9506 13.1147 13.5743C13.3327 13.1465 13.3327 12.5864 13.3327 11.4663V5.33301L9.33268 1.33301Z"
                            stroke="#6082E0"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                      <div class="flex items-center gap-1 shrink-0">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.9999 10.5579C12.9705 11.0455 13.8026 11.828 14.4101 12.8064C14.5303 13.0002 14.5905 13.0971 14.6113 13.2312C14.6535 13.5038 14.4671 13.839 14.2132 13.9469C14.0882 14 13.9477 14 13.6666 14M10.6666 7.68816C11.6544 7.19726 12.3332 6.17791 12.3332 5C12.3332 3.82209 11.6544 2.80274 10.6666 2.31184M9.33322 5C9.33322 6.65685 7.99008 8 6.33322 8C4.67637 8 3.33322 6.65685 3.33322 5C3.33322 3.34315 4.67637 2 6.33322 2C7.99008 2 9.33322 3.34315 9.33322 5ZM1.70604 12.6256C2.76892 11.0297 4.44614 10 6.33322 10C8.22031 10 9.89753 11.0297 10.9604 12.6256C11.1932 12.9752 11.3097 13.15 11.2963 13.3733C11.2858 13.5471 11.1719 13.76 11.0329 13.8651C10.8545 14 10.6091 14 10.1183 14H2.54813C2.05734 14 1.81194 14 1.63352 13.8651C1.49459 13.76 1.38062 13.5471 1.37018 13.3733C1.35678 13.15 1.4732 12.9752 1.70604 12.6256Z"
                            stroke="#6082E0"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>

                        <span>{{ group.dailyForm?.coDriver || 'No' }}</span>
                      </div>
                      <span
                        v-if="group.dailyForm"
                        :class="
                          group.dailyForm.isCertified
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-[#AF4B4B] dark:text-red-400'
                        "
                        class="font-medium shrink-0"
                      >
                        {{ group.dailyForm.isCertified ? 'Signed' : 'Unsigned' }}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 text-muted-foreground hover:text-primary shrink-0 bg-[#f0f0f0] dark:bg-muted"
                    @click.stop="$emit('edit-profile', group.date)"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15.0007 8.33326L11.6673 4.99993M2.08398 17.9166L4.90429 17.6032C5.24887 17.5649 5.42115 17.5458 5.58219 17.4937C5.72506 17.4474 5.86102 17.3821 5.98639 17.2994C6.1277 17.2062 6.25027 17.0836 6.49542 16.8385L17.5007 5.83326C18.4211 4.91279 18.4211 3.4204 17.5007 2.49993C16.5802 1.57945 15.0878 1.57945 14.1673 2.49992L3.16209 13.5052C2.91694 13.7503 2.79436 13.8729 2.70118 14.0142C2.61851 14.1396 2.55316 14.2755 2.50691 14.4184C2.45478 14.5794 2.43564 14.7517 2.39735 15.0963L2.08398 17.9166Z"
                        stroke="#666666"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </Button>
                </div>
              </AccordionTrigger>

              <AccordionContent class="pt-0">
                <div
                  v-for="event in group.events"
                  :key="event.eventId"
                  :data-event-id="event.eventId"
                  class="group grid grid-cols-[40px_60px_130px_150px_80px_170px_200px_80px_100px_100px_150px_90px_100px_120px_100px] gap-2 px-4 py-3 bg-white dark:bg-background cursor-pointer hover:bg-muted/30 border-t"
                  :class="[
                    event.actionState === 4 ? 'opacity-55' : '',
                    selectedEventId === event.eventId ? 'bg-primary/5 dark:bg-primary/10' : '',
                    selectedRowIds.includes(event.eventId) ? 'bg-blue-50 dark:bg-blue-900/20' : '',
                  ]"
                  :style="
                    event.errorTitles?.length || event.warningTitles?.length
                      ? { backgroundColor: event.errorTitles?.length ? '#F7EDED' : '#FBF4EC' }
                      : undefined
                  "
                  @click="handleRowClick(event.eventId)"
                >
                  <div class="flex items-center" @click.stop>
                    <CCustomCheckbox
                      :checked="selectedRowIds.includes(event.eventId)"
                      @update:checked="toggleRow(event.eventId)"
                    />
                  </div>

                  <TooltipProvider v-if="event.errorTitles?.length || event.warningTitles?.length">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <div
                          class="text-sm font-medium flex items-center gap-1 cursor-default"
                          :class="event.errorTitles?.length ? 'text-red-600' : 'text-yellow-600'"
                        >
                          {{ event.sequenceId }}
                          <span class="text-xs leading-none">⚠</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent class="max-w-64 text-xs">
                        {{
                          [...(event.errorTitles ?? []), ...(event.warningTitles ?? [])].join(' | ')
                        }}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div v-else class="text-sm text-foreground font-medium">
                    {{ event.sequenceId }}
                  </div>

                  <div class="text-sm text-foreground truncate">
                    {{ event.driverFullName || '-' }}
                  </div>

                  <div class="text-sm text-foreground whitespace-nowrap">
                    {{ formatEventTime(event.startTime) }}
                  </div>

                  <div class="text-sm text-foreground whitespace-nowrap">
                    {{ formatDuration(event.duration) }}
                  </div>

                  <div class="flex items-center gap-x-2">
                    <template v-if="findEventByTypeAndCode(event.eventType, event.eventCode)">
                      <div
                        class="w-3 h-4 rounded-[5px] shrink-0"
                        :style="{
                          backgroundColor: findEventByTypeAndCode(event.eventType, event.eventCode)!
                            .color,
                        }"
                      ></div>
                      <span
                        class="text-xs whitespace-nowrap"
                        :style="{
                          color: findEventByTypeAndCode(event.eventType, event.eventCode)!.color,
                        }"
                      >
                        {{ findEventByTypeAndCode(event.eventType, event.eventCode)!.label }}
                      </span>
                    </template>
                    <span v-else class="text-xs text-muted-foreground">-</span>
                  </div>

                  <div
                    class="text-sm text-foreground wrap-break-word"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="
                      draggableAttrs('location', event, {
                        locationOrigin: event.locationOrigin,
                        calculatedLocation: event.calculatedLocation,
                        manualLocation: event.manualLocation,
                        latitude: event.latitude,
                        longitude: event.longitude,
                      })
                    "
                  >
                    {{ event.calculatedLocation || event.manualLocation || 'N/A' }}
                  </div>

                  <div class="text-sm text-foreground">
                    {{ RECORD_ORIGIN_LABELS[event.eventRecordOrigin] ?? 'Auto' }}
                  </div>

                  <div
                    class="text-sm text-foreground font-mono"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('odometer', event, event.vehicleMiles ?? null)"
                  >
                    {{ event.vehicleMiles != null ? Math.round(event.vehicleMiles) : '-' }}
                  </div>

                  <div
                    class="text-sm text-foreground"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('engine_hours', event, event.engineHours ?? null)"
                  >
                    {{ event.engineHours ?? '-' }}
                  </div>

                  <div class="text-sm text-foreground wrap-break-word">
                    {{ event.annotation || '-' }}
                  </div>

                  <div>
                    <span
                      :class="[
                        'text-xs font-medium px-2 py-0.5 rounded',
                        getStatusClass(event.eventRecordStatus),
                      ]"
                    >
                      {{ getStatusLabel(event.eventRecordStatus) }}
                    </span>
                  </div>

                  <div
                    class="text-sm text-foreground"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('trailer', event, event.trailerNumber ?? null)"
                  >
                    {{ event.trailerNumber || '-' }}
                  </div>

                  <div
                    class="text-sm text-foreground"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('doc', event, event.shippingDocument ?? null)"
                  >
                    {{ event.shippingDocument || '-' }}
                  </div>

                  <div
                    class="flex justify-end gap-1 sticky right-0 bg-white dark:bg-background group-hover:bg-accent z-8 border-l border-border"
                    @click.stop
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      :disabled="event.actionState === 4 || event.actionState === 8"
                      @click="$emit('edit-event', event.eventId)"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      :disabled="event.actionState === 4 || event.actionState === 8"
                      @click="$emit('copy-event', event.eventId)"
                    >
                      <Copy class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      :disabled="event.actionState === 4 || event.actionState === 8"
                      @click="$emit('delete-event', event.eventId)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </div>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
import {
  Pencil,
  Copy,
  Trash2,
  ChevronDown,
  PackageOpen,
  FileEdit,
  Truck,
  FileText,
  Users,
} from 'lucide-vue-next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import CCustomCheckbox from '@/components/custom/CCustomCheckbox.vue'
import { formatTime, formatDuration } from '@/utils/time.ts'
import dayjs from 'dayjs'
import type { BoostUiEventGroup, BoostUiEventRow } from '../composables/useBoost.ts'
import { findEventByTypeAndCode } from '@/utils/events.ts'
import { useDragDrop, type DragColumnType, type DragPayload } from '../composables/useDragDrop.ts'

const RECORD_ORIGIN_LABELS: Record<number, string> = {
  1: 'ELD',
  2: 'Driver',
  3: 'User',
  4: 'Unknown',
}

interface Props {
  events?: BoostUiEventGroup[]
  loading?: boolean
  selectedEventId?: string
  selectedRowIds?: string[]
  dragDropEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  events: () => [],
  loading: false,
  selectedEventId: '',
  selectedRowIds: () => [],
  dragDropEnabled: false,
})

const emit = defineEmits<{
  'edit-event': [eventId: string]
  'copy-event': [eventId: string]
  'delete-event': [eventId: string]
  'toggle-selection': [eventId: string]
  'update:selected-row-ids': [ids: string[]]
  'edit-profile': [date: string]
  'drop-property': [column: DragColumnType, targetEventId: string, data: DragPayload['data']]
}>()

const openItems = ref<string[]>([])

watch(
  () => props.events,
  (groups) => {
    openItems.value = groups.filter((g) => g.events.length > 0).map((g) => `group-${g.date}`)
  },
  { immediate: true }
)

const isGroupOpen = (date: string) => openItems.value.includes(`group-${date}`)

const scrollContainer = ref<HTMLElement | null>(null)

watch(
  () => props.selectedEventId,
  async (eventId) => {
    if (!eventId) return
    await nextTick()
    const container = scrollContainer.value
    const el = container?.querySelector(`[data-event-id="${eventId}"]`)
    if (el && container) {
      const containerRect = container.getBoundingClientRect()
      const elRect = (el as HTMLElement).getBoundingClientRect()
      const isVisible = elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom
      if (!isVisible) {
        const scrollTo =
          container.scrollTop +
          elRect.top -
          containerRect.top -
          container.clientHeight / 2 +
          (el as HTMLElement).clientHeight / 2
        container.scrollTo({ top: scrollTo, behavior: 'smooth' })
      }
    }
  }
)

const allEvents = computed<BoostUiEventRow[]>(() => props.events.flatMap((g) => g.events))

const selectableEvents = computed(() => allEvents.value.filter((e) => e.actionState !== 4))

const globalIndexMap = computed<Map<string, number>>(() => {
  const map = new Map<string, number>()
  let idx = 0
  for (const group of props.events) {
    for (const event of group.events) {
      map.set(event.eventId, idx++)
    }
  }
  return map
})

const isShiftPressed = ref(false)
const lastClickedIndex = ref<number | null>(null)

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Shift') isShiftPressed.value = true
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'Shift') isShiftPressed.value = false
}

const { setup: setupDragDrop, cleanup: cleanupDragDrop } = useDragDrop(
  (column, targetEventId, data) => emit('drop-property', column, targetEventId, data)
)

function draggableAttrs(
  column: DragColumnType,
  event: BoostUiEventRow,
  payload: DragPayload['data']
) {
  if (!props.dragDropEnabled || event.actionState === 4 || event.actionState === 8) return {}
  return {
    draggable: true,
    'data-draggable': 'true',
    'data-column': column,
    'data-payload': JSON.stringify(payload),
  }
}
watch(
  scrollContainer,
  (container, prev) => {
    if (prev) cleanupDragDrop(prev)
    if (container) setupDragDrop(container)
  },
  { flush: 'post' }
)

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  if (scrollContainer.value) cleanupDragDrop(scrollContainer.value)
})

const selectedSet = computed(() => new Set(props.selectedRowIds))

const isAllSelected = computed(
  () =>
    selectableEvents.value.length > 0 &&
    selectableEvents.value.every((e) => selectedSet.value.has(e.eventId))
)

function toggleRow(eventId: string) {
  const event = allEvents.value.find((e) => e.eventId === eventId)
  if (event?.actionState === 4) return

  const globalIndex = globalIndexMap.value.get(eventId) ?? 0

  if (isShiftPressed.value && lastClickedIndex.value !== null) {
    const min = Math.min(lastClickedIndex.value, globalIndex)
    const max = Math.max(lastClickedIndex.value, globalIndex)
    const rangeIds = allEvents.value
      .slice(min, max + 1)
      .filter((e) => e.actionState !== 4)
      .map((e) => e.eventId)
    const next = new Set(props.selectedRowIds)
    const allInRange = rangeIds.every((id) => next.has(id))
    rangeIds.forEach((id) => (allInRange ? next.delete(id) : next.add(id)))
    emit('update:selected-row-ids', [...next])
  } else {
    const next = new Set(props.selectedRowIds)
    if (next.has(eventId)) {
      next.delete(eventId)
    } else {
      next.add(eventId)
    }
    emit('update:selected-row-ids', [...next])
  }
  lastClickedIndex.value = globalIndex
}

import ToggleEventsWorker from '../workers/toggleEvents.worker.ts?worker'

function handleRowClick(eventId: string) {
  const event = allEvents.value.find((e) => e.eventId === eventId)
  if (event?.actionState === 4) return
  emit('toggle-selection', eventId)
  toggleRow(eventId)
}

function toggleSelectAll(checked: boolean) {
  lastClickedIndex.value = null
  const eventIds = selectableEvents.value.map((e) => e.eventId)
  if (eventIds.length > 500) {
    const worker = new ToggleEventsWorker()
    worker.addEventListener('message', (e: MessageEvent<{ success: boolean; ids: string[] }>) => {
      if (e.data.success) emit('update:selected-row-ids', e.data.ids)
      worker.terminate()
    })
    worker.postMessage({ action: checked ? 'selectAll' : 'clearAll', eventIds })
  } else {
    emit('update:selected-row-ids', checked ? eventIds : [])
  }
}

const formatDateOnly = (date: string) => dayjs(date).format('DD.MM.YYYY')

const formatEventTime = (time: string) => formatTime(time, 'MMM D, h:mm:ss a')

const STATUS_LABELS: Record<number, string> = {
  1: 'Active',
  2: 'Inactive',
  3: 'Pending',
  4: 'Approved',
}
const STATUS_CLASSES: Record<number, string> = {
  1: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  2: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  3: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  4: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

const getStatusLabel = (status: number) => STATUS_LABELS[status] ?? 'Unknown'
const getStatusClass = (status: number) =>
  STATUS_CLASSES[status] ?? 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
</script>
