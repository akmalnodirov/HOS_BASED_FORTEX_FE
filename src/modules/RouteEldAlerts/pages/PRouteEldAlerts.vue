<template>
  <div
    class="flex min-h-0 flex-col overflow-hidden bg-white p-[16px_24px] dark:bg-background"
    :class="allCompanies ? 'h-[720px] rounded-lg border border-border' : 'h-[calc(100vh-65px)]'"
  >
    <div class="mb-4 flex flex-none flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-foreground">{{ allCompanies ? 'Alerts' : alertLabels[alertType] }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ pageDescription }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Select v-if="allCompanies" v-model="companyFilter">
          <SelectTrigger class="h-10 w-52"><SelectValue placeholder="All companies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            <SelectItem v-for="company in companies" :key="company.id" :value="company.externalCompanyId">
              {{ company.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-if="allCompanies" v-model="alertType">
          <SelectTrigger class="h-10 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-if="permittedTypes.includes('station')" value="station">Station alerts</SelectItem>
            <SelectItem v-if="permittedTypes.includes('alpr')" value="alpr">ALPR camera alerts</SelectItem>
            <SelectItem v-if="permittedTypes.includes('red_state')" value="red_state">Red state alerts</SelectItem>
            <SelectItem v-if="permittedTypes.includes('dot')" value="dot">DOT alerts</SelectItem>
            <SelectItem v-if="permittedTypes.includes('violation')" value="violation">Violation alerts</SelectItem>
            <SelectItem v-if="permittedTypes.includes('speed')" value="speed">Speed alerts</SelectItem>
          </SelectContent>
        </Select>
        <div class="relative w-64">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" class="h-10 pl-9" :placeholder="searchPlaceholder" />
        </div>
        <Select v-model="statusFilter">
          <SelectTrigger class="h-10 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          class="h-10"
          :disabled="isLoading || isRefreshing || readAllLoading || (!allCompanies && !requestCompanyId)"
          @click="readAllAlerts"
        >
          <Check class="mr-2 h-4 w-4" />Read all
        </Button>
        <Button
          variant="outline"
          class="h-10"
          :disabled="isRefreshing || (!allCompanies && !requestCompanyId)"
          @click="refresh"
        >
          <RefreshCw class="mr-2 h-4 w-4" :class="isRefreshing && 'animate-spin'" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="mb-4 grid flex-none grid-cols-2 gap-3 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-lg border border-border bg-card px-4 py-3"
      >
        <div class="text-xs text-muted-foreground">{{ card.label }}</div>
        <div class="mt-1 text-2xl font-semibold" :class="card.className">{{ card.value }}</div>
      </div>
    </div>

    <CRedStateSettings
      v-if="alertType === 'red_state'"
      :can-edit="hasPermission(authStore.token, 'route_eld.alerts.red_state.settings')"
    />

    <div
      v-if="pageError"
      class="mb-3 flex-none rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ pageError }}
    </div>

    <section
      v-if="mapSelection"
      ref="mapContainerRef"
      class="mb-4 flex-none overflow-hidden rounded-lg border border-border bg-card"
      :class="isMapFullscreen && 'mb-0 flex h-full w-full flex-col rounded-none border-0'"
    >
      <div class="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div class="font-semibold">{{ mapSelection.driver }} — {{ mapSelection.reason }}</div>
          <div class="text-xs text-muted-foreground">{{ mapSelection.detail }}</div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" :title="isMapFullscreen ? 'Exit fullscreen' : 'Fullscreen'" :aria-label="isMapFullscreen ? 'Exit fullscreen' : 'Fullscreen'" @click="toggleMapFullscreen">
            <Minimize v-if="isMapFullscreen" class="h-4 w-4" />
            <Maximize v-else class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close map" @click="closeMap">
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div v-if="mapSelection.latitude !== null && mapSelection.longitude !== null" class="relative" :class="isMapFullscreen ? 'min-h-0 flex-1' : 'h-72'">
      <div class="absolute right-3 top-3 z-10"><CMapTypeControl /></div>
      <CMap
        ref="mapRef"
        :center="{ lat: mapSelection.latitude, lng: mapSelection.longitude }"
        :zoom="12"
        @ready="fitMapSelection"
      >
        <CMapMarker :position="{ lat: mapSelection.latitude, lng: mapSelection.longitude }" :z-index="activeMapInfo === 'driver' ? 2 : 1">
          <div class="relative">
          <button type="button" class="rounded-full border-2 border-white bg-blue-600 p-2 text-white shadow-lg" :title="mapSelection.driver" @click.stop="activeMapInfo = 'driver'">
            <Truck class="h-4 w-4" />
          </button>
          <CMapMarkerInfo v-if="activeMapInfo === 'driver'" placement="left" :title="mapSelection.driver" :rows="mapSelection.driverRows" @close="activeMapInfo = null" />
          </div>
        </CMapMarker>
        <CMapMarker
          v-if="mapSelection.targetLatitude !== null && mapSelection.targetLongitude !== null"
          :position="{ lat: mapSelection.targetLatitude, lng: mapSelection.targetLongitude }"
          :z-index="activeMapInfo === 'target' ? 2 : 1"
        >
          <div class="relative">
          <button type="button" class="rounded-full border-2 border-white bg-emerald-600 p-2 text-white shadow-lg" :title="mapSelection.reason" @click.stop="activeMapInfo = 'target'">
            <MapPin class="h-4 w-4" />
          </button>
          <CMapMarkerInfo v-if="activeMapInfo === 'target'" placement="right" :title="mapSelection.targetName || mapSelection.reason" :rows="mapSelection.targetRows" @close="activeMapInfo = null" />
          </div>
        </CMapMarker>
      </CMap>
      </div>
      <div v-else class="flex h-28 items-center justify-center text-sm text-muted-foreground">
        Coordinates are unavailable for this notification.
      </div>
    </section>

    <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
      <table
        v-if="alertType === 'station'"
        class="w-full min-w-[1480px] border-collapse text-left text-sm"
      >
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th v-if="allCompanies" class="px-3">Company</th>
            <th class="px-3">Station</th>
            <th class="px-3">Driver location</th>
            <th class="px-3">Station location</th>
            <th class="px-3">Direction</th>
            <th class="px-3">Distance</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
            <th class="w-24 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td :colspan="allCompanies ? 11 : 10" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedStationAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td v-if="allCompanies" class="px-3">{{ companyName(alert.companyId) }}</td>
            <td class="px-3">
              <div class="font-medium">{{ alert.stationName }}</div>
              <div class="text-xs text-muted-foreground">{{ alert.stateCode || '—' }}</div>
            </td>
            <td class="max-w-64 px-3">
              <a
                :href="mapUrl(alert.driverLatitude, alert.driverLongitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 hover:text-primary hover:underline"
              >
                <MapPin class="h-4 w-4 shrink-0 text-blue-600" />
                <span class="truncate" :title="stationDriverLocation(alert)">
                  {{ stationDriverLocation(alert) }}
                </span>
              </a>
            </td>
            <td class="max-w-72 px-3">
              <a
                :href="mapUrl(alert.stationLatitude, alert.stationLongitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 hover:text-primary hover:underline"
              >
                <MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate" :title="stationLocation(alert)">{{
                  stationLocation(alert)
                }}</span>
              </a>
            </td>
            <td class="px-3">{{ alert.direction || '—' }}</td>
            <td class="whitespace-nowrap px-3">{{ alert.distanceMiles.toFixed(2) }} mi</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <div class="flex flex-wrap gap-1.5">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  :class="
                    alert.resolvedAt
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  "
                >
                  {{ alert.resolvedAt ? 'Passed' : 'Nearby' }}
                </span>
                <span
                  v-if="!alert.isRead"
                  class="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                >
                  Unread
                </span>
              </div>
            </td>
            <td class="px-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <Button variant="ghost" size="icon" title="View map" aria-label="View map" @click="viewStationMap(alert)">
                  <MapPinned class="h-4 w-4" />
                </Button>
              <Button
                v-if="!alert.isRead"
                variant="ghost"
                size="icon"
                :disabled="markingReadId === alert.id"
                title="Mark read"
                aria-label="Mark read"
                @click="markStationRead(alert.id)"
              >
                <LoaderCircle v-if="markingReadId === alert.id" class="h-4 w-4 animate-spin" />
                <Check v-else class="h-4 w-4" />
              </Button>
              </div>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedStationAlerts.length === 0">
            <td :colspan="allCompanies ? 11 : 10" class="h-28 text-center text-muted-foreground">
              No station notifications match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>

      <table
        v-else-if="alertType === 'alpr'"
        class="w-full min-w-[1380px] border-collapse text-left text-sm"
      >
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th v-if="allCompanies" class="px-3">Company</th>
            <th class="px-3">Camera</th>
            <th class="px-3">Driver location</th>
            <th class="px-3">Camera location</th>
            <!-- <th class="px-3">Brand / operator</th> -->
            <th class="px-3">Distance</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
            <th class="w-24 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td :colspan="allCompanies ? 10 : 9" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedAlprCameraAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td v-if="allCompanies" class="px-3">{{ companyName(alert.companyId) }}</td>
            <td class="px-3">
              <div class="font-medium">{{ alert.cameraName }}</div>
              <div class="text-xs text-muted-foreground">
                {{ alert.bearingConfidence || 'Bearing unknown' }}
              </div>
            </td>
            <td class="max-w-64 px-3">
              <a
                :href="mapUrl(alert.driverLatitude, alert.driverLongitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 hover:text-primary hover:underline"
              >
                <MapPin class="h-4 w-4 shrink-0 text-blue-600" />
                <span class="truncate" :title="alprDriverLocation(alert)">
                  {{ alprDriverLocation(alert) }}
                </span>
              </a>
            </td>
            <td class="max-w-64 px-3">
              <a
                :href="mapUrl(alert.cameraLatitude, alert.cameraLongitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 hover:text-primary hover:underline"
              >
                <MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate" :title="alprCameraLocation(alert)">
                  {{ alprCameraLocation(alert) }}
                </span>
              </a>
            </td>
            <!-- <td class="px-3">
              <div>{{ alert.brand || '—' }}</div>
              <div class="text-xs text-muted-foreground">{{ alert.operator || '—' }}</div>
            </td> -->
            <td class="whitespace-nowrap px-3">{{ alert.distanceMiles.toFixed(2) }} mi</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <div class="flex flex-wrap gap-1.5">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                  :class="
                    alert.resolvedAt
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  "
                >
                  {{ alert.resolvedAt ? 'Passed' : 'Nearby' }}
                </span>
                <span
                  v-if="!alert.isRead"
                  class="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                >
                  Unread
                </span>
              </div>
            </td>
            <td class="px-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <Button variant="ghost" size="icon" title="View map" aria-label="View map" @click="viewAlprMap(alert)">
                  <MapPinned class="h-4 w-4" />
                </Button>
              <Button
                v-if="!alert.isRead"
                variant="ghost"
                size="icon"
                :disabled="markingReadId === alert.id"
                title="Mark read"
                aria-label="Mark read"
                @click="markAlprCameraRead(alert.id)"
              >
                <LoaderCircle v-if="markingReadId === alert.id" class="h-4 w-4 animate-spin" />
                <Check v-else class="h-4 w-4" />
              </Button>
              </div>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedAlprCameraAlerts.length === 0">
            <td :colspan="allCompanies ? 10 : 9" class="h-28 text-center text-muted-foreground">
              No ALPR camera notifications match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="alertType === 'dot'" class="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th><th class="px-3">Driver</th>
            <th v-if="allCompanies" class="px-3">Company</th>
            <th class="px-3">Driver ID</th><th class="px-3">Truck</th><th class="px-3">Location</th>
            <th class="px-3">Submitted</th><th class="px-3">Log period</th>
            <th class="px-3">Status</th><th class="w-24 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td :colspan="allCompanies ? 10 : 9" class="h-28 text-center text-muted-foreground">Loading…</td></tr>
          <tr v-for="(alert, index) in paginatedDotAlerts" v-else :key="alert.id" class="h-12 border-t border-border transition-colors hover:bg-muted/40">
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td v-if="allCompanies" class="px-3">{{ companyName(alert.companyId) }}</td>
            <td class="px-3">{{ alert.externalDriverId }}</td>
            <td class="px-3 font-semibold text-red-600">{{ alert.truckNumber }}</td>
            <td class="max-w-64 truncate px-3" :title="alert.driverLocation || undefined">{{ alert.driverLocation || formatCoordinates(alert.driverLatitude, alert.driverLongitude) }}</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.submittedAt) }}</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.periodStart) }} – {{ formatDate(alert.periodEnd) }}</td>
            <td class="px-3"><span v-if="!alert.isRead" class="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Unread</span><span v-else class="text-muted-foreground">Read</span></td>
            <td class="px-3 text-center"><div class="flex items-center justify-center gap-1"><Button variant="ghost" size="icon" title="View map" aria-label="View map" @click="viewDotMap(alert)"><MapPinned class="h-4 w-4" /></Button><Button v-if="!alert.isRead" variant="ghost" size="icon" title="Mark read" aria-label="Mark read" :disabled="markingReadId === alert.id" @click="markDotRead(alert.id)"><LoaderCircle v-if="markingReadId === alert.id" class="h-4 w-4 animate-spin" /><Check v-else class="h-4 w-4" /></Button></div></td>
          </tr>
          <tr v-if="!isLoading && paginatedDotAlerts.length === 0"><td :colspan="allCompanies ? 10 : 9" class="h-28 text-center text-muted-foreground">No DOT alerts match the selected filters.</td></tr>
        </tbody>
      </table>

      <table v-else-if="alertType === 'red_state'" class="w-full min-w-[1060px] border-collapse text-left text-sm">
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th><th class="px-3">Driver</th>
            <th v-if="allCompanies" class="px-3">Company</th>
            <th class="px-3">State ahead</th><th class="px-3">Driver location</th>
            <th class="px-3">Distance</th><th class="px-3">Occurred</th>
            <th class="px-3">Status</th><th class="w-24 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td :colspan="allCompanies ? 9 : 8" class="h-28 text-center text-muted-foreground">Loading…</td></tr>
          <tr v-for="(alert, index) in paginatedRedStateAlerts" v-else :key="alert.id" class="h-12 border-t border-border transition-colors hover:bg-muted/40">
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td v-if="allCompanies" class="px-3">{{ companyName(alert.companyId) }}</td>
            <td class="px-3 font-semibold text-red-600">{{ alert.stateCode }}</td>
            <td class="max-w-64 truncate px-3" :title="alert.driverLocation || undefined">{{ alert.driverLocation || formatCoordinates(alert.driverLatitude, alert.driverLongitude) }}</td>
            <td class="whitespace-nowrap px-3">{{ alert.distanceMiles.toFixed(2) }} mi</td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <span class="rounded-full px-2 py-1 text-xs font-medium" :class="alert.resolvedAt ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">{{ alert.resolvedAt ? 'Passed' : 'Nearby' }}</span>
              <span v-if="!alert.isRead" class="ml-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Unread</span>
            </td>
            <td class="px-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <Button variant="ghost" size="icon" title="View map" aria-label="View map" @click="viewRedStateMap(alert)"><MapPinned class="h-4 w-4" /></Button>
                <Button v-if="!alert.isRead" variant="ghost" size="icon" title="Mark read" aria-label="Mark read" :disabled="markingReadId === alert.id" @click="markRedStateRead(alert.id)"><LoaderCircle v-if="markingReadId === alert.id" class="h-4 w-4 animate-spin" /><Check v-else class="h-4 w-4" /></Button>
              </div>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedRedStateAlerts.length === 0"><td :colspan="allCompanies ? 9 : 8" class="h-28 text-center text-muted-foreground">No red state alerts match the selected filters.</td></tr>
        </tbody>
      </table>

      <table
        v-else-if="alertType === 'speed'"
        class="w-full min-w-[1050px] border-collapse text-left text-sm"
      >
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th v-if="allCompanies" class="px-3">Company</th>
            <th class="px-3">Speed</th>
            <th class="px-3">Limit</th>
            <th class="px-3">Over limit</th>
            <th class="px-3">State</th>
            <th class="px-3">Location</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
            <th class="w-24 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td :colspan="allCompanies ? 11 : 10" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedSpeedAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
            <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
            <td class="px-3 font-medium">{{ alert.driverName }}</td>
            <td v-if="allCompanies" class="px-3">{{ companyName(alert.companyId) }}</td>
            <td class="px-3 font-medium text-red-600">{{ Math.round(alert.speed) }} mph</td>
            <td class="px-3">{{ alert.speedLimit }} mph</td>
            <td class="px-3 font-medium text-orange-600">{{ speedOverLimit(alert) }} mph</td>
            <td class="px-3">{{ alert.stateCode || '—' }}</td>
            <td class="max-w-80 px-3">
              <a
                :href="mapUrl(alert.latitude, alert.longitude)"
                target="_blank"
                rel="noopener noreferrer"
                class="block truncate hover:text-primary hover:underline"
                :title="speedLocation(alert)"
              >
                {{ speedLocation(alert) }}
              </a>
            </td>
            <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
            <td class="px-3">
              <span
                class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                :class="alert.isRead ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'"
              >
                {{ alert.isRead ? 'Read' : 'Unread' }}
              </span>
            </td>
            <td class="w-24 px-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <Button variant="ghost" size="icon" title="View map" aria-label="View map" @click="viewSpeedMap(alert)">
                  <MapPinned class="h-4 w-4" />
                </Button>
                <Button v-if="!alert.isRead" variant="ghost" size="icon" title="Mark read" aria-label="Mark read" :disabled="markingReadId === alert.id" @click="markSpeedRead(alert.id)">
                  <LoaderCircle v-if="markingReadId === alert.id" class="h-4 w-4 animate-spin"/>
                  <Check v-else class="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
          <tr v-if="!isLoading && paginatedSpeedAlerts.length === 0">
            <td :colspan="allCompanies ? 11 : 10" class="h-28 text-center text-muted-foreground">
              No speed notifications match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead class="sticky top-0 z-20 bg-muted text-xs text-muted-foreground">
          <tr>
            <th class="h-12 w-14 px-3">No</th>
            <th class="px-3">Driver</th>
            <th v-if="allCompanies" class="px-3">Company</th>
            <th class="px-3">Log date</th>
            <th class="px-3">Violations</th>
            <th class="px-3">Note</th>
            <th class="px-3">Time zone</th>
            <th class="px-3">Occurred</th>
            <th class="px-3">Status</th>
            <th class="w-16 px-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td :colspan="allCompanies ? 10 : 9" class="h-28 text-center text-muted-foreground">Loading…</td>
          </tr>
          <tr
            v-for="(alert, index) in paginatedViolationAlerts"
            v-else
            :key="alert.id"
            class="h-12 border-t border-border transition-colors hover:bg-muted/40"
          >
          <td class="px-3 text-muted-foreground">{{ rowNumber(index) }}</td>
          <td class="px-3 font-medium max-w-36">{{ alert.driverName }}</td>
          <td v-if="allCompanies" class="px-3">{{ companyName(alert.companyId) }}</td>
          <td class="whitespace-nowrap px-3">{{ formatLogDate(alert.logDate) }}</td>
          <td class="px-3 font-medium text-red-600">{{ alert.violationCount }}</td>
          <td class="max-w-56 px-3">
            <div class="truncate" :title="alert.note || ''">{{ alert.note || '—' }}</div>
          </td>
          <td class="px-3">{{ alert.timeZone || '—' }}</td>
          <td class="whitespace-nowrap px-3">{{ formatDate(alert.occurredAt) }}</td>
          <td class="px-3">
            <span v-if="!alert.isRead"
              class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
              :class="alert.isRead ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'"
              >
              {{ 'Unread' }}
            </span>
            <span 
              class="inline-flex rounded-full px-2 py-1 text-xs font-semibold" 
              :class="alert.fixedAt ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'">
              {{ alert.fixedAt ? 'Fixed' : 'Not fixed' }}
            </span>
          </td>
          <td class="px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon" title="View map" aria-label="View map" @click="viewViolationMap(alert)">
                <MapPinned class="h-4 w-4" />
              </Button>
              <Button v-if="!alert.isRead" variant="ghost" size="icon" title="Mark read" aria-label="Mark read" :disabled="markingReadId === alert.id" @click="markViolationRead(alert.id)">
                <LoaderCircle v-if="markingReadId === alert.id" class="h-4 w-4 animate-spin" />
                <Check v-else class="h-4 w-4" />
              </Button>
            </div>
          </td>
          </tr>
          <tr v-if="!isLoading && paginatedViolationAlerts.length === 0">
            <td :colspan="allCompanies ? 11 : 10" class="h-28 text-center text-muted-foreground">
              No violation notifications match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="mt-4 flex flex-none flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">Display on page</span>
        <Select v-model="pageSize">
          <SelectTrigger class="h-9 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="10">10</SelectItem>
            <SelectItem :value="25">25</SelectItem>
            <SelectItem :value="50">50</SelectItem>
            <SelectItem :value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span class="text-sm text-muted-foreground">{{ filteredCount }} entries</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden items-center gap-1 md:flex">
          <button
            v-for="page in pageNumbers"
            :key="page"
            :disabled="page === '...'"
            :class="[
              'h-8 min-w-8 rounded px-2 text-sm transition-colors',
              page === pageNumber
                ? 'bg-primary text-primary-foreground'
                : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'hover:bg-muted',
            ]"
            @click="typeof page === 'number' && (pageNumber = page)"
          >
            {{ page }}
          </button>
        </div>
        <span class="whitespace-nowrap text-sm text-muted-foreground">
          {{ filteredCount ? pageNumber : 0 }} of {{ totalPages }} pages
        </span>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="pageNumber <= 1"
          @click="pageNumber--"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :disabled="pageNumber >= totalPages"
          @click="pageNumber++"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronLeft, ChevronRight, LoaderCircle, MapPin, MapPinned, Maximize, Minimize, RefreshCw, Search, Truck, X } from 'lucide-vue-next'
