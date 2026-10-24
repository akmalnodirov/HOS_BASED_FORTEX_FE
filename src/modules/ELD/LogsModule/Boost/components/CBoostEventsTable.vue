<template>
  <div class="mt-1 space-y-4 bg-white px-6 pb-0 pt-4 dark:bg-card">
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
      <div class="w-full select-none" :style="{ minWidth: `${tableMinWidth}px` }">
        <div class="sticky top-0 z-30 mb-1 rounded-lg bg-[#f0f0f0] dark:bg-muted/50">
          <div class="boost-events-grid grid gap-3 px-4 py-3" :style="gridStyle">
            <div class="flex items-center gap-2">
              <CCustomCheckbox :checked="isAllSelected" @update:checked="toggleSelectAll" />
              <button
                type="button"
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                :aria-label="areAllGroupsExpanded ? 'Collapse all days' : 'Expand all days'"
                :title="areAllGroupsExpanded ? 'Collapse all days' : 'Expand all days'"
                :aria-expanded="areAllGroupsExpanded"
                @click="toggleAllGroups"
              >
                <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="areAllGroupsExpanded ? 'rotate-180' : ''" />
              </button>
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Seq ID</span
              >
            </div>
            <div class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Time ({{ timeZone || 'CT' }})</span
              >
            </div>
            <div v-if="isColumnVisible('duration')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Duration</span
              >
            </div>
            <div v-if="isColumnVisible('event')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Event</span
              >
            </div>
            <div v-if="showDriverColumn" class="flex items-center">
              <span
                class="text-sm font-semibold uppercase text-[#666666] dark:text-muted-foreground"
                >Driver name</span
              >
            </div>
            <div
              v-if="isColumnVisible('location')"
              class="flex items-center rounded px-1 transition-colors"
              :class="dragDropHeaderClass()"
              :title="dragDropEnabled ? 'Location drag/drop enabled' : undefined"
            >
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Location</span
              >
            </div>
            <div v-if="isColumnVisible('system')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >System</span
              >
            </div>
            <div
              v-if="isColumnVisible('odometer')"
              class="flex items-center rounded px-1 transition-colors"
              :class="dragDropHeaderClass()"
              :title="dragDropEnabled ? 'Odometer drag/drop enabled' : undefined"
            >
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Odometer</span
              >
            </div>
            <div
              v-if="isColumnVisible('engineHours')"
              class="flex items-center rounded px-1 transition-colors"
              :class="dragDropHeaderClass()"
              :title="dragDropEnabled ? 'Engine hours drag/drop enabled' : undefined"
            >
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Engine Hrs</span
              >
            </div>
            <div v-if="isColumnVisible('notes')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Notes</span
              >
            </div>
            <div v-if="isColumnVisible('status')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Status</span
              >
            </div>
            <div v-if="isColumnVisible('trailer')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Trailer</span
              >
            </div>
            <div v-if="isColumnVisible('document')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Document</span
              >
            </div>
            <div v-if="isColumnVisible('change')" class="flex items-center">
              <span
                class="text-sm font-semibold text-[#666666] dark:text-muted-foreground uppercase"
              >Change</span
              >
            </div>
            <div
              v-if="isColumnVisible('actions')"
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
          <AccordionItem
            v-for="group in events"
            :key="group.date"
            :value="`group-${group.date}`"
            class="relative"
          >
            <div class="mb-1 rounded-sm border transition-colors">
              <div class="sticky top-[45px] z-20 bg-[#f0f0f0] dark:bg-muted">
                <AccordionTrigger
                  class="w-full cursor-pointer border-0 bg-[#f0f0f0] px-4 py-2.5 hover:no-underline dark:bg-muted"
                >
                  <div
                    class="grid w-full min-w-0 grid-cols-[140px_repeat(3,minmax(0,1fr))_90px_32px] items-center gap-3 text-xs text-foreground"
                  >
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
                      <span class="text-xs text-muted-foreground">
                        ({{ group.events.length }})
                      </span>
                    </div>

                    <div class="col-span-4 grid min-w-0 grid-cols-subgrid items-center">
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
                          <span class="max-w-44 truncate">
                            {{ group.dailyForm?.trailers?.join(', ') || '—' }}
                          </span>
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
                          <span class="max-w-44 truncate">
                            {{ group.dailyForm?.shippingDocuments?.join(', ') || '—' }}
                          </span>
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

                    <Button
                      v-if="canEditProfile"
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
              </div>

              <AccordionContent class="pt-0">
                <div
                  v-for="event in group.events"
                  :key="event.eventId"
                  :data-event-id="event.eventId"
                  class="boost-events-grid group grid gap-3 border-t bg-white px-4 py-3 hover:bg-muted/30 dark:bg-background cursor-pointer"
                  :style="gridStyle"
                  :class="[
                    event.actionState === 4 ? 'opacity-55' : '',
                    event.ownerDriverId !== activeDriverId ? 'opacity-60' : '',
                    highlightedEventId === event.eventId
                      ? '!bg-emerald-50 ring-2 ring-inset ring-emerald-500 dark:!bg-emerald-950/35'
                      : selectedRowIds.includes(event.eventId)
                        ? '!bg-blue-50 dark:!bg-blue-950/30'
                        : event.errorTitles?.length
                          ? '!bg-red-50 dark:!bg-red-950/35'
                          : event.warningTitles?.length
                            ? '!bg-amber-50 dark:!bg-amber-950/35'
                            : '',
                  ]"
                  @click="handleRowClick(event.eventId, $event)"
                >
                  <div class="flex items-center" @click.stop>
                    <CCustomCheckbox
                      v-if="isActiveDriverEvent(event)"
                      :checked="selectedRowIds.includes(event.eventId)"
                      :disabled="event.actionState === 4 || event.actionState === 8"
                      @update:checked="toggleRow(event.eventId)"
                    />
                  </div>

                  <TooltipProvider v-if="event.errorTitles?.length || event.warningTitles?.length">
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <div class="flex cursor-default items-center gap-1.5 text-sm font-medium">
                          <span>{{ event.sequenceId }}</span>
                          <span class="flex flex-col items-start gap-0.5">
                            <span
                              v-if="event.errorTitles?.length"
                              class="rounded bg-red-100 px-1 text-[9px] font-semibold leading-3 text-red-700"
                              >E{{ event.errorTitles.length }}</span
                            >
                            <span
                              v-if="event.warningTitles?.length"
                              class="rounded bg-amber-100 px-1 text-[9px] font-semibold leading-3 text-amber-700"
                              >W{{ event.warningTitles.length }}</span
                            >
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
                        :side-offset="8"
                        arrow-class="bg-popover fill-popover"
                        class="z-[70] w-80 max-w-[calc(100vw-2rem)] border border-border bg-popover p-2 text-left text-popover-foreground shadow-md"
                      >
                        <div class="space-y-1.5">
                          <div
                            v-for="(error, index) in event.errorTitles"
                            :key="`e-${index}-${error}`"
                            class="flex items-start gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium leading-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                          >
                            <CircleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span class="min-w-0 break-words">{{ error }}</span>
                          </div>
                          <div
                            v-for="(warning, index) in event.warningTitles"
                            :key="`w-${index}-${warning}`"
                            class="flex items-start gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-medium leading-4 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                          >
                            <TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span class="min-w-0 break-words">{{ warning }}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div v-else class="text-sm text-foreground font-medium">
                    {{ event.sequenceId }}
                  </div>

                  <div class="text-sm text-foreground whitespace-nowrap">
                    {{ formatEventTime(event.startTime) }}
                  </div>

                  <div
                    v-if="isColumnVisible('duration')"
                    class="min-w-0 overflow-hidden whitespace-nowrap text-sm text-foreground"
                  >
                    {{ formatDutyDuration(event.duration) }}
                  </div>

                  <div
                    v-if="isColumnVisible('event')"
                    class="flex min-w-0 items-center gap-x-2 overflow-visible"
                  >
                    <template v-if="findEventByTypeAndCode(event.eventType, event.eventCode)">
                      <div
                        class="w-3 h-4 rounded-[5px] shrink-0"
                        :style="{
                          backgroundColor: findEventByTypeAndCode(event.eventType, event.eventCode)!
                            .color,
                        }"
                      ></div>
                      <span
                        class="truncate whitespace-nowrap text-xs"
                        :style="{
                          color: findEventByTypeAndCode(event.eventType, event.eventCode)!.color,
                        }"
                        :title="event.eventType === 7 ? event.eventName : undefined"
                      >
                        {{
                          event.eventType === 7 && event.eventName
                            ? event.eventName
                            : findEventByTypeAndCode(event.eventType, event.eventCode)!.label
                        }}
                      </span>
                    </template>
                    <span v-else class="truncate text-xs text-muted-foreground">{{
                      event.eventName || '-'
                    }}</span>
                    <span v-if="event.isFrozen" class="inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-semibold"
                      :class="event.freezeSource === 'MANUAL' ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400' : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'"
                      :title="event.freezeSource === 'MANUAL' ? 'Frozen by a manual DOT inspection' : 'Frozen by Route ELD'">
                      <ShieldAlert v-if="event.freezeSource === 'MANUAL'" class="h-3.5 w-3.5" />
                      <LockKeyhole v-else class="h-3 w-3" /> Frozen
                    </span>
                    <TooltipProvider v-if="cameraEventIdSet.has(event.eventId)">
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            class="ml-auto h-8 w-8 shrink-0 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/35 dark:text-red-400 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                            aria-label="View event route and cameras"
                            @click.stop="emit('open-camera-route', event.eventId)"
                          >
                            <Camera class="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          :side-offset="8"
                          arrow-class="bg-popover fill-popover"
                          class="z-[70] max-w-72 border border-border bg-popover p-3 text-left text-popover-foreground shadow-md"
                        >
                          <div class="flex items-center gap-2 text-xs font-semibold">
                            <Camera class="h-3.5 w-3.5 text-red-500" />
                            Camera near this event
                          </div>
                          <div class="mt-2 break-words text-xs leading-5 text-muted-foreground">
                            Click to inspect this event's route and cameras.
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div
                    v-if="showDriverColumn"
                    class="min-w-0 truncate text-xs font-semibold"
                    :class="event.ownerDriverId === mainDriverId ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'"
                    :title="event.driverFullName"
                  >
                    {{ event.driverFullName || '—' }}
                  </div>

                  <div
                    v-if="isColumnVisible('location')"
                    class="text-sm text-foreground"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('location', event)"
                  >
                    <div class="flex min-w-0 items-center gap-1.5">
                      <span class="min-w-0 truncate" :title="displayLocation(event)">{{ displayLocation(event) }}</span>
                      <span
                        v-if="hasManualLocationNote(event)"
                        class="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      >manual</span>
                      <button
                        v-if="event.latitude != null && event.longitude != null"
                        type="button"
                        class="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Copy latitude and longitude"
                        aria-label="Copy latitude and longitude"
                        draggable="false"
                        @click.stop="copyLocationCoordinates(event.latitude!, event.longitude!)"
                        @dragstart.stop.prevent
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div v-if="isColumnVisible('system')" class="text-sm text-foreground">
                    {{ RECORD_ORIGIN_LABELS[event.eventRecordOrigin] ?? 'Auto' }}
                  </div>

                  <div
                    v-if="isColumnVisible('odometer')"
                    class="text-sm text-foreground font-mono"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('odometer', event)"
                  >
                    <div class="flex min-w-0 items-center gap-1.5">
                      <span class="min-w-0 truncate">
                        {{ event.vehicleMiles != null ? Math.round(event.vehicleMiles) : '-' }}
                      </span>
                      <button
                        v-if="event.vehicleMiles != null"
                        type="button"
                        class="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Copy odometer"
                        aria-label="Copy odometer"
                        draggable="false"
                        @click.stop="copyCellValue(String(Math.round(event.vehicleMiles)), 'Odometer')"
                        @dragstart.stop.prevent
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="isColumnVisible('engineHours')"
                    class="text-sm text-foreground"
                    :class="
                      dragDropEnabled && event.actionState !== 4 && event.actionState !== 8
                        ? 'dd-cell'
                        : ''
                    "
                    v-bind="draggableAttrs('engine_hours', event)"
                  >
                    <div class="flex min-w-0 items-center gap-1.5">
                      <span class="min-w-0 truncate">{{ event.engineHours ?? '-' }}</span>
                      <button
                        v-if="event.engineHours != null"
                        type="button"
                        class="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Copy engine hours"
                        aria-label="Copy engine hours"
                        draggable="false"
                        @click.stop="copyCellValue(String(event.engineHours), 'Engine hours')"
                        @dragstart.stop.prevent
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="isColumnVisible('notes')"
                    class="text-sm text-foreground wrap-break-word"
                  >
                    {{ event.annotation || '-' }}
                  </div>

                  <div v-if="isColumnVisible('status')" class="flex flex-col items-start gap-1">
                    <span
                      :class="[
                        'text-xs font-medium px-2 py-0.5 rounded',
                        getStatusClass(event.eventRecordStatus),
                      ]"
                    >
                      {{ getStatusLabel(event.eventRecordStatus) }}
                    </span>
                  </div>

                  <div v-if="isColumnVisible('trailer')" class="text-sm text-foreground">
                    <div class="flex min-w-0 items-center gap-1.5">
                      <span class="min-w-0 truncate" :title="event.trailerNumber || undefined">
                        {{ event.trailerNumber || '-' }}
                      </span>
                      <button
                        v-if="event.trailerNumber?.trim()"
                        type="button"
                        class="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Copy trailers"
                        aria-label="Copy trailers"
                        draggable="false"
                        @click.stop="copyCellValue(event.trailerNumber, 'Trailers')"
                        @dragstart.stop.prevent
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div v-if="isColumnVisible('document')" class="text-sm text-foreground">
                    <div class="flex min-w-0 items-center gap-1.5">
                      <span class="min-w-0 truncate" :title="event.shippingDocument || undefined">
                        {{ event.shippingDocument || '-' }}
                      </span>
                      <button
                        v-if="event.shippingDocument?.trim()"
                        type="button"
                        class="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Copy documents"
                        aria-label="Copy documents"
                        draggable="false"
                        @click.stop="copyCellValue(event.shippingDocument, 'Documents')"
                        @dragstart.stop.prevent
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="isColumnVisible('change')"
                    class="flex min-w-0 flex-col items-start gap-1"
                  >
                    <span :class="changeStatusClass(event.changeStatus)">
                      {{ changeStatusLabel(event.changeStatus) }}
                    </span>
                    <span
                      v-if="event.deliveryStatus"
                      :class="deliveryStatusClass(event.deliveryStatus)"
                    >
                      {{ deliveryStatusLabel(event.deliveryStatus) }}
                    </span>
                  </div>

                  <div
                    v-if="isColumnVisible('actions')"
                    class="sticky right-0 z-8 flex justify-end gap-1 border-l border-border"
                    style="background-color: inherit"
                    @click.stop
                  >
                    <Button
                      v-if="canEditEvents && isActiveDriverEvent(event)"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      :disabled="event.actionState === 4 || event.actionState === 8 || mutationPending"
                      @click="$emit('edit-event', event.eventId)"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      v-if="canInsertEvents && isActiveDriverEvent(event)"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      :disabled="event.actionState === 4 || event.actionState === 8 || mutationPending"
                      @click="$emit('copy-event', event.eventId)"
                    >
                      <Copy class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      v-if="canEditEvents && isActiveDriverEvent(event) && event.changeStatus && event.changeStatus.toUpperCase() !== 'UNCHANGED'"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-blue-600"
                      title="Revert change"
                      :disabled="event.actionState === 8 || mutationPending"
                      @click="$emit('revert-event', event.eventId)"
                    >
                      <Undo2 class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      v-if="!isActiveDriverEvent(event) || !canEditEvents || event.actionState === 8"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      title="View event"
                      @click="$emit('view-event', event.eventId)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      v-if="canRetryDelivery && isActiveDriverEvent(event) && (event.deliveryStatus === 'SUBMISSION_PENDING' || event.deliveryStatus === 'ROLLBACK_PENDING' || (event.deliveryStatus === 'SUBMITTED' && event.eventType === 4 && ['CHANGED', 'INSERTED'].includes(event.changeStatus?.toUpperCase() ?? '')))"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-blue-600"
                      :title="event.deliveryStatus === 'ROLLBACK_PENDING' ? 'Retry rollback' : event.deliveryStatus === 'SUBMITTED' ? 'Recheck certification event on Route ELD' : 'Retry submission'"
                      :disabled="mutationPending || Boolean(retryingEventId)"
                      @click="$emit('retry-delivery', event.eventId)"
                    >
                      <LoaderCircle v-if="retryingEventId === event.eventId" class="h-3.5 w-3.5 animate-spin" />
                      <RotateCcw v-else class="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      v-if="canDeleteEvents && isActiveDriverEvent(event)"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7 text-[#666666] dark:text-muted-foreground"
                      :disabled="event.actionState === 4 || event.actionState === 8 || mutationPending"
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
import { toast } from 'vue-sonner'
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
  Eye,
  Undo2,
  Camera,
  CircleAlert,
  TriangleAlert,
  RotateCcw,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
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
import { formatTime } from '@/utils/time.ts'
import dayjs from 'dayjs'
import type { BoostUiEventGroup, BoostUiEventRow } from '../composables/useScheduleBoost'
import type {
  BoostEventTableColumn,
  BoostEventTableColumnVisibility,
} from '../composables/useBoostEventTableColumns'
import { findEventByTypeAndCode } from '@/utils/events.ts'
import { useDragDrop, type DragColumnType } from '../composables/useDragDrop.ts'
import { copyCoordinates } from '../utils/coordinateClipboard'

