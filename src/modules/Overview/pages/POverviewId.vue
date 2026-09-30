<template>
  <div class="flex w-full" style="height: calc(100vh - 72px)">
    <!-- Chap Panel (3 kolonna) -->
    <div v-if="!isFullscreen" class="flex w-1/4 flex-col overflow-hidden h-full">
      <!-- Routes Mode -->
      <div
        v-if="isRoutingMode"
        class="flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900"
      >
        <!-- Header -->
        <div
          class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0"
        >
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Routes</h2>
          <Button
            @click="isRoutingMode = false"
            variant="ghost"
            size="icon"
            class="h-7 w-7 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>

        <!-- From / To inputs -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <!-- From -->
          <div class="flex items-center gap-2">
            <div
              class="w-3.5 h-3.5 shrink-0 rounded-full border border-[#666666] bg-white dark:bg-gray-700 flex items-center justify-center"
            >
              <div class="w-2.5 h-2.5 rounded-full bg-gray-500 dark:bg-gray-400"></div>
            </div>
            <div class="flex-1">
              <SearchAutocomplete placeholder="From" v-model="routeForm.from" @select="onSelectRouteFrom" />
            </div>
          </div>
          <!-- Dashed connector -->
          <div class="flex gap-2 my-0">
            <div class="w-3.5 shrink-0 flex justify-center">
              <div
                class="w-0 h-3 border-l-2 border-dotted border-gray-300 dark:border-gray-600"
              ></div>
            </div>
          </div>
          <!-- To -->
          <div class="flex items-center gap-2">
            <div
              class="w-3.5 h-3.5 shrink-0 rounded-full bg-white border border-[#6082E0] dark:bg-blue-900/20 flex items-center justify-center"
            >
              <div class="w-2.5 h-2.5 rounded-full bg-[#3C64D8]"></div>
            </div>
            <div class="flex-1">
              <SearchAutocomplete
                v-model="routeForm.destinations[0].text"
                @select="(opt) => onSelectRouteDestination(opt, 0)"
                placeholder="To"
              />
            </div>
          </div>
        </div>

        <!-- Add destination / fetch routes button -->
        <div class="px-4 pb-4 shrink-0">
          <Button
            @click="fetchRouteAlternatives"
            :disabled="!routeForm.fromLat || !routeForm.destinations[0]?.lat || isFetchingRoutes"
            variant="outline"
            class="w-full h-10 gap-2 border border-[#666] dark:border-gray-600 text-[#090909] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent disabled:opacity-40"
          >
            <template v-if="isFetchingRoutes">
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Searching...</span>
            </template>
            <template v-else>
              <Plus class="w-4 h-4" />
              <span>Add destination</span>
            </template>
          </Button>
        </div>

        <!-- Route alternatives list -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading state -->
          <div
            v-if="isFetchingRoutes"
            class="flex items-center justify-center py-10 gap-2 text-gray-500 dark:text-gray-400"
          >
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span class="text-sm">Calculating routes...</span>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="
              !routeAlternatives.length && routeForm.fromLat && !routeForm.destinations[0]?.lat
            "
            class="flex flex-col items-center justify-center py-10 px-4 text-center gap-2"
          >
            <Navigation class="w-8 h-8 text-gray-300 dark:text-gray-600" />
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Select a destination to see routes
            </p>
          </div>

          <!-- Route items -->
          <div v-else-if="routeAlternatives.length">
            <div
              v-for="(route, idx) in routeAlternatives"
              :key="idx"
              @click="selectRoute(idx)"
              :class="[
                'flex items-center gap-3 px-4 py-4 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0',
                selectedRouteIndex === idx
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
              ]"
            >
              <div
                class="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0"
              >
                <Navigation class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  via {{ route.via }}
                </p>
                <p
                  :class="route.hasTolls ? 'text-red-500' : 'text-green-500'"
                  class="text-xs font-medium mt-0.5"
                >
                  {{ route.hasTolls ? `${route.tollCount} toll road` : 'There are no toll roads' }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ route.durationText }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ route.distanceText }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Tracking Mode -->
      <div v-else-if="focusLiveTracking" class="space-y-4">
        <div class="bg-white dark:bg-gray-900 p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Tracking</h2>
            <Button @click="liveModal = true" variant="outline" size="sm" class="gap-1">
              Live share
              <ChevronRight class="w-4 h-4" />
            </Button>
          </div>

          <!-- Live tracking form -->
          <form @submit.prevent="handleApplyDestinationRoute" class="space-y-4">
            <div class="space-y-2">
              <Label for="latitude">Latitude</Label>
              <Input
                id="latitude"
                v-model="liveTrackingForm.latitude"
                type="text"
                placeholder="Latitude"
                disabled
              />
            </div>

            <div class="space-y-2">
              <Label for="longitude">Longitude</Label>
              <Input
                id="longitude"
                v-model="liveTrackingForm.longitude"
                type="text"
                placeholder="Longitude"
                disabled
              />
            </div>

            <div class="space-y-2">
              <Label for="fromLocation">From Location</Label>
              <Input
                id="fromLocation"
                v-model="liveTrackingForm.fromLocation"
                type="text"
                placeholder="Enter from location"
              />
            </div>

            <div class="space-y-2">
              <Label for="toDestination">To Destination</Label>
              <SearchAutocomplete
                v-model="liveTrackingForm.toDestination"
                @select="onSelectDestination"
              />
            </div>

            <Button
              type="submit"
              class="w-full bg-gray-900 cursor-pointer hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
              :disabled="!isLiveTrackingFormValid"
            >
              Apply Route
            </Button>
          </form>
        </div>
      </div>

      <!-- Tarixiy Mode -->
      <div v-else class="flex flex-col flex-1 overflow-hidden">
        <!-- Header Section with Status Color -->
        <div class="p-3" :style="{ backgroundColor: headerStatusColor }">
          <div class="flex justify-between">
            <div class="flex flex-col">
              <span class="text-sm font-medium text-white">{{ driverUnit || 'N/A' }}</span>
              <span class="text-xs text-white/90 mt-0.5">{{ driverName }}</span>
            </div>
            <div class="flex gap-2 my-0">
              <Button
                @click="liveModal = true"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0 text-white bg-[#ffffff3d] cursor-pointer"
              >
                <Share2 class="w-4 h-4" />
              </Button>
              <Button
                @click="$router.push('/overview')"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0 text-white bg-[#ffffff3d] cursor-pointer"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
          </div>
          <hr class="my-2 border-[#FFFFFF29]" />
          <div class="flex flex-col gap-1">
            <div class="text-sm text-white flex items-center gap-2">
              <p class="font-normal text-xs">Phone Number:</p>
              <p class="text-xs">{{ driverPhone || 'N/A' }}</p>
            </div>
            <div class="text-sm text-white flex items-center gap-2">
              <p class="font-normal text-xs">Email:</p>
              <p class="text-xs">{{ driverEmail || 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Delivery Information -->
        <!--        <div class="bg-white dark:bg-gray-900 p-4"></div>-->

        <!-- History Section -->
        <div class="flex flex-col flex-1 overflow-hidden bg-white dark:bg-gray-900">
          <!-- History Summary -->
          <div
            v-if="firstEvent && lastEvent"
            class="p-4 border-b border-gray-100 dark:border-gray-800 bg-[#F5F5F5] dark:bg-gray-800/20"
          >
            <div class="flex items-start justify-between mb-4 text-[#666666] text-xs font-normal">
              <div class="space-y-1">
                <p>Start:</p>
                <p class="dark:text-gray-300 whitespace-nowrap">
                  {{ formatDateTime(lastEvent.startTime) }}
                </p>
              </div>
              <div class="space-y-1 text-center px-2">
                <p>Distance:</p>
                <p class="text-[11px] dark:text-gray-300 whitespace-nowrap">
                  {{ formattedDistance }}
                </p>
              </div>
              <div class="space-y-1 text-right">
                <p class="text-right">End:</p>
                <p class="dark:text-gray-300 whitespace-nowrap">
                  {{ formatDateTime(firstEvent.endTime) }}
                </p>
              </div>
            </div>

            <!-- Visual Timeline -->
            <div class="flex items-center gap-1 mb-4 px-1">
              <div
                class="w-3 h-3 rounded-full border border-gray-900 dark:border-gray-100 shrink-0 relative"
              >
                <div
                  class="absolute inset-0 bg-gray-900 dark:bg-gray-100 rounded-full scale-[0.6]"
                ></div>
              </div>
              <div
                class="flex-1 h-0.5 border-t-2 border-dotted border-gray-900 dark:border-gray-400 opacity-60"
              ></div>
              <div
                class="w-3 h-3 rounded-full border border-black dark:border-gray-400 shrink-0 relative"
              >
                <div
                  class="absolute inset-0 bg-gray-900 dark:bg-gray-100 rounded-full scale-[0.6]"
                ></div>
              </div>
              <div
                class="flex-1 h-0.5 border-t-2 border-dotted border-gray-400 dark:border-gray-600 opacity-40"
              ></div>
              <div
                class="w-3 h-3 rounded-full border border-gray-600 dark:border-gray-400 shrink-0 relative"
              >
                <div
                  class="absolute inset-0 bg-[#666666] dark:bg-gray-100 rounded-full scale-[0.6]"
                ></div>
              </div>
            </div>

            <!-- Locations -->
            <div class="grid grid-cols-2 gap-4 text-xs text-[#090909]">
              <p class="dark:text-gray-400 leading-snug line-clamp-2">
                {{ lastEvent.calculatedLocation || lastEvent.manualLocation || 'N/A' }}
              </p>
              <p class="dark:text-gray-400 leading-snug text-right line-clamp-2">
                {{ firstEvent.calculatedLocation || firstEvent.manualLocation || 'N/A' }}
              </p>
            </div>
          </div>

          <div class="p-3 border-b border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">History</h2>
              <Popover v-model:open="isCalendarOpen">
                <PopoverTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Calendar class="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="center">
                  <RangeCalendar
                    v-model="tempCalendarValueForBinding"
                    :number-of-months="2"
                    :is-date-disabled="isDateDisabled"
                    class="dark:bg-gray-800"
                  />
                  <div
                    class="flex items-center justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      @click="handleCancelDateSelect"
                      class="bg-white dark:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      @click="handleApplyDateSelect"
                      :disabled="isApplyDisabled"
                      class="bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                    >
                      {{ isApplyLoading ? 'Loading...' : 'Apply' }}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div
              v-for="(event, index) in historyEvents"
              :key="index"
              class="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <!-- Drive Event -->
              <div
                v-if="event.eventCode === 3 && event.eventType === 1"
                @click="selectEvent(event)"
                :class="[
                  'flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors',
                  selectedEvent?.eventId === event.eventId
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                ]"
              >
                <!-- Event Content -->
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-normal">
                      <!-- Event Number -->
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {{ historyEvents.length - index }}.
                      </span>
                      Drive
                    </p>
                    <div class="flex items-center gap-1">
                      <Clock class="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatDuration(event.duration) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-900 dark:text-gray-100">
                      {{ formatDistance(event.vehicleMiles) }} / {{ event.vehicleSpeed }}mph
                    </span>
                  </div>
                </div>
              </div>

              <!-- Location/Stop Event -->
              <div
                v-else
                @click="selectEvent(event)"
                :class="[
                  'flex items-start gap-2 px-4 py-3 cursor-pointer transition-colors',
                  selectedEvent?.eventId === event.eventId
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                ]"
              >
                <!-- Event Content -->
                <div class="flex-1">
                  <div class="text-sm text-gray-900 dark:text-gray-100 mb-2">
                    <!-- Event Number -->
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ historyEvents.length - index }}.
                    </span>
                    {{
                      event.calculatedLocation || event.manualLocation || 'Location not available'
                    }}
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Calendar class="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatEventTimeRange(event.startTime, event.endTime) }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <Clock class="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <span class="text-xs text-gray-600 dark:text-gray-400">
                        {{ formatDuration(event.duration) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="historyEvents.length === 0"
              class="text-sm text-gray-500 dark:text-gray-400 text-center py-4 px-4"
            >
              No history events available
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- O'ng Panel: Google Map (9 kolonna) -->
    <div class="flex flex-col relative" :class="isFullscreen ? 'w-full' : 'w-3/4'">
      <OverviewMapControls
        :fuel-type="fuelType"
        :radius="radius"
        :is-focus-live-tracking="focusLiveTracking"
        :is-traffic-active="isTrafficActive"
        :is-parking-active="isParkingActive"
        :is-routing-active="isRoutingMode"
        :is-fullscreen-active="isFullscreen"
        @update:fuel-type="fuelType = $event"
        @update:radius="radius = $event"
        @update:map-layer="updateMapLayer"
        @toggle:traffic="handleTrafficToggle"
        @toggle:parking="handleParkingToggle"
        @toggle:routing="handleRoutingToggle"
        @toggle:is-live-tracking="handleToggleLiveTracking"
        @toggle:fullscreen="toggleFullscreen"
        @toggle:weather="toggleWeather"
        @toggle:stations="toggleStations"
      />
      <GoogleMap
        ref="mapInstance"
        :api-key="apiKey"
        :center="mapCenter"
        :zoom="zoomMap"
        :libraries="['geometry', 'places']"
        :map-type-id="mapType"
        :styles="mapStyles"
        :disable-default-ui="true"
        style="width: 100%; height: 100%"
      >
        <!-- Truck Marker -->
        <CustomMarker
          v-if="truckPosition.lat && truckPosition.lng"
          ref="truckMarker"
          :options="{
            position: { lat: truckPosition.lat, lng: truckPosition.lng },
            anchorPoint: 'CENTER',
          }"
        >
          <div
            class="w-10 h-10"
            :style="{ transform: `rotate(${truckHeading + ICON_ROT_OFFSET}deg)` }"
          >
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M27.3408 14.3675C28.1634 14.0476 28.5747 13.8877 28.6901 13.6615C28.7902 13.4656 28.7871 13.2329 28.682 13.0397C28.5606 12.8167 28.1453 12.6676 27.3146 12.3694L6.12839 4.76406C5.44879 4.5201 5.109 4.39812 4.88686 4.47505C4.69372 4.54194 4.54194 4.69372 4.47505 4.88685C4.39812 5.109 4.5201 5.44879 4.76406 6.12839L12.3693 27.3147C12.6675 28.1453 12.8166 28.5607 13.0396 28.682C13.2329 28.7872 13.4655 28.7902 13.6614 28.6902C13.8876 28.5747 14.0475 28.1634 14.3674 27.3409L17.8299 18.4375C17.8925 18.2763 17.9239 18.1958 17.9722 18.1279C18.0151 18.0678 18.0677 18.0152 18.1279 17.9723C18.1957 17.9239 18.2763 17.8926 18.4374 17.8299L27.3408 14.3675Z"
                fill="#465A95"
                stroke="white"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </CustomMarker>

        <!-- Destination Marker -->
        <CustomMarker
          v-if="destinationMarker.visible && destinationMarker.lat && destinationMarker.lng"
          :options="{
            position: { lat: destinationMarker.lat, lng: destinationMarker.lng },
            anchorPoint: 'BOTTOM_CENTER',
          }"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 40 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style="filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))"
          >
            <path
              d="M20 0C11.163 0 4 7.163 4 16C4 28 20 50 20 50C20 50 36 28 36 16C36 7.163 28.837 0 20 0Z"
              fill="#EA4335"
            />
            <circle cx="20" cy="16" r="7" fill="white" />
          </svg>
        </CustomMarker>

        <!-- Event Markers (History Points) -->
        <CustomMarker
          v-if="!focusLiveTracking"
          v-for="(tracking, ind) in dailyTrackings?.trackingEventResponse"
          :key="tracking.eventId"
          :options="{
            position: { lat: tracking.latitude, lng: tracking.longitude },
            anchorPoint: 'CENTER',
          }"
          @click="selectEvent(tracking)"
          class="cursor-pointer"
        >
          <Popover :open="Boolean(trackingTooltips[tracking.eventId])">
            <PopoverTrigger as-child>
              <div
                class="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <span class="text-white text-xs font-semibold">
                  {{ (dailyTrackings?.trackingEventResponse?.length || 0) - ind }}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0 z-[9999]" :side="'top'" :align="'center'">
              <div class="px-3 py-2 min-w-[150px] max-w-[200px]">
                <div class="flex flex-col gap-2">
                  <!-- Location -->
                  <div class="flex items-start gap-1.5">
                    <svg
                      class="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <p class="text-xs font-normal text-gray-700 dark:text-gray-300 break-words">
                      {{ tracking.calculatedLocation || tracking.manualLocation || 'N/A' }}
                    </p>
                  </div>

                  <!-- Annotation -->
                  <div
                    v-if="tracking.annotation"
                    class="flex items-center gap-1.5 mt-1 pt-2 border-t border-gray-200 dark:border-gray-700"
                  >
                    <svg
                      class="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p class="text-xs text-gray-600 dark:text-gray-400">
                      {{ tracking.annotation }}
                    </p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </CustomMarker>
      </GoogleMap>
    </div>

    <!-- Live Share Modal -->
    <LiveShareModal
      v-model:open="liveModal"
      :emails="liveState.emails"
      :telegrams="liveState.telegrams"
      :expire-at="liveState.expireAt"
      :save-loading="saveLoading"
      @add-email="addEmail"
      @remove-email="removeEmail"
      @add-telegram="addTelegram"
      @remove-telegram="removeTelegram"
      @update:email="updateEmail"
      @update:telegram="updateTelegram"
      @update:expire-at="liveState.expireAt = $event"
      @submit="submitLiveShare"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { GoogleMap, CustomMarker } from 'vue3-google-map'