import type { Map as MapLibreMap } from 'maplibre-gl'
import CMap from '@/components/custom/CMap.vue'
import CMapMarker from '@/components/custom/CMapMarker.vue'
import CMapTypeControl from '@/components/custom/CMapTypeControl.vue'
import CMapMarkerInfo from '@/components/custom/CMapMarkerInfo.vue'
import { mapMarkerInfoPadding, positionsBounds } from '@/utils/maps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTimeZoneHelper } from '@/composables/useTimezone'
import { useRoute } from 'vue-router'
import { useApi } from '@/composables/useAxiosService'
import { ApiEndpoints } from '@/api/endpoints'
import { useAuthStore } from '@/modules/Auth/store/authStore'
import { hasPermission } from '@/router/permissions'
import type { RouteEldCompaniesResponse, RouteEldCompany } from '@/types/company'
import { useRouteEldAlerts } from '../composables/useRouteEldAlerts'
import { useRouteEldAlertSocket } from '../composables/useRouteEldAlertSocket'
import { alertLabels, useRouteEldNotificationCenter } from '../composables/useRouteEldNotificationCenter'
import CRedStateSettings from '../components/CRedStateSettings.vue'
import type { AlprCameraAlert, DotAlert, RedStateAlert, RouteEldAlertType, SpeedAlert, StationAlert, ViolationAlert } from '../types'