const RECORD_ORIGIN_LABELS: Record<number, string> = {
  1: 'Auto',
  2: 'Driver',
  3: 'User',
  4: 'Unknown',
}

const changeStatusLabel = (value?: string) => {
  const normalized = String(value || 'UNCHANGED').toUpperCase()
  const label = normalized.replaceAll('_', ' ').toLowerCase()
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const changeStatusClass = (value?: string) => {
  const normalized = String(value || 'UNCHANGED').toUpperCase()
  const base = 'inline-flex rounded px-2 py-0.5 text-[10px] font-medium'
  if (normalized === 'CHANGED') return `${base} bg-amber-50 text-amber-700`
  if (normalized === 'BOOSTED') return `${base} bg-violet-50 text-violet-700`
  if (normalized === 'DELETED') return `${base} bg-red-50 text-red-700`
  if (normalized === 'INSERTED') return `${base} bg-emerald-50 text-emerald-700`
  if (normalized === 'REASSIGNED' || normalized === 'REPLICATED')
    return `${base} bg-blue-50 text-blue-700`
  return `${base} bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground`
}

interface Props {
  events?: BoostUiEventGroup[]
  loading?: boolean
  selectedEventId?: string
  highlightedEventId?: string
  selectedRowIds?: string[]
  showDriverColumn?: boolean
  mainDriverId?: string
  activeDriverId?: string
  canEditProfile?: boolean
  canEditEvents?: boolean
  canInsertEvents?: boolean
  canDeleteEvents?: boolean
  mutationPending?: boolean
  canRetryDelivery?: boolean
  retryingEventId?: string
  dragDropEnabled?: boolean
  columnVisibility?: BoostEventTableColumnVisibility
  timeZone?: string | null
  cameraEventIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  events: () => [],
  loading: false,
  selectedEventId: '',
  highlightedEventId: '',
  selectedRowIds: () => [],
  showDriverColumn: false,
  canEditProfile: false,
  canEditEvents: false,
  canInsertEvents: false,
  canDeleteEvents: false,
  mutationPending: false,
  canRetryDelivery: false,
  retryingEventId: '',
  dragDropEnabled: false,
  columnVisibility: () => ({
    duration: true,
    event: true,
    location: true,
    system: true,
    odometer: true,
    engineHours: true,
    notes: true,
    status: true,
    trailer: true,
    document: true,
    change: true,
    actions: true,
  }),
  timeZone: 'CT',
  cameraEventIds: () => [],
})