import { mapStyles } from '@/utils/maps'
import { ChevronRight, Share2, X, Calendar, Clock, Car, Plus, Navigation } from 'lucide-vue-next'
import { useOverviewId } from '../composables/useOverviewId.ts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import LiveShareModal from '../components/LiveShareModal.vue'
import SearchAutocomplete from '../components/SearchAutocomplete.vue'
import OverviewMapControls from '../components/OverviewMapControls.vue'

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const {
  // Map
  mapCenter, zoomMap, truckPosition, truckHeading, focusLiveTracking,
  destinationMarker, mapInstance, mapType, truckMarker, ICON_ROT_OFFSET, dailyTrackings,
  // Date range
  headerDate, updateHeaderDate,
  // Event selection
  trackingTooltips, selectEvent, selectedEvent,
  // Live share
  liveModal, liveState, saveLoading, updateEmail, updateTelegram,
  addEmail, removeEmail, addTelegram, removeTelegram, submitLiveShare,
  // Live tracking form
  liveTrackingForm, isLiveTrackingFormValid, stopLiveTracking,
  // Status
  lastEventCode, lastEventType,
  // Calendar
  isCalendarOpen, calendarValue, tempCalendarValueForBinding,
  isDateDisabled, handleDateSelect, handleCancelDateSelect, handleApplyDateSelect, isApplyLoading,
  // Map controls
  updateMapLayer, toggleWeather, toggleStations,
  isTrafficActive, isParkingActive, handleToggleLiveTracking, isFullscreen, toggleFullscreen,
  // Driver info
  driverName, driverUnit, driverPhone, driverEmail,
  // History
  historyEvents, formattedDistance, formatDistance, formatDuration,
  formatDateTime, formatEventTimeRange, getEventName, headerStatusColor, firstEvent, lastEvent,
  // Route mode (from useRouteMode via useOverviewId)
  isRoutingMode, routeForm, selectedRouteIndex, isFetchingRoutes, routeAlternatives,
  onSelectRouteFrom, onSelectRouteDestination, fetchRouteAlternatives, selectRoute,
  // Mode coordination
  handleTrafficToggle, handleParkingToggle, handleRoutingToggle,
  // Live destination
  onSelectDestination, handleApplyDestinationRoute,
} = useOverviewId()

// UI-only state — not business logic, stays in the page
const fuelType = ref(0)
const radius = ref(50)

const isApplyDisabled = computed(
  () =>
    !tempCalendarValueForBinding.value?.start ||
    !tempCalendarValueForBinding.value?.end ||
    isApplyLoading.value,
)

onBeforeUnmount(() => {
  stopLiveTracking()
})
</script>