const props = withDefaults(defineProps<{
  allCompanies?: boolean
  companies?: RouteEldCompany[]
  alertType?: RouteEldAlertType
}>(), { allCompanies: false, companies: () => [] })
const { formatToTimeZone } = useTimeZoneHelper()
const route = useRoute()
const {
  stationAlerts,
  alprCameraAlerts,
  redStateAlerts,
  dotAlerts,
  speedAlerts,
  violationAlerts,
  isLoading,
  isRefreshing,
  markingReadId,
  error,
  fetchAlerts,
  ensureAlerts,
  resetAlerts,
  markStationRead,
  markAlprCameraRead,
  markRedStateRead,
  markDotRead,
  markSpeedRead,
  markViolationRead,
  markAllRead,
} = useRouteEldAlerts()
const { latestWeighStationAlert, latestAlprCameraAlert, latestRedStateAlert, latestDotAlert, latestGenericAlert } = useRouteEldAlertSocket()
const { refresh: refreshUnreadAlerts } = useRouteEldNotificationCenter()

const api = useApi()
const authStore = useAuthStore()
const permittedTypes = computed<RouteEldAlertType[]>(() =>
  (['station', 'alpr', 'red_state', 'dot', 'violation', 'speed'] as RouteEldAlertType[]).filter((type) =>
    hasPermission(authStore.token, `route_eld.alerts.${type === 'dot' ? 'red_state' : type}`)
  )
)
const selectedCompanyId = computed(() => authStore.companyId)
const requestCompanyId = ref<string | null>(null)
const readAllLoading = ref(false)
const selectedCompanyName = ref<string | null>(null)
const companyError = ref<string | null>(null)
const companyFilter = ref('all')
const companyName = (companyId: string | null) =>
  props.companies.find((company) => company.externalCompanyId === companyId)?.name ?? companyId ?? '—'