const cameraEventIdSet = computed(() => new Set(props.cameraEventIds))

const emit = defineEmits<{
  'edit-event': [eventId: string]
  'copy-event': [eventId: string]
  'delete-event': [eventId: string]
  'revert-event': [eventId: string]
  'view-event': [eventId: string]
  'toggle-selection': [eventId: string]
  'update:selected-row-ids': [ids: string[]]
  'edit-profile': [date: string]
  'drop-property': [column: DragColumnType, targetEventId: string, sourceEventId: string]
  'retry-delivery': [eventId: string]
  'open-camera-route': [eventId: string]
}>()

const copyLocationCoordinates = async (latitude: number, longitude: number) => {
  await copyCoordinates(latitude, longitude)
  toast.success('Coordinates copied')
}

const copyCellValue = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value.trim())
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Unable to copy ${label.toLowerCase()}`)
  }
}

const openItems = ref<string[]>([])
const groupOpenState = new Map<string, boolean>()
const expandNewGroups = ref(true)
const areAllGroupsExpanded = computed(() => {
  const groups = props.events ?? []
  return groups.length > 0 && groups.every((group) => openItems.value.includes(`group-${group.date}`))
})
const toggleAllGroups = () => {
  expandNewGroups.value = !areAllGroupsExpanded.value
  groupOpenState.clear()
  openItems.value = expandNewGroups.value
    ? (props.events ?? []).map((group) => `group-${group.date}`)
    : []
}
const isColumnVisible = (column: BoostEventTableColumn) => props.columnVisibility[column]
const columnTracks: Array<[BoostEventTableColumn, string]> = [
  ['duration', 'minmax(115px,.62fr)'],
  ['event', 'minmax(165px,1.05fr)'],
  ['location', 'minmax(210px,1.65fr)'],
  ['system', 'minmax(82px,.6fr)'],
  ['odometer', 'minmax(94px,.7fr)'],
  ['engineHours', 'minmax(94px,.7fr)'],
  ['notes', 'minmax(115px,1fr)'],
  ['status', '90px'],
  ['trailer', 'minmax(95px,.75fr)'],
  ['document', 'minmax(115px,.9fr)'],
  ['change', '132px'],
  ['actions', '132px'],
]
const gridStyle = computed(() => ({
  gridTemplateColumns: [
    '48px',
    'minmax(58px,.38fr)',
    'minmax(132px,.82fr)',
    ...columnTracks.flatMap(([column, track]) => {
      const result = isColumnVisible(column) ? [track] : []
      if (column === 'event' && props.showDriverColumn) result.push('minmax(140px,.85fr)')
      return result
    }),
  ].join(' '),
}))
const minimumColumnWidths: Record<BoostEventTableColumn, number> = {
  duration: 105,
  event: 165,
  location: 210,
  system: 82,
  odometer: 94,
  engineHours: 94,
  notes: 135,
  status: 90,
  trailer: 95,
  document: 115,
  change: 132,
  actions: 132,
}
const tableMinWidth = computed(
  () =>
    48 +
    58 +
    132 +
    (props.showDriverColumn ? 152 : 0) +
    48 +
    columnTracks.reduce(
      (total, [column]) => total + (isColumnVisible(column) ? minimumColumnWidths[column] + 12 : 0),
      0
    )
)

watch(
  () => props.events,
  (groups) => {
    openItems.value = groups
      .map((group) => `group-${group.date}`)
      .filter((key) => groupOpenState.get(key) ?? expandNewGroups.value)
  },
  { immediate: true }
)
watch(openItems, (keys) => {
  const open = new Set(keys)
  for (const group of props.events ?? []) {
    const key = `group-${group.date}`
    groupOpenState.set(key, open.has(key))
  }
}, { flush: 'sync' })

const isGroupOpen = (date: string) => openItems.value.includes(`group-${date}`)

const scrollContainer = ref<HTMLElement | null>(null)

watch(
  () => props.highlightedEventId,
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

const isActiveDriverEvent = (event: BoostUiEventRow) =>
  !props.activeDriverId || !event.ownerDriverId || event.ownerDriverId === props.activeDriverId

const selectableEvents = computed(() =>
  allEvents.value.filter((event) => event.actionState !== 4 && event.actionState !== 8)
)

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

const { setup: setupDragDrop, cleanup: cleanupDragDrop, suppressClick } = useDragDrop(
  (column, targetEventId, sourceEventId) =>
    emit('drop-property', column, targetEventId, sourceEventId)
)

function draggableAttrs(column: DragColumnType, event: BoostUiEventRow) {
  if (!props.dragDropEnabled || !props.canEditEvents || props.mutationPending || event.actionState === 4 || event.actionState === 8) return {}
  const hasValue = column === 'location'
    ? hasDraggableLocation(event)
    : column === 'odometer'
      ? event.vehicleMiles != null
      : event.engineHours != null
  return {
    draggable: hasValue,
    'data-drag-field': column,
    'data-drop-enabled': event.actionState === 8 || props.mutationPending ? 'false' : 'true',
  }
}

function hasManualLocationNote(event: BoostUiEventRow) {
  return event.positioning === 'MANUAL' && Boolean(event.manualLocation?.trim())
}

function displayLocation(event: BoostUiEventRow) {
  if (event.positioning === 'AUTOMATIC') {
    return event.calculatedLocation?.trim() || event.manualLocation?.trim() || 'N/A'
  }
  return event.manualLocation?.trim() || event.calculatedLocation?.trim() || 'N/A'
}

function hasDraggableLocation(event: BoostUiEventRow) {
  if (event.positioning === 'MANUAL' || event.manualLocation?.trim()) {
    return Boolean(event.manualLocation?.trim() || event.calculatedLocation?.trim())
  }
  return Boolean(event.calculatedLocation?.trim() || event.latitude != null || event.longitude != null)
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
  if (event?.actionState === 4 || event?.actionState === 8) return

  const globalIndex = globalIndexMap.value.get(eventId) ?? 0

  if (isShiftPressed.value && lastClickedIndex.value !== null) {
    const min = Math.min(lastClickedIndex.value, globalIndex)
    const max = Math.max(lastClickedIndex.value, globalIndex)
    const rangeIds = allEvents.value
      .slice(min, max + 1)
      .filter((event) => event.actionState !== 4 && event.actionState !== 8)
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

function handleRowClick(eventId: string, clickEvent: MouseEvent) {
  if (suppressClick(clickEvent)) return
  const event = allEvents.value.find((e) => e.eventId === eventId)
  if (event?.actionState === 4) return
  emit('toggle-selection', eventId)
  if (event?.actionState !== 8) toggleRow(eventId)
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

const formatDutyDuration = (seconds: number | null) => {
  if (seconds == null) return '—'
  const rounded = Math.max(0, Math.round(seconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const remainingSeconds = rounded % 60
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  return `${clock} (${(rounded / 3600).toFixed(2).padStart(5, '0')})`
}

const getStatusLabel = (status: string) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'ACTIVE') return 'Active'
  if (normalized === 'INACTIVE_CHANGED') return 'Inactive · changed'
  if (normalized === 'INACTIVE_CHANGE_REQUESTED') return 'Change requested'
  if (normalized === 'INACTIVE_CHANGE_REJECTED') return 'Change rejected'
  return normalized ? normalized.replaceAll('_', ' ').toLowerCase() : 'Unknown'
}
const getStatusClass = (status: string) =>
  String(status).toUpperCase() === 'ACTIVE'
    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'

const deliveryStatusLabel = (status: NonNullable<BoostUiEventRow['deliveryStatus']>) =>
  ({
    SUBMITTED: 'Submitted',
    SUBMISSION_PENDING: 'Submission pending',
    ROLLED_BACK: 'Rolled back',
    ROLLBACK_PENDING: 'Rollback pending',
    NOT_SUBMITTED: 'Not submitted',
  })[status]

const deliveryStatusClass = (status: NonNullable<BoostUiEventRow['deliveryStatus']>) => {
  const base =
    'inline-flex max-w-full rounded px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap'
  if (status === 'SUBMITTED') return `${base} bg-emerald-50 text-emerald-700`
  if (status === 'ROLLED_BACK') return `${base} bg-blue-50 text-blue-700`
  if (status.endsWith('PENDING')) return `${base} bg-amber-50 text-amber-700`
  return `${base} bg-slate-100 text-slate-600`
}

const dragDropHeaderClass = () =>
  props.dragDropEnabled
    ? 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300 dark:bg-blue-950/40 dark:text-blue-200'
    : ''
</script>

<style scoped>
.boost-events-grid {
  grid-template-columns:
    40px minmax(72px, 0.55fr) minmax(145px, 0.9fr) minmax(132px, 0.72fr) minmax(185px, 1.15fr)
    minmax(210px, 1.65fr) minmax(82px, 0.6fr) minmax(94px, 0.7fr) minmax(94px, 0.7fr)
    minmax(135px, 1fr) 90px minmax(95px, 0.75fr) minmax(115px, 0.9fr) 100px 140px;
}
</style>