const matchesAlertCompany = (companyId: string | null) => {
  if (!companyId) return false
  if (!props.allCompanies) return selectedCompanyId.value?.toLowerCase() === companyId.toLowerCase()
  return companyFilter.value === 'all' || props.companies.some((company) =>
    company.id.toLowerCase() === companyId.toLowerCase() &&
    company.externalCompanyId === companyFilter.value
  )
}
const alertType = ref<RouteEldAlertType>(
  props.alertType ?? permittedTypes.value.find((type) => type === route.query.type) ?? permittedTypes.value[0] ?? 'station'
)
const search = ref('')
const statusFilter = ref('all')
const pageNumber = ref(1)
const pageSize = ref(25)
const mapRef = ref<InstanceType<typeof CMap> | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
const isMapFullscreen = ref(false)
const getMap = () => mapRef.value?.getMap() ?? null
interface AlertMapSelection {
  driver: string
  reason: string
  detail: string
  driverRows: { label: string; value: string | number | null | undefined }[]
  targetName: string | null
  targetRows: { label: string; value: string | number | null | undefined }[]
  latitude: number | null
  longitude: number | null
  targetLatitude: number | null
  targetLongitude: number | null
}
const activeMapInfo = ref<'driver' | 'target' | null>('driver')
const mapSelection = ref<AlertMapSelection | null>(null)
let companyResolutionVersion = 0
const pageError = computed(() => companyError.value ?? error.value)

const pageDescription = computed(() => {
  if (alertType.value === 'station') return 'Driver approaches to weigh stations'
  if (alertType.value === 'alpr') return 'Drivers approaching ALPR cameras'
  if (alertType.value === 'red_state') return 'Drivers approaching monitored state borders'
  if (alertType.value === 'dot') return 'Logs submitted to DOT by Route ELD drivers'
  if (alertType.value === 'speed') return 'Drivers exceeding the state speed limit'
  return 'Drivers with HOS violations from Route ELD daily logs'
})

const searchPlaceholder = computed(() => {
  if (alertType.value === 'station') return 'Search driver or station'
  if (alertType.value === 'alpr') return 'Search driver or camera'
  if (alertType.value === 'red_state') return 'Search driver or state'
  if (alertType.value === 'dot') return 'Search driver ID or truck'
  if (alertType.value === 'speed') return 'Search driver or location'
  return 'Search driver, date or note'
})

const statusOptions = computed(() => {
  if (alertType.value === 'station' || alertType.value === 'alpr' || alertType.value === 'red_state') {
    return [
      { value: 'all', label: 'All statuses' },
      { value: 'unread', label: 'Unread' },
      { value: 'active', label: 'Nearby' },
      { value: 'resolved', label: 'Passed' },
    ]
  }
  return [
    { value: 'all', label: 'All alerts' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ]
})

const filteredStationAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return stationAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.stationName, alert.location, alert.stateCode, alert.direction].some(
        (value) => value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'active' && !alert.resolvedAt) ||
      (statusFilter.value === 'resolved' && !!alert.resolvedAt)
    return matchesSearch && matchesStatus
  })
})

const filteredAlprCameraAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return alprCameraAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.cameraName, alert.brand, alert.operator, alert.driverLocation].some(
        (value) => value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'active' && !alert.resolvedAt) ||
      (statusFilter.value === 'resolved' && !!alert.resolvedAt)
    return matchesSearch && matchesStatus
  })
})

const filteredRedStateAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return redStateAlerts.value.filter((alert) => {
    const matchesSearch = !query ||
      [alert.driverName, alert.stateCode, alert.driverLocation].some(value => value?.toLowerCase().includes(query))
    const matchesStatus = statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'active' && !alert.resolvedAt) ||
      (statusFilter.value === 'resolved' && !!alert.resolvedAt)
    return matchesSearch && matchesStatus
  })
})

const filteredDotAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return dotAlerts.value.filter((alert) => {
    const matchesSearch = !query ||
      [alert.driverName, alert.externalDriverId, alert.truckNumber, alert.driverLocation].some(value => value?.toLowerCase().includes(query))
    const matchesStatus = statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'read' && alert.isRead)
    return matchesSearch && matchesStatus
  })
})

const filteredSpeedAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return speedAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.location, alert.stateCode].some((value) =>
        value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'read' && alert.isRead)
    return matchesSearch && matchesStatus
  })
})

const filteredViolationAlerts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return violationAlerts.value.filter((alert) => {
    const matchesSearch =
      !query ||
      [alert.driverName, alert.logDate, alert.note].some((value) =>
        value?.toLowerCase().includes(query)
      )
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'unread' && !alert.isRead) ||
      (statusFilter.value === 'read' && alert.isRead)
    return matchesSearch && matchesStatus
  })
})

const filteredCount = computed(() => {
  if (alertType.value === 'station') return filteredStationAlerts.value.length
  if (alertType.value === 'alpr') return filteredAlprCameraAlerts.value.length
  if (alertType.value === 'red_state') return filteredRedStateAlerts.value.length
  if (alertType.value === 'dot') return filteredDotAlerts.value.length
  if (alertType.value === 'speed') return filteredSpeedAlerts.value.length
  return filteredViolationAlerts.value.length
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCount.value / pageSize.value)))
const pageNumbers = computed<(number | string)[]>(() => {
  if (totalPages.value <= 7) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  }
  const values: (number | string)[] = [1]
  if (pageNumber.value > 3) values.push('...')
  for (
    let page = Math.max(2, pageNumber.value - 1);
    page <= Math.min(totalPages.value - 1, pageNumber.value + 1);
    page += 1
  ) {
    values.push(page)
  }
  if (pageNumber.value < totalPages.value - 2) values.push('...')
  values.push(totalPages.value)
  return values
})

const pageSlice = computed(() => {
  const start = (pageNumber.value - 1) * pageSize.value
  return { start, end: start + pageSize.value }
})
const paginatedStationAlerts = computed(() =>
  filteredStationAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedAlprCameraAlerts = computed(() =>
  filteredAlprCameraAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedRedStateAlerts = computed(() =>
  filteredRedStateAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedDotAlerts = computed(() =>
  filteredDotAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedSpeedAlerts = computed(() =>
  filteredSpeedAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)
const paginatedViolationAlerts = computed(() =>
  filteredViolationAlerts.value.slice(pageSlice.value.start, pageSlice.value.end)
)

const summaryCards = computed(() => {
  if (alertType.value === 'station') {
    return [
      { label: 'Alerts loaded', value: stationAlerts.value.length, className: '' },
      {
        label: 'Active approaches',
        value: stationAlerts.value.filter((alert) => !alert.resolvedAt).length,
        className: 'text-orange-600',
      },
      {
        label: 'Passed',
        value: stationAlerts.value.filter((alert) => !!alert.resolvedAt).length,
        className: 'text-green-600',
      },
      {
        label: 'Unread',
        value: stationAlerts.value.filter((alert) => !alert.isRead).length,
        className: 'text-red-600',
      },
    ]
  }
  if (alertType.value === 'alpr') {
    return [
      { label: 'Alerts loaded', value: alprCameraAlerts.value.length, className: '' },
      {
        label: 'Active approaches',
        value: alprCameraAlerts.value.filter((alert) => !alert.resolvedAt).length,
        className: 'text-orange-600',
      },
      {
        label: 'Passed',
        value: alprCameraAlerts.value.filter((alert) => !!alert.resolvedAt).length,
        className: 'text-green-600',
      },
      {
        label: 'Unread',
        value: alprCameraAlerts.value.filter((alert) => !alert.isRead).length,
        className: 'text-red-600',
      },
    ]
  }
  if (alertType.value === 'red_state') {
    return [
      { label: 'Alerts loaded', value: redStateAlerts.value.length, className: '' },
      { label: 'Active approaches', value: redStateAlerts.value.filter(alert => !alert.resolvedAt).length, className: 'text-orange-600' },
      { label: 'Passed', value: redStateAlerts.value.filter(alert => !!alert.resolvedAt).length, className: 'text-green-600' },
      { label: 'Unread', value: redStateAlerts.value.filter(alert => !alert.isRead).length, className: 'text-red-600' },
    ]
  }
  if (alertType.value === 'dot') {
    return [
      { label: 'Alerts loaded', value: dotAlerts.value.length, className: '' },
      { label: 'Unread', value: dotAlerts.value.filter(alert => !alert.isRead).length, className: 'text-red-600' },
      { label: 'Drivers', value: new Set(dotAlerts.value.map(alert => alert.driverId)).size, className: '' },
      { label: 'Trucks', value: new Set(dotAlerts.value.map(alert => alert.truckNumber)).size, className: '' },
    ]
  }
  if (alertType.value === 'speed') {
    const overages = speedAlerts.value.map((alert) => Math.max(0, alert.speed - alert.speedLimit))
    return [
      { label: 'Alerts loaded', value: speedAlerts.value.length, className: '' },
      {
        label: 'Unread',
        value: speedAlerts.value.filter((alert) => !alert.isRead).length,
        className: 'text-red-600',
      },
      {
        label: 'Average over limit',
        value: `${Math.round(overages.reduce((sum, value) => sum + value, 0) / (overages.length || 1))} mph`,
        className: 'text-orange-600',
      },
      {
        label: 'Highest speed',
        value: `${Math.round(Math.max(0, ...speedAlerts.value.map((alert) => alert.speed)))} mph`,
        className: 'text-red-600',
      },
    ]
  }
  return [
    { label: 'Alerts loaded', value: violationAlerts.value.length, className: '' },
    {
      label: 'Unread',
      value: violationAlerts.value.filter((alert) => !alert.isRead).length,
      className: 'text-red-600',
    },
    {
      label: 'Total violations',
      value: violationAlerts.value.reduce((sum, alert) => sum + alert.violationCount, 0),
      className: 'text-red-600',
    },
    {
      label: 'Affected drivers',
      value: new Set(violationAlerts.value.map((alert) => alert.driverName)).size,
      className: 'text-orange-600',
    },
  ]
})

watch(alertType, async (value) => {
  mapSelection.value = null
  search.value = ''
  statusFilter.value = 'all'
  pageNumber.value = 1
  if (props.allCompanies || requestCompanyId.value) await ensureAlerts(value, requestCompanyId.value)
})
watch(() => props.alertType, (value) => {
  if (value) alertType.value = value
})
watch(companyFilter, async () => {
  if (!props.allCompanies) return
  requestCompanyId.value = companyFilter.value === 'all' ? null : companyFilter.value
  mapSelection.value = null
  pageNumber.value = 1
  resetAlerts()
  await fetchAlerts(alertType.value, requestCompanyId.value)
})
watch(
  () => route.query.type,
  (value) => {
    if (props.allCompanies && (value === 'station' || value === 'alpr' || value === 'red_state' || value === 'dot' || value === 'violation' || value === 'speed') && permittedTypes.value.includes(value)) {
      alertType.value = value
    }
  }
)
watch(latestWeighStationAlert, (alert) => {
  if (alertType.value === 'station' && matchesAlertCompany(alert?.companyId ?? null))
    void fetchAlerts('station', requestCompanyId.value, true)
})
watch(latestAlprCameraAlert, (alert) => {
  if (alertType.value === 'alpr' && matchesAlertCompany(alert?.companyId ?? null))
    void fetchAlerts('alpr', requestCompanyId.value, true)
})
watch(latestRedStateAlert, (alert) => {
  if (alertType.value === 'red_state' && matchesAlertCompany(alert?.companyId ?? null))
    void fetchAlerts('red_state', requestCompanyId.value, true)
})
watch(latestDotAlert, (alert) => {
  if (alertType.value === 'dot' && matchesAlertCompany(alert?.companyId ?? null))
    void fetchAlerts('dot', requestCompanyId.value, true)
})
watch(latestGenericAlert, (alert) => {
  const type = alert?.notificationKey
  if (type === alertType.value && matchesAlertCompany(alert?.companyId ?? null))
    void fetchAlerts(alertType.value, requestCompanyId.value, true)
})
watch(selectedCompanyId, async () => {
  if (props.allCompanies) return
  mapSelection.value = null
  search.value = ''
  statusFilter.value = 'all'
  pageNumber.value = 1
  resetAlerts()
  await resolveSelectedCompany()
})
watch(mapSelection, () => {
  activeMapInfo.value = 'driver'
  void nextTick(() => fitMapSelection())
})
watch([search, statusFilter, pageSize], () => {
  pageNumber.value = 1
})
watch(totalPages, (value) => {
  if (pageNumber.value > value) pageNumber.value = value
})

onMounted(async () => {
  document.addEventListener('fullscreenchange', handleMapFullscreenChange)
  await resolveSelectedCompany()
})
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', handleMapFullscreenChange))

async function resolveSelectedCompany() {
  const version = ++companyResolutionVersion
  requestCompanyId.value = null
  selectedCompanyName.value = null
  companyError.value = null
  if (props.allCompanies) {
    requestCompanyId.value = companyFilter.value === 'all' ? null : companyFilter.value
    await ensureAlerts(alertType.value, requestCompanyId.value)
    return
  }
  const companyId = selectedCompanyId.value
  if (!companyId) {
    companyError.value = 'Select a company before opening notifications.'
    return
  }
  try {
    const response = await api.get<RouteEldCompaniesResponse>(ApiEndpoints.ROUTE_ELD_COMPANIES)
    if (version !== companyResolutionVersion) return
    const company = response.data.successResult.find(
      (company) => company.id.toLowerCase() === companyId.toLowerCase()
    )
    requestCompanyId.value = company?.externalCompanyId ?? null
    selectedCompanyName.value = company?.name ?? null
    companyError.value = requestCompanyId.value ? null : 'The selected company could not be resolved.'
    if (requestCompanyId.value) await ensureAlerts(alertType.value, requestCompanyId.value)
  } catch {
    if (version !== companyResolutionVersion) return
    companyError.value = 'The selected company could not be loaded.'
  }
}

function refresh() {
  if (props.allCompanies || requestCompanyId.value)
    void fetchAlerts(alertType.value, requestCompanyId.value, true)
}

async function readAllAlerts() {
  readAllLoading.value = true
  try {
    await markAllRead(alertType.value, requestCompanyId.value)
    await refreshUnreadAlerts()
  } catch {
    companyError.value = 'Could not mark all alerts as read.'
  } finally {
    readAllLoading.value = false
  }
}

function viewStationMap(alert: StationAlert) {
  mapSelection.value = {
    driver: alert.driverName,
    reason: `Approaching ${alert.stationName}`,
    detail: `${alert.distanceMiles.toFixed(2)} mi away · ${stationLocation(alert)}`,
    driverRows: [
      { label: 'Company', value: props.allCompanies ? companyName(alert.companyId) : selectedCompanyName.value },
      { label: 'Location', value: stationDriverLocation(alert) },
      { label: 'Time', value: formatDate(alert.occurredAt) },
      { label: 'Distance', value: `${alert.distanceMiles.toFixed(2)} mi` },
    ],
    targetName: alert.stationName,
    targetRows: [
      { label: 'Location', value: stationLocation(alert) },
      { label: 'Direction', value: alert.direction },
      { label: 'Type', value: alert.stationType },
    ],
    latitude: alert.driverLatitude,
    longitude: alert.driverLongitude,
    targetLatitude: alert.stationLatitude,
    targetLongitude: alert.stationLongitude,
  }
}

function viewAlprMap(alert: AlprCameraAlert) {
  mapSelection.value = {
    driver: alert.driverName,
    reason: `Approaching ALPR camera ${alert.cameraName}`,
    detail: `${alert.distanceMiles.toFixed(2)} mi away · ${alert.brand || alert.operator || 'Camera'}`,
    driverRows: [
      { label: 'Company', value: props.allCompanies ? companyName(alert.companyId) : selectedCompanyName.value },
      { label: 'Location', value: alprDriverLocation(alert) },
      { label: 'Time', value: formatDate(alert.occurredAt) },
      { label: 'Distance', value: `${alert.distanceMiles.toFixed(2)} mi` },
    ],
    targetName: alert.cameraName,
    targetRows: [
      { label: 'Location', value: alprCameraLocation(alert) },
      { label: 'Brand', value: alert.brand },
      { label: 'Operator', value: alert.operator },
    ],
    latitude: alert.driverLatitude,
    longitude: alert.driverLongitude,
    targetLatitude: alert.cameraLatitude,
    targetLongitude: alert.cameraLongitude,
  }
}

function viewDotMap(alert: DotAlert) {
  mapSelection.value = {
    driver: alert.driverName,
    reason: 'DOT logs submitted',
    detail: `Truck ${alert.truckNumber} · ${formatDate(alert.periodStart)} → ${formatDate(alert.periodEnd)}`,
    driverRows: [
      { label: 'Company', value: props.allCompanies ? companyName(alert.companyId) : selectedCompanyName.value },
      { label: 'Location', value: alert.driverLocation || formatCoordinates(alert.driverLatitude, alert.driverLongitude) },
      { label: 'Submitted', value: formatDate(alert.submittedAt) },
      { label: 'Driver ID', value: alert.externalDriverId },
      { label: 'Truck', value: alert.truckNumber },
    ],
    targetName: null,
    targetRows: [],
    latitude: alert.driverLatitude,
    longitude: alert.driverLongitude,
    targetLatitude: null,
    targetLongitude: null,
  }
}

function viewRedStateMap(alert: RedStateAlert) {
  mapSelection.value = {
    driver: alert.driverName,
    reason: `Approaching ${alert.stateCode} state border`,
    detail: `${alert.distanceMiles.toFixed(2)} mi away`,
    driverRows: [
      { label: 'Company', value: props.allCompanies ? companyName(alert.companyId) : selectedCompanyName.value },
      { label: 'Location', value: alert.driverLocation || formatCoordinates(alert.driverLatitude, alert.driverLongitude) },
      { label: 'Time', value: formatDate(alert.occurredAt) },
      { label: 'Distance', value: `${alert.distanceMiles.toFixed(2)} mi` },
    ],
    targetName: `${alert.stateCode} border`,
    targetRows: [{ label: 'State', value: alert.stateCode }],
    latitude: alert.driverLatitude, longitude: alert.driverLongitude,
    targetLatitude: alert.boundaryLatitude, targetLongitude: alert.boundaryLongitude,
  }
}

function viewSpeedMap(alert: SpeedAlert) {
  mapSelection.value = {
    driver: alert.driverName,
    reason: `Speed ${Math.round(alert.speed)} mph in a ${alert.speedLimit} mph zone`,
    detail: speedLocation(alert),
    driverRows: [
      { label: 'Company', value: props.allCompanies ? companyName(alert.companyId) : selectedCompanyName.value },
      { label: 'Location', value: speedLocation(alert) },
      { label: 'Time', value: formatDate(alert.occurredAt) },
      { label: 'Speed', value: `${alert.speed} mph` },
      { label: 'Limit', value: `${alert.speedLimit} mph` },
    ],
    targetName: null,
    targetRows: [],
    latitude: alert.latitude,
    longitude: alert.longitude,
    targetLatitude: null,
    targetLongitude: null,
  }
}

function viewViolationMap(alert: ViolationAlert) {
  mapSelection.value = {
    driver: alert.driverName,
    reason: `${alert.violationCount} HOS violation${alert.violationCount === 1 ? '' : 's'}`,
    detail: `${formatLogDate(alert.logDate)} · ${alert.note || 'No additional details'} · Last known driver position, not necessarily the violation site.`,
    driverRows: [
      { label: 'Company', value: props.allCompanies ? companyName(alert.companyId) : selectedCompanyName.value },
      { label: 'Last location', value: alert.driverLocation || formatCoordinates(alert.driverLatitude, alert.driverLongitude) },
      { label: 'Time', value: formatDate(alert.occurredAt) },
      { label: 'Log date', value: formatLogDate(alert.logDate) },
      { label: 'Violations', value: alert.violationCount },
      { label: 'Note', value: alert.note },
    ],
    targetName: null,
    targetRows: [],
    latitude: alert.driverLatitude,
    longitude: alert.driverLongitude,
    targetLatitude: null,
    targetLongitude: null,
  }
}

function formatCoordinates(latitude: number | null, longitude: number | null) {
  return latitude === null || longitude === null ? '—' : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

async function toggleMapFullscreen() {
  const element = mapContainerRef.value
  if (!element) return
  if (document.fullscreenElement === element) await document.exitFullscreen().catch(() => {})
  else await element.requestFullscreen().catch(() => {})
}

function handleMapFullscreenChange() {
  isMapFullscreen.value = document.fullscreenElement === mapContainerRef.value
  void nextTick(() => {
    getMap()?.resize()
    fitMapSelection()
  })
}

async function closeMap() {
  if (document.fullscreenElement === mapContainerRef.value)
    await document.exitFullscreen().catch(() => {})
  mapSelection.value = null
}

function fitMapSelection(instance?: MapLibreMap) {
  const selection = mapSelection.value
  const map = instance ?? getMap()
  if (!selection || !map || selection.latitude === null || selection.longitude === null) return
  const driver = { lat: selection.latitude, lng: selection.longitude }
  if (selection.targetLatitude === null || selection.targetLongitude === null ||
      (selection.targetLatitude === selection.latitude && selection.targetLongitude === selection.longitude)) {
    map.jumpTo({ center: driver, zoom: 12 })
    map.panBy([0, -75], { duration: 0 })
    return
  }
  const bounds = positionsBounds([driver, { lat: selection.targetLatitude, lng: selection.targetLongitude }])
  if (bounds) map.fitBounds(bounds, { padding: mapMarkerInfoPadding(map), duration: 0 })
}

function rowNumber(index: number) {
  return (pageNumber.value - 1) * pageSize.value + index + 1
}

function formatDate(value: string) {
  return formatToTimeZone(value, 'MMM D, YYYY h:mm A')
}

function formatLogDate(value: string) {
  const normalized = value.replaceAll('/', '-')
  const date = new Date(`${normalized}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function mapUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function stationDriverLocation(alert: StationAlert) {
  return (
    alert.driverLocation ||
    `${alert.driverLatitude.toFixed(5)}, ${alert.driverLongitude.toFixed(5)}`
  )
}

function stationLocation(alert: StationAlert) {
  return (
    alert.location || `${alert.stationLatitude.toFixed(5)}, ${alert.stationLongitude.toFixed(5)}`
  )
}

function alprDriverLocation(alert: AlprCameraAlert) {
  return (
    alert.driverLocation ||
    `${alert.driverLatitude.toFixed(5)}, ${alert.driverLongitude.toFixed(5)}`
  )
}

function alprCameraLocation(alert: AlprCameraAlert) {
  return `${alert.cameraLatitude.toFixed(5)}, ${alert.cameraLongitude.toFixed(5)}`
}

function speedLocation(alert: SpeedAlert) {
  return alert.location || `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`
}

function speedOverLimit(alert: SpeedAlert) {
  return Math.max(0, Math.round(alert.speed - alert.speedLimit))
}
</script>
